
import React, { useState } from 'react';
import { AppState, Invoice, InvoiceStatus } from '../types';
import { formatCurrency } from '../utils/calculations';

interface InvoicesPageProps {
  state: AppState;
  onAdd: (invoice: Omit<Invoice, 'id' | 'status' | 'days_overdue' | 'final_value'>) => void;
  onPay: (id: string) => void;
  onDelete: (id: string) => void;
}

const InvoicesPage: React.FC<InvoicesPageProps> = ({ state, onAdd, onPay, onDelete }) => {
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState<InvoiceStatus | 'ALL'>('ALL');
  const [newInvoice, setNewInvoice] = useState({
    invoice_number: '',
    client_id: '',
    original_value: 0,
    due_date: new Date().toISOString().split('T')[0]
  });

  const filteredInvoices = state.invoices.filter(i => filter === 'ALL' || i.status === filter);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInvoice.client_id) return alert('Selecione um cliente');
    onAdd(newInvoice);
    setNewInvoice({ invoice_number: '', client_id: '', original_value: 0, due_date: new Date().toISOString().split('T')[0] });
    setShowModal(false);
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <nav className="flex text-sm text-slate-500 mb-2 gap-2 items-center">
            <span>Financeiro</span>
            <span className="material-symbols-outlined text-xs">chevron_right</span>
            <span className="text-primary font-medium">Notas Fiscais</span>
          </nav>
          <h2 className="text-3xl font-black tracking-tight text-slate-900">Notas Fiscais e Registros</h2>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-colors shadow-sm">
            <span className="material-symbols-outlined text-sm">download</span>
            Exportar Dados
          </button>
          <button 
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors shadow-lg shadow-primary/20"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            Nova Nota Fiscal
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative flex-1 max-w-md">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
            <input 
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-primary/20 text-slate-900" 
              placeholder="Buscar por cliente ou ID da nota..." 
              type="text"
            />
          </div>
          <select 
            className="bg-slate-50 border-none rounded-lg py-2 text-sm focus:ring-2 focus:ring-primary/20 text-slate-900"
            value={filter}
            onChange={e => setFilter(e.target.value as any)}
          >
            <option value="ALL">Todos os Status</option>
            <option value={InvoiceStatus.PAID}>Pago</option>
            <option value={InvoiceStatus.NOT_PAID}>Pendente</option>
            <option value={InvoiceStatus.OVERDUE}>Atrasado</option>
          </select>
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
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Valor Final</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredInvoices.map(inv => {
                const client = state.clients.find(c => c.id === inv.client_id);
                return (
                  <tr key={inv.id} className="hover:bg-primary/5 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="size-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs uppercase">
                          {client?.name.substring(0, 2) || '??'}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{client?.name}</p>
                          <p className="text-xs text-slate-500">ID: {inv.invoice_number}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{formatCurrency(inv.original_value)}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{inv.due_date}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                        inv.status === InvoiceStatus.PAID ? 'bg-emerald-100 text-emerald-700' :
                        inv.status === InvoiceStatus.OVERDUE ? 'bg-rose-100 text-rose-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        <span className={`size-1.5 rounded-full ${
                          inv.status === InvoiceStatus.PAID ? 'bg-emerald-500' :
                          inv.status === InvoiceStatus.OVERDUE ? 'bg-rose-500' :
                          'bg-amber-500'
                        }`} />
                        {inv.status}
                      </span>
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
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl animate-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-lg text-slate-800">Nova Nota Fiscal</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Cliente</label>
                <select 
                  required
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none bg-slate-50 text-slate-900"
                  value={newInvoice.client_id}
                  onChange={e => setNewInvoice({...newInvoice, client_id: e.target.value})}
                >
                  <option value="" className="text-slate-400">Selecione um cliente...</option>
                  {state.clients.map(c => <option key={c.id} value={c.id} className="text-slate-900">{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Número da Nota</label>
                <input 
                  required
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none bg-slate-50 text-slate-900 placeholder:text-slate-400"
                  value={newInvoice.invoice_number}
                  onChange={e => setNewInvoice({...newInvoice, invoice_number: e.target.value})}
                  placeholder="Ex: NF-2024-001"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Valor Original (R$)</label>
                  <input 
                    required
                    type="number"
                    step="0.01"
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none bg-slate-50 text-slate-900"
                    value={newInvoice.original_value}
                    onChange={e => setNewInvoice({...newInvoice, original_value: parseFloat(e.target.value)})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Vencimento</label>
                  <input 
                    required
                    type="date"
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none bg-slate-50 text-slate-900"
                    value={newInvoice.due_date}
                    onChange={e => setNewInvoice({...newInvoice, due_date: e.target.value})}
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
                  Emitir Nota
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
