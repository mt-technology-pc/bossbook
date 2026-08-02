-- ============================================================
-- BossBooks: Credit Notes (Sales Returns) + Purchase Returns
-- Run this once in the Supabase SQL Editor.
-- ============================================================

-- ── 1. credit_notes ─────────────────────────────────────────
create table if not exists public.credit_notes (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null references auth.users(id) on delete cascade,
  company_id   uuid not null default public.current_company_id()
               references public.companies(id) on delete cascade,
  customer_id  uuid references public.customers(id) on delete set null,
  sale_id      uuid references public.sales(id) on delete set null,
  reference    text,
  credit_date  date not null default current_date,
  notes        text,
  total_amount numeric(12,2) not null default 0,
  created_at   timestamptz not null default now()
);

create index if not exists credit_notes_company_id_idx  on public.credit_notes(company_id);
create index if not exists credit_notes_customer_id_idx on public.credit_notes(customer_id);
create index if not exists credit_notes_sale_id_idx     on public.credit_notes(sale_id);

alter table public.credit_notes enable row level security;

drop policy if exists "credit_notes_select" on public.credit_notes;
create policy "credit_notes_select" on public.credit_notes for select
  using (company_id = public.current_company_id());

drop policy if exists "credit_notes_insert" on public.credit_notes;
create policy "credit_notes_insert" on public.credit_notes for insert
  with check (company_id = public.current_company_id());

drop policy if exists "credit_notes_delete" on public.credit_notes;
create policy "credit_notes_delete" on public.credit_notes for delete
  using (company_id = public.current_company_id());

-- ── 2. credit_note_items ────────────────────────────────────
create table if not exists public.credit_note_items (
  id             uuid primary key default gen_random_uuid(),
  owner_id       uuid not null references auth.users(id) on delete cascade,
  company_id     uuid not null default public.current_company_id()
                 references public.companies(id) on delete cascade,
  credit_note_id uuid not null references public.credit_notes(id) on delete cascade,
  product_id     uuid references public.products(id) on delete set null,
  description    text,
  quantity       numeric(12,4) not null default 1 check (quantity > 0),
  unit_price     numeric(12,2) not null default 0,
  amount         numeric(12,2) not null default 0
);

create index if not exists credit_note_items_credit_note_id_idx on public.credit_note_items(credit_note_id);
create index if not exists credit_note_items_company_id_idx     on public.credit_note_items(company_id);

alter table public.credit_note_items enable row level security;

drop policy if exists "credit_note_items_select" on public.credit_note_items;
create policy "credit_note_items_select" on public.credit_note_items for select
  using (company_id = public.current_company_id());

drop policy if exists "credit_note_items_insert" on public.credit_note_items;
create policy "credit_note_items_insert" on public.credit_note_items for insert
  with check (company_id = public.current_company_id());

-- ── 3. purchase_returns ─────────────────────────────────────
create table if not exists public.purchase_returns (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null references auth.users(id) on delete cascade,
  company_id   uuid not null default public.current_company_id()
               references public.companies(id) on delete cascade,
  supplier_id  uuid references public.suppliers(id) on delete set null,
  purchase_id  uuid references public.purchases(id) on delete set null,
  reference    text,
  return_date  date not null default current_date,
  notes        text,
  total_amount numeric(12,2) not null default 0,
  created_at   timestamptz not null default now()
);

create index if not exists purchase_returns_company_id_idx  on public.purchase_returns(company_id);
create index if not exists purchase_returns_supplier_id_idx on public.purchase_returns(supplier_id);
create index if not exists purchase_returns_purchase_id_idx on public.purchase_returns(purchase_id);

alter table public.purchase_returns enable row level security;

drop policy if exists "purchase_returns_select" on public.purchase_returns;
create policy "purchase_returns_select" on public.purchase_returns for select
  using (company_id = public.current_company_id());

drop policy if exists "purchase_returns_insert" on public.purchase_returns;
create policy "purchase_returns_insert" on public.purchase_returns for insert
  with check (company_id = public.current_company_id());

drop policy if exists "purchase_returns_delete" on public.purchase_returns;
create policy "purchase_returns_delete" on public.purchase_returns for delete
  using (company_id = public.current_company_id());

