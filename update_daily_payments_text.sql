-- Execute este SQL no Painel SQL do Supabase para atualizar a tabela daily_payments
-- Isso altera as colunas de numérico para TEXTO, permitindo caracteres e números.

-- Atenção: Se houver dados existentes, eles serão convertidos para texto automaticamente.

ALTER TABLE public.daily_payments 
    ALTER COLUMN ativos TYPE TEXT,
    ALTER COLUMN inativos TYPE TEXT,
    ALTER COLUMN alteracao TYPE TEXT,
    ALTER COLUMN distrato TYPE TEXT,
    ALTER COLUMN remissao_gps TYPE TEXT,
    ALTER COLUMN recal_guia TYPE TEXT,
    ALTER COLUMN regularizacao TYPE TEXT,
    ALTER COLUMN outros TYPE TEXT,
    ALTER COLUMN rent_invest_facil TYPE TEXT,
    ALTER COLUMN abertura TYPE TEXT,
    ALTER COLUMN parcelamentos TYPE TEXT,
    ALTER COLUMN total TYPE TEXT;

-- Remover os valores default de 0, pois agora são texto (opcional, pode manter ou remover)
ALTER TABLE public.daily_payments 
    ALTER COLUMN ativos DROP DEFAULT,
    ALTER COLUMN inativos DROP DEFAULT,
    ALTER COLUMN alteracao DROP DEFAULT,
    ALTER COLUMN distrato DROP DEFAULT,
    ALTER COLUMN remissao_gps DROP DEFAULT,
    ALTER COLUMN recal_guia DROP DEFAULT,
    ALTER COLUMN regularizacao DROP DEFAULT,
    ALTER COLUMN outros DROP DEFAULT,
    ALTER COLUMN rent_invest_facil DROP DEFAULT,
    ALTER COLUMN abertura DROP DEFAULT,
    ALTER COLUMN parcelamentos DROP DEFAULT,
    ALTER COLUMN total DROP DEFAULT;
