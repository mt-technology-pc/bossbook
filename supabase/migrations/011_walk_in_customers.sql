-- ============================================================
-- BossBooks: Walk-in customer capture (Sales Receipts)
-- Run once in the Supabase SQL Editor.
--
-- A dedicated table, not a row in public.customers — a walk-in capture
-- is just "who do I text/email this one receipt to", not a real
-- customer relationship: it must never inflate the Customers list,
-- receivables/balance totals, or customer-picker dropdowns anywhere
-- else in the app. sale_id links it back to the one receipt it was
-- captured for; the sale itself stays customer_id = null throughout —
-- this is purely additive contact info, not a relabeling of the sale.
-- ============================================================

create table if not exists public.walk_in_customers (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references auth.users(id) on delete cascade,
  company_id uuid not null default public.current_company_id()
             references public.companies(id) on delete cascade,
  sale_id    uuid references public.sales(id) on delete cascade,
  name       text not null default 'Walk-in customer',
  phone      text,
  email      text,
  nic        text,
  created_at timestamptz not null default now()
);

create index if not exists walk_in_customers_company_id_idx on public.walk_in_customers(company_id);
create index if not exists walk_in_customers_sale_id_idx    on public.walk_in_customers(sale_id);

alter table public.walk_in_customers enable row level security;

drop policy if exists "walk_in_customers_select" on public.walk_in_customers;
create policy "walk_in_customers_select" on public.walk_in_customers for select
  using (company_id = public.current_company_id());

drop policy if exists "walk_in_customers_insert" on public.walk_in_customers;
create policy "walk_in_customers_insert" on public.walk_in_customers for insert
  with check (company_id = public.current_company_id());
