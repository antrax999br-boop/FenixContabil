import React, { useState } from 'react';
import { DailyPayment } from '../types';
import { formatCurrency } from '../utils/calculations';

interface DailyPaymentsPageProps {
    dailyPayments: DailyPayment[];
    onAdd: (payment: Omit<DailyPayment, 'id' | 'created_at'>) => void;
    onDelete: (id: string) => void;
}

const CATEGORIES = [
    'Ativos',
    'Inativos',
    'Alteração',
    'Distrato',
    'Remissão de GPS',
    'Recal Guia',
    'Regularização',
    'Outros',
    'Rent Invest Fácil',
    'Abertura',
    'Parcelamentos'
];

const DailyPaymentsPage: React.FC<DailyPaymentsPageProps> = ({ dailyPayments, onAdd, onDelete }) => {
    const [showModal, setShowModal] = useState(false);
    const [newPayment, setNewPayment] = useState<Omit<DailyPayment, 'id' | 'created_at'>>({
        date: new Date().toISOString().split('T')[0],
        description: '',
        category: '',
        value: 0
    });

    // Validations: description mandatory, value > 0, category mandatory
    const isFormValid = newPayment.description.trim() !== '' &&
        newPayment.category !== '' &&
        newPayment.value > 0;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!isFormValid) return;

        onAdd(newPayment);
        setShowModal(false);
        // Reset form
        setNewPayment({
            date: new Date().toISOString().split('T')[0],
            description: '',
            category: '',
            value: 0
        });
    };

    const handleInputChange = (field: keyof Omit<DailyPayment, 'id' | 'created_at'>, value: string | number) => {
        setNewPayment(prev => ({ ...prev, [field]: value }));
    };

    // Calculate total sum of numeric values
    const totalValue = dailyPayments.reduce((acc, curr) => acc + (Number(curr.value) || 0), 0);

    return (
        <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
                <div>
                    <nav className="flex text-sm text-slate-500 mb-2 gap-2 items-center">
                        <span>Financeiro</span>
                        <span className="material-symbols-outlined text-xs">chevron_right</span>
                        <span className="text-primary font-medium">Pagamentos Diários</span>
                    </nav>
                    <h2 className="text-3xl font-black tracking-tight text-slate-900">Pagamentos Diários</h2>
                </div>
                <div className="flex flex-col md:flex-row items-center gap-4">
                    <div className="bg-emerald-50 border border-emerald-100 px-6 py-2 rounded-xl text-right">
                        <span className="block text-[10px] font-black uppercase text-emerald-600 tracking-widest mb-0.5">Total Acumulado</span>
                        <span className="text-2xl font-black text-emerald-700">{formatCurrency(totalValue)}</span>
                    </div>
                    <button
                        onClick={() => setShowModal(true)}
                        className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl text-sm font-bold uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 active:scale-95"
                    >
                        <span className="material-symbols-outlined text-sm">add</span>
                        Adicionar Pagamento
                    </button>
                </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                        <thead>
                            <tr className="border-b border-slate-200 bg-slate-50/50">
                                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">Data</th>
                                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">Descrição</th>
                                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">Categoria</th>
                                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest text-right">Valor</th>
                                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {dailyPayments.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-medium">
                                        Nenhum lançamento encontrado.
                                    </td>
                                </tr>
                            ) : (
                                dailyPayments.map((p) => (
                                    <tr key={p.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-6 py-4 text-sm font-bold text-slate-700">
                                            {new Date(p.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-medium text-slate-900">{p.description}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-600">
                                                {p.category}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="text-sm font-black text-emerald-600">
                                                {formatCurrency(Number(p.value) || 0)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <button
                                                onClick={() => onDelete(p.id)}
                                                className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-all opacity-0 group-hover:opacity-100 active:scale-90"
                                                title="Excluir Lançamento"
                                            >
                                                <span className="material-symbols-outlined text-lg">delete</span>
                                            </button>
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
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-8 py-5 bg-blue-600 text-white flex items-center justify-between">
                            <h3 className="font-black uppercase tracking-widest text-sm">Novo Pagamento Diário</h3>
                            <button onClick={() => setShowModal(false)} className="hover:rotate-90 transition-transform p-1">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-8">
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Data do Pagamento</label>
                                    <input
                                        required
                                        className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl text-sm focus:border-blue-500 focus:bg-white outline-none transition-all font-medium"
                                        type="date"
                                        value={newPayment.date}
                                        onChange={e => handleInputChange('date', e.target.value)}
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Descrição do Pagamento</label>
                                    <input
                                        required
                                        className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl text-sm focus:border-blue-500 focus:bg-white outline-none transition-all font-medium"
                                        type="text"
                                        placeholder="Ex: Pagamento Fornecedor X, Recibo #123"
                                        value={newPayment.description}
                                        onChange={e => handleInputChange('description', e.target.value)}
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Categoria</label>
                                        <select
                                            required
                                            className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl text-sm focus:border-blue-500 focus:bg-white outline-none transition-all font-medium appearance-none"
                                            value={newPayment.category}
                                            onChange={e => handleInputChange('category', e.target.value)}
                                        >
                                            <option value="">Selecione...</option>
                                            {CATEGORIES.map(cat => (
                                                <option key={cat} value={cat}>{cat}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Valor (BRL)</label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">R$</span>
                                            <input
                                                required
                                                className="w-full pl-10 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl text-sm focus:border-blue-500 focus:bg-white outline-none transition-all font-bold"
                                                type="number"
                                                step="0.01"
                                                min="0.01"
                                                placeholder="0,00"
                                                value={newPayment.value || ''}
                                                onChange={e => handleInputChange('value', parseFloat(e.target.value) || 0)}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 px-6 py-4 border-2 border-slate-100 text-slate-500 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-50 transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={!isFormValid}
                                    className={`flex-[2] px-6 py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-lg active:scale-95 ${isFormValid
                                            ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200'
                                            : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                                        }`}
                                >
                                    Confirmar Lançamento
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DailyPaymentsPage;
