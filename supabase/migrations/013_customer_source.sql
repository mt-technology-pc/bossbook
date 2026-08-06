-- ============================================================
-- BossBooks: Track which customers were captured via the walk-in
-- quick-capture form on Sales Receipts, so they can be listed separately.
-- Run once in the Supabase SQL Editor.
--
-- Nullable, not backfilled — existing customers simply have no source
-- (they weren't created through this flow), and every other customer
-- creation path (Customers page, inline quick-add on invoice/receipt
-- lines) also leaves it null. Only WalkInCustomerModal.jsx sets it.
-- ============================================================

alter table public.customers add column if not exists source text;
