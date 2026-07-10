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
  -- We exclude both PAGO and AGENDADO from automatic overriding
  FOR inv IN SELECT * FROM public.invoices WHERE status NOT IN ('PAGO', 'AGENDADO') LOOP
    
    -- Calculate business days and calendar days since due date
    biz_days_late := public.count_business_days(inv.due_date, current_date_val);
    calendar_days_late := current_date_val - inv.due_date;
    
    -- Se o vencimento é hoje ou no futuro, garante status NAO_PAGO e zera taxas/multas
    IF calendar_days_late <= 0 THEN
      UPDATE public.invoices
      SET status = 'NAO_PAGO',
          penalty_applied = FALSE,
          fine_value = 0,
          interest_value = 0,
          reissue_tax = 0,
          postage_tax = 0,
          days_overdue = 0,
          final_value = inv.original_value
      WHERE id = inv.id;
      
    -- Condition to apply initial charges: 
    -- At least 5 business days late
    ELSIF biz_days_late >= 5 THEN
      
      -- Calculate weekly fee (R$ 5.00 per 7 days of delay)
      weeks_late := floor(calendar_days_late / 7);
      IF weeks_late < 1 THEN weeks_late := 1; END IF; 
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
