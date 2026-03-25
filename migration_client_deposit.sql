ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS deposit_fenix_savings BOOLEAN NOT NULL DEFAULT false;
