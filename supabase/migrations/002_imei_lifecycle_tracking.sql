-- ============================================================
-- BossBooks: IMEI Lifecycle Tracking
-- Run this once in the Supabase SQL Editor.
-- ============================================================

-- ── 1. Drop the unique constraint that blocks IMEI repurchase ──
-- Allows the same IMEI/serial to be purchased again after being
-- returned to supplier. Business logic controls active state.
alter table public.product_units
  drop constraint if exists product_units_company_serial_key;

-- ── 2. product_unit_events: immutable history log ────────────
create table if not exists public.product_unit_events (
  id               uuid primary key default gen_random_uuid(),
  company_id       uuid not null references public.companies(id) on delete cascade,
  owner_id         uuid not null references auth.users(id) on delete cascade,
  product_unit_id  uuid references public.product_units(id) on delete set null,
  serial_number    text not null,
  product_id       uuid references public.products(id) on delete set null,
  event_type       text not null,
  -- Values: 'purchased' | 'sold' | 'customer_return' | 'returned_to_supplier'
  --         | 'customer_return_reversed' | 'return_to_supplier_reversed'
  source_table     text,
  source_id        uuid,
  source_reference text,
  customer_id      uuid references public.customers(id) on delete set null,
  supplier_id      uuid references public.suppliers(id) on delete set null,
  previous_status  text,
  new_status       text not null,
  notes            text,
  created_at       timestamptz not null default now()
);

create index if not exists pue_company_serial_idx  on public.product_unit_events(company_id, serial_number);
create index if not exists pue_company_type_idx    on public.product_unit_events(company_id, event_type);
create index if not exists pue_source_id_idx       on public.product_unit_events(source_id);
create index if not exists pue_product_unit_id_idx on public.product_unit_events(product_unit_id);

alter table public.product_unit_events enable row level security;

drop policy if exists "pue_select" on public.product_unit_events;
create policy "pue_select" on public.product_unit_events for select
  using (company_id = public.current_company_id());

drop policy if exists "pue_insert" on public.product_unit_events;
create policy "pue_insert" on public.product_unit_events for insert
  with check (company_id = public.current_company_id());

grant select, insert on public.product_unit_events to authenticated;

-- ── 3. product_unit_current_status view ──────────────────────
-- Shows the most recent product_unit row per (company, serial).
-- When same IMEI is repurchased, only the latest lifecycle state is shown.
create or replace view public.product_unit_current_status
with (security_invoker = true) as
select distinct on (company_id, serial_number)
  id, company_id, serial_number, product_id, status,
  purchase_id, sale_id, created_at
from public.product_units
order by company_id, serial_number, created_at desc;

grant select on public.product_unit_current_status to authenticated;

