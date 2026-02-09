-- Adicionar coluna para nome avulso no boleto (especialmente para internet)
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS individual_name TEXT;

-- Remover a restrição de NOT NULL do client_id para permitir boletos avulsos (internet)
ALTER TABLE invoices ALTER COLUMN client_id DROP NOT NULL;
