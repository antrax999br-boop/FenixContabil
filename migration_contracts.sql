
-- Create Table for Contract Renewals
CREATE TABLE IF NOT EXISTS public.contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
    copan TEXT,
    status TEXT DEFAULT 'Ativo' CHECK (status IN ('Ativo', 'Inativo', 'Outros')),
    annual_duration TEXT DEFAULT 'Anual',
    due_day INTEGER,
    monthly_fee NUMERIC(15,2) DEFAULT 0,
    invoice_value NUMERIC(15,2) DEFAULT 0,
    year INTEGER NOT NULL,
    readjustment NUMERIC(15,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(client_id, year)
);

ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso público contracts" ON public.contracts FOR ALL USING (true) WITH CHECK (true);
