-- Tabela para marcar itens individuais de cartão como pagos
CREATE TABLE IF NOT EXISTS credit_card_item_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expense_id UUID NOT NULL REFERENCES credit_card_expenses(id) ON DELETE CASCADE,
    year_month TEXT NOT NULL, -- Formato AAAA.MM
    is_paid BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(expense_id, year_month)
);

ALTER TABLE credit_card_item_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso público credit_card_item_payments" ON public.credit_card_item_payments FOR ALL USING (true) WITH CHECK (true);
