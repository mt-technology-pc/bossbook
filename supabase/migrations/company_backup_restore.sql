-- ============================================================
-- BossBooks: Restore a company's data from an uploaded backup
-- Run this once in the Supabase SQL Editor.
-- ============================================================

-- Wipes and replaces every row belonging to the caller's own company
-- across all 19 backup tables, in a single transaction. company_id and
-- owner_id are always taken from the authenticated caller (auth.uid() /
-- current_company_id()) — never from the uploaded payload — so this can
-- never touch another company's data.
create or replace function public.restore_company_backup(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_id   uuid := auth.uid();
  v_company_id uuid := public.current_company_id();
  v_tables     text[] := array[
    'products','customers','suppliers','sales_reps','accounts','chart_of_accounts',
    'purchases','purchase_items','sales','sale_items','product_units',
    'supplier_payments','customer_transactions','expenses','account_transactions',
    'journal_entries','journal_entry_lines','sequence_counters','label_designs'
  ];
  v_table text;
  v_rows jsonb;
  v_transformed jsonb;
  v_counts jsonb := '{}'::jsonb;
  v_n int;
  i int;
begin
  if v_owner_id is null or v_company_id is null then
    raise exception 'Not authenticated';
  end if;

  -- Wipe this company's existing rows, children first (reverse of v_tables).
  for i in reverse array_length(v_tables, 1)..1 loop
    execute format('delete from public.%I where company_id = $1', v_tables[i])
    using v_company_id;
  end loop;

  -- Restore, parents first (v_tables order). This whole function body is
  -- one transaction, so any failure below rolls back the deletes above
  -- too — a bad file can never leave the company half-wiped.
  foreach v_table in array v_tables loop
    v_rows := coalesce(p_payload -> v_table, '[]'::jsonb);
    v_n := jsonb_array_length(v_rows);
    v_counts := v_counts || jsonb_build_object(v_table, v_n);
    if v_n = 0 then continue; end if;

    -- Never trust the file's company_id/owner_id — force the caller's own.
    select jsonb_agg(
      (elem - 'company_id' - 'owner_id')
        || jsonb_build_object('company_id', v_company_id, 'owner_id', v_owner_id)
    )
    into v_transformed
    from jsonb_array_elements(v_rows) as elem;

    -- ON CONFLICT DO NOTHING: the preceding delete already clears every
    -- pre-existing row for this company, so a unique-constraint hit here
    -- can only mean the uploaded file itself has two colliding rows (same
    -- product id, or two chart_of_accounts rows sharing a system_key).
    -- Skip the second one rather than aborting — and rolling back — the
    -- entire restore over one bad row in an otherwise-good file.
    execute format(
      'insert into public.%I select * from jsonb_populate_recordset(null::public.%I, $1) on conflict do nothing',
      v_table, v_table
    ) using v_transformed;
  end loop;

  return jsonb_build_object('success', true, 'counts', v_counts);
end;
$$;

grant execute on function public.restore_company_backup(jsonb) to authenticated;
