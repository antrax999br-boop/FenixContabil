
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
  calendar_days_late INTEGER;
  weeks_late INTEGER;
  calc_fine NUMERIC;
  calc_interest NUMERIC;
  calc_reissue_tax NUMERIC := 2.50;
  calc_postage_tax NUMERIC;
BEGIN
  FOR inv IN SELECT * FROM public.invoices WHERE status != 'PAGO' LOOP
    
    -- Calculate business days and calendar days since due date
    biz_days_late := public.count_business_days(inv.due_date, current_date_val);
    calendar_days_late := current_date_val - inv.due_date;
    
    -- Condition to apply initial charges: 
    -- At least 5 business days late
    IF biz_days_late >= 5 THEN
      
      -- Calculate weekly fee (R$ 5.00 per 7 days of delay)
      weeks_late := floor(calendar_days_late / 7);
      IF weeks_late < 1 THEN weeks_late := 1; END IF; -- Minimum 1 week if >= 5 business days? 
                                                     -- Actually, user said 4 weeks = 20.00, so weeks_late * 5.
      calc_postage_tax := weeks_late * 5.00;

      IF NOT inv.penalty_applied THEN
        -- FIRST TIME APPLICATION
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
              days_overdue = calendar_days_late,
              final_value = inv.original_value + calc_fine + calc_interest + calc_reissue_tax + calc_postage_tax
          WHERE id = inv.id;
        END IF;
      ELSE
        -- ALREADY APPLIED, only update the recurring weekly tax if it increased
        IF calc_postage_tax > inv.postage_tax THEN
          UPDATE public.invoices
          SET postage_tax = calc_postage_tax,
              days_overdue = calendar_days_late,
              final_value = inv.original_value + inv.fine_value + inv.interest_value + inv.reissue_tax + calc_postage_tax
          WHERE id = inv.id;
        END IF;
      END IF;
      
    ELSIF NOT inv.penalty_applied THEN
      -- Less than 5 business days
      IF calendar_days_late > 0 THEN
        UPDATE public.invoices
        SET status = 'ATRASADO',
            days_overdue = calendar_days_late,
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