-- ── 4. purchase_return_items ────────────────────────────────
create table if not exists public.purchase_return_items (
  id                 uuid primary key default gen_random_uuid(),
  owner_id           uuid not null references auth.users(id) on delete cascade,
  company_id         uuid not null default public.current_company_id()
                     references public.companies(id) on delete cascade,
  purchase_return_id uuid not null references public.purchase_returns(id) on delete cascade,
  product_id         uuid not null references public.products(id) on delete restrict,
  quantity           numeric(12,4) not null default 1 check (quantity > 0),
  cost               numeric(12,2) not null default 0,
  amount             numeric(12,2) not null default 0
);

create index if not exists purchase_return_items_purchase_return_id_idx
  on public.purchase_return_items(purchase_return_id);
create index if not exists purchase_return_items_company_id_idx
  on public.purchase_return_items(company_id);

alter table public.purchase_return_items enable row level security;

drop policy if exists "purchase_return_items_select" on public.purchase_return_items;
create policy "purchase_return_items_select" on public.purchase_return_items for select
  using (company_id = public.current_company_id());

drop policy if exists "purchase_return_items_insert" on public.purchase_return_items;
create policy "purchase_return_items_insert" on public.purchase_return_items for insert
  with check (company_id = public.current_company_id());

-- ── 5. Add credit_note_id FK to customer_transactions ───────
alter table public.customer_transactions
  add column if not exists credit_note_id uuid
  references public.credit_notes(id) on delete set null;

-- ── 6. Widen customer_transactions.type check constraint ─────
alter table public.customer_transactions
  drop constraint if exists customer_transactions_type_check;
alter table public.customer_transactions
  add constraint customer_transactions_type_check
  check (type in ('charge', 'payment', 'credit_note'));

-- ── 7. Updated customer_balances VIEW ───────────────────────
create or replace view public.customer_balances
with (security_invoker = true) as
select
  c.id as customer_id,
  c.owner_id,
  c.name,
  coalesce(sum(case when t.type = 'charge' then t.amount else 0 end), 0) as total_charged,
  coalesce(sum(case when t.type in ('payment', 'credit_note') then t.amount else 0 end), 0) as total_paid,
  coalesce(sum(case when t.type = 'charge' then t.amount else -t.amount end), 0) as balance,
  c.company_id
from public.customers c
left join public.customer_transactions t on t.customer_id = c.id
group by c.id, c.owner_id, c.name, c.company_id;

grant select on public.customer_balances to authenticated;

-- ── 8. Updated supplier_balances VIEW ───────────────────────
-- Must drop first — CREATE OR REPLACE cannot add new columns to an existing view.
drop view if exists public.supplier_balances;
create view public.supplier_balances
with (security_invoker = true) as
select
  s.id as supplier_id,
  s.owner_id,
  s.name,
  coalesce(billed.total, 0)   as total_billed,
  coalesce(paid.total, 0)     as total_paid,
  coalesce(returned.total, 0) as total_returned,
  coalesce(billed.total, 0) - coalesce(returned.total, 0) - coalesce(paid.total, 0) as balance,
  s.company_id
from public.suppliers s
left join (
  select supplier_id, sum(total_amount) as total
  from public.purchases
  where supplier_id is not null
  group by supplier_id
) billed on billed.supplier_id = s.id
left join (
  select supplier_id, sum(amount) as total
  from public.supplier_payments
  group by supplier_id
) paid on paid.supplier_id = s.id
left join (
  select supplier_id, sum(total_amount) as total
  from public.purchase_returns
  where supplier_id is not null
  group by supplier_id
) returned on returned.supplier_id = s.id;

grant select on public.supplier_balances to authenticated;

-- ── 9. Updated sale_balances VIEW ───────────────────────────
-- Include credit notes applied to specific sales in the paid amount
-- so the outstanding balance on an invoice reflects any credit notes raised.
create or replace view public.sale_balances
with (security_invoker = true) as
select
  s.id as sale_id,
  s.owner_id,
  s.customer_id,
  s.type,
  s.reference,
  s.sale_date,
  s.due_date,
  s.total_amount,
  coalesce(paid.total, 0) as paid_amount,
  s.total_amount - coalesce(paid.total, 0) as outstanding,
  s.company_id,
  c.name as customer_name
from public.sales s
left join public.customers c on c.id = s.customer_id
left join (
  select sale_id, sum(amount) as total
  from public.customer_transactions
  where type in ('payment', 'credit_note') and sale_id is not null
  group by sale_id
) paid on paid.sale_id = s.id;

grant select on public.sale_balances to authenticated;

