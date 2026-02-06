
import { Invoice, InvoiceStatus, Client } from '../types';

export const calculateInvoiceStatusAndValues = (invoice: Invoice, client: Client): Invoice => {
  if (invoice.status === InvoiceStatus.PAID) {
    return invoice;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = new Date(invoice.due_date);
  dueDate.setHours(0, 0, 0, 0);

  const diffTime = today.getTime() - dueDate.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays > 0) {
    const interestPerDay = (client.interest_percent / 100);
    const totalInterest = invoice.original_value * interestPerDay * diffDays;
    
    return {
      ...invoice,
      status: InvoiceStatus.OVERDUE,
      days_overdue: diffDays,
      final_value: invoice.original_value + totalInterest
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
