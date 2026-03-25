
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
  avatar_url?: string;
  job_title?: string;
}

export interface Client {
  id: string; // UUID
  name: string;
  cnpj: string;
  interest_percent: number;
  fine_percent: number;
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
  penalty_applied: boolean;
  fine_value: number;
  interest_value: number;
  reissue_tax: number;
  postage_tax: number;
  payment_date?: string | null;
  individual_name?: string;
  is_retirado?: boolean;
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

export interface Payable {
  id: string; // UUID
  description: string;
  value: number;
  due_date: string; // YYYY-MM-DD
  payment_date?: string | null;
  prazo?: string;
  status: InvoiceStatus;
  created_at?: string;
}

export interface DailyPayment {
  id: string; // UUID
  date: string; // YYYY-MM-DD
  description?: string;
  ativos?: string;
  inativos?: string;
  alteracao?: string;
  distrato?: string;
  remissao_gps?: string;
  recal_guia?: string;
  regularizacao?: string;
  outros?: string;
  rent_invest_facil?: string;
  abertura?: string;
  parcelamentos?: string;
  certificadora?: string;
  ativos_pix?: string;
  inativos_pix?: string;
  irpf?: string;
  total?: string;
  created_at?: string;
}


// Credit Card Expenses
export interface CreditCardExpense {
  id: string; // UUID
  purchase_date: string; // YYYY-MM-DD
  description: string;
  card: string; // Visa, Master, etc.
  total_value: number;
  total_installments: number;
  created_at?: string;
}

export interface CreditCardPayment {
  id: string; // UUID
  year_month: string; // YYYY.MM
  card: string; // Visa, Master, etc.
  is_paid: boolean;
  created_at?: string;
}


export enum EmployeePaymentStatus {
  PAID = 'PAGO',
  PENDING = 'PENDENTE',
  OVERDUE = 'ATRASADO'
}

export interface Employee {
  id: string; // UUID
  name: string;
  job_title: string;
  salary: number;
  meal_voucher_day: number;
  transport_voucher_day: number;
  payment_method: string; // PIX or Bank Account (text)
  payment_day: number; // Day of month
  active: boolean;
  created_at?: string;
}

export interface EmployeePayment {
  id: string; // UUID
  employee_id: string; // UUID
  year_month: string; // YYYY.MM
  status: EmployeePaymentStatus;
  salary: number;
  meal_voucher_total: number;
  transport_voucher_total: number;
  created_at?: string;
}

export interface FutureEntry {
  id: string;
  description: string;
  amount: number;
  date: string;
  category: 'ESPN' | 'FENIX';
  approved: boolean;
  created_at?: string;
}

export interface FenixLoan {
  id: string;
  description: string;
  amount: number;
  date: string;
  created_at?: string;
}

export interface BankFee {
  id: string; // UUID
  date: string; // YYYY-MM-DD
  fee_registro_cobranca?: string;
  fee_titulos_beneficiario?: string;
  fee_titulo_vencido_baixado?: string;
  fee_alteracao_vencimento?: string;
  fee_cesta_max_empresarial?: string;
  fee_cesta_taxa_protesto?: string;
  fee_pagamento_taxa_func?: string;
  fee_extrato_protesto?: string;
  fee_doc_taxa?: string;
  total?: string;
  created_at?: string;
}

export interface Contract {
  id: string; // UUID
  client_id: string; // UUID
  copan: string;
  status: 'Ativo' | 'Inativo' | 'Outros';
  annual_duration: string;
  due_day: number;
  monthly_fee: number;
  invoice_value: number;
  year: number;
  readjustment: number;
  created_at?: string;
}


export interface IrpfReceipt {
  id: string; // UUID
  date: string; // YYYY-MM-DD
  person_name: string;
  value: number;
  created_at?: string;
}

export interface AppState {
  users: User[];
  clients: Client[];
  invoices: Invoice[];
  payables: Payable[];
  dailyPayments: DailyPayment[];
  creditCardExpenses: CreditCardExpense[];
  creditCardPayments: CreditCardPayment[];
  employees: Employee[];
  employeePayments: EmployeePayment[];
  events: CalendarEvent[];
  contracts: Contract[];
  futureEntries: FutureEntry[];
  fenixLoans: FenixLoan[];
  bankFees: BankFee[];
  irpfReceipts: IrpfReceipt[];
  currentUser: User | null;
  loading: boolean;
}

