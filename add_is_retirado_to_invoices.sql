
-- Migration to add is_retirado to invoices table
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS is_retirado BOOLEAN DEFAULT FALSE;
