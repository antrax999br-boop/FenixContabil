-- EXECUTE ESTE SQL NO PAINEL SQL DO SUPABASE
-- Isso reverte a tabela para o formato largo (wide), onde cada dia é um registro único com várias colunas.

-- 1. Backup (opcional, se quiser salvar os dados atuais antes de apagar)
-- CREATE TABLE IF NOT EXISTS daily_payments_backup_narrow AS SELECT * FROM daily_payments;

-- 2. Remover a tabela antiga (formato estreito)
DROP TABLE IF EXISTS daily_payments CASCADE;

-- 3. Criar a nova tabela (formato largo)
CREATE TABLE daily_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    description TEXT,
    ativos TEXT,
    inativos TEXT,
    alteracao TEXT,
    distrato TEXT,
    remissao_gps TEXT,
    recal_guia TEXT,
    regularizacao TEXT,
    outros TEXT,
    rent_invest_facil TEXT,
    abertura TEXT,
    parcelamentos TEXT,
    total TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Habilitar RLS
ALTER TABLE daily_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso público daily_payments" ON public.daily_payments FOR ALL USING (true) WITH CHECK (true);

-- NOTA: Os dados criados no formato anterior (uma linha por item) serão perdidos.
-- Se você precisar migrá-los, avise.
