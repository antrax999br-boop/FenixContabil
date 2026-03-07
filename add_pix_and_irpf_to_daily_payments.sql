
-- Migration to add PIX and IRPF fields to daily_payments
ALTER TABLE public.daily_payments ADD COLUMN IF NOT EXISTS ativos_pix TEXT;
ALTER TABLE public.daily_payments ADD COLUMN IF NOT EXISTS inativos_pix TEXT;
ALTER TABLE public.daily_payments ADD COLUMN IF NOT EXISTS irpf TEXT;
