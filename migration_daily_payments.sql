
-- 1. Backup dos dados atuais
CREATE TABLE IF NOT EXISTS daily_payments_backup AS SELECT * FROM daily_payments;

-- 2. Remover a tabela antiga para recriar com a nova estrutura
DROP TABLE IF EXISTS daily_payments CASCADE;

-- 3. Criar a nova tabela de lançamentos dinâmicos
CREATE TABLE daily_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    value TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Habilitar RLS
ALTER TABLE daily_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso público daily_payments" ON public.daily_payments FOR ALL USING (true) WITH CHECK (true);

-- 5. Migração de dados existentes
-- Migrar Ativos
INSERT INTO daily_payments (date, description, category, value, created_at)
SELECT date, ativos, 'Ativos', ativos, created_at
FROM daily_payments_backup WHERE ativos IS NOT NULL AND ativos != '';

-- Migrar Inativos
INSERT INTO daily_payments (date, description, category, value, created_at)
SELECT date, inativos, 'Inativos', inativos, created_at
FROM daily_payments_backup WHERE inativos IS NOT NULL AND inativos != '';

-- Migrar Alteração
INSERT INTO daily_payments (date, description, category, value, created_at)
SELECT date, alteracao, 'Alteração', alteracao, created_at
FROM daily_payments_backup WHERE alteracao IS NOT NULL AND alteracao != '';

-- Migrar Distrato
INSERT INTO daily_payments (date, description, category, value, created_at)
SELECT date, distrato, 'Distrato', distrato, created_at
FROM daily_payments_backup WHERE distrato IS NOT NULL AND distrato != '';

-- Migrar Remissão GPS
INSERT INTO daily_payments (date, description, category, value, created_at)
SELECT date, remissao_gps, 'Remissão de GPS', remissao_gps, created_at
FROM daily_payments_backup WHERE remissao_gps IS NOT NULL AND remissao_gps != '';

-- Migrar Recal Guia
INSERT INTO daily_payments (date, description, category, value, created_at)
SELECT date, recal_guia, 'Recal Guia', recal_guia, created_at
FROM daily_payments_backup WHERE recal_guia IS NOT NULL AND recal_guia != '';

-- Migrar Regularização
INSERT INTO daily_payments (date, description, category, value, created_at)
SELECT date, regularizacao, 'Regularização', regularizacao, created_at
FROM daily_payments_backup WHERE regularizacao IS NOT NULL AND regularizacao != '';

-- Migrar Outros
INSERT INTO daily_payments (date, description, category, value, created_at)
SELECT date, outros, 'Outros', outros, created_at
FROM daily_payments_backup WHERE outros IS NOT NULL AND outros != '';

-- Migrar Rent Invest Fácil
INSERT INTO daily_payments (date, description, category, value, created_at)
SELECT date, rent_invest_facil, 'Rent Invest Fácil', rent_invest_facil, created_at
FROM daily_payments_backup WHERE rent_invest_facil IS NOT NULL AND rent_invest_facil != '';

-- Migrar Abertura
INSERT INTO daily_payments (date, description, category, value, created_at)
SELECT date, abertura, 'Abertura', abertura, created_at
FROM daily_payments_backup WHERE abertura IS NOT NULL AND abertura != '';

-- Migrar Parcelamentos
INSERT INTO daily_payments (date, description, category, value, created_at)
SELECT date, parcelamentos, 'Parcelamentos', parcelamentos, created_at
FROM daily_payments_backup WHERE parcelamentos IS NOT NULL AND parcelamentos != '';

-- Limpeza
DROP TABLE IF EXISTS daily_payments_backup;
