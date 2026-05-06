-- Adiciona a coluna is_recurring à tabela de payables
ALTER TABLE public.payables ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false;

-- Opcional: Se você quiser que itens antigos não tenham problemas com nulo (embora o default resolva)
UPDATE public.payables SET is_recurring = false WHERE is_recurring IS NULL;
