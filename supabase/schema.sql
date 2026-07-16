-- Run this in the Supabase SQL editor (Project > SQL Editor > New query).
-- Safe to re-run: uses IF NOT EXISTS / OR REPLACE where possible.

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  sku text,
  category text,
  price numeric(12,2) not null default 0,
  cost numeric(12,2) not null default 0,
  stock_quantity integer not null default 0,
  tracks_serial boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists products_owner_id_idx on public.products(owner_id);

alter table public.products enable row level security;

drop policy if exists "Users can view own products" on public.products;
create policy "Users can view own products"
  on public.products for select
  using (auth.uid() = owner_id);

drop policy if exists "Users can insert own products" on public.products;
create policy "Users can insert own products"
  on public.products for insert
  with check (auth.uid() = owner_id);

drop policy if exists "Users can update own products" on public.products;
create policy "Users can update own products"
  on public.products for update
  using (auth.uid() = owner_id);

drop policy if exists "Users can delete own products" on public.products;
create policy "Users can delete own products"
  on public.products for delete
  using (auth.uid() = owner_id);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_products_updated_at on public.products;
create trigger set_products_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  phone text,
  email text,
  address text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists customers_owner_id_idx on public.customers(owner_id);

alter table public.customers enable row level security;

drop policy if exists "Users can view own customers" on public.customers;
create policy "Users can view own customers"
  on public.customers for select
  using (auth.uid() = owner_id);

drop policy if exists "Users can insert own customers" on public.customers;
create policy "Users can insert own customers"
  on public.customers for insert
  with check (auth.uid() = owner_id);

drop policy if exists "Users can update own customers" on public.customers;
create policy "Users can update own customers"
  on public.customers for update
  using (auth.uid() = owner_id);

drop policy if exists "Users can delete own customers" on public.customers;
create policy "Users can delete own customers"
  on public.customers for delete
  using (auth.uid() = owner_id);

drop trigger if exists set_customers_updated_at on public.customers;
create trigger set_customers_updated_at
  before update on public.customers
  for each row execute function public.set_updated_at();

-- Suppliers ------------------------------------------------------------

create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  phone text,
  email text,
  address text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists suppliers_owner_id_idx on public.suppliers(owner_id);

alter table public.suppliers enable row level security;

drop policy if exists "Users can view own suppliers" on public.suppliers;
create policy "Users can view own suppliers"
  on public.suppliers for select
  using (auth.uid() = owner_id);

drop policy if exists "Users can insert own suppliers" on public.suppliers;
create policy "Users can insert own suppliers"
  on public.suppliers for insert
  with check (auth.uid() = owner_id);

drop policy if exists "Users can update own suppliers" on public.suppliers;
create policy "Users can update own suppliers"
  on public.suppliers for update
  using (auth.uid() = owner_id);

drop policy if exists "Users can delete own suppliers" on public.suppliers;
create policy "Users can delete own suppliers"
  on public.suppliers for delete
  using (auth.uid() = owner_id);

drop trigger if exists set_suppliers_updated_at on public.suppliers;
create trigger set_suppliers_updated_at
  before update on public.suppliers
  for each row execute function public.set_updated_at();

-- Purchases (bills) — recording a purchase increases product stock ----

create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  supplier_id uuid references public.suppliers(id) on delete set null,
  reference text,
  notes text,
  total_amount numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

alter table public.purchases add column if not exists bill_date date not null default current_date;
alter table public.purchases add column if not exists due_date date;

create index if not exists purchases_owner_id_idx on public.purchases(owner_id);

alter table public.purchases enable row level security;

drop policy if exists "Users can view own purchases" on public.purchases;
create policy "Users can view own purchases"
  on public.purchases for select
  using (auth.uid() = owner_id);

drop policy if exists "Users can insert own purchases" on public.purchases;
create policy "Users can insert own purchases"
  on public.purchases for insert
  with check (auth.uid() = owner_id);

drop policy if exists "Users can delete own purchases" on public.purchases;
create policy "Users can delete own purchases"
  on public.purchases for delete
  using (auth.uid() = owner_id);

create table if not exists public.purchase_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  purchase_id uuid not null references public.purchases(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  unit_cost numeric(12,2) not null default 0,
  subtotal numeric(12,2) not null default 0
);

create index if not exists purchase_items_purchase_id_idx on public.purchase_items(purchase_id);
create index if not exists purchase_items_owner_id_idx on public.purchase_items(owner_id);

alter table public.purchase_items enable row level security;

drop policy if exists "Users can view own purchase items" on public.purchase_items;
create policy "Users can view own purchase items"
  on public.purchase_items for select
  using (auth.uid() = owner_id);

drop policy if exists "Users can insert own purchase items" on public.purchase_items;
create policy "Users can insert own purchase items"
  on public.purchase_items for insert
  with check (auth.uid() = owner_id);

-- Individual serial/IMEI units, created when a tracked product is purchased

create table if not exists public.product_units (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  purchase_id uuid references public.purchases(id) on delete set null,
  serial_number text not null,
  status text not null default 'in_stock',
  created_at timestamptz not null default now(),
  unique (owner_id, serial_number)
);

-- sale_id is added via alter below since sales doesn't exist yet at this point in the file.

create index if not exists product_units_owner_id_idx on public.product_units(owner_id);
create index if not exists product_units_product_id_idx on public.product_units(product_id);

alter table public.product_units enable row level security;

drop policy if exists "Users can view own product units" on public.product_units;
create policy "Users can view own product units"
  on public.product_units for select
  using (auth.uid() = owner_id);

drop policy if exists "Users can insert own product units" on public.product_units;
create policy "Users can insert own product units"
  on public.product_units for insert
  with check (auth.uid() = owner_id);

drop policy if exists "Users can update own product units" on public.product_units;
create policy "Users can update own product units"
  on public.product_units for update
  using (auth.uid() = owner_id);

-- Atomically records a bill: inserts the purchase, its line items, bumps
-- product stock, and registers any serial/IMEI units in one transaction.
-- p_items shape: [{ "product_id": uuid, "quantity": int, "unit_cost": numeric, "serials": [text, ...]? }]
drop function if exists public.create_purchase(uuid, text, text, jsonb);

create or replace function public.create_purchase(
  p_supplier_id uuid,
  p_reference text,
  p_notes text,
  p_items jsonb,
  p_bill_date date default current_date,
  p_due_date date default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_id uuid := auth.uid();
  v_purchase_id uuid;
  v_item jsonb;
  v_total numeric(12,2) := 0;
  v_serial text;
  v_product_owner uuid;
  v_inventory_coa uuid;
  v_ap_coa uuid;
  v_reference text := nullif(trim(coalesce(p_reference, '')), '');
begin
  if v_owner_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'A bill needs at least one line item';
  end if;

  if v_reference is null then
    v_reference := 'B' || public.next_sequence_number(v_owner_id, 'purchase');
  end if;

  select coalesce(sum((item->>'quantity')::int * (item->>'unit_cost')::numeric), 0)
  into v_total
  from jsonb_array_elements(p_items) as item;

  insert into public.purchases (owner_id, supplier_id, reference, notes, total_amount, bill_date, due_date)
  values (v_owner_id, p_supplier_id, v_reference, p_notes, v_total, coalesce(p_bill_date, current_date), p_due_date)
  returning id into v_purchase_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    select owner_id into v_product_owner
    from public.products
    where id = (v_item->>'product_id')::uuid;

    if v_product_owner is null or v_product_owner <> v_owner_id then
      raise exception 'Invalid product on this bill';
    end if;

    insert into public.purchase_items (owner_id, purchase_id, product_id, quantity, unit_cost, subtotal)
    values (
      v_owner_id,
      v_purchase_id,
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
        insert into public.product_units (owner_id, product_id, purchase_id, serial_number, status)
        values (v_owner_id, (v_item->>'product_id')::uuid, v_purchase_id, v_serial, 'in_stock');
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

-- Supplier balances -----------------------------------------------------
-- Purchases already represent what you owe a supplier (the bill total).
-- Payments record what you've paid back against that. Balance = billed - paid.

create table if not exists public.supplier_payments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  note text,
  created_at timestamptz not null default now()
);

create index if not exists supplier_payments_owner_id_idx on public.supplier_payments(owner_id);
create index if not exists supplier_payments_supplier_id_idx on public.supplier_payments(supplier_id);

alter table public.supplier_payments enable row level security;

drop policy if exists "Users can view own supplier payments" on public.supplier_payments;
create policy "Users can view own supplier payments"
  on public.supplier_payments for select
  using (auth.uid() = owner_id);

drop policy if exists "Users can insert own supplier payments" on public.supplier_payments;
create policy "Users can insert own supplier payments"
  on public.supplier_payments for insert
  with check (auth.uid() = owner_id);

drop policy if exists "Users can delete own supplier payments" on public.supplier_payments;
create policy "Users can delete own supplier payments"
  on public.supplier_payments for delete
  using (auth.uid() = owner_id);

drop view if exists public.supplier_balances;
create view public.supplier_balances
with (security_invoker = true) as
select
  s.id as supplier_id,
  s.owner_id,
  s.name,
  coalesce(billed.total, 0) as total_billed,
  coalesce(paid.total, 0) as total_paid,
  coalesce(billed.total, 0) - coalesce(paid.total, 0) as balance
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
) paid on paid.supplier_id = s.id;

grant select on public.supplier_balances to authenticated;

-- Customer balances -------------------------------------------------------
-- No invoicing system exists yet, so this is a simple manual ledger:
-- a "charge" is money the customer owes you, a "payment" is money they paid back.

create table if not exists public.customer_transactions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  type text not null check (type in ('charge', 'payment')),
  amount numeric(12,2) not null check (amount > 0),
  note text,
  created_at timestamptz not null default now()
);

create index if not exists customer_transactions_owner_id_idx on public.customer_transactions(owner_id);
create index if not exists customer_transactions_customer_id_idx on public.customer_transactions(customer_id);

alter table public.customer_transactions enable row level security;

drop policy if exists "Users can view own customer transactions" on public.customer_transactions;
create policy "Users can view own customer transactions"
  on public.customer_transactions for select
  using (auth.uid() = owner_id);

drop policy if exists "Users can insert own customer transactions" on public.customer_transactions;
create policy "Users can insert own customer transactions"
  on public.customer_transactions for insert
  with check (auth.uid() = owner_id);

drop policy if exists "Users can delete own customer transactions" on public.customer_transactions;
create policy "Users can delete own customer transactions"
  on public.customer_transactions for delete
  using (auth.uid() = owner_id);

