-- ============================================================
-- BossBooks: Notifications — balance alerts + bills/invoices due
-- Run this once in the Supabase SQL Editor.
-- ============================================================

-- Re-declare account_balances to add company_id, same trailing-column
-- technique already used for sale_balances/purchase_balances/
-- customer_balances/supplier_balances (create or replace view can only
-- append columns, not reorder/insert among existing ones). Purely
-- additive — security_invoker = true means RLS on the underlying tables
-- still fully applies for every existing owner/staff-facing page already
-- reading this view; only the new cron job (service-role, needs to filter
-- by an explicit target company) requires this.
create or replace view public.account_balances
with (security_invoker = true) as
select
  a.id as account_id,
  a.owner_id,
  a.name,
  a.type,
  a.opening_balance,
  a.opening_balance + coalesce(sum(
    case when t.type = 'deposit' then t.amount else -t.amount end
  ), 0) as balance,
  a.code,
  a.company_id
from public.accounts a
left join public.account_transactions t on t.account_id = a.id
group by a.id, a.owner_id, a.name, a.type, a.opening_balance, a.code, a.company_id;

-- notifications ---------------------------------------------------------
-- Company-wide, not per-user: a low-balance or overdue-bill alert is a
-- company concern, not an individual one, and whoever reads it marks it
-- read for the whole company — same simple model the given spec asked for
-- (no user_id column). Only ever written by the cron job (service role,
-- bypasses RLS) — regular users can view and mark read, but never create
-- or delete a notification themselves, so there's no insert/delete policy
-- below (unlike smtp_settings' full 4-policy set).
create table if not exists public.notifications (
  id                 uuid primary key default gen_random_uuid(),
  company_id         uuid not null default public.current_company_id()
                     references public.companies(id) on delete cascade,
  type               text not null check (type in (
                       'bank_balance_low', 'cash_balance_low',
                       'bill_due', 'bill_overdue',
                       'invoice_due', 'invoice_overdue'
                     )),
  severity           text not null check (severity in ('info', 'warning', 'critical')),
  title              text not null,
  message            text not null,
  -- Nullable: a digest notification (e.g. "3 bills due today") groups
  -- several bills into one row per the spec's own grouping requirement,
  -- so it names no single entity — the message text lists them instead of
  -- this app inventing a multi-entity-reference column the given schema
  -- didn't ask for.
  related_entity_type text,
  related_entity_id   uuid,
  is_read            boolean not null default false,
  created_at         timestamptz not null default now()
);

create index if not exists notifications_company_id_idx on public.notifications(company_id);
create index if not exists notifications_company_created_idx on public.notifications(company_id, created_at desc);

alter table public.notifications enable row level security;

drop policy if exists "Users can view own company notifications" on public.notifications;
create policy "Users can view own company notifications"
  on public.notifications for select
  using (company_id = public.current_company_id());

drop policy if exists "Users can mark own company notifications read" on public.notifications;
create policy "Users can mark own company notifications read"
  on public.notifications for update
  using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id());

-- notification_settings ---------------------------------------------------
-- Same shape as smtp_settings/sms_settings: one row per company, full
-- 4-policy RLS set since (unlike notifications rows) a company genuinely
-- configures this itself.
create table if not exists public.notification_settings (
  company_id            uuid primary key references public.companies(id) on delete cascade,
  threshold_bank_balance numeric(12,2),
  threshold_cash_balance numeric(12,2),
  -- Optional swing alert from the spec ("large balance swings") — nullable
  -- because most companies won't want this at all, unlike the due-date
  -- window which always has a sane default.
  balance_swing_percent numeric(5,2),
  days_before_due_alert int not null default 3,
  digest_frequency      text not null default 'daily' check (digest_frequency in ('realtime', 'daily', 'weekly')),
  channels              text[] not null default array['in_app'],
  updated_at            timestamptz not null default now()
);

alter table public.notification_settings alter column company_id set default public.current_company_id();

alter table public.notification_settings enable row level security;

drop policy if exists "Users can view own notification settings" on public.notification_settings;
create policy "Users can view own notification settings" on public.notification_settings for select using (company_id = public.current_company_id());
drop policy if exists "Users can insert own notification settings" on public.notification_settings;
create policy "Users can insert own notification settings" on public.notification_settings for insert with check (company_id = public.current_company_id());
drop policy if exists "Users can update own notification settings" on public.notification_settings;
create policy "Users can update own notification settings" on public.notification_settings for update using (company_id = public.current_company_id());
drop policy if exists "Users can delete own notification settings" on public.notification_settings;
create policy "Users can delete own notification settings" on public.notification_settings for delete using (company_id = public.current_company_id());

drop trigger if exists set_notification_settings_updated_at on public.notification_settings;
create trigger set_notification_settings_updated_at
  before update on public.notification_settings
  for each row execute function public.set_updated_at();
