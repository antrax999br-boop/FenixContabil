-- migration_credit_card.sql
-- Tabela de compras no cartão
CREATE TABLE IF NOT EXISTS credit_card_expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_date DATE NOT NULL,
    description TEXT NOT NULL,
    card TEXT NOT NULL, -- Visa, Master, etc.
    total_value DECIMAL(12,2) NOT NULL,
    total_installments INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela para marcar meses como pagos
-- Isso permite o controle de Status (PAGO/EM ABERTO) por mês/fatura
CREATE TABLE IF NOT EXISTS credit_card_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    year_month TEXT NOT NULL, -- Formato AAAA.MM
    card TEXT NOT NULL,
    is_paid BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(year_month, card)
);

-- Habilitar RLS
ALTER TABLE credit_card_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_card_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso público credit_card_expenses" ON public.credit_card_expenses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso público credit_card_payments" ON public.credit_card_payments FOR ALL USING (true) WITH CHECK (true);
