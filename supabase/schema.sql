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
begin
  if v_owner_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'A bill needs at least one line item';
  end if;

  select coalesce(sum((item->>'quantity')::int * (item->>'unit_cost')::numeric), 0)
  into v_total
  from jsonb_array_elements(p_items) as item;

  insert into public.purchases (owner_id, supplier_id, reference, notes, total_amount, bill_date, due_date)
  values (v_owner_id, p_supplier_id, p_reference, p_notes, v_total, coalesce(p_bill_date, current_date), p_due_date)
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

-- Atomically records a sale: inserts the sale, its line items, reduces
-- product stock, marks any selected serial/IMEI units as sold, and — for
-- invoices — charges the customer's balance (receipts settle instantly
-- so they charge and immediately pay off the same amount, net zero, purely
-- so it still shows up in the customer's transaction history). Sales
-- receipts deposit into a real account rather than a free-text label.
-- p_items shape: [{ "product_id": uuid, "quantity": int, "unit_price": numeric, "unit_ids": [uuid, ...]? }]
alter table public.sales add column if not exists deposit_account_id uuid references public.accounts(id) on delete set null;

drop function if exists public.create_sale(uuid, text, text, text, date, date, text, jsonb);

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

  select coalesce(sum((item->>'quantity')::int * (item->>'unit_price')::numeric), 0)
  into v_total
  from jsonb_array_elements(p_items) as item;

  insert into public.sales (owner_id, customer_id, type, reference, notes, sale_date, due_date, deposit_account_id, total_amount)
  values (
    v_owner_id, p_customer_id, p_type, p_reference, p_notes,
    coalesce(p_sale_date, current_date), p_due_date, p_deposit_account_id, v_total
  )
  returning id into v_sale_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_product_id := (v_item->>'product_id')::uuid;

    select owner_id, stock_quantity, tracks_serial
    into v_product_owner, v_stock, v_tracks_serial
    from public.products
    where id = v_product_id;

    if v_product_owner is null or v_product_owner <> v_owner_id then
      raise exception 'Invalid product on this sale';
    end if;

    if v_stock < (v_item->>'quantity')::int then
      raise exception 'Not enough stock for one of the products on this sale';
    end if;

    insert into public.sale_items (owner_id, sale_id, product_id, quantity, unit_price, subtotal)
    values (
      v_owner_id,
      v_sale_id,
      v_product_id,
      (v_item->>'quantity')::int,
      (v_item->>'unit_price')::numeric,
      (v_item->>'quantity')::int * (v_item->>'unit_price')::numeric
    );

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
      insert into public.customer_transactions (owner_id, customer_id, type, amount, note)
      values (v_owner_id, p_customer_id, 'charge', v_total, coalesce('Invoice ' || p_reference, 'Invoice'));
    elsif p_type = 'receipt' then
      insert into public.customer_transactions (owner_id, customer_id, type, amount, note)
      values (v_owner_id, p_customer_id, 'charge', v_total, coalesce('Sale receipt ' || p_reference, 'Sale receipt'));
      insert into public.customer_transactions (owner_id, customer_id, type, amount, note)
      values (v_owner_id, p_customer_id, 'payment', v_total, 'Paid in full at time of sale');
    end if;
  end if;

  if p_type = 'receipt' and p_deposit_account_id is not null then
    insert into public.account_transactions (owner_id, account_id, type, amount, note, sale_id)
    values (v_owner_id, p_deposit_account_id, 'deposit', v_total, coalesce('Sale receipt ' || p_reference, 'Sale receipt'), v_sale_id);
  end if;

  return v_sale_id;
end;
$$;

grant execute on function public.create_sale(uuid, text, text, text, date, date, uuid, jsonb) to authenticated;

-- Receive payment: a customer pays down their balance, money lands in an account.
drop function if exists public.receive_payment(uuid, uuid, numeric, text);
drop function if exists public.receive_payment(uuid, uuid, numeric, text, date);

create or replace function public.receive_payment(
  p_customer_id uuid,
  p_account_id uuid,
  p_amount numeric,
  p_note text,
  p_payment_date date default current_date
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

  insert into public.customer_transactions (owner_id, customer_id, type, amount, note, created_at)
  values (v_owner_id, p_customer_id, 'payment', p_amount, coalesce(p_note, 'Payment received'), v_when)
  returning id into v_transaction_id;

  insert into public.account_transactions (owner_id, account_id, type, amount, note, created_at)
  values (v_owner_id, p_account_id, 'deposit', p_amount, coalesce(p_note, 'Payment received'), v_when);

  return v_transaction_id;
end;
$$;

grant execute on function public.receive_payment(uuid, uuid, numeric, text, date) to authenticated;

-- Pay bill: pay down a supplier balance, money leaves an account.
drop function if exists public.pay_bill(uuid, uuid, numeric, text);
drop function if exists public.pay_bill(uuid, uuid, numeric, text, date);

create or replace function public.pay_bill(
  p_supplier_id uuid,
  p_account_id uuid,
  p_amount numeric,
  p_note text,
  p_payment_date date default current_date
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

  insert into public.supplier_payments (owner_id, supplier_id, amount, note, created_at)
  values (v_owner_id, p_supplier_id, p_amount, coalesce(p_note, 'Bill payment'), v_when)
  returning id into v_payment_id;

  insert into public.account_transactions (owner_id, account_id, type, amount, note, created_at)
  values (v_owner_id, p_account_id, 'withdrawal', p_amount, coalesce(p_note, 'Bill payment'), v_when);

  return v_payment_id;
end;
$$;

grant execute on function public.pay_bill(uuid, uuid, numeric, text, date) to authenticated;
