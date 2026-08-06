-- ============================================================
-- BossBooks: Attach a customer to an already-saved sale
-- Run once in the Supabase SQL Editor.
--
-- Needed for the walk-in-customer capture flow on Sales Receipts: a
-- receipt made with no customer selected has nothing to relabel with a
-- direct client update, since public.sales has SELECT/INSERT/DELETE RLS
-- policies but no UPDATE policy — the client can't touch it directly, so
-- this is a narrow security-definer RPC instead, matching how every
-- other sales mutation (create_sale/update_sale/delete_sale) already
-- works in this app.
--
-- Deliberately does nothing else: a receipt is already fully settled
-- (its charge and payment already net to zero) regardless of whose name
-- ends up on it, so this is pure relabeling — no retroactive
-- customer_transactions rows, no balance/journal impact.
-- ============================================================

create or replace function public.attach_customer_to_sale(
  p_sale_id uuid,
  p_customer_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid := public.current_company_id();
begin
  if v_company_id is null then
    raise exception 'Not authenticated';
  end if;

  if not exists (
    select 1 from public.sales where id = p_sale_id and company_id = v_company_id
  ) then
    raise exception 'Invalid sale';
  end if;

  if not exists (
    select 1 from public.customers where id = p_customer_id and company_id = v_company_id
  ) then
    raise exception 'Invalid customer';
  end if;

  update public.sales
  set customer_id = p_customer_id
  where id = p_sale_id;
end;
$$;

grant execute on function public.attach_customer_to_sale(uuid, uuid) to authenticated;
