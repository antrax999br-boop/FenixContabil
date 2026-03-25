-- migration_financeiro.sql

-- Lançamentos Futuros
CREATE TABLE future_entries (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  description text NOT null,
  amount numeric(10, 2) NOT null,
  date date NOT null,
  category text NOT null CHECK (category IN ('ESPN', 'FENIX')),
  approved boolean DEFAULT false NOT null,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT null
);

-- Empréstimos FENIX
CREATE TABLE fenix_loans (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  description text NOT null,
  amount numeric(10, 2) NOT null,
  date date NOT null,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT null
);

-- Ativar RLS se necessário, com base no resto do sistema (liberar tudo por enquanto):

ALTER TABLE future_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read/write access for all users" ON future_entries FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE fenix_loans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read/write access for all users" ON fenix_loans FOR ALL USING (true) WITH CHECK (true);

