-- ============================================================
-- BossBooks: Credit Note — Full System Updates
-- Run this AFTER receipt_sales_return.sql.
--
-- Fixes three gaps that existed in create_credit_note:
--   1. Stock quantity was not restored when goods are returned
--   2. COGS was not reversed (inventory value not restored)
--   3. Receipt refunds did not appear in account register
-- ============================================================

-- ── 1. Add credit_note_id to account_transactions ────────────
-- Lets us find and delete the refund entry when a credit note is deleted.
alter table public.account_transactions
  add column if not exists credit_note_id uuid
  references public.credit_notes(id) on delete set null;

create index if not exists account_transactions_credit_note_id_idx
  on public.account_transactions(credit_note_id);

-- ── 2. create_credit_note — full replacement ──────────────────
-- Combines IMEI tracking + receipt journal routing + stock restore + COGS reversal
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
  v_owner_id        uuid := auth.uid();
  v_company_id      uuid := public.current_company_id();
  v_cn_id           uuid;
  v_item            jsonb;
  v_total           numeric(12,2) := 0;
  v_cogs_total      numeric(12,2) := 0;
  v_reference       text := nullif(trim(coalesce(p_reference, '')), '');
  v_sr_coa          uuid;
  v_ar_coa          uuid;
  v_cash_coa        uuid;
  v_inventory_coa   uuid;
  v_cogs_coa        uuid;
  v_sale_type       text;
  v_sale_deposit_id uuid;
  v_unit_id         uuid;
  v_unit_serial     text;
  v_unit_product    uuid;
  v_unit_sale       uuid;
  v_product_cost    numeric(12,2);
  v_journal_lines   jsonb;
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

    select type, deposit_account_id
    into v_sale_type, v_sale_deposit_id
    from public.sales
    where id = p_sale_id and company_id = v_company_id;
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

    -- Restore stock quantity for the returned product
    if (v_item->>'product_id') is not null and (v_item->>'product_id') <> '' then
      select cost into v_product_cost
      from public.products
      where id = (v_item->>'product_id')::uuid and company_id = v_company_id;

      update public.products
      set stock_quantity = stock_quantity + (v_item->>'quantity')::numeric
      where id = (v_item->>'product_id')::uuid and company_id = v_company_id;

      -- Accumulate COGS for the returned goods
      v_cogs_total := v_cogs_total + coalesce(v_product_cost, 0) * (v_item->>'quantity')::numeric;
    end if;

    -- Update IMEI unit statuses
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

  -- Customer transaction: records the credit on the customer's ledger
  if p_customer_id is not null then
    insert into public.customer_transactions
      (owner_id, company_id, customer_id, type, amount, note, sale_id, credit_note_id, auto_generated)
    values
      (v_owner_id, v_company_id, p_customer_id,
       'credit_note', v_total, 'Credit Note ' || v_reference,
       p_sale_id, v_cn_id, true);
  end if;

  -- For receipt-based returns: record the refund in the account register
  if v_sale_type = 'receipt' and v_sale_deposit_id is not null then
    insert into public.account_transactions
      (owner_id, company_id, account_id, type, amount, note, credit_note_id)
    values
      (v_owner_id, v_company_id, v_sale_deposit_id,
       'withdrawal', v_total,
       'Refund · Credit Note ' || v_reference,
       v_cn_id);
  end if;

  -- ── Journal entry ─────────────────────────────────────────
  v_sr_coa := public.ensure_system_account('sales_returns', 'Sales Returns', 'expense', 'debit');
  v_journal_lines := '[]'::jsonb;

  -- DR Sales Returns (returned goods reduce net revenue)
  v_journal_lines := v_journal_lines || jsonb_build_array(
    jsonb_build_object('account_id', v_sr_coa, 'debit', v_total, 'credit', 0)
  );

  -- CR Cash/Bank (receipt) or CR Accounts Receivable (invoice)
  if v_sale_type = 'receipt' then
    if v_sale_deposit_id is not null then
      v_cash_coa := public.ensure_account_coa_row(v_sale_deposit_id);
    else
      v_cash_coa := public.ensure_system_account('undeposited_funds', 'Undeposited Funds', 'asset', 'debit');
    end if;
    v_journal_lines := v_journal_lines || jsonb_build_array(
      jsonb_build_object('account_id', v_cash_coa, 'debit', 0, 'credit', v_total)
    );
  else
    v_ar_coa := public.ensure_system_account('accounts_receivable', 'Accounts Receivable', 'asset', 'debit');
    v_journal_lines := v_journal_lines || jsonb_build_array(
      jsonb_build_object('account_id', v_ar_coa, 'debit', 0, 'credit', v_total)
    );
  end if;

  -- DR Inventory / CR COGS — goods are back in stock, reverse the original COGS
  if v_cogs_total > 0 then
    v_inventory_coa := public.ensure_system_account('inventory', 'Inventory', 'asset', 'debit');
    v_cogs_coa      := public.ensure_system_account('cogs', 'Cost of Goods Sold', 'expense', 'debit');
    v_journal_lines := v_journal_lines || jsonb_build_array(
      jsonb_build_object('account_id', v_inventory_coa, 'debit', v_cogs_total, 'credit', 0),
      jsonb_build_object('account_id', v_cogs_coa,      'debit', 0, 'credit', v_cogs_total)
    );
  end if;

  perform public.post_journal_entry(
    coalesce(p_credit_date, current_date),
    'Credit Note ' || v_reference,
    'credit_notes', v_cn_id,
    v_journal_lines
  );

  return v_cn_id;
end;
$$;

grant execute on function public.create_credit_note(uuid, uuid, text, date, text, jsonb) to authenticated;

-- ── 3. delete_credit_note — full replacement ──────────────────
-- Reverses all system updates made by create_credit_note
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
  v_item_record record;
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

  -- Restore IMEI units back to 'sold' and log the reversal event
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

  -- Reverse stock quantity: goods go back out of stock
  for v_item_record in
    select product_id, quantity
    from public.credit_note_items
    where credit_note_id = p_credit_note_id
      and product_id is not null
  loop
    update public.products
    set stock_quantity = stock_quantity - v_item_record.quantity
    where id = v_item_record.product_id and company_id = v_company_id;
  end loop;

  -- Remove the refund entry from the account register (receipt returns only)
  delete from public.account_transactions
  where credit_note_id = p_credit_note_id and company_id = v_company_id;

  -- Remove the credit from the customer's ledger
  delete from public.customer_transactions
  where credit_note_id = p_credit_note_id
    and auto_generated = true
    and company_id = v_company_id;

  -- Reverse journal entries (handles both invoice AR and receipt Cash/Bank + COGS reversal)
  perform public.reverse_journal_entries('credit_notes', p_credit_note_id);

  delete from public.credit_notes
  where id = p_credit_note_id and company_id = v_company_id;
end;
$$;

grant execute on function public.delete_credit_note(uuid) to authenticated;
