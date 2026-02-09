-- Adicionar coluna para nome avulso no boleto (especialmente para internet)
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS individual_name TEXT;
