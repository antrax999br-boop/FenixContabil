
-- Migration to add fine and penalty calculation logic
-- 1. Update clients table
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS fine_percent NUMERIC(5,2) DEFAULT 0;

-- 2. Update invoices table
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS penalty_applied BOOLEAN DEFAULT FALSE;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS fine_value NUMERIC(15,2) DEFAULT 0;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS interest_value NUMERIC(15,2) DEFAULT 0;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS reissue_tax NUMERIC(15,2) DEFAULT 0;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS postage_tax NUMERIC(15,2) DEFAULT 0;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS days_overdue INTEGER DEFAULT 0;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS final_value NUMERIC(15,2) DEFAULT 0;

-- 3. Function to calculate business days between two dates
-- Skipping Saturday (6) and Sunday (0)
CREATE OR REPLACE FUNCTION public.count_business_days(start_date DATE, end_date DATE)
RETURNS INTEGER AS $$
DECLARE
    curr_date DATE := start_date;
    business_days INTEGER := 0;
BEGIN
    IF start_date >= end_date THEN
        RETURN 0;
    END IF;

    -- We start counting from the day AFTER start_date
    curr_date := start_date + 1;
    
    WHILE curr_date <= end_date LOOP
        -- 0 = Sunday, 6 = Saturday
        IF EXTRACT(DOW FROM curr_date) NOT IN (0, 6) THEN
            business_days := business_days + 1;
        END IF;
        curr_date := curr_date + 1;
    END LOOP;
    
    RETURN business_days;
END;
$$ LANGUAGE plpgsql;

-- 4. Update the update_invoice_statuses function
CREATE OR REPLACE FUNCTION update_invoice_statuses()
RETURNS void AS $$
DECLARE
  inv RECORD;
  cli RECORD;
  current_date_val DATE := current_date;
  biz_days_late INTEGER;
  calc_fine NUMERIC;
  calc_interest NUMERIC;
  calc_reissue_tax NUMERIC := 2.50;
  calc_postage_tax NUMERIC := 5.00;
BEGIN
  FOR inv IN SELECT * FROM public.invoices WHERE status != 'PAGO' LOOP
    
    -- Calculate business days since due date
    biz_days_late := public.count_business_days(inv.due_date, current_date_val);
    
    -- Condition to apply charges: 
    -- 1. At least 5 business days late
    -- 2. Charges not applied yet
    IF biz_days_late >= 5 AND NOT inv.penalty_applied THEN
      
      -- Get client data for percentages
      SELECT * INTO cli FROM public.clients WHERE id = inv.client_id;
      
      IF FOUND THEN
        calc_fine := inv.original_value * (COALESCE(cli.fine_percent, 0) / 100.0);
        calc_interest := inv.original_value * (COALESCE(cli.interest_percent, 0) / 100.0);
        
        UPDATE public.invoices
        SET status = 'ATRASADO',
            penalty_applied = TRUE,
            fine_value = calc_fine,
            interest_value = calc_interest,
            reissue_tax = calc_reissue_tax,
            postage_tax = calc_postage_tax,
            days_overdue = biz_days_late,
            final_value = inv.original_value + calc_fine + calc_interest + calc_reissue_tax + calc_postage_tax
        WHERE id = inv.id;
      END IF;
      
    ELSIF NOT inv.penalty_applied THEN
      -- ... (rest of logic remains same)
      IF current_date_val > inv.due_date THEN
        UPDATE public.invoices
        SET status = 'ATRASADO',
            days_overdue = (current_date_val - inv.due_date),
            final_value = inv.original_value
        WHERE id = inv.id;
      ELSE
        UPDATE public.invoices
        SET status = 'NAO_PAGO',
            days_overdue = 0,
            final_value = inv.original_value
        WHERE id = inv.id;
      END IF;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;
