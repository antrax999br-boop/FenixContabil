CREATE TABLE bank_fees (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  fee_registro_cobranca TEXT DEFAULT '0,00',
  fee_titulos_beneficiario TEXT DEFAULT '0,00',
  fee_titulo_vencido_baixado TEXT DEFAULT '0,00',
  fee_alteracao_vencimento TEXT DEFAULT '0,00',
  fee_cesta_max_empresarial TEXT DEFAULT '0,00',
  fee_cesta_taxa_protesto TEXT DEFAULT '0,00',
  fee_pagamento_taxa_func TEXT DEFAULT '0,00',
  fee_extrato_protesto TEXT DEFAULT '0,00',
  fee_doc_taxa TEXT DEFAULT '0,00',
  total TEXT DEFAULT '0,00',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE bank_fees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all for users" ON bank_fees
  FOR ALL USING (auth.role() = 'authenticated');
