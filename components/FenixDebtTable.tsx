import React, { useState } from 'react';
import { FenixDebt, FenixDebtType } from '../types';
import { formatCurrency } from '../utils/calculations';

interface FenixDebtTableProps {
    debts: FenixDebt[];
    onAddDebt: (debt: Omit<FenixDebt, 'id' | 'created_at'>) => void;
    onDeleteDebt: (id: string) => void;
}

export const FenixDebtTable: React.FC<FenixDebtTableProps> = ({ debts, onAddDebt, onDeleteDebt }) => {
    const getLocalDateString = () => {
        const d = new Date();
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
        return d.toISOString().split('T')[0];
    };

    const [dateInput, setDateInput] = useState(getLocalDateString());
    const [descInput, setDescInput] = useState('');
    const [valueInput, setValueInput] = useState('');
    const [typeInput, setTypeInput] = useState<FenixDebtType>(FenixDebtType.WITHDRAWAL);

    const totalDivida = debts.reduce((acc, current) => {
        if (current.type === FenixDebtType.WITHDRAWAL) return acc + current.amount;
        if (current.type === FenixDebtType.PAYMENT) return acc - current.amount;
        return acc;
    }, 0);

    const formatInputValue = (val: string) => {
        if (!val) return '';
        let cleaned = val.replace(/\./g, '').replace(',', '.');
        cleaned = cleaned.replace(/[^0-9.-]/g, '');
        const floatVal = parseFloat(cleaned);
        if (isNaN(floatVal)) return '';
        return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(floatVal);
    };

    const handleAdd = () => {
        if (!descInput.trim()) {
            alert('Por favor, informe a descrição.');
            return;
        }

        let numericValue = 0;
        if (valueInput) {
            let cleaned = valueInput.replace(/\./g, '').replace(',', '.');
            cleaned = cleaned.replace(/[^0-9.-]/g, '');
            numericValue = parseFloat(cleaned) || 0;
        }

        if (numericValue <= 0) {
            alert('Por favor, informe um valor válido maior que zero.');
            return;
        }

        onAddDebt({
            date: dateInput,
            description: descInput.trim(),
            type: typeInput,
            amount: numericValue,
        });

        setDescInput('');
        setValueInput('');
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col h-full space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                    <h3 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                        <span className="material-symbols-outlined text-rose-500">account_balance_wallet</span>
                        DEVE PARA FENIX
                    </h3>
                    <p className="text-xs font-semibold text-slate-500 mt-1">Controle de dívidas e pagamentos corporativos isolados</p>
                </div>
                <div className="bg-rose-50 px-4 py-2 rounded-xl text-right">
                    <span className="block text-[10px] font-black text-rose-400 uppercase tracking-widest">Dívida Total Acumulada</span>
                    <span className="block text-xl font-black text-rose-600">{formatCurrency(totalDivida)}</span>
                </div>
            </div>

            {/* Form */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="md:col-span-2">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Data</label>
                    <input type="date" value={dateInput} onChange={e => setDateInput(e.target.value)} className="w-full bg-white border border-slate-200 px-3 py-2 text-sm rounded-lg font-semibold focus:ring-2 focus:ring-rose-200" />
                </div>
                <div className="md:col-span-3">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Operação</label>
                    <select value={typeInput} onChange={e => setTypeInput(e.target.value as FenixDebtType)} className="w-full bg-white border border-slate-200 px-3 py-2 text-sm rounded-lg font-black focus:ring-2 focus:ring-rose-200">
                        <option value={FenixDebtType.WITHDRAWAL}>🔴 Retirar (Aumenta Dívida)</option>
                        <option value={FenixDebtType.PAYMENT}>🟢 Pagar (Diminui Dívida)</option>
                    </select>
                </div>
                <div className="md:col-span-3">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Descrição</label>
                    <input type="text" placeholder="Motivo..." value={descInput} onChange={e => setDescInput(e.target.value)} className="w-full bg-white border border-slate-200 px-3 py-2 text-sm rounded-lg font-semibold focus:ring-2 focus:ring-rose-200" />
                </div>
                <div className="md:col-span-2">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Valor (R$)</label>
                    <input type="text" placeholder="0,00" value={valueInput} onChange={e => setValueInput(e.target.value)} onBlur={() => setValueInput(formatInputValue(valueInput))} className="w-full bg-white border border-slate-200 px-3 py-2 text-sm rounded-lg font-black text-slate-700 focus:ring-2 focus:ring-rose-200 text-right" />
                </div>
                <div className="md:col-span-2 flex items-end">
                    <button onClick={handleAdd} className="w-full h-[38px] bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs uppercase rounded-lg transition-colors flex items-center justify-center gap-1 shadow-md">
                        <span className="material-symbols-outlined text-[16px]">add</span> Add
                    </button>
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-auto rounded-xl border border-slate-200 bg-white">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 sticky top-0 z-10">
                        <tr>
                            <th className="px-4 py-3 text-xs font-black text-slate-500 uppercase border-b border-slate-200 w-24">Data</th>
                            <th className="px-4 py-3 text-xs font-black text-slate-500 uppercase border-b border-slate-200 text-center w-32">Tipo</th>
                            <th className="px-4 py-3 text-xs font-black text-slate-500 uppercase border-b border-slate-200">Descrição</th>
                            <th className="px-4 py-3 text-xs font-black text-slate-500 uppercase border-b border-slate-200 text-right w-36">Valor</th>
                            <th className="px-4 py-3 text-xs font-black text-slate-500 uppercase border-b border-slate-200 text-center w-16"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {debts.length === 0 ? (
                            <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400 text-sm font-medium">Nenhum registro encontrado.</td></tr>
                        ) : debts.map(d => (
                            <tr key={d.id} className="hover:bg-slate-50/50">
                                <td className="px-4 py-3 text-sm font-semibold text-slate-600">
                                    {new Date(d.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                                </td>
                                <td className="px-4 py-3 text-center">
                                    {d.type === FenixDebtType.WITHDRAWAL ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-50 text-rose-600 text-[10px] font-black uppercase">
                                            <span className="material-symbols-outlined text-[12px]">arrow_outward</span> RETIRADA
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase">
                                            <span className="material-symbols-outlined text-[12px]">south_east</span> PAGAMENTO
                                        </span>
                                    )}
                                </td>
                                <td className="px-4 py-3 text-sm font-medium text-slate-800">{d.description}</td>
                                <td className={`px-4 py-3 text-right text-sm font-black ${d.type === FenixDebtType.WITHDRAWAL ? 'text-rose-600' : 'text-emerald-600'}`}>
                                    {d.type === FenixDebtType.WITHDRAWAL ? '+' : '-'}{formatCurrency(d.amount)}
                                </td>
                                <td className="px-4 py-3 text-center">
                                    <button onClick={() => onDeleteDebt(d.id)} className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors" title="Excluir">
                                        <span className="material-symbols-outlined text-[18px]">delete</span>
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