-- ── 4. create_purchase: add event logging per serial ─────────
create or replace function public.create_purchase(
  p_supplier_id uuid,
  p_reference   text,
  p_notes       text,
  p_items       jsonb,
  p_bill_date   date default current_date,
  p_due_date    date default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_id        uuid := auth.uid();
  v_company_id      uuid := public.current_company_id();
  v_purchase_id     uuid;
  v_item            jsonb;
  v_total           numeric(12,2) := 0;
  v_serial          text;
  v_unit_id         uuid;
  v_product_company uuid;
  v_inventory_coa   uuid;
  v_ap_coa          uuid;
  v_reference       text := nullif(trim(coalesce(p_reference, '')), '');
begin
  if v_owner_id is null or v_company_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'A bill needs at least one line item';
  end if;

  if v_reference is null then
    v_reference := public.next_sequence_code(v_company_id, 'purchase', 'B');
  end if;

  select coalesce(sum((item->>'quantity')::int * (item->>'unit_cost')::numeric), 0)
  into v_total
  from jsonb_array_elements(p_items) as item;

  insert into public.purchases (owner_id, company_id, supplier_id, reference, notes, total_amount, bill_date, due_date)
  values (v_owner_id, v_company_id, p_supplier_id, v_reference, p_notes, v_total, coalesce(p_bill_date, current_date), p_due_date)
  returning id into v_purchase_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    select company_id into v_product_company
    from public.products
    where id = (v_item->>'product_id')::uuid;

    if v_product_company is null or v_product_company <> v_company_id then
      raise exception 'Invalid product on this bill';
    end if;

    insert into public.purchase_items (owner_id, company_id, purchase_id, product_id, quantity, unit_cost, subtotal)
    values (
      v_owner_id, v_company_id, v_purchase_id,
      (v_item->>'product_id')::uuid,
      (v_item->>'quantity')::int,
      (v_item->>'unit_cost')::numeric,
      (v_item->>'quantity')::int * (v_item->>'unit_cost')::numeric
    );

    update public.products
    set stock_quantity = stock_quantity + (v_item->>'quantity')::int,
        cost = (v_item->>'unit_cost')::numeric
    where id = (v_item->>'product_id')::uuid;

    if (v_item ? 'serials') then
      for v_serial in select jsonb_array_elements_text(v_item->'serials')
      loop
        insert into public.product_units
          (owner_id, company_id, product_id, purchase_id, serial_number, status)
        values
          (v_owner_id, v_company_id, (v_item->>'product_id')::uuid, v_purchase_id, v_serial, 'in_stock')
        returning id into v_unit_id;

        insert into public.product_unit_events (
          company_id, owner_id, product_unit_id, serial_number,
          product_id, event_type, source_table, source_id, source_reference,
          supplier_id, previous_status, new_status
        ) values (
          v_company_id, v_owner_id, v_unit_id, v_serial,
          (v_item->>'product_id')::uuid, 'purchased', 'purchases', v_purchase_id, v_reference,
          p_supplier_id, null, 'in_stock'
        );
      end loop;
    end if;
  end loop;

  if v_total > 0 then
    v_inventory_coa := public.ensure_system_account('inventory', 'Inventory', 'asset', 'debit');
    v_ap_coa := public.ensure_system_account('accounts_payable', 'Accounts Payable', 'liability', 'credit');
    perform public.post_journal_entry(
      coalesce(p_bill_date, current_date), 'Bill ' || v_reference, 'purchases', v_purchase_id,
      jsonb_build_array(
        jsonb_build_object('account_id', v_inventory_coa, 'debit', v_total, 'credit', 0),
        jsonb_build_object('account_id', v_ap_coa, 'debit', 0, 'credit', v_total)
      )
    );
  end if;

  return v_purchase_id;
end;
$$;

grant execute on function public.create_purchase(uuid, text, text, jsonb, date, date) to authenticated;

-- ── 5. create_sale: add event logging per sold unit ──────────
create or replace function public.create_sale(
  p_customer_id        uuid,
  p_type               text,
  p_reference          text,
  p_notes              text,
  p_sale_date          date,
  p_due_date           date,
  p_deposit_account_id uuid,
  p_items              jsonb,
  p_sales_rep_id       uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_id        uuid := auth.uid();
  v_company_id      uuid := public.current_company_id();
  v_sale_id         uuid;
  v_item            jsonb;
  v_total           numeric(12,2) := 0;
  v_unit_id         uuid;
  v_product_id      uuid;
  v_product_company uuid;
  v_stock           integer;
  v_tracks_serial   boolean;
  v_account_company uuid;
  v_rep_company     uuid;
  v_product_cost    numeric(12,2);
  v_cogs            numeric(12,2) := 0;
  v_ar_coa          uuid;
  v_revenue_coa     uuid;
  v_cogs_coa        uuid;
  v_inventory_coa   uuid;
  v_cash_coa        uuid;
  v_lines           jsonb;
  v_reference       text := nullif(trim(coalesce(p_reference, '')), '');
  v_unit_serial     text;
begin
  if v_owner_id is null or v_company_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_type not in ('invoice', 'receipt') then
    raise exception 'Invalid sale type';
  end if;

  if p_sales_rep_id is not null then
    select company_id into v_rep_company from public.sales_reps where id = p_sales_rep_id;
    if v_rep_company is null or v_rep_company <> v_company_id then
      raise exception 'Invalid sales rep';
    end if;
  end if;

  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'A sale needs at least one line item';
  end if;

  if p_type = 'receipt' and p_deposit_account_id is not null then
    select company_id into v_account_company from public.accounts where id = p_deposit_account_id;
    if v_account_company is null or v_account_company <> v_company_id then
      raise exception 'Invalid deposit account';
    end if;
  end if;

  if v_reference is null then
    v_reference := public.next_sequence_code(
      v_company_id, p_type, case when p_type = 'invoice' then 'S' else 'R' end
    );
  end if;

  select coalesce(sum((item->>'quantity')::int * (item->>'unit_price')::numeric), 0)
  into v_total
  from jsonb_array_elements(p_items) as item;

  insert into public.sales (owner_id, company_id, customer_id, type, reference, notes, sale_date, due_date, deposit_account_id, total_amount, sales_rep_id)
  values (
    v_owner_id, v_company_id, p_customer_id, p_type, v_reference, p_notes,
    coalesce(p_sale_date, current_date), p_due_date, p_deposit_account_id, v_total, p_sales_rep_id
  )
  returning id into v_sale_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_product_id := (v_item->>'product_id')::uuid;

    select company_id, stock_quantity, tracks_serial, cost
    into v_product_company, v_stock, v_tracks_serial, v_product_cost
    from public.products
    where id = v_product_id;

    if v_product_company is null or v_product_company <> v_company_id then
      raise exception 'Invalid product on this sale';
    end if;

    if v_stock < (v_item->>'quantity')::int then
      raise exception 'Not enough stock for one of the products on this sale';
    end if;

    insert into public.sale_items (owner_id, company_id, sale_id, product_id, quantity, unit_price, subtotal, unit_cost)
    values (
      v_owner_id, v_company_id, v_sale_id, v_product_id,
      (v_item->>'quantity')::int,
      (v_item->>'unit_price')::numeric,
      (v_item->>'quantity')::int * (v_item->>'unit_price')::numeric,
      v_product_cost
    );

    v_cogs := v_cogs + (v_item->>'quantity')::int * coalesce(v_product_cost, 0);

    update public.products
    set stock_quantity = stock_quantity - (v_item->>'quantity')::int
    where id = v_product_id;

    if v_tracks_serial and (v_item ? 'unit_ids') then
      for v_unit_id in select (jsonb_array_elements_text(v_item->'unit_ids'))::uuid
      loop
        update public.product_units
        set status = 'sold', sale_id = v_sale_id
        where id = v_unit_id
          and company_id = v_company_id
          and product_id = v_product_id
          and status = 'in_stock';

        if not found then
          raise exception 'One of the selected serial/IMEI units is no longer in stock';
        end if;

        select serial_number into v_unit_serial
        from public.product_units where id = v_unit_id;

        insert into public.product_unit_events (
          company_id, owner_id, product_unit_id, serial_number,
          product_id, event_type, source_table, source_id, source_reference,
          customer_id, previous_status, new_status
        ) values (
          v_company_id, v_owner_id, v_unit_id, v_unit_serial,
          v_product_id, 'sold', 'sales', v_sale_id, v_reference,
          p_customer_id, 'in_stock', 'sold'
        );
      end loop;
    end if;
  end loop;

  if p_customer_id is not null then
    if p_type = 'invoice' then
      insert into public.customer_transactions (owner_id, company_id, customer_id, type, amount, note, sale_id, auto_generated)
      values (v_owner_id, v_company_id, p_customer_id, 'charge', v_total, 'Invoice ' || v_reference, v_sale_id, true);
    elsif p_type = 'receipt' then
      insert into public.customer_transactions (owner_id, company_id, customer_id, type, amount, note, sale_id, auto_generated)
      values (v_owner_id, v_company_id, p_customer_id, 'charge', v_total, 'Sale receipt ' || v_reference, v_sale_id, true);
      insert into public.customer_transactions (owner_id, company_id, customer_id, type, amount, note, sale_id, auto_generated)
      values (v_owner_id, v_company_id, p_customer_id, 'payment', v_total, 'Paid in full at time of sale', v_sale_id, true);
    end if;
  end if;

  if p_type = 'receipt' and p_deposit_account_id is not null then
    insert into public.account_transactions (owner_id, company_id, account_id, type, amount, note, sale_id)
    values (v_owner_id, v_company_id, p_deposit_account_id, 'deposit', v_total, 'Sale receipt ' || v_reference, v_sale_id);
  end if;

  if v_total > 0 then
    v_revenue_coa := public.ensure_system_account('sales_revenue', 'Sales Revenue', 'income', 'credit');
    v_lines := '[]'::jsonb;

    if p_type = 'invoice' then
      v_ar_coa := public.ensure_system_account('accounts_receivable', 'Accounts Receivable', 'asset', 'debit');
      v_lines := v_lines || jsonb_build_array(
        jsonb_build_object('account_id', v_ar_coa, 'debit', v_total, 'credit', 0)
      );
    else
      if p_deposit_account_id is not null then
        v_cash_coa := public.ensure_account_coa_row(p_deposit_account_id);
      else
        v_cash_coa := public.ensure_system_account('undeposited_funds', 'Undeposited Funds', 'asset', 'debit');
      end if;
      v_lines := v_lines || jsonb_build_array(
        jsonb_build_object('account_id', v_cash_coa, 'debit', v_total, 'credit', 0)
      );
    end if;

    v_lines := v_lines || jsonb_build_array(
      jsonb_build_object('account_id', v_revenue_coa, 'debit', 0, 'credit', v_total)
    );

    if v_cogs > 0 then
      v_cogs_coa      := public.ensure_system_account('cogs', 'Cost of Goods Sold', 'expense', 'debit');
      v_inventory_coa := public.ensure_system_account('inventory', 'Inventory', 'asset', 'debit');
      v_lines := v_lines || jsonb_build_array(
        jsonb_build_object('account_id', v_cogs_coa,      'debit', v_cogs, 'credit', 0),
        jsonb_build_object('account_id', v_inventory_coa, 'debit', 0,      'credit', v_cogs)
      );
    end if;

    perform public.post_journal_entry(
      coalesce(p_sale_date, current_date),
      (case when p_type = 'invoice' then 'Invoice ' else 'Sale receipt ' end) || v_reference,
      'sales', v_sale_id, v_lines
    );
  end if;

  return v_sale_id;
end;
$$;

grant execute on function public.create_sale(uuid, text, text, text, date, date, uuid, jsonb, uuid) to authenticated;

-- ── 6. delete_sale: only reset 'sold' units, leave returned ones ──
create or replace function public.delete_sale(p_sale_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_id    uuid := auth.uid();
  v_company_id  uuid := public.current_company_id();
  v_old_company uuid;
  v_old_item    record;
begin
  if v_owner_id is null or v_company_id is null then
    raise exception 'Not authenticated';
  end if;

  select company_id into v_old_company from public.sales where id = p_sale_id;
  if v_old_company is null or v_old_company <> v_company_id then
    raise exception 'Invalid sale';
  end if;

  for v_old_item in select product_id, quantity from public.sale_items where sale_id = p_sale_id
  loop
    update public.products
    set stock_quantity = stock_quantity + v_old_item.quantity
    where id = v_old_item.product_id;
  end loop;

  -- Only reset units still in 'sold' status — leave 'returned_by_customer' units unchanged
  update public.product_units
  set status = 'in_stock', sale_id = null
  where sale_id = p_sale_id and status = 'sold';

  delete from public.account_transactions where sale_id = p_sale_id;
  delete from public.customer_transactions where sale_id = p_sale_id and auto_generated = true;
  delete from public.sale_items where sale_id = p_sale_id;
  delete from public.sales where id = p_sale_id;
  perform public.reverse_journal_entries('sales', p_sale_id);
end;
$$;

grant execute on function public.delete_sale(uuid) to authenticated;

-- ── 7. create_credit_note: add IMEI unit tracking ────────────
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
  v_owner_id     uuid := auth.uid();
  v_company_id   uuid := public.current_company_id();
  v_cn_id        uuid;
  v_item         jsonb;
  v_total        numeric(12,2) := 0;
  v_reference    text := nullif(trim(coalesce(p_reference, '')), '');
  v_sr_coa       uuid;
  v_ar_coa       uuid;
  v_unit_id      uuid;
  v_unit_serial  text;
  v_unit_product uuid;
  v_unit_sale    uuid;
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

  -- Pre-validate IMEI units before any writes
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    if v_item ? 'unit_ids' then
      for v_unit_id in select (jsonb_array_elements_text(v_item->'unit_ids'))::uuid
      loop
        select serial_number, product_id, sale_id
        into v_unit_serial, v_unit_product, v_unit_sale
        from public.product_units
        where id = v_unit_id and company_id = v_company_id and status = 'sold';

        if v_unit_serial is null then
          raise exception 'An IMEI unit is not available to return (not found or not sold)';
        end if;

        if p_sale_id is not null and v_unit_sale <> p_sale_id then
          raise exception 'IMEI % was not sold on the selected invoice', v_unit_serial;
        end if;
      end loop;
    end if;
  end loop;

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

    if v_item ? 'unit_ids' then
      for v_unit_id in select (jsonb_array_elements_text(v_item->'unit_ids'))::uuid
      loop
        select serial_number, product_id
        into v_unit_serial, v_unit_product
        from public.product_units
        where id = v_unit_id and company_id = v_company_id;

        update public.product_units
        set status = 'returned_by_customer'
        where id = v_unit_id
          and company_id = v_company_id
          and status = 'sold';

        insert into public.product_unit_events (
          company_id, owner_id, product_unit_id, serial_number,
          product_id, event_type, source_table, source_id, source_reference,
          customer_id, previous_status, new_status
        ) values (
          v_company_id, v_owner_id, v_unit_id, v_unit_serial,
          v_unit_product, 'customer_return', 'credit_notes', v_cn_id, v_reference,
          p_customer_id, 'sold', 'returned_by_customer'
        );
      end loop;
    end if;
  end loop;

  if p_customer_id is not null then
    insert into public.customer_transactions
      (owner_id, company_id, customer_id, type, amount, note, sale_id, credit_note_id, auto_generated)
    values
      (v_owner_id, v_company_id, p_customer_id,
       'credit_note', v_total, 'Credit Note ' || v_reference,
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

grant execute on function public.create_credit_note(uuid, uuid, text, date, text, jsonb) to authenticated;

-- ── 8. delete_credit_note: restore IMEI unit statuses ────────
create or replace function public.delete_credit_note(p_credit_note_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_id    uuid := auth.uid();
  v_company_id  uuid := public.current_company_id();
  v_unit_record record;
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

  -- Restore IMEI units back to 'sold' (reverse the return)
  for v_unit_record in
    select product_unit_id, serial_number, product_id
    from public.product_unit_events
    where source_id = p_credit_note_id
      and event_type = 'customer_return'
      and company_id = v_company_id
      and product_unit_id is not null
  loop
    update public.product_units
    set status = 'sold'
    where id = v_unit_record.product_unit_id
      and company_id = v_company_id
      and status = 'returned_by_customer';

    insert into public.product_unit_events (
      company_id, owner_id, product_unit_id, serial_number,
      product_id, event_type, source_table, source_id,
      previous_status, new_status, notes
    ) values (
      v_company_id, v_owner_id, v_unit_record.product_unit_id, v_unit_record.serial_number,
      v_unit_record.product_id, 'customer_return_reversed', 'credit_notes', p_credit_note_id,
      'returned_by_customer', 'sold', 'Credit note deleted'
    );
  end loop;

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

-- ── 9. create_purchase_return: add IMEI unit tracking ────────
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
  v_owner_id      uuid := auth.uid();
  v_company_id    uuid := public.current_company_id();
  v_pr_id         uuid;
  v_item          jsonb;
  v_total         numeric(12,2) := 0;
  v_reference     text := nullif(trim(coalesce(p_reference, '')), '');
  v_ap_coa        uuid;
  v_inv_coa       uuid;
  v_product_qty   numeric;
  v_product_name  text;
  v_unit_id       uuid;
  v_unit_serial   text;
  v_unit_product  uuid;
  v_unit_purchase uuid;
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

  -- Pre-validate all items before any writes
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    if v_item ? 'unit_ids' and jsonb_array_length(v_item->'unit_ids') > 0 then
      -- IMEI product: validate each unit is in_stock and belongs to this purchase
      for v_unit_id in select (jsonb_array_elements_text(v_item->'unit_ids'))::uuid
      loop
        select serial_number, product_id, purchase_id
        into v_unit_serial, v_unit_product, v_unit_purchase
        from public.product_units
        where id = v_unit_id
          and company_id = v_company_id
          and status = 'in_stock';

        if v_unit_serial is null then
          raise exception 'An IMEI unit is not available to return (not found or not in stock)';
        end if;

        if p_purchase_id is not null and v_unit_purchase <> p_purchase_id then
          raise exception 'IMEI % was not purchased on the selected bill', v_unit_serial;
        end if;
      end loop;
    else
      -- Non-IMEI product: validate aggregate stock
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

    if v_item ? 'unit_ids' then
      for v_unit_id in select (jsonb_array_elements_text(v_item->'unit_ids'))::uuid
      loop
        select serial_number, product_id
        into v_unit_serial, v_unit_product
        from public.product_units
        where id = v_unit_id and company_id = v_company_id;

        update public.product_units
        set status = 'returned_to_supplier'
        where id = v_unit_id
          and company_id = v_company_id
          and status = 'in_stock';

        insert into public.product_unit_events (
          company_id, owner_id, product_unit_id, serial_number,
          product_id, event_type, source_table, source_id, source_reference,
          supplier_id, previous_status, new_status
        ) values (
          v_company_id, v_owner_id, v_unit_id, v_unit_serial,
          v_unit_product, 'returned_to_supplier', 'purchase_returns', v_pr_id, v_reference,
          p_supplier_id, 'in_stock', 'returned_to_supplier'
        );
      end loop;
    end if;
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

grant execute on function public.create_purchase_return(uuid, uuid, text, date, text, jsonb) to authenticated;

-- ── 10. delete_purchase_return: restore IMEI unit statuses ───
create or replace function public.delete_purchase_return(p_purchase_return_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_id    uuid := auth.uid();
  v_company_id  uuid := public.current_company_id();
  v_old_item    record;
  v_unit_record record;
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

  -- Restore IMEI units back to 'in_stock' (reverse the return to supplier)
  for v_unit_record in
    select product_unit_id, serial_number, product_id
    from public.product_unit_events
    where source_id = p_purchase_return_id
      and event_type = 'returned_to_supplier'
      and company_id = v_company_id
      and product_unit_id is not null
  loop
    update public.product_units
    set status = 'in_stock'
    where id = v_unit_record.product_unit_id
      and company_id = v_company_id
      and status = 'returned_to_supplier';

    insert into public.product_unit_events (
      company_id, owner_id, product_unit_id, serial_number,
      product_id, event_type, source_table, source_id,
      previous_status, new_status, notes
    ) values (
      v_company_id, v_owner_id, v_unit_record.product_unit_id, v_unit_record.serial_number,
      v_unit_record.product_id, 'return_to_supplier_reversed', 'purchase_returns', p_purchase_return_id,
      'returned_to_supplier', 'in_stock', 'Purchase return deleted'
    );
  end loop;

  -- Restore aggregate stock for each item
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
