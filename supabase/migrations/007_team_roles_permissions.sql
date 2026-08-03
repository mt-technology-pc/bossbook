-- ============================================================
-- BossBooks: Team — custom roles with per-page permissions
-- Run this once in the Supabase SQL Editor.
--
-- Additive only. company_users.role ('owner'/'staff') is untouched — it's
-- load-bearing in handle_new_user() and several existing call sites. This
-- adds a SEPARATE, optional role_id a staff member can be assigned, whose
-- permissions gate which app pages they can see. An owner always has full
-- access regardless of role_id — this module never changes that.
-- ============================================================

create table if not exists public.roles (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null default public.current_company_id()
              references public.companies(id) on delete cascade,
  name        text not null,
  -- true bypasses role_permissions entirely — equivalent to an owner's
  -- access, without actually being company_users.role = 'owner'.
  full_access boolean not null default false,
  -- System roles (currently just the auto-seeded "Standard access") can be
  -- assigned and used like any other role, but can't be renamed or deleted
  -- from the UI — enforced below by a trigger, not just app-level checks.
  is_system   boolean not null default false,
  created_at  timestamptz not null default now(),
  unique (company_id, name)
);

create index if not exists roles_company_id_idx on public.roles(company_id);

create table if not exists public.role_permissions (
  role_id  uuid not null references public.roles(id) on delete cascade,
  -- One of the fixed page keys the frontend nav is built from (see
  -- DashboardLayout.jsx's nav/topBarShortcuts) — not FK'd to a table since
  -- these are route identifiers, not stored data. Meaningless (ignored) for
  -- any role with full_access = true.
  page_key text not null,
  primary key (role_id, page_key)
);

alter table public.company_users add column if not exists role_id uuid
  references public.roles(id) on delete set null;

alter table public.roles enable row level security;
alter table public.role_permissions enable row level security;

-- Every company member can read role names/permissions (so a restricted
-- staff member can at least see their own role's label), but only a team
-- manager can create/edit/delete them.
drop policy if exists "Members can view own company roles" on public.roles;
create policy "Members can view own company roles"
  on public.roles for select
  using (company_id = public.current_company_id());

drop policy if exists "Members can view own company role permissions" on public.role_permissions;
create policy "Members can view own company role permissions"
  on public.role_permissions for select
  using (role_id in (select id from public.roles where company_id = public.current_company_id()));

-- is_team_manager(): true for an owner, or a staff member whose assigned
-- role has full_access. This is the gate for managing Team/Roles itself —
-- deliberately NOT one of the checkbox page permissions, so a limited role
-- can never grant itself more access by editing roles.
create or replace function public.is_team_manager()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.company_users cu
    left join public.roles r on r.id = cu.role_id
    where cu.user_id = auth.uid()
      and (cu.role = 'owner' or coalesce(r.full_access, false))
  );
$$;

grant execute on function public.is_team_manager() to authenticated;

drop policy if exists "Team managers can insert roles" on public.roles;
create policy "Team managers can insert roles"
  on public.roles for insert
  with check (company_id = public.current_company_id() and public.is_team_manager());

drop policy if exists "Team managers can update roles" on public.roles;
create policy "Team managers can update roles"
  on public.roles for update
  using (company_id = public.current_company_id() and public.is_team_manager());

drop policy if exists "Team managers can delete roles" on public.roles;
create policy "Team managers can delete roles"
  on public.roles for delete
  using (company_id = public.current_company_id() and public.is_team_manager());

drop policy if exists "Team managers can manage role permissions" on public.role_permissions;
create policy "Team managers can manage role permissions"
  on public.role_permissions for all
  using (role_id in (
    select id from public.roles where company_id = public.current_company_id() and public.is_team_manager()
  ))
  with check (role_id in (
    select id from public.roles where company_id = public.current_company_id() and public.is_team_manager()
  ));

-- Blocks renaming/toggling full_access/deleting a system role from the UI,
-- regardless of the is_team_manager() RLS check above passing — belt and
-- braces, since this is the one thing that should never be editable even
-- by a full-access role.
create or replace function public.prevent_system_role_mutation()
returns trigger
language plpgsql
as $$
begin
  if TG_OP = 'DELETE' then
    if old.is_system then
      raise exception 'This is a system role and can''t be deleted';
    end if;
    return old;
  end if;

  if old.is_system and (new.name <> old.name or new.full_access <> old.full_access) then
    raise exception 'This is a system role and can''t be renamed or have its access level changed';
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_system_role_mutation on public.roles;
create trigger prevent_system_role_mutation
  before update or delete on public.roles
  for each row execute function public.prevent_system_role_mutation();

-- ensure_default_role(): same lazy get-or-create shape as the existing
-- ensure_system_account() (schema.sql) — called whenever the Team page
-- loads, so every company ends up with one ready-to-assign full-access
-- role without needing to touch the signup trigger for existing OR future
-- companies.
-- No company_id parameter, deliberately — takes it from current_company_id()
-- internally (same reasoning as current_company_id() itself), so a caller
-- can only ever ensure/return a role for their OWN company. A parameterized
-- version would let any authenticated user pass an arbitrary company_id and
-- create junk rows in a tenant they don't belong to.
create or replace function public.ensure_default_role()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid := public.current_company_id();
  v_id uuid;
begin
  if v_company_id is null then
    raise exception 'Not authenticated';
  end if;

  select id into v_id from public.roles
  where company_id = v_company_id and name = 'Standard access';

  if v_id is not null then
    return v_id;
  end if;

  insert into public.roles (company_id, name, full_access, is_system)
  values (v_company_id, 'Standard access', true, true)
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.ensure_default_role() to authenticated;

-- my_permissions(): one round trip for the frontend to decide what nav to
-- show — owners and full-access roles get is_full_access = true (page_keys
-- is irrelevant/empty then); everyone else gets their role's explicit
-- page_permissions list (or an empty list if no role is assigned yet).
create or replace function public.my_permissions()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_role text;
  v_role_id uuid;
  v_full_access boolean;
  v_pages text[];
begin
  select cu.role, cu.role_id into v_role, v_role_id
  from public.company_users cu
  where cu.user_id = auth.uid();

  if v_role is null then
    return jsonb_build_object('is_full_access', false, 'page_keys', '[]'::jsonb);
  end if;

  if v_role = 'owner' then
    return jsonb_build_object('is_full_access', true, 'page_keys', '[]'::jsonb);
  end if;

  if v_role_id is null then
    return jsonb_build_object('is_full_access', false, 'page_keys', '[]'::jsonb);
  end if;

  select full_access into v_full_access from public.roles where id = v_role_id;

  if coalesce(v_full_access, false) then
    return jsonb_build_object('is_full_access', true, 'page_keys', '[]'::jsonb);
  end if;

  select coalesce(array_agg(page_key), array[]::text[]) into v_pages
  from public.role_permissions where role_id = v_role_id;

  return jsonb_build_object('is_full_access', false, 'page_keys', to_jsonb(v_pages));
end;
$$;

grant execute on function public.my_permissions() to authenticated;
