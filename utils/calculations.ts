
import { Invoice, InvoiceStatus, Client } from '../types';


export const isBusinessDay = (date: Date): boolean => {
  const day = date.getDay();
  return day !== 0 && day !== 6; // 0 is Sunday, 6 is Saturday
};

export const countBusinessDays = (startDate: Date, endDate: Date): number => {
  if (startDate >= endDate) return 0;

  let count = 0;
  const current = new Date(startDate);
  current.setHours(12, 0, 0, 0);

  const end = new Date(endDate);
  end.setHours(12, 0, 0, 0);

  // We start counting from the day AFTER the start date
  current.setDate(current.getDate() + 1);

  while (current <= end) {
    if (isBusinessDay(current)) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  return count;
};

export const calculateInvoiceStatusAndValues = (invoice: Invoice, client: Client): Invoice => {
  if (invoice.status === InvoiceStatus.PAID) {
    return invoice;
  }

  // Calculate delay days
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = new Date(invoice.due_date);
  dueDate.setHours(0, 0, 0, 0);

  const businessDaysLate = countBusinessDays(dueDate, today);
  const calendarDaysLate = Math.ceil((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

  // Minimum 1 week fee as soon as charges apply, then +5 every 7 days
  const weeksLate = Math.max(1, Math.floor(calendarDaysLate / 7));
  const postageTax = weeksLate * 5.00;

  // If penalty was already applied, we recalculate the values to ensure they reflect current client rates
  if (invoice.penalty_applied) {
    const currentFine = invoice.original_value * (client.fine_percent / 100);
    const currentInterest = invoice.original_value * (client.interest_percent / 100);
    const reissueTax = invoice.reissue_tax || 2.50;

    return {
      ...invoice,
      status: InvoiceStatus.OVERDUE,
      fine_value: currentFine,
      interest_value: currentInterest,
      reissue_tax: reissueTax,
      postage_tax: postageTax,
      final_value: invoice.original_value + currentFine + currentInterest + reissueTax + postageTax
    };
  }

  // Condition to apply charges: 5 business days of delay
  if (businessDaysLate >= 5) {
    const fineValue = invoice.original_value * (client.fine_percent / 100);
    const interestValue = invoice.original_value * (client.interest_percent / 100);
    const reissueTax = 2.50;

    return {
      ...invoice,
      status: InvoiceStatus.OVERDUE,
      days_overdue: calendarDaysLate,
      penalty_applied: true,
      fine_value: fineValue,
      interest_value: interestValue,
      reissue_tax: reissueTax,
      postage_tax: postageTax,
      final_value: invoice.original_value + fineValue + interestValue + reissueTax + postageTax
    };
  }

  // If late but less than 5 business days, we mark as overdue but no extra charges
  if (calendarDaysLate > 0) {
    return {
      ...invoice,
      status: InvoiceStatus.OVERDUE,
      days_overdue: calendarDaysLate,
      final_value: invoice.original_value
    };
  }

  return {
    ...invoice,
    status: InvoiceStatus.NOT_PAID,
    days_overdue: 0,
    final_value: invoice.original_value
  };
};

export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export const formatCNPJ = (cnpj: string): string => {
  return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
};
