
import React, { useState } from 'react';
import { AppState, Invoice, InvoiceStatus } from '../types';
import { formatCurrency } from '../utils/calculations';

interface InvoicesPageProps {
  state: AppState;
  onAdd: (invoice: Omit<Invoice, 'id' | 'status' | 'days_overdue' | 'final_value'>) => void;
  onPay: (id: string) => void;
  onDelete: (id: string) => void;
  initialFilter?: InvoiceStatus | 'ALL' | 'ATIVOS' | 'SEM_NOTA' | 'INTERNET';
}

const InvoicesPage: React.FC<InvoicesPageProps> = ({ state, onAdd, onPay, onDelete, initialFilter }) => {
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState<InvoiceStatus | 'ALL' | 'ATIVOS' | 'SEM_NOTA' | 'INTERNET'>(initialFilter || 'ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [monthFilter, setMonthFilter] = useState<number | 'ALL'>(new Date().getMonth());
  const [yearFilter, setYearFilter] = useState<number | 'ALL'>(new Date().getFullYear());
  const [newInvoice, setNewInvoice] = useState({
    invoice_number: '',
    client_id: '',
    original_value: 0,
    due_date: new Date().toISOString().split('T')[0]
  });

  const months = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  const currentYear = new Date().getFullYear();
  const years = [currentYear - 1, currentYear, currentYear + 1];

  const filteredInvoices = state.invoices.filter(i => {
    const client = state.clients.find(c => c.id === i.client_id);

    const isInternet = i.invoice_number?.startsWith('INT-');
    const isSemNota = !isInternet && (!i.invoice_number || i.invoice_number.trim() === '' || i.invoice_number.toUpperCase() === 'S/N' || i.invoice_number.toUpperCase() === 'S/AN');
    const isStandard = !isInternet && !isSemNota;

    let matchesStatus = false;
    if (filter === 'ALL') {
      // General view: show everything
      matchesStatus = true;
    } else if (filter === 'ATIVOS') {
      matchesStatus = isStandard && (i.status === InvoiceStatus.NOT_PAID || i.status === InvoiceStatus.OVERDUE);
    } else if (filter === 'SEM_NOTA') {
      matchesStatus = isSemNota;
    } else if (filter === 'INTERNET') {
      matchesStatus = isInternet;
    } else {
      matchesStatus = i.status === filter;
    }

    const invoiceDate = new Date(i.due_date + 'T12:00:00');
    const matchesMonth = monthFilter === 'ALL' || invoiceDate.getMonth() === monthFilter;
    const matchesYear = yearFilter === 'ALL' || invoiceDate.getFullYear() === yearFilter;

    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = searchTerm === '' ||
      client?.name.toLowerCase().includes(searchLower) ||
      i.invoice_number?.toLowerCase().includes(searchLower);

    return matchesStatus && matchesMonth && matchesYear && matchesSearch;
  }).sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());

  const groupedInvoices = filteredInvoices.reduce((acc, inv) => {
    const month = new Date(inv.due_date + 'T12:00:00').getMonth();
    if (!acc[month]) acc[month] = [];
    acc[month].push(inv);
    return acc;
  }, {} as Record<number, Invoice[]>);

  const sortedMonthKeys = Object.keys(groupedInvoices).map(Number).sort((a, b) => a - b);

  const getDefaultType = () => {
    if (filter === 'INTERNET') return 'INTERNET';
    if (filter === 'SEM_NOTA') return 'SEM_NOTA';
    return 'STANDARD';
  };

  const [regType, setRegType] = useState<'STANDARD' | 'INTERNET' | 'SEM_NOTA'>(getDefaultType());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInvoice.client_id) return alert('Selecione um cliente');

    let finalNumber = newInvoice.invoice_number;
    if (regType === 'SEM_NOTA') finalNumber = 'S/N';
    else if (regType === 'INTERNET' && !finalNumber.startsWith('INT-')) {
      finalNumber = 'INT-' + (finalNumber || 'AUTOGEN');
    }

    onAdd({
      ...newInvoice,
      invoice_number: finalNumber
    });

    setNewInvoice({ invoice_number: '', client_id: '', original_value: 0, due_date: new Date().toISOString().split('T')[0] });
    setShowModal(false);
  };

  // Helper to get display number (hide technical prefixes)
  const getDisplayNumber = (num?: string) => {
    if (!num) return 'S/N';
    if (num.startsWith('INT-')) return num.replace('INT-', '');
    return num;
  };

  const renderStatusBadge = (invoice: Invoice, categoryIcon: string, iconColor: string) => {
    const isPaid = invoice.status === InvoiceStatus.PAID;
    const isOverdue = invoice.status === InvoiceStatus.OVERDUE;

    let badgeColor = "bg-amber-100 text-amber-700 border-amber-200";
    let statusText = "PENDENTE";

    if (isPaid) {
      badgeColor = "bg-emerald-100 text-emerald-700 border-emerald-200";
      statusText = "PAGO";
    } else if (isOverdue) {
      badgeColor = "bg-rose-100 text-rose-700 border-rose-200";
      statusText = "ATRASADO";
    }

    return (
      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-black tracking-wider uppercase ${badgeColor}`}>
        <span className={`material-symbols-outlined text-[14px] ${iconColor}`}>{categoryIcon}</span>
        {statusText}
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <nav className="flex text-sm text-slate-500 mb-2 gap-2 items-center">
            <span>Financeiro</span>
            <span className="material-symbols-outlined text-xs">chevron_right</span>
            <span className="text-primary font-medium">Boletos</span>
          </nav>
          <h2 className="text-3xl font-black tracking-tight text-slate-900">Boletos e Registros</h2>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-colors shadow-sm">
            <span className="material-symbols-outlined text-sm">download</span>
            Exportar Dados
          </button>
          <button
            onClick={() => {
              setRegType(getDefaultType());
              setShowModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors shadow-lg shadow-primary/20"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            Novo Boleto
          </button>
        </div>
      </div>

      {/* ... filter section remains same but update current display ... */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative flex-1 max-w-sm">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
            <input
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-primary/20 text-slate-900"
              placeholder="Buscar por cliente ou ID do boleto..."
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              className="bg-slate-50 border-none rounded-lg py-2 text-sm focus:ring-2 focus:ring-primary/20 text-slate-900"
              value={monthFilter}
              onChange={e => setMonthFilter(e.target.value === 'ALL' ? 'ALL' : parseInt(e.target.value))}
            >
              <option value="ALL">Todo o Ano</option>
              {months.map((m, idx) => (
                <option key={m} value={idx}>{m}</option>
              ))}
            </select>

            <select
              className="bg-slate-50 border-none rounded-lg py-2 text-sm focus:ring-2 focus:ring-primary/20 text-slate-900"
              value={yearFilter}
              onChange={e => setYearFilter(e.target.value === 'ALL' ? 'ALL' : parseInt(e.target.value))}
            >
              <option value="ALL">Todos os Anos</option>
              {years.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>

            <select
              className="bg-slate-50 border-none rounded-lg py-2 text-sm focus:ring-2 focus:ring-primary/20 text-slate-900 font-bold"
              value={filter}
              onChange={e => setFilter(e.target.value as any)}
            >
              <option value="ALL">📋 Visualização Geral</option>
              <option value="ATIVOS">🔥 Boletos Iniciais</option>
              <option value="SEM_NOTA">📄 Boletos Sem Nota</option>
              <option value="INTERNET">🌐 Boletos Internet</option>
              <option value={InvoiceStatus.PAID}>Somente Pagos</option>
              <option value={InvoiceStatus.NOT_PAID}>Somente Pendentes</option>
              <option value={InvoiceStatus.OVERDUE}>Somente Atrasados</option>
            </select>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <span>Mostrando {filteredInvoices.length} de {state.invoices.length}</span>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/50">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Cliente</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Valor Original</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Vencimento</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Boletos Ativos</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Boletos S/ Nota</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Boletos Internet</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Valor Final</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedMonthKeys.map(monthIdx => (
                <React.Fragment key={monthIdx}>
                  {monthFilter === 'ALL' && (
                    <tr className="bg-slate-100/50">
                      <td colSpan={8} className="px-6 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-sm text-primary">calendar_month</span>
                          <span className="text-xs font-black text-slate-700 uppercase tracking-widest">
                            {months[monthIdx]}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400 ml-auto">
                            {groupedInvoices[monthIdx].length} {groupedInvoices[monthIdx].length === 1 ? 'Boleto' : 'Boletos'}
                          </span>
                        </div>
                      </td>
                    </tr>
                  )}
                  {groupedInvoices[monthIdx].map(inv => {
                    const client = state.clients.find(c => c.id === inv.client_id);
                    const isInternet = inv.invoice_number?.startsWith('INT-');
                    const isSemNota = !isInternet && (!inv.invoice_number || inv.invoice_number.trim() === '' || inv.invoice_number.toUpperCase() === 'S/N' || inv.invoice_number.toUpperCase() === 'S/AN');
                    const isStandard = !isInternet && !isSemNota;

                    return (
                      <tr key={inv.id} className="hover:bg-primary/5 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="size-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs uppercase">
                              {client?.name.substring(0, 2) || '??'}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-slate-900">{client?.name}</p>
                              <p className="text-xs text-slate-500">ID: {getDisplayNumber(inv.invoice_number)}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">{formatCurrency(inv.original_value)}</td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {new Date(inv.due_date + 'T12:00:00').toLocaleDateString('pt-BR')}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {isStandard ? renderStatusBadge(inv, 'local_fire_department', 'text-orange-500') : <span className="text-slate-300">-</span>}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {isSemNota ? renderStatusBadge(inv, 'assignment_late', 'text-amber-500') : <span className="text-slate-300">-</span>}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {isInternet ? renderStatusBadge(inv, 'language', 'text-blue-500') : <span className="text-slate-300">-</span>}
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-slate-900 text-right">{formatCurrency(inv.final_value)}</td>
                        <td className="px-6 py-4">
                          <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            {inv.status !== InvoiceStatus.PAID && (
                              <button
                                onClick={() => onPay(inv.id)}
                                className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                title="Marcar como Pago"
                              >
                                <span className="material-symbols-outlined text-lg">check_circle</span>
                              </button>
                            )}
                            <button
                              onClick={() => onDelete(inv.id)}
                              className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Excluir"
                            >
                              <span className="material-symbols-outlined text-lg">delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl animate-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-lg text-slate-800">Novo Registro de Boleto</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Tipo de Registro</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setRegType('STANDARD')}
                      className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all ${regType === 'STANDARD' ? 'bg-primary text-white border-primary' : 'bg-slate-50 text-slate-500 border-slate-200'}`}
                    >
                      Boleto Inicial
                    </button>
                    <button
                      type="button"
                      onClick={() => setRegType('INTERNET')}
                      className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all ${regType === 'INTERNET' ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 text-slate-500 border-slate-200'}`}
                    >
                      Internet
                    </button>
                    <button
                      type="button"
                      onClick={() => setRegType('SEM_NOTA')}
                      className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all ${regType === 'SEM_NOTA' ? 'bg-amber-500 text-white border-amber-500' : 'bg-slate-50 text-slate-500 border-slate-200'}`}
                    >
                      Sem Nota
                    </button>
                  </div>
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Cliente</label>
                  <select
                    required
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none bg-slate-50 text-slate-900"
                    value={newInvoice.client_id}
                    onChange={e => setNewInvoice({ ...newInvoice, client_id: e.target.value })}
                  >
                    <option value="" className="text-slate-400">Selecione um cliente...</option>
                    {state.clients.map(c => <option key={c.id} value={c.id} className="text-slate-900">{c.name}</option>)}
                  </select>
                </div>

                {regType !== 'SEM_NOTA' && (
                  <div className="col-span-2">
                    <label className="block text-sm font-semibold text-slate-700 mb-1">
                      {regType === 'INTERNET' ? 'ID do Registro Internet' : 'Número do Boleto'}
                    </label>
                    <input
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none bg-slate-50 text-slate-900 placeholder:text-slate-400"
                      value={newInvoice.invoice_number}
                      onChange={e => setNewInvoice({ ...newInvoice, invoice_number: e.target.value })}
                      placeholder={regType === 'INTERNET' ? 'Ex: INT-2024-001' : 'Ex: NF-2024-001'}
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Valor Original (R$)</label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none bg-slate-50 text-slate-900"
                    value={newInvoice.original_value}
                    onChange={e => setNewInvoice({ ...newInvoice, original_value: parseFloat(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Vencimento</label>
                  <input
                    required
                    type="date"
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none bg-slate-50 text-slate-900"
                    value={newInvoice.due_date}
                    onChange={e => setNewInvoice({ ...newInvoice, due_date: e.target.value })}
                  />
                </div>
              </div>
              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 rounded-lg border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-lg bg-primary text-white font-bold text-sm hover:bg-primary/90 shadow-lg shadow-primary/20"
                >
                  Cadastrar Registro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoicesPage;
