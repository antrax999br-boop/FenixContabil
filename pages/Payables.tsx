
import React, { useState } from 'react';
import { AppState, Payable, InvoiceStatus } from '../types';
import { formatCurrency } from '../utils/calculations';

interface PayablesPageProps {
    state: AppState;
    onAdd: (payable: Omit<Payable, 'id' | 'status'>) => void;
    onPay: (id: string) => void;
    onDelete: (id: string) => void;
}

const PayablesPage: React.FC<PayablesPageProps> = ({ state, onAdd, onPay, onDelete }) => {
    const [showModal, setShowModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [newPayable, setNewPayable] = useState({
        description: '',
        value: 0,
        due_date: new Date().toISOString().split('T')[0],
        prazo: '',
    });

    const filteredPayables = (state.payables || []).filter(p =>
        p.description.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newPayable.description) return alert('Insira uma descrição');
        onAdd(newPayable);
        setNewPayable({
            description: '',
            value: 0,
            due_date: new Date().toISOString().split('T')[0],
            prazo: '',
        });
        setShowModal(false);
    };

    return (
        <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
                <div>
                    <nav className="flex text-sm text-slate-500 mb-2 gap-2 items-center">
                        <span>Financeiro</span>
                        <span className="material-symbols-outlined text-xs">chevron_right</span>
                        <span className="text-primary font-medium">Contas a Pagar</span>
                    </nav>
                    <h2 className="text-3xl font-black tracking-tight text-slate-900">Contas a Pagar</h2>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-lg text-sm font-semibold hover:bg-rose-700 transition-colors shadow-lg shadow-rose-200"
                >
                    <span className="material-symbols-outlined text-sm">add</span>
                    Nova Conta
                </button>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6">
                <div className="relative max-w-sm">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
                    <input
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-primary/20 text-slate-900"
                        placeholder="Buscar por descrição..."
                        type="text"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-200 bg-slate-50/50">
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Descrição</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Valor</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Vencimento</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Prazo</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Pagamento</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-center">Status</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredPayables.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                                        Nenhuma conta a pagar encontrada.
                                    </td>
                                </tr>
                            ) : (
                                filteredPayables.map((p) => (
                                    <tr key={p.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-6 py-4 text-sm font-semibold text-slate-900">{p.description}</td>
                                        <td className="px-6 py-4 text-sm font-bold text-rose-600">{formatCurrency(p.value)}</td>
                                        <td className="px-6 py-4 text-sm text-slate-600">
                                            {new Date(p.due_date + 'T12:00:00').toLocaleDateString('pt-BR')}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-600">{p.prazo || '---'}</td>
                                        <td className="px-6 py-4 text-sm text-slate-600">
                                            {p.payment_date
                                                ? new Date(p.payment_date + 'T12:00:00').toLocaleDateString('pt-BR')
                                                : '---'}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-black uppercase ${p.status === InvoiceStatus.PAID
                                                    ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                                                    : p.status === InvoiceStatus.OVERDUE
                                                        ? 'bg-rose-100 text-rose-700 border-rose-200'
                                                        : 'bg-amber-100 text-amber-700 border-amber-200'
                                                }`}>
                                                {p.status === InvoiceStatus.PAID ? 'Pago' : p.status === InvoiceStatus.OVERDUE ? 'Atrasado' : 'Pendente'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {p.status !== InvoiceStatus.PAID && (
                                                    <button
                                                        onClick={() => onPay(p.id)}
                                                        className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                                        title="Marcar como Pago"
                                                    >
                                                        <span className="material-symbols-outlined text-lg">check_circle</span>
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => onDelete(p.id)}
                                                    className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                                                    title="Excluir"
                                                >
                                                    <span className="material-symbols-outlined text-lg">delete</span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 bg-rose-600 text-white flex items-center justify-between">
                            <h3 className="font-black uppercase tracking-tight">Nova Conta a Pagar</h3>
                            <button onClick={() => setShowModal(false)} className="hover:rotate-90 transition-transform">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-black text-slate-500 uppercase mb-1">Descrição</label>
                                <input
                                    required
                                    className="w-full px-4 py-2 bg-slate-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-rose-500/20"
                                    type="text"
                                    placeholder="Ex: Aluguel, Luz, Fornecedor..."
                                    value={newPayable.description}
                                    onChange={e => setNewPayable({ ...newPayable, description: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-black text-slate-500 uppercase mb-1">Valor (R$)</label>
                                    <input
                                        required
                                        className="w-full px-4 py-2 bg-slate-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-rose-500/20"
                                        type="number"
                                        step="0.01"
                                        value={newPayable.value}
                                        onChange={e => setNewPayable({ ...newPayable, value: parseFloat(e.target.value) })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-slate-500 uppercase mb-1">Vencimento</label>
                                    <input
                                        required
                                        className="w-full px-4 py-2 bg-slate-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-rose-500/20"
                                        type="date"
                                        value={newPayable.due_date}
                                        onChange={e => setNewPayable({ ...newPayable, due_date: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-black text-slate-500 uppercase mb-1">Prazo (Opcional)</label>
                                <input
                                    className="w-full px-4 py-2 bg-slate-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-rose-500/20"
                                    type="text"
                                    placeholder="Ex: 30 dias, Imediato..."
                                    value={newPayable.prazo}
                                    onChange={e => setNewPayable({ ...newPayable, prazo: e.target.value })}
                                />
                            </div>
                            <div className="pt-2">
                                <button
                                    type="submit"
                                    className="w-full py-3 bg-rose-600 text-white rounded-xl font-black uppercase tracking-widest hover:bg-rose-700 transition-all shadow-lg shadow-rose-200 active:scale-95"
                                >
                                    Confirmar Cadastro
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PayablesPage;
