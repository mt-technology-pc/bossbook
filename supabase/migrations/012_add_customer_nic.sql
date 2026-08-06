-- ============================================================
-- BossBooks: Add optional NIC (National Identity Card number) to customers
-- Run once in the Supabase SQL Editor.
--
-- Captured from the walk-in customer quick-capture form on Sales
-- Receipts (WalkInCustomerModal.jsx) — optional, plain text (not
-- format-validated: NIC formats vary and this app doesn't need to parse
-- it, only store it).
-- ============================================================

alter table public.customers add column if not exists nic text;
