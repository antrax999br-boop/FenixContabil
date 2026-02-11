
-- Employees Table
CREATE TABLE IF NOT EXISTS public.employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    meal_voucher_day DECIMAL(10, 2) DEFAULT 0,
    transport_voucher_day DECIMAL(10, 2) DEFAULT 0,
    payment_method TEXT, -- "Pix", "Conta Bancária", etc.
    payment_day INTEGER DEFAULT 5,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Employee Payments Table (Monthly tracking)
CREATE TABLE IF NOT EXISTS public.employee_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
    year_month TEXT NOT NULL, -- Format: YYYY.MM
    status TEXT NOT NULL DEFAULT 'PENDENTE', -- "PAGO", "PENDENTE", "ATRASADO"
    meal_voucher_total DECIMAL(10, 2) DEFAULT 0,
    transport_voucher_total DECIMAL(10, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(employee_id, year_month)
);

-- RLS Policies
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_payments ENABLE ROW LEVEL SECURITY;

-- Simple policy: authenticated users can do everything for now, 
-- similar to other tables in this project (based on previous conversations)
CREATE POLICY "Allow all actions for authenticated users" ON public.employees
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all actions for authenticated users" ON public.employee_payments
    FOR ALL USING (auth.role() = 'authenticated');
