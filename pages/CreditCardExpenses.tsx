import React, { useState } from 'react';
import { CreditCardExpense, CreditCardPayment } from '../types';
import { formatCurrency } from '../utils/calculations';

interface CreditCardExpensesPageProps {
    expenses: CreditCardExpense[];
    payments: CreditCardPayment[];
    onAddExpense: (expense: Omit<CreditCardExpense, 'id' | 'created_at'>) => void;
    onUpdateExpense: (expense: CreditCardExpense) => void;
    onDeleteExpense: (id: string) => void;
    onTogglePayment: (yearMonth: string, card: string, isPaid: boolean) => void;
}

const CreditCardExpensesPage: React.FC<CreditCardExpensesPageProps> = ({
    expenses,
    payments,
    onAddExpense,
    onUpdateExpense,
    onDeleteExpense,
    onTogglePayment
}) => {
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7).replace('-', '.')); // AAAA.MM
    const [showModal, setShowModal] = useState(false);
    const [editingExpense, setEditingExpense] = useState<CreditCardExpense | null>(null);

    const [formData, setFormData] = useState<Omit<CreditCardExpense, 'id' | 'created_at'>>({
        purchase_date: new Date().toISOString().split('T')[0],
        description: '',
        card: 'Visa',
        total_value: 0,
        total_installments: 1
    });

    const cards = ['Visa', 'Master', 'Elo', 'Amex', 'Nubank', 'Outros'];

    // Helper to get month string AAAA.MM from date
    const getMonthStr = (date: Date) => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        return `${y}.${m}`;
    };

    // Calculate which expenses are active in the selected month
    const getActiveInstallments = () => {
        const [selYear, selMonth] = selectedMonth.split('.').map(Number);
        const selDate = new Date(selYear, selMonth - 1, 1);

        return expenses.map(exp => {
            const purchaseDate = new Date(exp.purchase_date + 'T12:00:00');
            const startYear = purchaseDate.getFullYear();
            const startMonth = purchaseDate.getMonth(); // 0-11

            // Difference in months
            const diffMonths = (selYear - startYear) * 12 + (selMonth - 1 - startMonth);

            if (diffMonths >= 0 && diffMonths < exp.total_installments) {
                const installmentValue = exp.total_value / exp.total_installments;
                const paidCount = getPaidInstallmentsCount(exp);
                const balance = exp.total_value - (installmentValue * paidCount);

                // Status logic from user: 
                // Se ValorMensal = 0 então Status = "PAGO"
                // Se ValorMensal < 0 então Status = "EM ABERTO"
                // Actually, the user wants to see -Value if active.

                const isPaid = isMonthPaid(selectedMonth, exp.card);

                return {
                    ...exp,
                    currentInstallment: diffMonths + 1,
                    monthlyValue: -installmentValue,
                    balance: balance,
                    isPaid: isPaid
                };
            }
            return null;
        }).filter(Boolean) as (CreditCardExpense & { currentInstallment: number, monthlyValue: number, balance: number, isPaid: boolean })[];
    };

    const getPaidInstallmentsCount = (exp: CreditCardExpense) => {
        // Correct logic: count how many months within the installment range are marked as PAGO
        const purchaseDate = new Date(exp.purchase_date + 'T12:00:00');
        let count = 0;
        for (let i = 0; i < exp.total_installments; i++) {
            const d = new Date(purchaseDate.getFullYear(), purchaseDate.getMonth() + i, 1);
            const mStr = getMonthStr(d);
            if (isMonthPaid(mStr, exp.card)) {
                count++;
            }
        }
        return count;
    };

    const isMonthPaid = (yearMonth: string, card: string) => {
        return payments.some(p => p.year_month === yearMonth && p.card === card && p.is_paid);
    };

    const activeItems = getActiveInstallments();
    const totalMonthlyBill = activeItems.reduce((sum, item) => sum + item.monthlyValue, 0);

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingExpense(null);
        setFormData({
            purchase_date: new Date().toISOString().split('T')[0],
            description: '',
            card: 'Visa',
            total_value: 0,
            total_installments: 1
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingExpense) {
            onUpdateExpense({ ...editingExpense, ...formData });
        } else {
            onAddExpense(formData);
        }
        handleCloseModal();
    };

    // Generate month options for filter (Current year + any with data)
    const generateMonthOptions = () => {
        const months = new Set<string>();
        const now = new Date();
        for (let m = 0; m < 12; m++) {
            months.add(getMonthStr(new Date(now.getFullYear(), m, 1)));
        }
        expenses.forEach(exp => {
            const d = new Date(exp.purchase_date + 'T12:00:00');
            for (let i = 0; i < exp.total_installments; i++) {
                months.add(getMonthStr(new Date(d.getFullYear(), d.getMonth() + i, 1)));
            }
        });
        return Array.from(months).sort().reverse();
    };

    return (
        <div className="max-w-7xl mx-auto pb-20">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
                <div>
                    <nav className="flex text-sm text-slate-500 mb-2 gap-2 items-center">
                        <span>Financeiro</span>
                        <span className="material-symbols-outlined text-xs">chevron_right</span>
                        <span className="text-primary font-medium">Gastos de Cartão</span>
                    </nav>
                    <h2 className="text-3xl font-black tracking-tight text-slate-900">Controle de Cartão</h2>
                </div>

                <div className="flex flex-col md:flex-row items-center gap-4">
                    <div className="flex flex-col">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1 ml-1">Fatura de Referência</label>
                        <select
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="bg-white border-2 border-slate-200 px-4 py-2.5 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-blue-500 transition-all cursor-pointer shadow-sm"
                        >
                            {generateMonthOptions().map(m => (
                                <option key={m} value={m}>
                                    {new Date(m.replace('.', '-') + '-02').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase()}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="bg-rose-50 border border-rose-100 px-6 py-2 rounded-xl text-right">
                        <span className="block text-[10px] font-black uppercase text-rose-600 tracking-widest mb-0.5">Total da Fatura</span>
                        <span className="text-2xl font-black text-rose-700">{formatCurrency(Math.abs(totalMonthlyBill))}</span>
                    </div>

                    <button
                        onClick={() => setShowModal(true)}
                        className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl text-sm font-bold uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 active:scale-95 h-[52px]"
                    >
                        <span className="material-symbols-outlined text-sm">add_shopping_cart</span>
                        Nova Compra
                    </button>
                </div>
            </div>

            {/* Matrix View (like Excel) */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden mb-8">
                <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <h3 className="font-black text-slate-700 uppercase tracking-widest text-xs">
                        Lançamentos em {new Date(selectedMonth.replace('.', '-') + '-02').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                        {cards.map(card => {
                            const isPaid = isMonthPaid(selectedMonth, card);
                            const cardHasItems = activeItems.some(i => i.card === card);
                            if (!cardHasItems) return null;
                            return (
                                <button
                                    key={card}
                                    onClick={() => onTogglePayment(selectedMonth, card, !isPaid)}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-sm border-2 ${isPaid
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                        : 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700 hover:shadow-blue-100'
                                        }`}
                                >
                                    <span className="material-symbols-outlined text-sm">
                                        {isPaid ? 'check_circle' : 'pending'}
                                    </span>
                                    {card}: {isPaid ? 'FATURA PAGA' : 'MARCAR COMO PAGO'}
                                </button>
                            );
                        })}
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                        <thead>
                            <tr className="border-b border-slate-200 bg-slate-50/30">
                                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Data</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Descrição</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Cartão</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Parcela</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Valor Parcela</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Saldo Restante</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Status</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {activeItems.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center gap-2">
                                            <span className="material-symbols-outlined text-4xl text-slate-200">credit_card_off</span>
                                            <p className="text-slate-400 font-medium">
                                                Nenhum gasto registrado para {new Date(selectedMonth.replace('.', '-') + '-02').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                                            </p>
                                            <p className="text-slate-300 text-xs">Clique em "Nova Compra" para realizar o primeiro lançamento.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                activeItems.map((item) => {
                                    const now = new Date();
                                    const currentYearMonth = getMonthStr(now);
                                    let statusColor = 'text-blue-600 bg-blue-50';
                                    let statusText = 'EM ABERTO';

                                    if (item.isPaid) {
                                        statusColor = 'text-emerald-600 bg-emerald-50';
                                        statusText = 'PAGO';
                                    } else if (selectedMonth > currentYearMonth) {
                                        statusColor = 'text-rose-600 bg-rose-50';
                                        statusText = 'FUTURO';
                                    }

                                    return (
                                        <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                                            <td className="px-6 py-4 text-sm font-medium text-slate-600">
                                                {new Date(item.purchase_date + 'T12:00:00').toLocaleDateString('pt-BR')}
                                            </td>
                                            <td className="px-6 py-4 text-sm font-bold text-slate-900">
                                                {item.description}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-black rounded-md">{item.card.toUpperCase()}</span>
                                            </td>
                                            <td className="px-6 py-4 text-center text-sm font-medium text-slate-500">
                                                {item.currentInstallment}/{item.total_installments}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className="text-sm font-black text-rose-600">
                                                    {formatCurrency(item.monthlyValue)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className="text-sm font-medium text-slate-600">
                                                    {formatCurrency(item.balance)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${statusColor}`}>
                                                    {statusText}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center text-slate-400">
                                                <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => { setEditingExpense(item); setFormData(item); setShowModal(true); }} className="hover:text-blue-600 p-1"><span className="material-symbols-outlined text-lg">edit</span></button>
                                                    <button onClick={() => onDeleteExpense(item.id)} className="hover:text-rose-600 p-1"><span className="material-symbols-outlined text-lg">delete</span></button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Summary by Card */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {cards.map(card => {
                    const cardItems = activeItems.filter(i => i.card === card);
                    if (cardItems.length === 0) return null;
                    const cardTotal = cardItems.reduce((sum, i) => sum + i.monthlyValue, 0);
                    const isPaid = isMonthPaid(selectedMonth, card);

                    return (
                        <button
                            key={card}
                            onClick={() => onTogglePayment(selectedMonth, card, !isPaid)}
                            className={`bg-white border text-left border-slate-200 rounded-2xl p-6 shadow-sm hover:scale-[1.02] transition-all active:scale-95 group ${isPaid ? 'border-emerald-200 bg-emerald-50/10' : 'hover:border-blue-300'}`}
                        >
                            <div className="flex items-center justify-between mb-4">
                                <h4 className="font-black text-slate-900 uppercase tracking-widest text-xs">{card}</h4>
                                <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase ${isPaid ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                    {isPaid ? 'PAGO' : 'EM ABERTO'}
                                </span>
                            </div>
                            <div className={`text-2xl font-black mb-1 ${isPaid ? 'text-emerald-700' : 'text-slate-900 group-hover:text-blue-600'}`}>{formatCurrency(Math.abs(cardTotal))}</div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center justify-between">
                                <span>Total na Fatura</span>
                                <span className="material-symbols-outlined text-sm opacity-0 group-hover:opacity-100 transition-opacity">
                                    {isPaid ? 'undo' : 'check_circle'}
                                </span>
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-8 py-5 bg-blue-600 text-white flex items-center justify-between">
                            <h3 className="font-black uppercase tracking-widest text-sm">{editingExpense ? 'Editar Compra' : 'Nova Compra no Cartão'}</h3>
                            <button onClick={handleCloseModal} className="hover:rotate-90 transition-transform p-1">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-8">
                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div className="col-span-2">
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Descrição da Despesa</label>
                                    <input
                                        required
                                        className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl text-sm focus:border-blue-500 focus:bg-white outline-none transition-all font-bold"
                                        type="text"
                                        placeholder="Ex: Carrefour, Sofa, etc"
                                        value={formData.description}
                                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Data da Compra</label>
                                    <input
                                        required
                                        className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl text-sm focus:border-blue-500 focus:bg-white outline-none transition-all font-medium"
                                        type="date"
                                        value={formData.purchase_date}
                                        onChange={e => setFormData({ ...formData, purchase_date: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Cartão</label>
                                    <select
                                        className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl text-sm focus:border-blue-500 focus:bg-white outline-none transition-all font-bold"
                                        value={formData.card}
                                        onChange={e => setFormData({ ...formData, card: e.target.value })}
                                    >
                                        {cards.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Valor Total</label>
                                    <input
                                        required
                                        className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl text-sm focus:border-blue-500 focus:bg-white outline-none transition-all font-black text-blue-600"
                                        type="number"
                                        step="0.01"
                                        placeholder="0,00"
                                        value={formData.total_value || ''}
                                        onChange={e => setFormData({ ...formData, total_value: parseFloat(e.target.value) || 0 })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Nº de Parcelas</label>
                                    <input
                                        required
                                        className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl text-sm focus:border-blue-500 focus:bg-white outline-none transition-all font-bold"
                                        type="number"
                                        min="1"
                                        value={formData.total_installments}
                                        onChange={e => setFormData({ ...formData, total_installments: parseInt(e.target.value) || 1 })}
                                    />
                                </div>
                            </div>

                            {formData.total_value > 0 && (
                                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 mb-8 flex justify-between items-center">
                                    <div>
                                        <span className="block text-[10px] font-black text-blue-400 uppercase tracking-widest leading-none mb-1">Valor por Parcela</span>
                                        <span className="text-xl font-black text-blue-700">{formatCurrency(formData.total_value / formData.total_installments)}</span>
                                    </div>
                                    <div className="text-right">
                                        <span className="block text-[10px] font-black text-blue-400 uppercase tracking-widest leading-none mb-1">Duração</span>
                                        <span className="text-sm font-bold text-blue-700">{formData.total_installments} meses</span>
                                    </div>
                                </div>
                            )}

                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    className="flex-1 px-6 py-4 border-2 border-slate-100 text-slate-500 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-50 transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="flex-[2] px-6 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-lg shadow-blue-200 active:scale-95 hover:bg-blue-700"
                                >
                                    {editingExpense ? 'Salvar Alterações' : 'Gravar Compra'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CreditCardExpensesPage;
