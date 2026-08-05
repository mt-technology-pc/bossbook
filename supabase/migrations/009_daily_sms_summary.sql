-- ============================================================
-- BossBooks: Login + end-of-day SMS summary
-- Run this once in the Supabase SQL Editor.
-- ============================================================

-- Two independent throttle columns, both on sms_settings since that's
-- this feature's only real dependency (having SMS configured at all) —
-- not notification_settings, which is a separate, unrelated concern.
-- `last_login_alert_sent_date`: at most one "X logged in" SMS per company
-- per calendar day, sent on whichever login happens first that day.
-- `last_daily_summary_sent_date`: the end-of-day cron's own re-run
-- safety, independent of whether the login one already fired that day —
-- they answer different questions (a login just happened vs. here's the
-- day's final numbers).
alter table public.sms_settings add column if not exists last_login_alert_sent_date date;
alter table public.sms_settings add column if not exists last_daily_summary_sent_date date;

-- The recipient for these two alerts specifically — not companies.phone,
-- which is generic company contact info (could be a landline, could be
-- unset) rather than necessarily the right mobile number for SMS alerts.
-- Set from Settings alongside the rest of the SMS configuration.
alter table public.sms_settings add column if not exists notify_phone text;
