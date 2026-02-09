-- SQL para permitir letras e números no valor dos pagamentos diários
ALTER TABLE public.daily_payments 
    ALTER COLUMN value TYPE TEXT;

-- Garantir que a estrutura está correta (se ainda não estiver)
-- Caso já existam as colunas antigas, este SQL as ignora se a tabela já foi migrada.
