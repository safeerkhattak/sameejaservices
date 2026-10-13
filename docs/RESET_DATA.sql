-- ============================================================================
-- RESET APPLICATION DATA
-- Keeps:   app_users (logins) and products (catalog)
-- Deletes: customers, invoices, invoice_items, payments,
--          payment_allocations, audit_logs
--
-- Run this in the Supabase SQL editor (or any psql connected to the app DB).
-- WARNING: This is IRREVERSIBLE. Take a backup first if unsure.
-- ============================================================================

BEGIN;

TRUNCATE TABLE
  audit_logs,
  payment_allocations,
  payments,
  invoice_items,
  invoices,
  customers
RESTART IDENTITY CASCADE;

COMMIT;

-- After this runs, the first invoice created will be numbered 176 (INV-000176),
-- PROVIDED the deployed app uses the start-at-176 logic. Deleting the most
-- recent invoice later frees its number so the next one reuses it; deleting a
-- middle invoice leaves a permanent gap in the sequence.
--
-- Verify it's empty (optional):
--   SELECT count(*) AS customers FROM customers;
--   SELECT count(*) AS invoices  FROM invoices;
--   SELECT count(*) AS payments  FROM payments;
