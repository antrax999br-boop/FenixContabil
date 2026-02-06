
create or replace function update_invoice_statuses()
returns void as $$
declare
  inv record;
  cli record;
  current_date_val date := current_date;
  days_late int;
  interest_val numeric;
begin
  for inv in select * from public.invoices where status != 'PAGO' loop
    -- Só aplica juros se o dia atual for MAIOR que um dia após o vencimento
    if (current_date_val - inv.due_date) > 1 then
      -- It is overdue
      days_late := current_date_val - inv.due_date;
      
      -- Get client interest
      select * into cli from public.clients where id = inv.client_id;
      
      if found then
        interest_val := inv.original_value * (cli.interest_percent / 100.0) * days_late;
        
        update public.invoices
        set status = 'ATRASADO',
            days_overdue = days_late,
            final_value = inv.original_value + interest_val
        where id = inv.id;
      end if;
    else
        -- Se não passou da tolerância, reseta para valores originais se não tiver pago
        -- Isso corrige casos onde talvez tenha marcado errado antes
         update public.invoices
         set status = 'NAO_PAGO',
             days_overdue = 0,
             final_value = inv.original_value
         where id = inv.id;
    end if;
  end loop;
end;
$$ language plpgsql;
