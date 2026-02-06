
export enum UserProfile {
  ADMIN = 'admin',
  USER = 'usuario'
}

export enum InvoiceStatus {
  PAID = 'PAGO',
  NOT_PAID = 'NAO_PAGO',
  OVERDUE = 'ATRASADO'
}

export interface User {
  id: string; // UUID
  name: string;
  email: string;
  profile: UserProfile;
}

export interface Client {
  id: string; // UUID
  name: string;
  cnpj: string;
  interest_percent: number;
  observations: string;
  created_at?: string;
}

export interface Invoice {
  id: string; // UUID
  invoice_number?: string;
  client_id: string; // UUID
  original_value: number;
  due_date: string; // YYYY-MM-DD
  status: InvoiceStatus;
  days_overdue: number;
  final_value: number;
  payment_date?: string | null;
  created_at?: string;
}

export interface CalendarEvent {
  id: string; // UUID
  title: string;
  description: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM:SS
  created_by: string; // user id or name name
}

export interface AppState {
  users: User[];
  clients: Client[];
  invoices: Invoice[];
  events: CalendarEvent[];
  currentUser: User | null;
  loading: boolean;
}
