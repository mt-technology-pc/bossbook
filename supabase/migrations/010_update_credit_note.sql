-- ============================================================
-- BossBooks: Add update_credit_note — true in-place edit for a
-- credit note (same id kept throughout), mirroring update_sale's
-- reverse-old-effects-then-reapply-new-effects pattern rather than
-- a delete+recreate. Run once in the Supabase SQL Editor, AFTER 006.
-- ============================================================

create or replace function public.update_credit_note(
  p_credit_note_id uuid,
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
  v_old_company     uuid;
  v_item            jsonb;
  v_total           numeric(12,2) := 0;
  v_cogs_total      numeric(12,2) := 0;
  v_reference       text;
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
  v_product_cost    numeric(12,2);
  v_journal_lines   jsonb;
  v_unit_record     record;
  v_item_record     record;
  v_sold_qty        numeric;
  v_already_cred    numeric;
begin
  if v_owner_id is null or v_company_id is null then
    raise exception 'Not authenticated';
  end if;

  select company_id into v_old_company from public.credit_notes where id = p_credit_note_id;
  if v_old_company is null or v_old_company <> v_company_id then
    raise exception 'Invalid credit note';
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

  -- ── Reverse old effects (same as delete_credit_note, minus the
  -- final row deletes — this credit note is kept and updated in
  -- place, not dropped) ──────────────────────────────────────────

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
      'returned_by_customer', 'sold', 'Credit note edited'
    );
  end loop;

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

  delete from public.account_transactions
  where credit_note_id = p_credit_note_id and company_id = v_company_id;

  delete from public.customer_transactions
  where credit_note_id = p_credit_note_id
    and auto_generated = true
    and company_id = v_company_id;

  perform public.reverse_journal_entries('credit_notes', p_credit_note_id);

  delete from public.credit_note_items where credit_note_id = p_credit_note_id;

  -- ── Pre-validate new items (same checks as create_credit_note) ──

  if p_sale_id is not null then
    select type, deposit_account_id
    into v_sale_type, v_sale_deposit_id
    from public.sales
    where id = p_sale_id and company_id = v_company_id;
  end if;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    if v_item ? 'unit_ids' and jsonb_array_length(v_item->'unit_ids') > 0 then
      for v_unit_id in select (jsonb_array_elements_text(v_item->'unit_ids'))::uuid
      loop
        select serial_number, product_id
        into v_unit_serial, v_unit_product
        from public.product_units
        where id = v_unit_id and company_id = v_company_id and status = 'sold';

        if v_unit_serial is null then
          raise exception 'An IMEI unit is not available to return (not found or not sold)';
        end if;
      end loop;
    elsif p_sale_id is not null and coalesce(v_item->>'product_id', '') <> '' then
      -- Non-IMEI product tied to a specific invoice: this credit's new
      -- quantity (plus whatever else is already credited against this
      -- invoice, now that this note's own old items were just removed
      -- above) must never exceed what was actually sold on it.
      select coalesce(sum(si.quantity), 0)
      into v_sold_qty
      from public.sale_items si
      where si.sale_id = p_sale_id
        and si.product_id = (v_item->>'product_id')::uuid;

      select coalesce(sum(cni.quantity), 0)
      into v_already_cred
      from public.credit_note_items cni
      join public.credit_notes cn on cn.id = cni.credit_note_id
      where cn.sale_id = p_sale_id
        and cni.product_id = (v_item->>'product_id')::uuid;

      if v_already_cred + coalesce((v_item->>'quantity')::numeric, 1) > v_sold_qty then
        raise exception 'Cannot credit % units of this product on this invoice — only % were sold on it and % already credited',
          coalesce((v_item->>'quantity')::numeric, 1), v_sold_qty, v_already_cred;
      end if;
    end if;
  end loop;

  select coalesce(sum((item->>'amount')::numeric), 0)
  into v_total
  from jsonb_array_elements(p_items) as item;

  if v_total <= 0 then
    raise exception 'Credit note total must be greater than zero';
  end if;

  v_reference := coalesce(nullif(trim(coalesce(p_reference, '')), ''),
    (select reference from public.credit_notes where id = p_credit_note_id));

  update public.credit_notes
  set customer_id = p_customer_id,
      sale_id = p_sale_id,
      reference = v_reference,
      credit_date = coalesce(p_credit_date, credit_date),
      notes = p_notes,
      total_amount = v_total
  where id = p_credit_note_id;

  -- ── Reapply new effects (same as create_credit_note) ──

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    insert into public.credit_note_items
      (owner_id, company_id, credit_note_id, product_id, description, quantity, unit_price, amount)
    values (
      v_owner_id, v_company_id, p_credit_note_id,
      nullif(v_item->>'product_id', '')::uuid,
      v_item->>'description',
      coalesce((v_item->>'quantity')::numeric, 1),
      coalesce((v_item->>'unit_price')::numeric, 0),
      coalesce((v_item->>'amount')::numeric, 0)
    );

    if (v_item->>'product_id') is not null and (v_item->>'product_id') <> '' then
      select cost into v_product_cost
      from public.products
      where id = (v_item->>'product_id')::uuid and company_id = v_company_id;

      update public.products
      set stock_quantity = stock_quantity + (v_item->>'quantity')::numeric
      where id = (v_item->>'product_id')::uuid and company_id = v_company_id;

      v_cogs_total := v_cogs_total + coalesce(v_product_cost, 0) * (v_item->>'quantity')::numeric;
    end if;

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
          v_unit_product, 'customer_return', 'credit_notes', p_credit_note_id, v_reference,
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
       p_sale_id, p_credit_note_id, true);
  end if;

  if v_sale_type = 'receipt' and v_sale_deposit_id is not null then
    insert into public.account_transactions
      (owner_id, company_id, account_id, type, amount, note, credit_note_id)
    values
      (v_owner_id, v_company_id, v_sale_deposit_id,
       'withdrawal', v_total,
       'Refund · Credit Note ' || v_reference,
       p_credit_note_id);
  end if;

  -- ── Journal entry ─────────────────────────────────────────
  v_sr_coa := public.ensure_system_account('sales_returns', 'Sales Returns', 'expense', 'debit');
  v_journal_lines := '[]'::jsonb;

  v_journal_lines := v_journal_lines || jsonb_build_array(
    jsonb_build_object('account_id', v_sr_coa, 'debit', v_total, 'credit', 0)
  );

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
    'credit_notes', p_credit_note_id,
    v_journal_lines
  );

  return p_credit_note_id;
end;
$$;

grant execute on function public.update_credit_note(uuid, uuid, uuid, text, date, text, jsonb) to authenticated;