drop view if exists public.customer_balances;
create view public.customer_balances
with (security_invoker = true) as
select
  c.id as customer_id,
  c.owner_id,
  c.name,
  coalesce(sum(case when t.type = 'charge' then t.amount else 0 end), 0) as total_charged,
  coalesce(sum(case when t.type = 'payment' then t.amount else 0 end), 0) as total_paid,
  coalesce(sum(case when t.type = 'charge' then t.amount else -t.amount end), 0) as balance
from public.customers c
left join public.customer_transactions t on t.customer_id = c.id
group by c.id, c.owner_id, c.name;

grant select on public.customer_balances to authenticated;

-- Sales (invoices & sales receipts) — recording a sale decreases product stock
-- Invoice = credit sale, money owed by the customer (adds a charge to their balance).
-- Sales receipt = paid immediately, deposited to cash/bank (no balance impact).

create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  type text not null check (type in ('invoice', 'receipt')),
  reference text,
  notes text,
  sale_date date not null default current_date,
  due_date date,
  deposit_to text check (deposit_to in ('cash', 'bank', 'undeposited')),
  total_amount numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists sales_owner_id_idx on public.sales(owner_id);

alter table public.sales enable row level security;

drop policy if exists "Users can view own sales" on public.sales;
create policy "Users can view own sales"
  on public.sales for select
  using (auth.uid() = owner_id);

drop policy if exists "Users can insert own sales" on public.sales;
create policy "Users can insert own sales"
  on public.sales for insert
  with check (auth.uid() = owner_id);

drop policy if exists "Users can delete own sales" on public.sales;
create policy "Users can delete own sales"
  on public.sales for delete
  using (auth.uid() = owner_id);

create table if not exists public.sale_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  sale_id uuid not null references public.sales(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  unit_price numeric(12,2) not null default 0,
  subtotal numeric(12,2) not null default 0
);

create index if not exists sale_items_sale_id_idx on public.sale_items(sale_id);
create index if not exists sale_items_owner_id_idx on public.sale_items(owner_id);

alter table public.sale_items enable row level security;

drop policy if exists "Users can view own sale items" on public.sale_items;
create policy "Users can view own sale items"
  on public.sale_items for select
  using (auth.uid() = owner_id);

drop policy if exists "Users can insert own sale items" on public.sale_items;
create policy "Users can insert own sale items"
  on public.sale_items for insert
  with check (auth.uid() = owner_id);

alter table public.product_units add column if not exists sale_id uuid references public.sales(id) on delete set null;
create index if not exists product_units_sale_id_idx on public.product_units(sale_id);

-- Cash & bank accounts ---------------------------------------------------

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text not null check (type in ('cash', 'bank')),
  opening_balance numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists accounts_owner_id_idx on public.accounts(owner_id);

alter table public.accounts enable row level security;

drop policy if exists "Users can view own accounts" on public.accounts;
create policy "Users can view own accounts"
  on public.accounts for select
  using (auth.uid() = owner_id);

drop policy if exists "Users can insert own accounts" on public.accounts;
create policy "Users can insert own accounts"
  on public.accounts for insert
  with check (auth.uid() = owner_id);

drop policy if exists "Users can delete own accounts" on public.accounts;
create policy "Users can delete own accounts"
  on public.accounts for delete
  using (auth.uid() = owner_id);