-- ── 10. RPC: create_credit_note ─────────────────────────────
create or replace function public.create_credit_note(
  p_customer_id uuid,
  p_sale_id     uuid,
  p_reference   text,
  p_credit_date date,
  p_notes       text,
  p_items       jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_id   uuid := auth.uid();
  v_company_id uuid := public.current_company_id();
  v_cn_id      uuid;
  v_item       jsonb;
  v_total      numeric(12,2) := 0;
  v_reference  text := nullif(trim(coalesce(p_reference, '')), '');
  v_sr_coa     uuid;
  v_ar_coa     uuid;
begin
  if v_owner_id is null or v_company_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'A credit note needs at least one line item';
  end if;

  if p_customer_id is not null then
    if not exists (
      select 1 from public.customers
      where id = p_customer_id and company_id = v_company_id
    ) then
      raise exception 'Invalid customer';
    end if;
  end if;

  if p_sale_id is not null then
    if not exists (
      select 1 from public.sales
      where id = p_sale_id and company_id = v_company_id
    ) then
      raise exception 'Invalid sale';
    end if;
  end if;

  if v_reference is null then
    v_reference := public.next_sequence_code(v_company_id, 'credit_note', 'CN');
  end if;

  select coalesce(sum((item->>'amount')::numeric), 0)
  into v_total
  from jsonb_array_elements(p_items) as item;

  if v_total <= 0 then
    raise exception 'Credit note total must be greater than zero';
  end if;

  insert into public.credit_notes
    (owner_id, company_id, customer_id, sale_id, reference, credit_date, notes, total_amount)
  values
    (v_owner_id, v_company_id, p_customer_id, p_sale_id,
     v_reference, coalesce(p_credit_date, current_date), p_notes, v_total)
  returning id into v_cn_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    insert into public.credit_note_items
      (owner_id, company_id, credit_note_id, product_id, description, quantity, unit_price, amount)
    values (
      v_owner_id, v_company_id, v_cn_id,
      nullif(v_item->>'product_id', '')::uuid,
      v_item->>'description',
      coalesce((v_item->>'quantity')::numeric, 1),
      coalesce((v_item->>'unit_price')::numeric, 0),
      coalesce((v_item->>'amount')::numeric, 0)
    );
  end loop;

  if p_customer_id is not null then
    insert into public.customer_transactions
      (owner_id, company_id, customer_id, type, amount, note, sale_id, credit_note_id, auto_generated)
    values
      (v_owner_id, v_company_id, p_customer_id,
       'credit_note', v_total,
       'Credit Note ' || v_reference,
       p_sale_id, v_cn_id, true);
  end if;

  v_sr_coa := public.ensure_system_account('sales_returns', 'Sales Returns', 'expense', 'debit');
  v_ar_coa := public.ensure_system_account('accounts_receivable', 'Accounts Receivable', 'asset', 'debit');

  perform public.post_journal_entry(
    coalesce(p_credit_date, current_date),
    'Credit Note ' || v_reference,
    'credit_notes', v_cn_id,
    jsonb_build_array(
      jsonb_build_object('account_id', v_sr_coa, 'debit', v_total, 'credit', 0),
      jsonb_build_object('account_id', v_ar_coa, 'debit', 0,       'credit', v_total)
    )
  );

  return v_cn_id;
end;
$$;

grant execute on function public.create_credit_note(uuid, uuid, text, date, text, jsonb)
  to authenticated;

-- ── 11. RPC: delete_credit_note ─────────────────────────────
create or replace function public.delete_credit_note(p_credit_note_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_id   uuid := auth.uid();
  v_company_id uuid := public.current_company_id();
begin
  if v_owner_id is null or v_company_id is null then
    raise exception 'Not authenticated';
  end if;

  if not exists (
    select 1 from public.credit_notes
    where id = p_credit_note_id and company_id = v_company_id
  ) then
    raise exception 'Credit note not found';
  end if;

  delete from public.customer_transactions
  where credit_note_id = p_credit_note_id
    and auto_generated = true
    and company_id = v_company_id;

  perform public.reverse_journal_entries('credit_notes', p_credit_note_id);

  delete from public.credit_notes
  where id = p_credit_note_id and company_id = v_company_id;
end;
$$;

grant execute on function public.delete_credit_note(uuid) to authenticated;

-- ── 12. RPC: create_purchase_return ─────────────────────────
create or replace function public.create_purchase_return(
  p_supplier_id uuid,
  p_purchase_id uuid,
  p_reference   text,
  p_return_date date,
  p_notes       text,
  p_items       jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_id    uuid := auth.uid();
  v_company_id  uuid := public.current_company_id();
  v_pr_id       uuid;
  v_item        jsonb;
  v_total       numeric(12,2) := 0;
  v_reference   text := nullif(trim(coalesce(p_reference, '')), '');
  v_ap_coa      uuid;
  v_inv_coa     uuid;
  v_product_qty numeric;
  v_product_name text;
begin
  if v_owner_id is null or v_company_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'A purchase return needs at least one line item';
  end if;

  if p_supplier_id is not null then
    if not exists (
      select 1 from public.suppliers
      where id = p_supplier_id and company_id = v_company_id
    ) then
      raise exception 'Invalid supplier';
    end if;
  end if;

  if p_purchase_id is not null then
    if not exists (
      select 1 from public.purchases
      where id = p_purchase_id and company_id = v_company_id
    ) then
      raise exception 'Invalid purchase';
    end if;
  end if;

  -- Pre-validate stock for all items
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    select stock_quantity, name
    into v_product_qty, v_product_name
    from public.products
    where id = (v_item->>'product_id')::uuid
      and company_id = v_company_id;

    if v_product_qty is null then
      raise exception 'Invalid product on this return';
    end if;

    if v_product_qty < (v_item->>'quantity')::numeric then
      raise exception 'Cannot return % units of % — only % in stock',
        (v_item->>'quantity')::numeric, v_product_name, v_product_qty;
    end if;
  end loop;

  if v_reference is null then
    v_reference := public.next_sequence_code(v_company_id, 'purchase_return', 'PR');
  end if;

  select coalesce(sum((item->>'amount')::numeric), 0)
  into v_total
  from jsonb_array_elements(p_items) as item;

  if v_total <= 0 then
    raise exception 'Purchase return total must be greater than zero';
  end if;

  insert into public.purchase_returns
    (owner_id, company_id, supplier_id, purchase_id, reference, return_date, notes, total_amount)
  values
    (v_owner_id, v_company_id, p_supplier_id, p_purchase_id,
     v_reference, coalesce(p_return_date, current_date), p_notes, v_total)
  returning id into v_pr_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    insert into public.purchase_return_items
      (owner_id, company_id, purchase_return_id, product_id, quantity, cost, amount)
    values (
      v_owner_id, v_company_id, v_pr_id,
      (v_item->>'product_id')::uuid,
      coalesce((v_item->>'quantity')::numeric, 1),
      coalesce((v_item->>'cost')::numeric, 0),
      coalesce((v_item->>'amount')::numeric, 0)
    );

    update public.products
    set stock_quantity = stock_quantity - (v_item->>'quantity')::numeric
    where id = (v_item->>'product_id')::uuid
      and company_id = v_company_id;
  end loop;

  v_ap_coa  := public.ensure_system_account('accounts_payable', 'Accounts Payable', 'liability', 'credit');
  v_inv_coa := public.ensure_system_account('inventory', 'Inventory', 'asset', 'debit');

  perform public.post_journal_entry(
    coalesce(p_return_date, current_date),
    'Purchase Return ' || v_reference,
    'purchase_returns', v_pr_id,
    jsonb_build_array(
      jsonb_build_object('account_id', v_ap_coa,  'debit', v_total, 'credit', 0),
      jsonb_build_object('account_id', v_inv_coa, 'debit', 0,       'credit', v_total)
    )
  );

  return v_pr_id;
end;
$$;

grant execute on function public.create_purchase_return(uuid, uuid, text, date, text, jsonb)
  to authenticated;

-- ── 13. RPC: delete_purchase_return ─────────────────────────
create or replace function public.delete_purchase_return(p_purchase_return_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_id   uuid := auth.uid();
  v_company_id uuid := public.current_company_id();
  v_old_item   record;
begin
  if v_owner_id is null or v_company_id is null then
    raise exception 'Not authenticated';
  end if;

  if not exists (
    select 1 from public.purchase_returns
    where id = p_purchase_return_id and company_id = v_company_id
  ) then
    raise exception 'Purchase return not found';
  end if;

  -- Restore stock for each returned item
  for v_old_item in
    select product_id, quantity
    from public.purchase_return_items
    where purchase_return_id = p_purchase_return_id
  loop
    update public.products
    set stock_quantity = stock_quantity + v_old_item.quantity
    where id = v_old_item.product_id and company_id = v_company_id;
  end loop;

  perform public.reverse_journal_entries('purchase_returns', p_purchase_return_id);

  delete from public.purchase_returns
  where id = p_purchase_return_id and company_id = v_company_id;
end;
$$;

grant execute on function public.delete_purchase_return(uuid) to authenticated;
