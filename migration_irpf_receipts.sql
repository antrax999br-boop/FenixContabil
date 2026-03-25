CREATE TABLE IF NOT EXISTS public.irpf_receipts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    date DATE NOT NULL,
    person_name TEXT NOT NULL,
    value NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.irpf_receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all operations for authenticated users" 
ON public.irpf_receipts
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);