create table if not exists public.account_transactions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete cascade,
  type text not null check (type in ('deposit', 'withdrawal')),
  amount numeric(12,2) not null check (amount > 0),
  note text,
  sale_id uuid references public.sales(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists account_transactions_owner_id_idx on public.account_transactions(owner_id);
create index if not exists account_transactions_account_id_idx on public.account_transactions(account_id);

alter table public.account_transactions enable row level security;

drop policy if exists "Users can view own account transactions" on public.account_transactions;
create policy "Users can view own account transactions"
  on public.account_transactions for select
  using (auth.uid() = owner_id);

drop policy if exists "Users can insert own account transactions" on public.account_transactions;
create policy "Users can insert own account transactions"
  on public.account_transactions for insert
  with check (auth.uid() = owner_id);

drop view if exists public.account_balances;
create view public.account_balances
with (security_invoker = true) as
select
  a.id as account_id,
  a.owner_id,
  a.name,
  a.type,
  a.opening_balance,
  a.opening_balance + coalesce(sum(
    case when t.type = 'deposit' then t.amount else -t.amount end
  ), 0) as balance
from public.accounts a
left join public.account_transactions t on t.account_id = a.id
group by a.id, a.owner_id, a.name, a.type, a.opening_balance;

grant select on public.account_balances to authenticated;

-- Sales receipts deposit into a real account rather than a free-text label.
-- (create_sale itself is defined once, further below, alongside update_sale
-- and delete_sale so the three stay next to each other.)
alter table public.sales add column if not exists deposit_account_id uuid references public.accounts(id) on delete set null;

-- receive_payment and pay_bill are defined once, further below, alongside
-- their update/delete counterparts, so all four stay together.

-- Expenses -----------------------------------------------------------------
-- Recording an expense withdraws money from an account, same as paying a
-- bill — an expense here always represents money already paid, not an
-- unpaid liability (there's no accounts-payable concept for expenses).

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid references public.accounts(id) on delete set null,
  category text not null,
  description text,
  amount numeric(12,2) not null check (amount > 0),
  expense_date date not null default current_date,
  created_at timestamptz not null default now()
);

create index if not exists expenses_owner_id_idx on public.expenses(owner_id);

alter table public.expenses enable row level security;

drop policy if exists "Users can view own expenses" on public.expenses;
create policy "Users can view own expenses"
  on public.expenses for select
  using (auth.uid() = owner_id);

drop policy if exists "Users can insert own expenses" on public.expenses;
create policy "Users can insert own expenses"
  on public.expenses for insert
  with check (auth.uid() = owner_id);

drop policy if exists "Users can delete own expenses" on public.expenses;
create policy "Users can delete own expenses"
  on public.expenses for delete
  using (auth.uid() = owner_id);

alter table public.account_transactions add column if not exists expense_id uuid references public.expenses(id) on delete set null;
create index if not exists account_transactions_expense_id_idx on public.account_transactions(expense_id);

drop function if exists public.record_expense(uuid, text, text, numeric, date);

create or replace function public.record_expense(
  p_account_id uuid,
  p_category text,
  p_description text,
  p_amount numeric,
  p_expense_date date default current_date
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_id uuid := auth.uid();
  v_account_owner uuid;
  v_expense_id uuid;
  v_when timestamptz := coalesce(p_expense_date, current_date);
  v_category text := trim(coalesce(p_category, ''));
  v_expense_coa uuid;
  v_cash_coa uuid;
begin
  if v_owner_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Enter an amount greater than 0';
  end if;

  if v_category = '' then
    raise exception 'Enter a category';
  end if;

  select owner_id into v_account_owner from public.accounts where id = p_account_id;
  if v_account_owner is null or v_account_owner <> v_owner_id then
    raise exception 'Invalid account';
  end if;

  insert into public.expenses (owner_id, account_id, category, description, amount, expense_date)
  values (v_owner_id, p_account_id, v_category, p_description, p_amount, coalesce(p_expense_date, current_date))
  returning id into v_expense_id;

  insert into public.account_transactions (owner_id, account_id, type, amount, note, expense_id, created_at)
  values (
    v_owner_id, p_account_id, 'withdrawal', p_amount,
    v_category || coalesce(': ' || nullif(p_description, ''), ''),
    v_expense_id, v_when
  );

  v_expense_coa := public.ensure_expense_category_account(v_category);
  v_cash_coa := public.ensure_account_coa_row(p_account_id);
  perform public.post_journal_entry(
    coalesce(p_expense_date, current_date), v_category || coalesce(': ' || nullif(p_description, ''), ''),
    'expenses', v_expense_id,
    jsonb_build_array(
      jsonb_build_object('account_id', v_expense_coa, 'debit', p_amount, 'credit', 0),
      jsonb_build_object('account_id', v_cash_coa, 'debit', 0, 'credit', p_amount)
    )
  );

  return v_expense_id;
end;
$$;

grant execute on function public.record_expense(uuid, text, text, numeric, date) to authenticated;

drop function if exists public.delete_expense(uuid);

create or replace function public.delete_expense(p_expense_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_id uuid := auth.uid();
  v_expense_owner uuid;
begin
  if v_owner_id is null then
    raise exception 'Not authenticated';
  end if;

  select owner_id into v_expense_owner from public.expenses where id = p_expense_id;
  if v_expense_owner is null or v_expense_owner <> v_owner_id then
    raise exception 'Invalid expense';
  end if;

  delete from public.account_transactions where expense_id = p_expense_id and owner_id = v_owner_id;
  delete from public.expenses where id = p_expense_id and owner_id = v_owner_id;
  perform public.reverse_journal_entries('expenses', p_expense_id);
end;
$$;

grant execute on function public.delete_expense(uuid) to authenticated;

-- Payment linking + full CRUD for Sales, Purchases, Receive Payment, Pay Bill
-- ----------------------------------------------------------------------
-- Lets a payment optionally point at the specific invoice/bill it settles,
-- and lets each payment's ledger deposit/withdrawal point back at the
-- payment itself — so editing or deleting a payment correctly reverses
-- money movement instead of leaving the account ledger out of sync.

alter table public.customer_transactions add column if not exists sale_id uuid references public.sales(id) on delete set null;
alter table public.customer_transactions add column if not exists auto_generated boolean not null default false;
create index if not exists customer_transactions_sale_id_idx on public.customer_transactions(sale_id);

alter table public.supplier_payments add column if not exists purchase_id uuid references public.purchases(id) on delete set null;
create index if not exists supplier_payments_purchase_id_idx on public.supplier_payments(purchase_id);

alter table public.account_transactions add column if not exists customer_transaction_id uuid references public.customer_transactions(id) on delete set null;
alter table public.account_transactions add column if not exists supplier_payment_id uuid references public.supplier_payments(id) on delete set null;
create index if not exists account_transactions_customer_transaction_id_idx on public.account_transactions(customer_transaction_id);
create index if not exists account_transactions_supplier_payment_id_idx on public.account_transactions(supplier_payment_id);

-- Real per-invoice / per-bill outstanding balance, now that payments can
-- be linked to a specific sale or purchase.
drop view if exists public.sale_balances;
create view public.sale_balances
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
  s.total_amount - coalesce(paid.total, 0) as outstanding
from public.sales s
left join (
  select sale_id, sum(amount) as total
  from public.customer_transactions
  where type = 'payment' and sale_id is not null
  group by sale_id
) paid on paid.sale_id = s.id;

grant select on public.sale_balances to authenticated;

drop view if exists public.purchase_balances;
create view public.purchase_balances
with (security_invoker = true) as
select
  p.id as purchase_id,
  p.owner_id,
  p.supplier_id,
  p.reference,
  p.bill_date,
  p.due_date,
  p.total_amount,
  coalesce(paid.total, 0) as paid_amount,
  p.total_amount - coalesce(paid.total, 0) as outstanding
from public.purchases p
left join (
  select purchase_id, sum(amount) as total
  from public.supplier_payments
  where purchase_id is not null
  group by purchase_id
) paid on paid.purchase_id = p.id;

grant select on public.purchase_balances to authenticated;

-- create_sale now tags the charge/payment entries it generates itself as
-- auto_generated, so update_sale can safely wipe and recreate only those
-- without touching a real, manually-linked Receive Payment.
drop function if exists public.create_sale(uuid, text, text, text, date, date, uuid, jsonb);

create or replace function public.create_sale(
  p_customer_id uuid,
  p_type text,
  p_reference text,
  p_notes text,
  p_sale_date date,
  p_due_date date,
  p_deposit_account_id uuid,
  p_items jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_id uuid := auth.uid();
  v_sale_id uuid;
  v_item jsonb;
  v_total numeric(12,2) := 0;
  v_unit_id uuid;
  v_product_id uuid;
  v_product_owner uuid;
  v_stock integer;
  v_tracks_serial boolean;
  v_account_owner uuid;
  v_product_cost numeric(12,2);
  v_cogs numeric(12,2) := 0;
  v_ar_coa uuid;
  v_revenue_coa uuid;
  v_cogs_coa uuid;
  v_inventory_coa uuid;
  v_cash_coa uuid;
  v_lines jsonb;
  v_reference text := nullif(trim(coalesce(p_reference, '')), '');
begin
  if v_owner_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_type not in ('invoice', 'receipt') then
    raise exception 'Invalid sale type';
  end if;

  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'A sale needs at least one line item';
  end if;

  if p_type = 'receipt' and p_deposit_account_id is not null then
    select owner_id into v_account_owner from public.accounts where id = p_deposit_account_id;
    if v_account_owner is null or v_account_owner <> v_owner_id then
      raise exception 'Invalid deposit account';
    end if;
  end if;

  if v_reference is null then
    v_reference := (case when p_type = 'invoice' then 'S' else 'R' end)
      || public.next_sequence_number(v_owner_id, p_type);
  end if;

  select coalesce(sum((item->>'quantity')::int * (item->>'unit_price')::numeric), 0)
  into v_total
  from jsonb_array_elements(p_items) as item;

  insert into public.sales (owner_id, customer_id, type, reference, notes, sale_date, due_date, deposit_account_id, total_amount)
  values (
    v_owner_id, p_customer_id, p_type, v_reference, p_notes,
    coalesce(p_sale_date, current_date), p_due_date, p_deposit_account_id, v_total
  )
  returning id into v_sale_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_product_id := (v_item->>'product_id')::uuid;

    select owner_id, stock_quantity, tracks_serial, cost
    into v_product_owner, v_stock, v_tracks_serial, v_product_cost
    from public.products
    where id = v_product_id;

    if v_product_owner is null or v_product_owner <> v_owner_id then
      raise exception 'Invalid product on this sale';
    end if;

    if v_stock < (v_item->>'quantity')::int then
      raise exception 'Not enough stock for one of the products on this sale';
    end if;

    insert into public.sale_items (owner_id, sale_id, product_id, quantity, unit_price, subtotal, unit_cost)
    values (
      v_owner_id,
      v_sale_id,
      v_product_id,
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
          and owner_id = v_owner_id
          and product_id = v_product_id
          and status = 'in_stock';

        if not found then
          raise exception 'One of the selected serial/IMEI units is no longer in stock';
        end if;
      end loop;
    end if;
  end loop;

  if p_customer_id is not null then
    if p_type = 'invoice' then
      insert into public.customer_transactions (owner_id, customer_id, type, amount, note, sale_id, auto_generated)
      values (v_owner_id, p_customer_id, 'charge', v_total, 'Invoice ' || v_reference, v_sale_id, true);
    elsif p_type = 'receipt' then
      insert into public.customer_transactions (owner_id, customer_id, type, amount, note, sale_id, auto_generated)
      values (v_owner_id, p_customer_id, 'charge', v_total, 'Sale receipt ' || v_reference, v_sale_id, true);
      insert into public.customer_transactions (owner_id, customer_id, type, amount, note, sale_id, auto_generated)
      values (v_owner_id, p_customer_id, 'payment', v_total, 'Paid in full at time of sale', v_sale_id, true);
    end if;
  end if;

  if p_type = 'receipt' and p_deposit_account_id is not null then
    insert into public.account_transactions (owner_id, account_id, type, amount, note, sale_id)
    values (v_owner_id, p_deposit_account_id, 'deposit', v_total, 'Sale receipt ' || v_reference, v_sale_id);
  end if;

  -- Journal entry: Dr Accounts Receivable (invoice) or Cash/Undeposited
  -- Funds (receipt) / Cr Sales Revenue, plus Dr COGS / Cr Inventory using
  -- each line's cost snapshot above (standard/latest-cost method).
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
      v_cogs_coa := public.ensure_system_account('cogs', 'Cost of Goods Sold', 'expense', 'debit');
      v_inventory_coa := public.ensure_system_account('inventory', 'Inventory', 'asset', 'debit');
      v_lines := v_lines || jsonb_build_array(
        jsonb_build_object('account_id', v_cogs_coa, 'debit', v_cogs, 'credit', 0),
        jsonb_build_object('account_id', v_inventory_coa, 'debit', 0, 'credit', v_cogs)
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

grant execute on function public.create_sale(uuid, text, text, text, date, date, uuid, jsonb) to authenticated;

-- Edits a posted sale by fully reversing its stock/serial/ledger effects
-- and reapplying fresh ones from the new line items, atomically. A real,
-- manually-linked Receive Payment against this sale is preserved (only
-- the sale's own auto-generated charge/payment entries are replaced).
create or replace function public.update_sale(
  p_sale_id uuid,
  p_customer_id uuid,
  p_type text,
  p_reference text,
  p_notes text,
  p_sale_date date,
  p_due_date date,
  p_deposit_account_id uuid,
  p_items jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_id uuid := auth.uid();
  v_old_owner uuid;
  v_old_item record;
  v_new_item jsonb;
  v_unit_id uuid;
  v_product_id uuid;
  v_product_owner uuid;
  v_stock integer;
  v_tracks_serial boolean;
  v_account_owner uuid;
  v_total numeric(12,2) := 0;
  v_product_cost numeric(12,2);
  v_cogs numeric(12,2) := 0;
  v_ar_coa uuid;
  v_revenue_coa uuid;
  v_cogs_coa uuid;
  v_inventory_coa uuid;
  v_cash_coa uuid;
  v_lines jsonb;
begin
  if v_owner_id is null then
    raise exception 'Not authenticated';
  end if;

  select owner_id into v_old_owner from public.sales where id = p_sale_id;
  if v_old_owner is null or v_old_owner <> v_owner_id then
    raise exception 'Invalid sale';
  end if;

  if p_type not in ('invoice', 'receipt') then
    raise exception 'Invalid sale type';
  end if;

  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'A sale needs at least one line item';
  end if;

  if p_type = 'receipt' and p_deposit_account_id is not null then
    select owner_id into v_account_owner from public.accounts where id = p_deposit_account_id;
    if v_account_owner is null or v_account_owner <> v_owner_id then
      raise exception 'Invalid deposit account';
    end if;
  end if;

  -- Reverse old effects
  for v_old_item in select product_id, quantity from public.sale_items where sale_id = p_sale_id
  loop
    update public.products
    set stock_quantity = stock_quantity + v_old_item.quantity
    where id = v_old_item.product_id;
  end loop;

  update public.product_units set status = 'in_stock', sale_id = null where sale_id = p_sale_id;

  delete from public.account_transactions where sale_id = p_sale_id;
  delete from public.customer_transactions where sale_id = p_sale_id and auto_generated = true;
  delete from public.sale_items where sale_id = p_sale_id;
  perform public.reverse_journal_entries('sales', p_sale_id);

  select coalesce(sum((item->>'quantity')::int * (item->>'unit_price')::numeric), 0)
  into v_total
  from jsonb_array_elements(p_items) as item;

  update public.sales
  set customer_id = p_customer_id,
      type = p_type,
      reference = p_reference,
      notes = p_notes,
      sale_date = coalesce(p_sale_date, sale_date),
      due_date = p_due_date,
      deposit_account_id = p_deposit_account_id,
      total_amount = v_total
  where id = p_sale_id;

  -- Reapply new effects
  for v_new_item in select * from jsonb_array_elements(p_items)
  loop
    v_product_id := (v_new_item->>'product_id')::uuid;

    select owner_id, stock_quantity, tracks_serial, cost
    into v_product_owner, v_stock, v_tracks_serial, v_product_cost
    from public.products
    where id = v_product_id;

    if v_product_owner is null or v_product_owner <> v_owner_id then
      raise exception 'Invalid product on this sale';
    end if;

    if v_stock < (v_new_item->>'quantity')::int then
      raise exception 'Not enough stock for one of the products on this sale';
    end if;

    insert into public.sale_items (owner_id, sale_id, product_id, quantity, unit_price, subtotal, unit_cost)
    values (
      v_owner_id, p_sale_id, v_product_id,
      (v_new_item->>'quantity')::int,
      (v_new_item->>'unit_price')::numeric,
      (v_new_item->>'quantity')::int * (v_new_item->>'unit_price')::numeric,
      v_product_cost
    );

    v_cogs := v_cogs + (v_new_item->>'quantity')::int * coalesce(v_product_cost, 0);

    update public.products
    set stock_quantity = stock_quantity - (v_new_item->>'quantity')::int
    where id = v_product_id;

    if v_tracks_serial and (v_new_item ? 'unit_ids') then
      for v_unit_id in select (jsonb_array_elements_text(v_new_item->'unit_ids'))::uuid
      loop
        update public.product_units
        set status = 'sold', sale_id = p_sale_id
        where id = v_unit_id
          and owner_id = v_owner_id
          and product_id = v_product_id
          and status = 'in_stock';

        if not found then
          raise exception 'One of the selected serial/IMEI units is no longer in stock';
        end if;
      end loop;
    end if;
  end loop;

  if p_customer_id is not null then
    if p_type = 'invoice' then
      insert into public.customer_transactions (owner_id, customer_id, type, amount, note, sale_id, auto_generated)
      values (v_owner_id, p_customer_id, 'charge', v_total, coalesce('Invoice ' || p_reference, 'Invoice'), p_sale_id, true);
    elsif p_type = 'receipt' then
      insert into public.customer_transactions (owner_id, customer_id, type, amount, note, sale_id, auto_generated)
      values (v_owner_id, p_customer_id, 'charge', v_total, coalesce('Sale receipt ' || p_reference, 'Sale receipt'), p_sale_id, true);
      insert into public.customer_transactions (owner_id, customer_id, type, amount, note, sale_id, auto_generated)
      values (v_owner_id, p_customer_id, 'payment', v_total, 'Paid in full at time of sale', p_sale_id, true);
    end if;
  end if;

  if p_type = 'receipt' and p_deposit_account_id is not null then
    insert into public.account_transactions (owner_id, account_id, type, amount, note, sale_id)
    values (v_owner_id, p_deposit_account_id, 'deposit', v_total, coalesce('Sale receipt ' || p_reference, 'Sale receipt'), p_sale_id);
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
      v_cogs_coa := public.ensure_system_account('cogs', 'Cost of Goods Sold', 'expense', 'debit');
      v_inventory_coa := public.ensure_system_account('inventory', 'Inventory', 'asset', 'debit');
      v_lines := v_lines || jsonb_build_array(
        jsonb_build_object('account_id', v_cogs_coa, 'debit', v_cogs, 'credit', 0),
        jsonb_build_object('account_id', v_inventory_coa, 'debit', 0, 'credit', v_cogs)
      );
    end if;

    perform public.post_journal_entry(
      coalesce(p_sale_date, current_date),
      case when p_type = 'invoice'
        then coalesce('Invoice ' || p_reference, 'Invoice')
        else coalesce('Sale receipt ' || p_reference, 'Sale receipt')
      end,
      'sales', p_sale_id, v_lines
    );
  end if;

  return p_sale_id;
end;
$$;

grant execute on function public.update_sale(uuid, uuid, text, text, text, date, date, uuid, jsonb) to authenticated;

-- Deletes a sale, reversing stock/serial effects. A real, manually-linked
-- Receive Payment survives, just unlinked (sale_id set to null via FK).
create or replace function public.delete_sale(p_sale_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_id uuid := auth.uid();
  v_old_owner uuid;
  v_old_item record;
begin
  if v_owner_id is null then
    raise exception 'Not authenticated';
  end if;

  select owner_id into v_old_owner from public.sales where id = p_sale_id;
  if v_old_owner is null or v_old_owner <> v_owner_id then
    raise exception 'Invalid sale';
  end if;

  for v_old_item in select product_id, quantity from public.sale_items where sale_id = p_sale_id
  loop
    update public.products
    set stock_quantity = stock_quantity + v_old_item.quantity
    where id = v_old_item.product_id;
  end loop;

  update public.product_units set status = 'in_stock', sale_id = null where sale_id = p_sale_id;

  delete from public.account_transactions where sale_id = p_sale_id;
  delete from public.customer_transactions where sale_id = p_sale_id and auto_generated = true;
  delete from public.sale_items where sale_id = p_sale_id;
  delete from public.sales where id = p_sale_id;
  perform public.reverse_journal_entries('sales', p_sale_id);
end;
$$;

grant execute on function public.delete_sale(uuid) to authenticated;

-- Edits a posted purchase the same way — reverse then reapply, atomically.
-- Blocked if any unit from this bill has already been sold, or if stock
-- has dropped below what this bill originally added (can't safely
-- un-receive stock that's already gone).
create or replace function public.update_purchase(
  p_purchase_id uuid,
  p_supplier_id uuid,
  p_reference text,
  p_notes text,
  p_bill_date date,
  p_due_date date,
  p_items jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_id uuid := auth.uid();
  v_old_owner uuid;
  v_old_item record;
  v_new_item jsonb;
  v_serial text;
  v_product_id uuid;
  v_product_owner uuid;
  v_total numeric(12,2) := 0;
  v_current_stock integer;
  v_product_name text;
  v_inventory_coa uuid;
  v_ap_coa uuid;
begin
  if v_owner_id is null then
    raise exception 'Not authenticated';
  end if;

  select owner_id into v_old_owner from public.purchases where id = p_purchase_id;
  if v_old_owner is null or v_old_owner <> v_owner_id then
    raise exception 'Invalid purchase';
  end if;

  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'A bill needs at least one line item';
  end if;

  if exists (select 1 from public.product_units where purchase_id = p_purchase_id and status <> 'in_stock') then
    raise exception 'Cannot edit this bill: one or more of its serial/IMEI units have already been sold';
  end if;

  for v_old_item in select product_id, quantity from public.purchase_items where purchase_id = p_purchase_id
  loop
    select stock_quantity, name into v_current_stock, v_product_name
    from public.products where id = v_old_item.product_id;

    if v_current_stock < v_old_item.quantity then
      raise exception 'Cannot edit this bill: % has less stock remaining than this bill added — some has already been sold or removed', v_product_name;
    end if;
  end loop;

  -- Reverse old effects
  for v_old_item in select product_id, quantity from public.purchase_items where purchase_id = p_purchase_id
  loop
    update public.products
    set stock_quantity = stock_quantity - v_old_item.quantity
    where id = v_old_item.product_id;
  end loop;

  delete from public.product_units where purchase_id = p_purchase_id;
  delete from public.purchase_items where purchase_id = p_purchase_id;
  perform public.reverse_journal_entries('purchases', p_purchase_id);

  select coalesce(sum((item->>'quantity')::int * (item->>'unit_cost')::numeric), 0)
  into v_total
  from jsonb_array_elements(p_items) as item;

  update public.purchases
  set supplier_id = p_supplier_id,
      reference = p_reference,
      notes = p_notes,
      bill_date = coalesce(p_bill_date, bill_date),
      due_date = p_due_date,
      total_amount = v_total
  where id = p_purchase_id;

  for v_new_item in select * from jsonb_array_elements(p_items)
  loop
    v_product_id := (v_new_item->>'product_id')::uuid;

    select owner_id into v_product_owner from public.products where id = v_product_id;
    if v_product_owner is null or v_product_owner <> v_owner_id then
      raise exception 'Invalid product on this bill';
    end if;

    insert into public.purchase_items (owner_id, purchase_id, product_id, quantity, unit_cost, subtotal)
    values (
      v_owner_id, p_purchase_id, v_product_id,
      (v_new_item->>'quantity')::int,
      (v_new_item->>'unit_cost')::numeric,
      (v_new_item->>'quantity')::int * (v_new_item->>'unit_cost')::numeric
    );

    update public.products
    set stock_quantity = stock_quantity + (v_new_item->>'quantity')::int,
        cost = (v_new_item->>'unit_cost')::numeric
    where id = v_product_id;

    if (v_new_item ? 'serials') then
      for v_serial in select jsonb_array_elements_text(v_new_item->'serials')
      loop
        insert into public.product_units (owner_id, product_id, purchase_id, serial_number, status)
        values (v_owner_id, v_product_id, p_purchase_id, v_serial, 'in_stock');
      end loop;
    end if;
  end loop;

  if v_total > 0 then
    v_inventory_coa := public.ensure_system_account('inventory', 'Inventory', 'asset', 'debit');
    v_ap_coa := public.ensure_system_account('accounts_payable', 'Accounts Payable', 'liability', 'credit');
    perform public.post_journal_entry(
      coalesce(p_bill_date, current_date), coalesce('Bill ' || p_reference, 'Bill'), 'purchases', p_purchase_id,
      jsonb_build_array(
        jsonb_build_object('account_id', v_inventory_coa, 'debit', v_total, 'credit', 0),
        jsonb_build_object('account_id', v_ap_coa, 'debit', 0, 'credit', v_total)
      )
    );
  end if;

  return p_purchase_id;
end;
$$;

grant execute on function public.update_purchase(uuid, uuid, text, text, date, date, jsonb) to authenticated;

-- Deletes a purchase, reversing stock effects. Blocked under the same
-- conditions as update_purchase. A real, manually-linked Pay Bill payment
-- survives, just unlinked (purchase_id set to null via FK).
create or replace function public.delete_purchase(p_purchase_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_id uuid := auth.uid();
  v_old_owner uuid;
  v_old_item record;
  v_current_stock integer;
  v_product_name text;
begin
  if v_owner_id is null then
    raise exception 'Not authenticated';
  end if;

  select owner_id into v_old_owner from public.purchases where id = p_purchase_id;
  if v_old_owner is null or v_old_owner <> v_owner_id then
    raise exception 'Invalid purchase';
  end if;

  if exists (select 1 from public.product_units where purchase_id = p_purchase_id and status <> 'in_stock') then
    raise exception 'Cannot delete this bill: one or more of its serial/IMEI units have already been sold';
  end if;

  for v_old_item in select product_id, quantity from public.purchase_items where purchase_id = p_purchase_id
  loop
    select stock_quantity, name into v_current_stock, v_product_name
    from public.products where id = v_old_item.product_id;

    if v_current_stock < v_old_item.quantity then
      raise exception 'Cannot delete this bill: % has less stock remaining than this bill added — some has already been sold or removed', v_product_name;
    end if;
  end loop;

  for v_old_item in select product_id, quantity from public.purchase_items where purchase_id = p_purchase_id
  loop
    update public.products
    set stock_quantity = stock_quantity - v_old_item.quantity
    where id = v_old_item.product_id;
  end loop;

  delete from public.product_units where purchase_id = p_purchase_id;
  delete from public.purchase_items where purchase_id = p_purchase_id;
  delete from public.purchases where id = p_purchase_id;
  perform public.reverse_journal_entries('purchases', p_purchase_id);
end;
$$;

grant execute on function public.delete_purchase(uuid) to authenticated;

-- Receive payment now optionally links to a specific invoice.
drop function if exists public.receive_payment(uuid, uuid, numeric, text);
drop function if exists public.receive_payment(uuid, uuid, numeric, text, date);

create or replace function public.receive_payment(
  p_customer_id uuid,
  p_account_id uuid,
  p_amount numeric,
  p_note text,
  p_payment_date date default current_date,
  p_sale_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_id uuid := auth.uid();
  v_customer_owner uuid;
  v_account_owner uuid;
  v_transaction_id uuid;
  v_when timestamptz := coalesce(p_payment_date, current_date);
  v_cash_coa uuid;
  v_ar_coa uuid;
  v_code text;
begin
  if v_owner_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Enter an amount greater than 0';
  end if;

  select owner_id into v_customer_owner from public.customers where id = p_customer_id;
  if v_customer_owner is null or v_customer_owner <> v_owner_id then
    raise exception 'Invalid customer';
  end if;

  select owner_id into v_account_owner from public.accounts where id = p_account_id;
  if v_account_owner is null or v_account_owner <> v_owner_id then
    raise exception 'Invalid account';
  end if;

  if p_sale_id is not null then
    if not exists (
      select 1 from public.sales where id = p_sale_id and owner_id = v_owner_id and customer_id = p_customer_id
    ) then
      raise exception 'Invalid invoice for this customer';
    end if;
  end if;

  v_code := 'RCPT' || public.next_sequence_number(v_owner_id, 'customer_payment');

  insert into public.customer_transactions (owner_id, customer_id, type, amount, note, sale_id, created_at, code)
  values (v_owner_id, p_customer_id, 'payment', p_amount, coalesce(p_note, 'Payment received'), p_sale_id, v_when, v_code)
  returning id into v_transaction_id;

  insert into public.account_transactions (owner_id, account_id, type, amount, note, customer_transaction_id, created_at)
  values (v_owner_id, p_account_id, 'deposit', p_amount, coalesce(p_note, 'Payment received'), v_transaction_id, v_when);

  v_cash_coa := public.ensure_account_coa_row(p_account_id);
  v_ar_coa := public.ensure_system_account('accounts_receivable', 'Accounts Receivable', 'asset', 'debit');
  perform public.post_journal_entry(
    coalesce(p_payment_date, current_date), coalesce(p_note, 'Payment received'), 'customer_transactions', v_transaction_id,
    jsonb_build_array(
      jsonb_build_object('account_id', v_cash_coa, 'debit', p_amount, 'credit', 0),
      jsonb_build_object('account_id', v_ar_coa, 'debit', 0, 'credit', p_amount)
    )
  );

  return v_transaction_id;
end;
$$;

grant execute on function public.receive_payment(uuid, uuid, numeric, text, date, uuid) to authenticated;

create or replace function public.update_customer_payment(
  p_payment_id uuid,
  p_account_id uuid,
  p_amount numeric,
  p_note text,
  p_payment_date date,
  p_sale_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_id uuid := auth.uid();
  v_payment_owner uuid;
  v_payment_type text;
  v_customer_id uuid;
  v_account_owner uuid;
  v_when timestamptz := coalesce(p_payment_date, current_date);
  v_cash_coa uuid;
  v_ar_coa uuid;
begin
  if v_owner_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Enter an amount greater than 0';
  end if;

  select owner_id, type, customer_id into v_payment_owner, v_payment_type, v_customer_id
  from public.customer_transactions where id = p_payment_id;

  if v_payment_owner is null or v_payment_owner <> v_owner_id then
    raise exception 'Invalid payment';
  end if;
  if v_payment_type <> 'payment' then
    raise exception 'Only payments can be edited here';
  end if;

  select owner_id into v_account_owner from public.accounts where id = p_account_id;
  if v_account_owner is null or v_account_owner <> v_owner_id then
    raise exception 'Invalid account';
  end if;

  if p_sale_id is not null then
    if not exists (
      select 1 from public.sales where id = p_sale_id and owner_id = v_owner_id and customer_id = v_customer_id
    ) then
      raise exception 'Invalid invoice for this customer';
    end if;
  end if;

  update public.customer_transactions
  set amount = p_amount, note = p_note, created_at = v_when, sale_id = p_sale_id
  where id = p_payment_id;

  update public.account_transactions
  set account_id = p_account_id, amount = p_amount, note = p_note, created_at = v_when
  where customer_transaction_id = p_payment_id;

  perform public.reverse_journal_entries('customer_transactions', p_payment_id);
  v_cash_coa := public.ensure_account_coa_row(p_account_id);
  v_ar_coa := public.ensure_system_account('accounts_receivable', 'Accounts Receivable', 'asset', 'debit');
  perform public.post_journal_entry(
    coalesce(p_payment_date, current_date), coalesce(p_note, 'Payment received'), 'customer_transactions', p_payment_id,
    jsonb_build_array(
      jsonb_build_object('account_id', v_cash_coa, 'debit', p_amount, 'credit', 0),
      jsonb_build_object('account_id', v_ar_coa, 'debit', 0, 'credit', p_amount)
    )
  );
end;
$$;

grant execute on function public.update_customer_payment(uuid, uuid, numeric, text, date, uuid) to authenticated;

create or replace function public.delete_customer_payment(p_payment_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_id uuid := auth.uid();
  v_payment_owner uuid;
  v_payment_type text;
begin
  if v_owner_id is null then
    raise exception 'Not authenticated';
  end if;

  select owner_id, type into v_payment_owner, v_payment_type
  from public.customer_transactions where id = p_payment_id;

  if v_payment_owner is null or v_payment_owner <> v_owner_id then
    raise exception 'Invalid payment';
  end if;
  if v_payment_type <> 'payment' then
    raise exception 'Only payments can be deleted here';
  end if;

  delete from public.account_transactions where customer_transaction_id = p_payment_id;
  delete from public.customer_transactions where id = p_payment_id;
  perform public.reverse_journal_entries('customer_transactions', p_payment_id);
end;
$$;

grant execute on function public.delete_customer_payment(uuid) to authenticated;

-- Pay bill now optionally links to a specific bill.
drop function if exists public.pay_bill(uuid, uuid, numeric, text);
drop function if exists public.pay_bill(uuid, uuid, numeric, text, date);

create or replace function public.pay_bill(
  p_supplier_id uuid,
  p_account_id uuid,
  p_amount numeric,
  p_note text,
  p_payment_date date default current_date,
  p_purchase_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_id uuid := auth.uid();
  v_supplier_owner uuid;
  v_account_owner uuid;
  v_payment_id uuid;
  v_when timestamptz := coalesce(p_payment_date, current_date);
  v_cash_coa uuid;
  v_ap_coa uuid;
  v_code text;
begin
  if v_owner_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Enter an amount greater than 0';
  end if;

  select owner_id into v_supplier_owner from public.suppliers where id = p_supplier_id;
  if v_supplier_owner is null or v_supplier_owner <> v_owner_id then
    raise exception 'Invalid supplier';
  end if;

  select owner_id into v_account_owner from public.accounts where id = p_account_id;
  if v_account_owner is null or v_account_owner <> v_owner_id then
    raise exception 'Invalid account';
  end if;

  if p_purchase_id is not null then
    if not exists (
      select 1 from public.purchases where id = p_purchase_id and owner_id = v_owner_id and supplier_id = p_supplier_id
    ) then
      raise exception 'Invalid bill for this supplier';
    end if;
  end if;

  v_code := 'PAY' || public.next_sequence_number(v_owner_id, 'supplier_payment');

  insert into public.supplier_payments (owner_id, supplier_id, amount, note, purchase_id, created_at, code)
  values (v_owner_id, p_supplier_id, p_amount, coalesce(p_note, 'Bill payment'), p_purchase_id, v_when, v_code)
  returning id into v_payment_id;

  insert into public.account_transactions (owner_id, account_id, type, amount, note, supplier_payment_id, created_at)
  values (v_owner_id, p_account_id, 'withdrawal', p_amount, coalesce(p_note, 'Bill payment'), v_payment_id, v_when);

  v_cash_coa := public.ensure_account_coa_row(p_account_id);
  v_ap_coa := public.ensure_system_account('accounts_payable', 'Accounts Payable', 'liability', 'credit');
  perform public.post_journal_entry(
    coalesce(p_payment_date, current_date), coalesce(p_note, 'Bill payment'), 'supplier_payments', v_payment_id,
    jsonb_build_array(
      jsonb_build_object('account_id', v_ap_coa, 'debit', p_amount, 'credit', 0),
      jsonb_build_object('account_id', v_cash_coa, 'debit', 0, 'credit', p_amount)
    )
  );

  return v_payment_id;
end;
$$;

grant execute on function public.pay_bill(uuid, uuid, numeric, text, date, uuid) to authenticated;

create or replace function public.update_supplier_payment(
  p_payment_id uuid,
  p_account_id uuid,
  p_amount numeric,
  p_note text,
  p_payment_date date,
  p_purchase_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_id uuid := auth.uid();
  v_payment_owner uuid;
  v_supplier_id uuid;
  v_account_owner uuid;
  v_when timestamptz := coalesce(p_payment_date, current_date);
  v_cash_coa uuid;
  v_ap_coa uuid;
begin
  if v_owner_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Enter an amount greater than 0';
  end if;

  select owner_id, supplier_id into v_payment_owner, v_supplier_id
  from public.supplier_payments where id = p_payment_id;

  if v_payment_owner is null or v_payment_owner <> v_owner_id then
    raise exception 'Invalid payment';
  end if;

  select owner_id into v_account_owner from public.accounts where id = p_account_id;
  if v_account_owner is null or v_account_owner <> v_owner_id then
    raise exception 'Invalid account';
  end if;

  if p_purchase_id is not null then
    if not exists (
      select 1 from public.purchases where id = p_purchase_id and owner_id = v_owner_id and supplier_id = v_supplier_id
    ) then
      raise exception 'Invalid bill for this supplier';
    end if;
  end if;

  update public.supplier_payments
  set amount = p_amount, note = p_note, created_at = v_when, purchase_id = p_purchase_id
  where id = p_payment_id;

  update public.account_transactions
  set account_id = p_account_id, amount = p_amount, note = p_note, created_at = v_when
  where supplier_payment_id = p_payment_id;

  perform public.reverse_journal_entries('supplier_payments', p_payment_id);
  v_cash_coa := public.ensure_account_coa_row(p_account_id);
  v_ap_coa := public.ensure_system_account('accounts_payable', 'Accounts Payable', 'liability', 'credit');
  perform public.post_journal_entry(
    coalesce(p_payment_date, current_date), coalesce(p_note, 'Bill payment'), 'supplier_payments', p_payment_id,
    jsonb_build_array(
      jsonb_build_object('account_id', v_ap_coa, 'debit', p_amount, 'credit', 0),
      jsonb_build_object('account_id', v_cash_coa, 'debit', 0, 'credit', p_amount)
    )
  );
end;
$$;

grant execute on function public.update_supplier_payment(uuid, uuid, numeric, text, date, uuid) to authenticated;

create or replace function public.delete_supplier_payment(p_payment_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_id uuid := auth.uid();
  v_payment_owner uuid;
begin
  if v_owner_id is null then
    raise exception 'Not authenticated';
  end if;

  select owner_id into v_payment_owner from public.supplier_payments where id = p_payment_id;
  if v_payment_owner is null or v_payment_owner <> v_owner_id then
    raise exception 'Invalid payment';
  end if;

  delete from public.account_transactions where supplier_payment_id = p_payment_id;
  delete from public.supplier_payments where id = p_payment_id;
  perform public.reverse_journal_entries('supplier_payments', p_payment_id);
end;
$$;

grant execute on function public.delete_supplier_payment(uuid) to authenticated;

-- Double-entry bookkeeping: Chart of Accounts + journal entries ----------
-- This is additive and does NOT replace any of the tables/views above —
-- those remain the source of truth for stock, per-customer/supplier
-- balances, invoice/bill lists, and the FIFO/weighted-average Income
-- Statement. Every money-moving RPC below now *also* posts a balanced
-- journal entry as a side effect, so a real General Ledger / Trial
-- Balance / T-account view can be built on top, matching the standard
-- pattern of subsidiary ledgers feeding General Ledger control accounts.

create table if not exists public.chart_of_accounts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text not null check (type in ('asset', 'liability', 'equity', 'income', 'expense')),
  normal_balance text not null check (normal_balance in ('debit', 'credit')),
  -- system_key identifies a control account (e.g. 'accounts_receivable');
  -- account_id links a 1:1 row mirroring a real cash/bank account;
  -- category links a 1:1 row mirroring a distinct expenses.category value.
  -- Exactly one of the three is set per row.
  system_key text,
  account_id uuid references public.accounts(id) on delete cascade,
  category text,
  created_at timestamptz not null default now()
);

create index if not exists chart_of_accounts_owner_id_idx on public.chart_of_accounts(owner_id);
create unique index if not exists chart_of_accounts_owner_system_key_idx
  on public.chart_of_accounts(owner_id, system_key) where system_key is not null;
create unique index if not exists chart_of_accounts_owner_account_id_idx
  on public.chart_of_accounts(owner_id, account_id) where account_id is not null;
create unique index if not exists chart_of_accounts_owner_category_idx
  on public.chart_of_accounts(owner_id, category) where category is not null;

alter table public.chart_of_accounts enable row level security;

drop policy if exists "Users can view own chart of accounts" on public.chart_of_accounts;
create policy "Users can view own chart of accounts"
  on public.chart_of_accounts for select
  using (auth.uid() = owner_id);

create table if not exists public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  entry_date date not null default current_date,
  memo text,
  -- Polymorphic pointer back to whatever row generated this entry
  -- (e.g. source_table='sales', source_id=<sale id>). Not a real FK
  -- since it can point at several different tables.
  source_table text,
  source_id uuid,
  created_at timestamptz not null default now()
);

create index if not exists journal_entries_owner_id_idx on public.journal_entries(owner_id);
create index if not exists journal_entries_source_idx on public.journal_entries(source_table, source_id);

alter table public.journal_entries enable row level security;

drop policy if exists "Users can view own journal entries" on public.journal_entries;
create policy "Users can view own journal entries"
  on public.journal_entries for select
  using (auth.uid() = owner_id);

create table if not exists public.journal_entry_lines (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  entry_id uuid not null references public.journal_entries(id) on delete cascade,
  account_id uuid not null references public.chart_of_accounts(id) on delete restrict,
  debit numeric(12,2) not null default 0 check (debit >= 0),
  credit numeric(12,2) not null default 0 check (credit >= 0),
  created_at timestamptz not null default now(),
  check (debit = 0 or credit = 0),
  check (debit > 0 or credit > 0)
);

create index if not exists journal_entry_lines_owner_id_idx on public.journal_entry_lines(owner_id);
create index if not exists journal_entry_lines_entry_id_idx on public.journal_entry_lines(entry_id);
create index if not exists journal_entry_lines_account_id_idx on public.journal_entry_lines(account_id);

alter table public.journal_entry_lines enable row level security;

drop policy if exists "Users can view own journal entry lines" on public.journal_entry_lines;
create policy "Users can view own journal entry lines"
  on public.journal_entry_lines for select
  using (auth.uid() = owner_id);

-- Sales lock in the product's cost at the moment of sale, so COGS journal
-- entries (and any future edit/reversal) reflect cost-at-time-of-sale
-- rather than whatever the product's cost has drifted to since.
alter table public.sale_items add column if not exists unit_cost numeric(12,2);

-- Lazily get-or-create a named control account (Accounts Receivable,
-- Accounts Payable, Inventory, Sales Revenue, COGS, Opening Balance
-- Equity, Undeposited Funds, ...). Idempotent per owner.
create or replace function public.ensure_system_account(
  p_system_key text,
  p_name text,
  p_type text,
  p_normal_balance text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_id uuid := auth.uid();
  v_id uuid;
begin
  if v_owner_id is null then
    raise exception 'Not authenticated';
  end if;

  select id into v_id from public.chart_of_accounts
  where owner_id = v_owner_id and system_key = p_system_key;

  if v_id is not null then
    return v_id;
  end if;

  insert into public.chart_of_accounts (owner_id, name, type, normal_balance, system_key)
  values (v_owner_id, p_name, p_type, p_normal_balance, p_system_key)
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.ensure_system_account(text, text, text, text) to authenticated;

-- Lazily get-or-create the asset COA row mirroring a real cash/bank account.
create or replace function public.ensure_account_coa_row(p_account_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_id uuid := auth.uid();
  v_id uuid;
  v_name text;
begin
  if v_owner_id is null then
    raise exception 'Not authenticated';
  end if;

  select id into v_id from public.chart_of_accounts
  where owner_id = v_owner_id and account_id = p_account_id;

  if v_id is not null then
    return v_id;
  end if;

  select name into v_name from public.accounts where id = p_account_id and owner_id = v_owner_id;
  if v_name is null then
    raise exception 'Invalid account';
  end if;

  insert into public.chart_of_accounts (owner_id, name, type, normal_balance, account_id)
  values (v_owner_id, v_name, 'asset', 'debit', p_account_id)
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.ensure_account_coa_row(uuid) to authenticated;

-- Lazily get-or-create an expense COA row per distinct expenses.category
-- string (categories are free text, not a fixed list).
create or replace function public.ensure_expense_category_account(p_category text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_id uuid := auth.uid();
  v_id uuid;
  v_category text := trim(coalesce(p_category, ''));
begin
  if v_owner_id is null then
    raise exception 'Not authenticated';
  end if;
  if v_category = '' then
    raise exception 'Category required';
  end if;

  select id into v_id from public.chart_of_accounts
  where owner_id = v_owner_id and category = v_category;

  if v_id is not null then
    return v_id;
  end if;

  insert into public.chart_of_accounts (owner_id, name, type, normal_balance, category)
  values (v_owner_id, v_category, 'expense', 'debit', v_category)
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.ensure_expense_category_account(text) to authenticated;

-- The one place double-entry is actually enforced: p_lines must balance
-- (sum(debit) = sum(credit)) or the whole entry is rejected.
-- p_lines shape: [{ "account_id": uuid, "debit": numeric, "credit": numeric }, ...]
create or replace function public.post_journal_entry(
  p_entry_date date,
  p_memo text,
  p_source_table text,
  p_source_id uuid,
  p_lines jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_id uuid := auth.uid();
  v_entry_id uuid;
  v_line jsonb;
  v_total_debit numeric(12,2) := 0;
  v_total_credit numeric(12,2) := 0;
begin
  if v_owner_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_lines is null or jsonb_array_length(p_lines) < 2 then
    raise exception 'A journal entry needs at least two lines';
  end if;

  select
    coalesce(sum((line->>'debit')::numeric), 0),
    coalesce(sum((line->>'credit')::numeric), 0)
  into v_total_debit, v_total_credit
  from jsonb_array_elements(p_lines) as line;

  if round(v_total_debit, 2) <> round(v_total_credit, 2) then
    raise exception 'Journal entry is not balanced: debits % vs credits %', v_total_debit, v_total_credit;
  end if;

  insert into public.journal_entries (owner_id, entry_date, memo, source_table, source_id)
  values (v_owner_id, coalesce(p_entry_date, current_date), p_memo, p_source_table, p_source_id)
  returning id into v_entry_id;

  for v_line in select * from jsonb_array_elements(p_lines)
  loop
    insert into public.journal_entry_lines (owner_id, entry_id, account_id, debit, credit)
    values (
      v_owner_id, v_entry_id, (v_line->>'account_id')::uuid,
      coalesce((v_line->>'debit')::numeric, 0), coalesce((v_line->>'credit')::numeric, 0)
    );
  end loop;

  return v_entry_id;
end;
$$;

grant execute on function public.post_journal_entry(date, text, text, uuid, jsonb) to authenticated;

-- Deletes every journal entry generated by a given source row (cascades to
-- its lines). Called by every update/delete RPC before reapplying, mirroring
-- the reverse-then-reapply pattern already used for sales/purchases above.
create or replace function public.reverse_journal_entries(p_source_table text, p_source_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_id uuid := auth.uid();
begin
  if v_owner_id is null then
    raise exception 'Not authenticated';
  end if;

  delete from public.journal_entries
  where owner_id = v_owner_id and source_table = p_source_table and source_id = p_source_id;
end;
$$;

grant execute on function public.reverse_journal_entries(text, uuid) to authenticated;

-- Accounts and products are created via plain client-side inserts (not an
-- RPC), so an opening balance / opening stock quantity needs a trigger to
-- get its offsetting Opening Balance Equity entry instead of an RPC call.

create or replace function public.post_account_opening_balance()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cash_coa uuid;
  v_equity_coa uuid;
  v_value numeric(12,2);
begin
  if new.opening_balance is null or new.opening_balance = 0 then
    return new;
  end if;

  v_cash_coa := public.ensure_account_coa_row(new.id);
  v_equity_coa := public.ensure_system_account(
    'opening_balance_equity', 'Opening Balance Equity', 'equity', 'credit'
  );
  v_value := abs(new.opening_balance);

  if new.opening_balance > 0 then
    perform public.post_journal_entry(
      current_date, 'Opening balance: ' || new.name, 'accounts', new.id,
      jsonb_build_array(
        jsonb_build_object('account_id', v_cash_coa, 'debit', v_value, 'credit', 0),
        jsonb_build_object('account_id', v_equity_coa, 'debit', 0, 'credit', v_value)
      )
    );
  else
    perform public.post_journal_entry(
      current_date, 'Opening balance: ' || new.name, 'accounts', new.id,
      jsonb_build_array(
        jsonb_build_object('account_id', v_equity_coa, 'debit', v_value, 'credit', 0),
        jsonb_build_object('account_id', v_cash_coa, 'debit', 0, 'credit', v_value)
      )
    );
  end if;

  return new;
end;
$$;

drop trigger if exists post_account_opening_balance_trigger on public.accounts;
create trigger post_account_opening_balance_trigger
  after insert on public.accounts
  for each row execute function public.post_account_opening_balance();

create or replace function public.cleanup_account_journal_entries()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.journal_entries where owner_id = old.owner_id and source_table = 'accounts' and source_id = old.id;
  return old;
end;
$$;

drop trigger if exists cleanup_account_journal_entries_trigger on public.accounts;
create trigger cleanup_account_journal_entries_trigger
  before delete on public.accounts
  for each row execute function public.cleanup_account_journal_entries();

create or replace function public.post_product_opening_stock()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inventory_coa uuid;
  v_equity_coa uuid;
  v_value numeric(12,2);
begin
  if new.stock_quantity is null or new.stock_quantity <= 0 then
    return new;
  end if;

  v_value := new.stock_quantity * coalesce(new.cost, 0);
  if v_value <= 0 then
    return new;
  end if;

  v_inventory_coa := public.ensure_system_account('inventory', 'Inventory', 'asset', 'debit');
  v_equity_coa := public.ensure_system_account(
    'opening_balance_equity', 'Opening Balance Equity', 'equity', 'credit'
  );

  perform public.post_journal_entry(
    current_date, 'Opening stock: ' || new.name, 'products', new.id,
    jsonb_build_array(
      jsonb_build_object('account_id', v_inventory_coa, 'debit', v_value, 'credit', 0),
      jsonb_build_object('account_id', v_equity_coa, 'debit', 0, 'credit', v_value)
    )
  );

  return new;
end;
$$;

drop trigger if exists post_product_opening_stock_trigger on public.products;
create trigger post_product_opening_stock_trigger
  after insert on public.products
  for each row execute function public.post_product_opening_stock();

create or replace function public.cleanup_product_journal_entries()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.journal_entries where owner_id = old.owner_id and source_table = 'products' and source_id = old.id;
  return old;
end;
$$;

drop trigger if exists cleanup_product_journal_entries_trigger on public.products;
create trigger cleanup_product_journal_entries_trigger
  before delete on public.products
  for each row execute function public.cleanup_product_journal_entries();

-- Once an account has real posted journal history, journal_entry_lines'
-- "on delete restrict" blocks deleting it (protecting ledger integrity,
-- a deliberate tightening vs. the previous silent cascade). This wraps
-- that into a friendly error instead of a raw FK violation.
create or replace function public.delete_account(p_account_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_id uuid := auth.uid();
  v_owner uuid;
begin
  if v_owner_id is null then
    raise exception 'Not authenticated';
  end if;

  select owner_id into v_owner from public.accounts where id = p_account_id;
  if v_owner is null or v_owner <> v_owner_id then
    raise exception 'Invalid account';
  end if;

  begin
    delete from public.accounts where id = p_account_id;
  exception
    when foreign_key_violation then
      raise exception 'Cannot delete this account: it has real transaction history posted to the ledger. Remove those transactions first.';
  end;
end;
$$;

grant execute on function public.delete_account(uuid) to authenticated;

-- Current balance per chart-of-accounts row, in that account's own normal-
-- balance direction (so a positive number always means "as expected" for
-- that account type — an asset/expense account normally sits debit-positive,
-- a liability/equity/income account normally sits credit-positive).
drop view if exists public.chart_of_accounts_balances;
create view public.chart_of_accounts_balances
with (security_invoker = true) as
select
  coa.id as coa_id,
  coa.owner_id,
  coa.name,
  coa.type,
  coa.normal_balance,
  coa.system_key,
  coa.account_id,
  coa.category,
  coalesce(sum(jel.debit), 0) as total_debit,
  coalesce(sum(jel.credit), 0) as total_credit,
  case when coa.normal_balance = 'debit'
    then coalesce(sum(jel.debit), 0) - coalesce(sum(jel.credit), 0)
    else coalesce(sum(jel.credit), 0) - coalesce(sum(jel.debit), 0)
  end as balance
from public.chart_of_accounts coa
left join public.journal_entry_lines jel on jel.account_id = coa.id
group by coa.id, coa.owner_id, coa.name, coa.type, coa.normal_balance, coa.system_key, coa.account_id, coa.category;

grant select on public.chart_of_accounts_balances to authenticated;

-- One-time (but safely re-runnable) backfill: walks every account, product,
-- purchase, sale, payment, and expense the current user already has and
-- posts the equivalent journal entry for anything that predates this
-- feature, so the General Ledger / Trial Balance are complete from day
-- one. Idempotent — skips anything that already has a journal entry.
create or replace function public.backfill_journal_entries()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_id uuid := auth.uid();
  v_acc record;
  v_prod record;
  v_purch record;
  v_sale record;
  v_item record;
  v_pay record;
  v_exp record;
  v_cash_coa uuid;
  v_equity_coa uuid;
  v_inventory_coa uuid;
  v_ap_coa uuid;
  v_ar_coa uuid;
  v_revenue_coa uuid;
  v_cogs_coa uuid;
  v_expense_coa uuid;
  v_value numeric(12,2);
  v_cogs numeric(12,2);
  v_lines jsonb;
  v_account_id uuid;
begin
  if v_owner_id is null then
    raise exception 'Not authenticated';
  end if;

  -- 1. Account opening balances
  for v_acc in select * from public.accounts where owner_id = v_owner_id
  loop
    if v_acc.opening_balance is not null and v_acc.opening_balance <> 0
       and not exists (
         select 1 from public.journal_entries
         where owner_id = v_owner_id and source_table = 'accounts' and source_id = v_acc.id
       )
    then
      v_cash_coa := public.ensure_account_coa_row(v_acc.id);
      v_equity_coa := public.ensure_system_account(
        'opening_balance_equity', 'Opening Balance Equity', 'equity', 'credit'
      );
      v_value := abs(v_acc.opening_balance);
      if v_acc.opening_balance > 0 then
        perform public.post_journal_entry(
          v_acc.created_at::date, 'Opening balance: ' || v_acc.name, 'accounts', v_acc.id,
          jsonb_build_array(
            jsonb_build_object('account_id', v_cash_coa, 'debit', v_value, 'credit', 0),
            jsonb_build_object('account_id', v_equity_coa, 'debit', 0, 'credit', v_value)
          )
        );
      else
        perform public.post_journal_entry(
          v_acc.created_at::date, 'Opening balance: ' || v_acc.name, 'accounts', v_acc.id,
          jsonb_build_array(
            jsonb_build_object('account_id', v_equity_coa, 'debit', v_value, 'credit', 0),
            jsonb_build_object('account_id', v_cash_coa, 'debit', 0, 'credit', v_value)
          )
        );
      end if;
    end if;
  end loop;

  -- 2. Derived product opening stock: the only quantity consistent with
  -- today's stock_quantity plus everything ever purchased/sold since.
  for v_prod in
    select p.id, p.name, p.created_at, p.cost,
      p.stock_quantity
        - coalesce((select sum(quantity) from public.purchase_items where product_id = p.id), 0)
        + coalesce((select sum(quantity) from public.sale_items where product_id = p.id), 0)
      as opening_qty
    from public.products p
    where p.owner_id = v_owner_id
  loop
    if v_prod.opening_qty > 0
       and not exists (
         select 1 from public.journal_entries
         where owner_id = v_owner_id and source_table = 'products' and source_id = v_prod.id
       )
    then
      v_value := v_prod.opening_qty * coalesce(v_prod.cost, 0);
      if v_value > 0 then
        v_inventory_coa := public.ensure_system_account('inventory', 'Inventory', 'asset', 'debit');
        v_equity_coa := public.ensure_system_account(
          'opening_balance_equity', 'Opening Balance Equity', 'equity', 'credit'
        );
        perform public.post_journal_entry(
          v_prod.created_at::date, 'Opening stock: ' || v_prod.name, 'products', v_prod.id,
          jsonb_build_array(
            jsonb_build_object('account_id', v_inventory_coa, 'debit', v_value, 'credit', 0),
            jsonb_build_object('account_id', v_equity_coa, 'debit', 0, 'credit', v_value)
          )
        );
      end if;
    end if;
  end loop;

  -- 3. Purchases
  for v_purch in select * from public.purchases where owner_id = v_owner_id
  loop
    if v_purch.total_amount > 0
       and not exists (
         select 1 from public.journal_entries
         where owner_id = v_owner_id and source_table = 'purchases' and source_id = v_purch.id
       )
    then
      v_inventory_coa := public.ensure_system_account('inventory', 'Inventory', 'asset', 'debit');
      v_ap_coa := public.ensure_system_account('accounts_payable', 'Accounts Payable', 'liability', 'credit');
      perform public.post_journal_entry(
        v_purch.bill_date, coalesce('Bill ' || v_purch.reference, 'Bill'), 'purchases', v_purch.id,
        jsonb_build_array(
          jsonb_build_object('account_id', v_inventory_coa, 'debit', v_purch.total_amount, 'credit', 0),
          jsonb_build_object('account_id', v_ap_coa, 'debit', 0, 'credit', v_purch.total_amount)
        )
      );
    end if;
  end loop;

  -- 4. Sales (COGS uses sale_items.unit_cost where present, else falls
  -- back to the product's current cost as a best-effort proxy for sales
  -- that predate that column — an approximation only for pre-existing data).
  for v_sale in select * from public.sales where owner_id = v_owner_id
  loop
    if v_sale.total_amount > 0
       and not exists (
         select 1 from public.journal_entries
         where owner_id = v_owner_id and source_table = 'sales' and source_id = v_sale.id
       )
    then
      v_cogs := 0;
      for v_item in
        select si.quantity, coalesce(si.unit_cost, p.cost, 0) as cost
        from public.sale_items si
        join public.products p on p.id = si.product_id
        where si.sale_id = v_sale.id
      loop
        v_cogs := v_cogs + v_item.quantity * v_item.cost;
      end loop;

      v_revenue_coa := public.ensure_system_account('sales_revenue', 'Sales Revenue', 'income', 'credit');
      v_lines := '[]'::jsonb;

      if v_sale.type = 'invoice' then
        v_ar_coa := public.ensure_system_account('accounts_receivable', 'Accounts Receivable', 'asset', 'debit');
        v_lines := v_lines || jsonb_build_array(
          jsonb_build_object('account_id', v_ar_coa, 'debit', v_sale.total_amount, 'credit', 0)
        );
      else
        if v_sale.deposit_account_id is not null then
          v_cash_coa := public.ensure_account_coa_row(v_sale.deposit_account_id);
        else
          v_cash_coa := public.ensure_system_account('undeposited_funds', 'Undeposited Funds', 'asset', 'debit');
        end if;
        v_lines := v_lines || jsonb_build_array(
          jsonb_build_object('account_id', v_cash_coa, 'debit', v_sale.total_amount, 'credit', 0)
        );
      end if;

      v_lines := v_lines || jsonb_build_array(
        jsonb_build_object('account_id', v_revenue_coa, 'debit', 0, 'credit', v_sale.total_amount)
      );

      if v_cogs > 0 then
        v_cogs_coa := public.ensure_system_account('cogs', 'Cost of Goods Sold', 'expense', 'debit');
        v_inventory_coa := public.ensure_system_account('inventory', 'Inventory', 'asset', 'debit');
        v_lines := v_lines || jsonb_build_array(
          jsonb_build_object('account_id', v_cogs_coa, 'debit', v_cogs, 'credit', 0),
          jsonb_build_object('account_id', v_inventory_coa, 'debit', 0, 'credit', v_cogs)
        );
      end if;

      perform public.post_journal_entry(
        v_sale.sale_date,
        case when v_sale.type = 'invoice'
          then coalesce('Invoice ' || v_sale.reference, 'Invoice')
          else coalesce('Sale receipt ' || v_sale.reference, 'Sale receipt')
        end,
        'sales', v_sale.id, v_lines
      );
    end if;
  end loop;

  -- 5. Customer payments (account inferred via the existing
  -- account_transactions.customer_transaction_id link)
  for v_pay in select * from public.customer_transactions where owner_id = v_owner_id and type = 'payment'
  loop
    if not exists (
      select 1 from public.journal_entries
      where owner_id = v_owner_id and source_table = 'customer_transactions' and source_id = v_pay.id
    ) then
      select account_id into v_account_id from public.account_transactions
      where customer_transaction_id = v_pay.id limit 1;

      if v_account_id is not null then
        v_cash_coa := public.ensure_account_coa_row(v_account_id);
        v_ar_coa := public.ensure_system_account('accounts_receivable', 'Accounts Receivable', 'asset', 'debit');
        perform public.post_journal_entry(
          v_pay.created_at::date, coalesce(v_pay.note, 'Payment received'), 'customer_transactions', v_pay.id,
          jsonb_build_array(
            jsonb_build_object('account_id', v_cash_coa, 'debit', v_pay.amount, 'credit', 0),
            jsonb_build_object('account_id', v_ar_coa, 'debit', 0, 'credit', v_pay.amount)
          )
        );
      end if;
    end if;
  end loop;

  -- 6. Supplier payments (account inferred via account_transactions.supplier_payment_id)
  for v_pay in select * from public.supplier_payments where owner_id = v_owner_id
  loop
    if not exists (
      select 1 from public.journal_entries
      where owner_id = v_owner_id and source_table = 'supplier_payments' and source_id = v_pay.id
    ) then
      select account_id into v_account_id from public.account_transactions
      where supplier_payment_id = v_pay.id limit 1;

      if v_account_id is not null then
        v_cash_coa := public.ensure_account_coa_row(v_account_id);
        v_ap_coa := public.ensure_system_account('accounts_payable', 'Accounts Payable', 'liability', 'credit');
        perform public.post_journal_entry(
          v_pay.created_at::date, coalesce(v_pay.note, 'Bill payment'), 'supplier_payments', v_pay.id,
          jsonb_build_array(
            jsonb_build_object('account_id', v_ap_coa, 'debit', v_pay.amount, 'credit', 0),
            jsonb_build_object('account_id', v_cash_coa, 'debit', 0, 'credit', v_pay.amount)
          )
        );
      end if;
    end if;
  end loop;

  -- 7. Expenses (already have a direct account_id column)
  for v_exp in select * from public.expenses where owner_id = v_owner_id
  loop
    if v_exp.account_id is not null
       and not exists (
         select 1 from public.journal_entries
         where owner_id = v_owner_id and source_table = 'expenses' and source_id = v_exp.id
       )
    then
      v_expense_coa := public.ensure_expense_category_account(v_exp.category);
      v_cash_coa := public.ensure_account_coa_row(v_exp.account_id);
      perform public.post_journal_entry(
        v_exp.expense_date, v_exp.category || coalesce(': ' || nullif(v_exp.description, ''), ''),
        'expenses', v_exp.id,
        jsonb_build_array(
          jsonb_build_object('account_id', v_expense_coa, 'debit', v_exp.amount, 'credit', 0),
          jsonb_build_object('account_id', v_cash_coa, 'debit', 0, 'credit', v_exp.amount)
        )
      );
    end if;
  end loop;
end;
$$;

grant execute on function public.backfill_journal_entries() to authenticated;

-- Auto-generated, sequential, per-owner record numbers -------------------
-- (S1/S2/... for invoices, R1/R2/... for receipts, B1/B2/... for bills,
-- C1/C2/... for customers, P1/P2/... for products (via sku), RCPT1/RCPT2/...
-- for payments received, PAY1/PAY2/... for bill payments made). Each prefix
-- is its own independent counter per owner, assigned atomically so two
-- concurrent creates can never collide or skip.

create table if not exists public.sequence_counters (
  owner_id uuid not null references auth.users(id) on delete cascade,
  key text not null,
  next_value integer not null default 1,
  primary key (owner_id, key)
);

alter table public.sequence_counters enable row level security;

drop policy if exists "Users can view own sequence counters" on public.sequence_counters;
create policy "Users can view own sequence counters"
  on public.sequence_counters for select
  using (auth.uid() = owner_id);

-- Atomically returns the next integer for (owner_id, key), starting at 1.
-- Safe under concurrent calls: the ON CONFLICT DO UPDATE takes a row lock,
-- serializing simultaneous requests for the same counter.
create or replace function public.next_sequence_number(p_owner_id uuid, p_key text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_next integer;
begin
  insert into public.sequence_counters (owner_id, key, next_value)
  values (p_owner_id, p_key, 2)
  on conflict (owner_id, key) do update set next_value = public.sequence_counters.next_value + 1
  returning next_value - 1 into v_next;

  return v_next;
end;
$$;

grant execute on function public.next_sequence_number(uuid, text) to authenticated;

-- Customers and products are created via plain client-side inserts, so a
-- code/sku is assigned by a trigger when the user leaves it blank (their
-- own value, if provided, is always respected).
alter table public.customers add column if not exists code text;
create unique index if not exists customers_owner_code_idx
  on public.customers(owner_id, code) where code is not null;

create or replace function public.assign_customer_code()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.code is null or trim(new.code) = '' then
    new.code := 'C' || public.next_sequence_number(new.owner_id, 'customer');
  end if;
  return new;
end;
$$;

drop trigger if exists assign_customer_code_trigger on public.customers;
create trigger assign_customer_code_trigger
  before insert on public.customers
  for each row execute function public.assign_customer_code();

create or replace function public.assign_product_sku()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.sku is null or trim(new.sku) = '' then
    new.sku := 'P' || public.next_sequence_number(new.owner_id, 'product');
  end if;
  return new;
end;
$$;

drop trigger if exists assign_product_sku_trigger on public.products;
create trigger assign_product_sku_trigger
  before insert on public.products
  for each row execute function public.assign_product_sku();

-- Customer/supplier payments get their own code column (they never had a
-- reference field before); bills and sales reuse their existing reference
-- column, assigned inside create_purchase/create_sale below.
alter table public.customer_transactions add column if not exists code text;
create unique index if not exists customer_transactions_owner_code_idx
  on public.customer_transactions(owner_id, code) where code is not null;

alter table public.supplier_payments add column if not exists code text;
create unique index if not exists supplier_payments_owner_code_idx
  on public.supplier_payments(owner_id, code) where code is not null;

-- One-time (safely re-runnable) backfill: assigns a code/reference, in
-- creation order, to every existing customer/product/purchase/sale/payment
-- that predates this feature and doesn't have one yet.
create or replace function public.backfill_record_codes()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_id uuid := auth.uid();
  v_row record;
begin
  if v_owner_id is null then
    raise exception 'Not authenticated';
  end if;

  for v_row in
    select id from public.customers
    where owner_id = v_owner_id and (code is null or trim(code) = '')
    order by created_at asc
  loop
    update public.customers set code = 'C' || public.next_sequence_number(v_owner_id, 'customer')
    where id = v_row.id;
  end loop;

  for v_row in
    select id from public.products
    where owner_id = v_owner_id and (sku is null or trim(sku) = '')
    order by created_at asc
  loop
    update public.products set sku = 'P' || public.next_sequence_number(v_owner_id, 'product')
    where id = v_row.id;
  end loop;

  for v_row in
    select id from public.purchases
    where owner_id = v_owner_id and (reference is null or trim(reference) = '')
    order by created_at asc
  loop
    update public.purchases set reference = 'B' || public.next_sequence_number(v_owner_id, 'purchase')
    where id = v_row.id;
  end loop;

  for v_row in
    select id, type from public.sales
    where owner_id = v_owner_id and (reference is null or trim(reference) = '')
    order by created_at asc
  loop
    update public.sales
    set reference = (case when v_row.type = 'invoice' then 'S' else 'R' end)
      || public.next_sequence_number(v_owner_id, v_row.type)
    where id = v_row.id;
  end loop;

  for v_row in
    select id from public.customer_transactions
    where owner_id = v_owner_id and type = 'payment' and (code is null or trim(code) = '')
    order by created_at asc
  loop
    update public.customer_transactions set code = 'RCPT' || public.next_sequence_number(v_owner_id, 'customer_payment')
    where id = v_row.id;
  end loop;

  for v_row in
    select id from public.supplier_payments
    where owner_id = v_owner_id and (code is null or trim(code) = '')
    order by created_at asc
  loop
    update public.supplier_payments set code = 'PAY' || public.next_sequence_number(v_owner_id, 'supplier_payment')
    where id = v_row.id;
  end loop;
end;
$$;

grant execute on function public.backfill_record_codes() to authenticated;
