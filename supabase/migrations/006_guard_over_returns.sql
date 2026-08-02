-- ============================================================
-- BossBooks: Guard purchase/sales returns against over-returning
-- Date: 2026-08-02
-- Run this once in the Supabase SQL Editor, AFTER 002 and 004.
--
-- create_purchase_return and create_credit_note previously only
-- checked a non-serialized product's current stock_quantity, not
-- how much was actually on the specific bill/invoice being returned
-- against — so returning more units than that document ever had was
-- silently accepted as long as overall stock covered it. Both
-- functions now also check cumulative-already-returned vs.
-- originally purchased/sold quantity for that purchase_id/sale_id
-- when one is given. (Full function bodies below — this is a plain
-- create or replace, safe to re-run.)
-- ============================================================

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
  v_purchased_qty numeric;
  v_already_ret   numeric;
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

      -- If this return is tied to a specific bill, also make sure it's
      -- not returning more of this product than that bill ever had, net
      -- of whatever's already been returned against it — current stock
      -- alone can't catch over-returning against one specific purchase.
      if p_purchase_id is not null then
        select coalesce(sum(pi.quantity), 0)
        into v_purchased_qty
        from public.purchase_items pi
        where pi.purchase_id = p_purchase_id
          and pi.product_id = (v_item->>'product_id')::uuid;

        select coalesce(sum(pri.quantity), 0)
        into v_already_ret
        from public.purchase_return_items pri
        join public.purchase_returns pr on pr.id = pri.purchase_return_id
        where pr.purchase_id = p_purchase_id
          and pri.product_id = (v_item->>'product_id')::uuid;

        if v_already_ret + (v_item->>'quantity')::numeric > v_purchased_qty then
          raise exception 'Cannot return % units of % on this bill — % were purchased on it and % already returned',
            (v_item->>'quantity')::numeric, v_product_name, v_purchased_qty, v_already_ret;
        end if;
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
  v_sold_qty        numeric;
  v_already_cred    numeric;
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
    elsif p_sale_id is not null and coalesce(v_item->>'product_id', '') <> '' then
      -- Non-IMEI product tied to a specific invoice: make sure this credit
      -- (plus whatever's already been credited against this invoice) never
      -- exceeds what was actually sold on it.
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
