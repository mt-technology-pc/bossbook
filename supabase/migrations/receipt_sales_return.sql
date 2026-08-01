-- ============================================================
-- BossBooks: Receipt-based Sales Returns
-- Run this AFTER imei_lifecycle_tracking.sql.
-- Updates create_credit_note to journal correctly for receipts:
--   Invoice return → DR Sales Returns / CR Accounts Receivable
--   Receipt return → DR Sales Returns / CR Cash/Bank account
-- ============================================================

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
  v_reference       text := nullif(trim(coalesce(p_reference, '')), '');
  v_sr_coa          uuid;
  v_ar_coa          uuid;
  v_cash_coa        uuid;
  v_sale_type       text;
  v_sale_deposit_id uuid;
  v_unit_id         uuid;
  v_unit_serial     text;
  v_unit_product    uuid;
  v_unit_sale       uuid;
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

    -- Look up the sale type and deposit account for correct journal routing
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

  -- Journal entry: route to correct contra account based on original sale type
  v_sr_coa := public.ensure_system_account('sales_returns', 'Sales Returns', 'expense', 'debit');

  if v_sale_type = 'receipt' then
    -- Receipt return → credit the original cash/bank account
    if v_sale_deposit_id is not null then
      v_cash_coa := public.ensure_account_coa_row(v_sale_deposit_id);
    else
      v_cash_coa := public.ensure_system_account('undeposited_funds', 'Undeposited Funds', 'asset', 'debit');
    end if;
    perform public.post_journal_entry(
      coalesce(p_credit_date, current_date),
      'Credit Note ' || v_reference,
      'credit_notes', v_cn_id,
      jsonb_build_array(
        jsonb_build_object('account_id', v_sr_coa,   'debit', v_total, 'credit', 0),
        jsonb_build_object('account_id', v_cash_coa, 'debit', 0,       'credit', v_total)
      )
    );
  else
    -- Invoice return (or standalone credit note) → credit AR
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
  end if;

  return v_cn_id;
end;
$$;

grant execute on function public.create_credit_note(uuid, uuid, text, date, text, jsonb) to authenticated;
