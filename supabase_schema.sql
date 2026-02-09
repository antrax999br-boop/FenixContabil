
-- SQL para criar as tabelas necessárias no Supabase
-- Você pode copiar e colar este código no Painel SQL do seu projeto Supabase

-- 1. Tabela de Perfis de Usuário
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    profile TEXT DEFAULT 'usuario' CHECK (profile IN ('admin', 'usuario')),
    avatar_url TEXT,
    job_title TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabela de Clientes
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    cnpj TEXT UNIQUE NOT NULL,
    interest_percent NUMERIC(5,2) DEFAULT 0,
    observations TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tabela de Boletos (Invoices)
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number TEXT,
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
    original_value NUMERIC(15,2) NOT NULL DEFAULT 0,
    due_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'NAO_PAGO' CHECK (status IN ('PAGO', 'NAO_PAGO', 'ATRASADO')),
    payment_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Tabela de Contas a Pagar (Payables)
CREATE TABLE IF NOT EXISTS public.payables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    description TEXT NOT NULL,
    value NUMERIC(15,2) NOT NULL DEFAULT 0,
    due_date DATE NOT NULL,
    payment_date DATE,
    status TEXT NOT NULL DEFAULT 'NAO_PAGO' CHECK (status IN ('PAGO', 'NAO_PAGO', 'ATRASADO')),
    prazo TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Tabela de Eventos do Calendário
CREATE TABLE IF NOT EXISTS public.calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    event_date DATE NOT NULL,
    event_time TIME NOT NULL,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

-- Criar políticas simples de acesso (Ajuste conforme sua necessidade de segurança)
CREATE POLICY "Acesso público profiles" ON public.profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso público clients" ON public.clients FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso público invoices" ON public.invoices FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso público payables" ON public.payables FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso público calendar_events" ON public.calendar_events FOR ALL USING (true) WITH CHECK (true);

-- 6. Tabela de Pagamentos Diários
CREATE TABLE IF NOT EXISTS public.daily_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
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

ALTER TABLE public.daily_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso público daily_payments" ON public.daily_payments FOR ALL USING (true) WITH CHECK (true);
