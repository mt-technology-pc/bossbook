// Every data table (not view) in supabase/schema.sql, ordered so a restored
// SQL dump can be replayed top-to-bottom without violating foreign keys.
export const BACKUP_TABLES = [
  'products',
  'customers',
  'suppliers',
  'sales_reps',
  'accounts',
  'chart_of_accounts',
  'purchases',
  'purchase_items',
  'sales',
  'sale_items',
  'product_units',
  'supplier_payments',
  'customer_transactions',
  'expenses',
  'account_transactions',
  'journal_entries',
  'journal_entry_lines',
  'sequence_counters',
  'label_designs',
]
