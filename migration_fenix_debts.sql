CREATE TABLE IF NOT EXISTS public.fenix_debts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    date DATE NOT NULL,
    description TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('WITHDRAWAL', 'PAYMENT')),
    amount NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.fenix_debts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all operations for authenticated users" 
ON public.fenix_debts
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);
