import React, { useState } from 'react';
import { DailyPayment } from '../types';
import { formatCurrency } from '../utils/calculations';

interface DailyPaymentsPageProps {
    dailyPayments: DailyPayment[];
    onAdd: (payment: Omit<DailyPayment, 'id' | 'created_at'>) => void;
    onUpdate: (payment: DailyPayment) => void;
    onDelete: (id: string) => void;
}

const DailyPaymentsPage: React.FC<DailyPaymentsPageProps> = ({ dailyPayments, onAdd, onUpdate, onDelete }) => {
    const [showModal, setShowModal] = useState(false);
    const [editingPayment, setEditingPayment] = useState<DailyPayment | null>(null);
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
    const [newPayment, setNewPayment] = useState<Omit<DailyPayment, 'id' | 'created_at'>>({
        date: new Date().toISOString().split('T')[0],
        description: '',
        category: '',
        value: ''
    });

    // Helper to get day of week in Portuguese
    const getDayOfWeek = (dateStr: string) => {
        const date = new Date(dateStr + 'T12:00:00');
        return date.toLocaleDateString('pt-BR', { weekday: 'long' }).split('-')[0].toUpperCase();
    };

    // Helper to extract numeric value from string (handling Brazilian format)
    const extractValue = (val: string | number): number => {
        if (typeof val === 'number') return val;
        if (!val) return 0;
        const hasComma = val.includes(',');
        let cleaned = val;
        if (hasComma) {
            cleaned = val.replace(/\./g, '').replace(',', '.');
        }
        cleaned = cleaned.replace(/[^0-9.]/g, '');
        return parseFloat(cleaned) || 0;
    };

    // Filter payments by selected month
    const filteredPayments = selectedMonth === 'all'
        ? dailyPayments
        : dailyPayments.filter(p => p.date.startsWith(selectedMonth));

    const currentForm = editingPayment || newPayment;

    // Validations
    const isFormValid = currentForm.description.trim() !== '' &&
        currentForm.category.trim() !== '' &&
        String(currentForm.value).trim() !== '';

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!isFormValid) return;

        if (editingPayment) {
            onUpdate(editingPayment);
        } else {
            onAdd(newPayment);
        }

        handleCloseModal();
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingPayment(null);
        setNewPayment({
            date: new Date().toISOString().split('T')[0],
            description: '',
            category: '',
            value: ''
        });
    };

    const handleEdit = (p: DailyPayment) => {
        setEditingPayment(p);
        setShowModal(true);
    };

    const handleInputChange = (field: keyof Omit<DailyPayment, 'id' | 'created_at'>, value: string) => {
        if (editingPayment) {
            setEditingPayment(prev => prev ? ({ ...prev, [field]: value }) : null);
        } else {
            setNewPayment(prev => ({ ...prev, [field]: value }));
        }
    };

    // Calculate total
    const totalValue = filteredPayments.reduce((acc, curr) => acc + extractValue(curr.value), 0);

    const availableMonths = Array.from(new Set(dailyPayments.map(p => p.date.slice(0, 7)))).sort().reverse();

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
                    <div className="flex flex-col">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1 ml-1">Mês de Referência</label>
                        <select
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="bg-white border-2 border-slate-200 px-4 py-2.5 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-blue-500 transition-all cursor-pointer shadow-sm"
                        >
                            <option value="all">VER TODOS OS MESES</option>
                            {!availableMonths.includes(new Date().toISOString().slice(0, 7)) && (
                                <option value={new Date().toISOString().slice(0, 7)}>
                                    {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase()}
                                </option>
                            )}
                            {availableMonths.map(month => (
                                <option key={month} value={month}>
                                    {new Date(month + '-02').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase()}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="bg-emerald-50 border border-emerald-100 px-6 py-2 rounded-xl text-right">
                        <span className="block text-[10px] font-black uppercase text-emerald-600 tracking-widest mb-0.5">Total no Mês</span>
                        <span className="text-2xl font-black text-emerald-700">{formatCurrency(totalValue)}</span>
                    </div>

                    <button
                        onClick={() => setShowModal(true)}
                        className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl text-sm font-bold uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 active:scale-95 h-[52px]"
                    >
                        <span className="material-symbols-outlined text-sm">add</span>
                        Adicionar
                    </button>
                </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                        <thead>
                            <tr className="border-b border-slate-200 bg-slate-50/50">
                                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">Data / Dia</th>
                                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">Item / Categoria</th>
                                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest text-right">Valor / Info</th>
                                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredPayments.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-slate-400 font-medium">
                                        Nenhum lançamento encontrado para este mês.
                                    </td>
                                </tr>
                            ) : (
                                filteredPayments.map((p) => (
                                    <tr key={p.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-bold text-slate-700">{new Date(p.date + 'T12:00:00').toLocaleDateString('pt-BR')}</div>
                                            <div className="text-[10px] font-black text-blue-600 uppercase tracking-tighter">{getDayOfWeek(p.date)}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-600">
                                                    {p.category}
                                                </span>
                                                {p.description && p.description !== p.category && (
                                                    <span className="text-sm font-medium text-slate-900">{p.description}</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="text-sm font-black text-emerald-600">
                                                {!isNaN(extractValue(p.value)) && extractValue(p.value) > 0 && String(p.value).match(/^[0-9,.]+$/) ?
                                                    formatCurrency(extractValue(p.value)) :
                                                    p.value}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => handleEdit(p)}
                                                    className="p-2 text-blue-500 hover:bg-blue-50 rounded-xl transition-all active:scale-90"
                                                    title="Editar Lançamento"
                                                >
                                                    <span className="material-symbols-outlined text-lg">edit</span>
                                                </button>
                                                <button
                                                    onClick={() => onDelete(p.id)}
                                                    className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-all active:scale-90"
                                                    title="Excluir Lançamento"
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
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-8 py-5 bg-blue-600 text-white flex items-center justify-between">
                            <h3 className="font-black uppercase tracking-widest text-sm">{editingPayment ? 'Editar Registro' : 'Lançamento Diário'}</h3>
                            <button onClick={handleCloseModal} className="hover:rotate-90 transition-transform p-1">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="p-8 max-h-[80vh] overflow-y-auto">
                            <div className="mb-6">
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Data dos Lançamentos</label>
                                <input
                                    required
                                    className="w-full max-w-xs px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl text-sm focus:border-blue-500 focus:bg-white outline-none transition-all font-medium"
                                    type="date"
                                    value={currentForm.date}
                                    onChange={e => handleInputChange('date', e.target.value)}
                                />
                            </div>

                            <div className="space-y-3">
                                <div className="grid grid-cols-12 gap-4 pb-2 border-b border-slate-100 mb-2">
                                    <div className="col-span-7">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nome do Item / Categoria</span>
                                    </div>
                                    <div className="col-span-5">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Valor ou Informação</span>
                                    </div>
                                </div>

                                {editingPayment ? (
                                    <div className="grid grid-cols-12 gap-4 items-center">
                                        <div className="col-span-7">
                                            <input
                                                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:border-blue-500 outline-none transition-all font-medium"
                                                type="text"
                                                value={editingPayment.category}
                                                onChange={e => setEditingPayment({ ...editingPayment, category: e.target.value, description: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-span-5">
                                            <input
                                                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:border-blue-500 outline-none transition-all font-bold"
                                                type="text"
                                                value={editingPayment.value}
                                                onChange={e => setEditingPayment({ ...editingPayment, value: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        {[
                                            'Ativos', 'Inativos', 'Alteração', 'Distrato',
                                            'Remissão de GPS', 'Recal Guia', 'Regularização',
                                            'Rent Invest Fácil', 'Abertura', 'Parcelamentos', 'Outros'
                                        ].map((cat) => (
                                            <div key={cat} className="grid grid-cols-12 gap-4 items-center">
                                                <div className="col-span-7">
                                                    <div className="px-4 py-2 bg-slate-100 border border-slate-200 rounded-lg text-sm font-bold text-slate-600">
                                                        {cat}
                                                    </div>
                                                </div>
                                                <div className="col-span-5">
                                                    <input
                                                        className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:border-blue-500 outline-none transition-all font-bold"
                                                        type="text"
                                                        placeholder="Vazio"
                                                        onChange={e => {
                                                            // Logic to handle multiple adds would be better with a local state for these inputs
                                                            // but for now we'll just use a simple approach or update the handleAdd logic
                                                        }}
                                                        onBlur={e => {
                                                            if (e.target.value.trim()) {
                                                                // We'll collect these on submit
                                                            }
                                                        }}
                                                        id={`input-${cat}`}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </>
                                )}
                            </div>

                            <div className="mt-8 flex gap-3 sticky bottom-0 bg-white pt-4">
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    className="flex-1 px-6 py-4 border-2 border-slate-100 text-slate-500 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-50 transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (editingPayment) {
                                            onUpdate(editingPayment);
                                            handleCloseModal();
                                        } else {
                                            const items = [
                                                'Ativos', 'Inativos', 'Alteração', 'Distrato',
                                                'Remissão de GPS', 'Recal Guia', 'Regularização',
                                                'Rent Invest Fácil', 'Abertura', 'Parcelamentos', 'Outros'
                                            ];
                                            let addedCount = 0;
                                            items.forEach(cat => {
                                                const input = document.getElementById(`input-${cat}`) as HTMLInputElement;
                                                if (input && input.value.trim() !== '') {
                                                    onAdd({
                                                        date: currentForm.date,
                                                        category: cat,
                                                        description: cat, // Merge as requested
                                                        value: input.value
                                                    });
                                                    addedCount++;
                                                }
                                            });
                                            if (addedCount > 0) handleCloseModal();
                                        }
                                    }}
                                    className="flex-[2] px-6 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-lg shadow-blue-200 active:scale-95 hover:bg-blue-700"
                                >
                                    {editingPayment ? 'Salvar Alterações' : 'Gravar Tudo'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DailyPaymentsPage;
