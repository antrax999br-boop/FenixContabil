
import React from 'react';
import { AppState, InvoiceStatus } from '../types';
import { formatCurrency } from '../utils/calculations';

interface DashboardProps {
  state: AppState;
  onTabChange: (tab: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ state, onTabChange }) => {
  const paidTotal = state.invoices
    .filter(i => i.status === InvoiceStatus.PAID)
    .reduce((acc, i) => acc + i.final_value, 0);
  
  const pendingCount = state.invoices.filter(i => i.status === InvoiceStatus.NOT_PAID).length;
  const pendingTotal = state.invoices
    .filter(i => i.status === InvoiceStatus.NOT_PAID)
    .reduce((acc, i) => acc + i.final_value, 0);

  const overdueCount = state.invoices.filter(i => i.status === InvoiceStatus.OVERDUE).length;
  const overdueTotal = state.invoices
    .filter(i => i.status === InvoiceStatus.OVERDUE)
    .reduce((acc, i) => acc + i.final_value, 0);

  const recentInvoices = [...state.invoices]
    .sort((a, b) => new Date(b.due_date).getTime() - new Date(a.due_date).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-start mb-4">
            <div className="size-12 rounded-lg bg-green-50 flex items-center justify-center">
              <span className="material-symbols-outlined text-green-600">check_circle</span>
            </div>
            <span className="text-[11px] font-bold text-green-600 bg-green-50 px-2 py-1 rounded uppercase tracking-wider">Pago</span>
          </div>
          <p className="text-sm font-medium text-slate-500">Notas Pagas</p>
          <div className="flex items-baseline gap-2 mt-1">
            <h3 className="text-2xl font-bold text-slate-800">{formatCurrency(paidTotal)}</h3>
            <span className="text-xs font-semibold text-green-600">+12%</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-start mb-4">
            <div className="size-12 rounded-lg bg-status-pending/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-status-pending">schedule</span>
            </div>
            <span className="text-[11px] font-bold text-status-pending bg-status-pending/10 px-2 py-1 rounded uppercase tracking-wider">
              {pendingCount} Pendentes
            </span>
          </div>
          <p className="text-sm font-medium text-slate-500">Notas Pendentes</p>
          <div className="flex items-baseline gap-2 mt-1">
            <h3 className="text-2xl font-bold text-slate-800">{formatCurrency(pendingTotal)}</h3>
            <span className="text-xs font-semibold text-slate-400">Fluxo projetado</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-start mb-4">
            <div className="size-12 rounded-lg bg-red-50 flex items-center justify-center">
              <span className="material-symbols-outlined text-red-600">error_outline</span>
            </div>
            <span className="text-[11px] font-bold text-red-600 bg-red-50 px-2 py-1 rounded uppercase tracking-wider">
              {overdueCount} Atrasadas
            </span>
          </div>
          <p className="text-sm font-medium text-slate-500">Valor em Aberto (Atraso)</p>
          <div className="flex items-baseline gap-2 mt-1">
            <h3 className="text-2xl font-bold text-slate-800">{formatCurrency(overdueTotal)}</h3>
            <span className="text-xs font-semibold text-red-600">Crítico</span>
          </div>
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-base font-bold text-slate-800">Acesso Rápido</h4>
          <button className="text-xs font-bold text-primary hover:underline">Personalizar</button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <button 
            onClick={() => onTabChange('calendario')}
            className="group bg-white p-5 rounded-xl border border-slate-100 hover:border-primary/40 transition-all shadow-sm text-left"
          >
            <div className="flex items-center gap-4">
              <div className="size-11 rounded-full bg-blue-50 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all">
                <span className="material-symbols-outlined text-2xl leading-none">event</span>
              </div>
              <div>
                <h5 className="text-sm font-bold text-slate-800">Calendário</h5>
                <p className="text-xs text-slate-500 mt-0.5">Agendamentos e Prazos Fiscais</p>
              </div>
              <span className="material-symbols-outlined ml-auto text-slate-300 group-hover:text-primary transition-colors">chevron_right</span>
            </div>
          </button>

          <button 
            onClick={() => onTabChange('clientes')}
            className="group bg-white p-5 rounded-xl border border-slate-100 hover:border-primary/40 transition-all shadow-sm text-left"
          >
            <div className="flex items-center gap-4">
              <div className="size-11 rounded-full bg-orange-50 flex items-center justify-center text-brand-orange group-hover:bg-brand-orange group-hover:text-white transition-all">
                <span className="material-symbols-outlined text-2xl leading-none">groups</span>
              </div>
              <div>
                <h5 className="text-sm font-bold text-slate-800">Clientes</h5>
                <p className="text-xs text-slate-500 mt-0.5">Gerenciar Diretório e CRM</p>
              </div>
              <span className="material-symbols-outlined ml-auto text-slate-300 group-hover:text-brand-orange transition-colors">chevron_right</span>
            </div>
          </button>

          <button 
            onClick={() => onTabChange('notas')}
            className="group bg-white p-5 rounded-xl border border-slate-100 hover:border-primary/40 transition-all shadow-sm text-left"
          >
            <div className="flex items-center gap-4">
              <div className="size-11 rounded-full bg-purple-50 flex items-center justify-center text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-all">
                <span className="material-symbols-outlined text-2xl leading-none">description</span>
              </div>
              <div>
                <h5 className="text-sm font-bold text-slate-800">Notas Fiscais</h5>
                <p className="text-xs text-slate-500 mt-0.5">Recorrentes e Rascunhos</p>
              </div>
              <span className="material-symbols-outlined ml-auto text-slate-300 group-hover:text-purple-600 transition-colors">chevron_right</span>
            </div>
          </button>
        </div>
      </section>

      <section className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h4 className="text-base font-bold text-slate-800">Transações Recentes</h4>
          <div className="flex gap-2">
            <button className="px-3 py-1.5 text-xs font-semibold bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors">Exportar CSV</button>
            <button onClick={() => onTabChange('notas')} className="px-3 py-1.5 text-xs font-semibold bg-primary text-white rounded-lg shadow-sm hover:opacity-90 transition-opacity">Ver Tudo</button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50">
                <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Cliente</th>
                <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">ID da Nota</th>
                <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Valor Final</th>
                <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Vencimento</th>
                <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentInvoices.map((inv) => {
                const client = state.clients.find(c => c.id === inv.client_id);
                return (
                  <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div 
                          className="size-8 rounded-full bg-slate-200 bg-cover" 
                          style={{ backgroundImage: `url('https://picsum.photos/seed/${inv.client_id}/100/100')` }}
                        />
                        <span className="text-sm font-semibold text-slate-800">{client?.name || 'Cliente Desconhecido'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-500">#{inv.invoice_number}</td>
                    <td className="px-6 py-4 text-sm font-bold text-slate-800">{formatCurrency(inv.final_value)}</td>
                    <td className="px-6 py-4 text-sm text-slate-500">{inv.due_date}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        inv.status === InvoiceStatus.PAID ? 'bg-green-100 text-green-700' :
                        inv.status === InvoiceStatus.OVERDUE ? 'bg-red-100 text-red-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {inv.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <footer className="py-6 border-t border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
        <p className="text-xs font-medium text-slate-500">© 2024 Phoenix Contábil. Todos os direitos reservados.</p>
        <div className="flex items-center gap-6">
          <button className="text-xs font-bold text-slate-400 hover:text-primary transition-colors">Política de Privacidade</button>
          <button className="text-xs font-bold text-slate-400 hover:text-primary transition-colors">Termos de Serviço</button>
        </div>
      </footer>
    </div>
  );
};

export default Dashboard;
