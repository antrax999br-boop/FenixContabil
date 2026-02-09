import React, { useState, useEffect } from 'react';
import { DailyPayment } from '../types';
import { formatCurrency } from '../utils/calculations';

interface DailyPaymentsPageProps {
    dailyPayments: DailyPayment[];
    onAdd: (payment: Omit<DailyPayment, 'id' | 'created_at'>) => void;
    onDelete: (id: string) => void;
}

const DailyPaymentsPage: React.FC<DailyPaymentsPageProps> = ({ dailyPayments, onAdd, onDelete }) => {
    const [showModal, setShowModal] = useState(false);

    const [newPayment, setNewPayment] = useState<Omit<DailyPayment, 'id' | 'created_at'>>({
        date: new Date().toISOString().split('T')[0],
        ativos: 0,
        inativos: 0,
        alteracao: 0,
        distrato: 0,
        remissao_gps: 0,
        recal_guia: 0,
        regularizacao: 0,
        outros: 0,
        rent_invest_facil: 0,
        abertura: 0,
        parcelamentos: 0,
        total: 0
    });

    // Calculate total automatically whenever fields change
    useEffect(() => {
        const total =
            (newPayment.ativos || 0) +
            (newPayment.inativos || 0) +
            (newPayment.alteracao || 0) +
            (newPayment.distrato || 0) +
            (newPayment.remissao_gps || 0) +
            (newPayment.recal_guia || 0) +
            (newPayment.regularizacao || 0) +
            (newPayment.outros || 0) +
            (newPayment.rent_invest_facil || 0) +
            (newPayment.abertura || 0) +
            (newPayment.parcelamentos || 0);

        setNewPayment(prev => ({ ...prev, total }));
    }, [
        newPayment.ativos, newPayment.inativos, newPayment.alteracao,
        newPayment.distrato, newPayment.remissao_gps, newPayment.recal_guia,
        newPayment.regularizacao, newPayment.outros, newPayment.rent_invest_facil,
        newPayment.abertura, newPayment.parcelamentos
    ]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onAdd(newPayment);
        setShowModal(false);
        // Reset form
        setNewPayment({
            date: new Date().toISOString().split('T')[0],
            ativos: 0,
            inativos: 0,
            alteracao: 0,
            distrato: 0,
            remissao_gps: 0,
            recal_guia: 0,
            regularizacao: 0,
            outros: 0,
            rent_invest_facil: 0,
            abertura: 0,
            parcelamentos: 0,
            total: 0
        });
    };

    const handleInputChange = (field: keyof Omit<DailyPayment, 'id' | 'created_at'>, value: string) => {
        if (field === 'date') {
            setNewPayment(prev => ({ ...prev, [field]: value }));
        } else {
            setNewPayment(prev => ({ ...prev, [field]: parseFloat(value) || 0 }));
        }
    };

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
                <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
                >
                    <span className="material-symbols-outlined text-sm">add</span>
                    Novo Registro
                </button>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                        <thead>
                            <tr className="border-b border-slate-200 bg-slate-50/50">
                                <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase sticky left-0 bg-slate-50 z-10">Data</th>
                                <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase">Ativos</th>
                                <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase">Inativos</th>
                                <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase">Alteração</th>
                                <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase">Distrato</th>
                                <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase">Remissão GPS</th>
                                <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase">Recal Guia</th>
                                <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase">Regularização</th>
                                <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase">Rent. Invest Fácil</th>
                                <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase">Abertura</th>
                                <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase">Parcelamentos</th>
                                <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase">Outros</th>
                                <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase sticky right-0 bg-slate-50 z-10">Total</th>
                                <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {dailyPayments.length === 0 ? (
                                <tr>
                                    <td colSpan={14} className="px-6 py-12 text-center text-slate-400">
                                        Nenhum registro encontrado.
                                    </td>
                                </tr>
                            ) : (
                                dailyPayments.map((p) => (
                                    <tr key={p.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-4 py-3 text-sm font-semibold text-slate-900 sticky left-0 bg-white group-hover:bg-slate-50">
                                            {new Date(p.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                                        </td>
                                        <td className="px-4 py-3 text-xs text-slate-600">{formatCurrency(p.ativos)}</td>
                                        <td className="px-4 py-3 text-xs text-slate-600">{formatCurrency(p.inativos)}</td>
                                        <td className="px-4 py-3 text-xs text-slate-600">{formatCurrency(p.alteracao)}</td>
                                        <td className="px-4 py-3 text-xs text-slate-600">{formatCurrency(p.distrato)}</td>
                                        <td className="px-4 py-3 text-xs text-slate-600">{formatCurrency(p.remissao_gps)}</td>
                                        <td className="px-4 py-3 text-xs text-slate-600">{formatCurrency(p.recal_guia)}</td>
                                        <td className="px-4 py-3 text-xs text-slate-600">{formatCurrency(p.regularizacao)}</td>
                                        <td className="px-4 py-3 text-xs text-slate-600">{formatCurrency(p.rent_invest_facil)}</td>
                                        <td className="px-4 py-3 text-xs text-slate-600">{formatCurrency(p.abertura)}</td>
                                        <td className="px-4 py-3 text-xs text-slate-600">{formatCurrency(p.parcelamentos)}</td>
                                        <td className="px-4 py-3 text-xs text-slate-600">{formatCurrency(p.outros)}</td>
                                        <td className="px-4 py-3 text-xs font-bold text-emerald-600 sticky right-0 bg-white group-hover:bg-slate-50">
                                            {formatCurrency(p.total)}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <button
                                                onClick={() => onDelete(p.id)}
                                                className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                                title="Excluir"
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
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
                        <div className="px-6 py-4 bg-blue-600 text-white flex items-center justify-between sticky top-0 z-10">
                            <h3 className="font-black uppercase tracking-tight">Novo Registro Diário</h3>
                            <button onClick={() => setShowModal(false)} className="hover:rotate-90 transition-transform">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                <div className="col-span-1 md:col-span-3">
                                    <label className="block text-xs font-black text-slate-500 uppercase mb-1">Data</label>
                                    <input
                                        required
                                        className="w-full px-4 py-2 bg-slate-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20"
                                        type="date"
                                        value={newPayment.date}
                                        onChange={e => handleInputChange('date', e.target.value)}
                                    />
                                </div>

                                {Object.keys(newPayment).map((key) => {
                                    if (key === 'date' || key === 'total') return null;
                                    const label = key.replace(/_/g, ' ').toUpperCase();
                                    return (
                                        <div key={key}>
                                            <label className="block text-xs font-black text-slate-500 uppercase mb-1">{label}</label>
                                            <input
                                                className="w-full px-4 py-2 bg-slate-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20"
                                                type="number"
                                                step="0.01"
                                                value={(newPayment as any)[key]}
                                                onChange={e => handleInputChange(key as any, e.target.value)}
                                                onFocus={e => e.target.select()}
                                            />
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                                <div className="text-xl font-bold text-slate-700">
                                    Total: <span className="text-emerald-600">{formatCurrency(newPayment.total)}</span>
                                </div>
                                <button
                                    type="submit"
                                    className="px-8 py-3 bg-blue-600 text-white rounded-xl font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 active:scale-95"
                                >
                                    Salvar
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
