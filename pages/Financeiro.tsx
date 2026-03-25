import React, { useState } from 'react';
import { AppState, FutureEntry, FenixLoan, DailyPayment, BankFee } from '../types';
import { formatCurrency, getLocalDateString } from '../utils/calculations';
import { BankFeesTable } from '../components/BankFeesTable';

interface FinanceiroPageProps {
    state: AppState;
    onAddFutureEntry: (entry: Omit<FutureEntry, 'id' | 'created_at'>) => void;
    onToggleFutureEntryApproval: (id: string, approved: boolean) => void;
    onDeleteFutureEntry: (id: string) => void;
    onAddFenixLoan: (loan: Omit<FenixLoan, 'id' | 'created_at'>) => void;
    onDeleteFenixLoan: (id: string) => void;
    onAddBankFee: (fee: Omit<BankFee, 'id' | 'created_at'>) => void;
    onUpdateBankFee: (fee: BankFee) => void;
    onDeleteBankFee: (id: string) => void;
}

const extractValue = (val: string | number | undefined): number => {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    const hasComma = String(val).includes(',');
    let cleaned = String(val);
    if (hasComma) {
        cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    }
    cleaned = cleaned.replace(/[^0-9.-]/g, '');
    return parseFloat(cleaned) || 0;
};

const FinanceiroPage: React.FC<FinanceiroPageProps> = ({
    state, onAddFutureEntry, onToggleFutureEntryApproval, onDeleteFutureEntry, onAddFenixLoan, onDeleteFenixLoan, onAddBankFee, onUpdateBankFee, onDeleteBankFee
}) => {
    const [selectedMonth, setSelectedMonth] = useState(getLocalDateString().slice(0, 7)); // YYYY-MM

    const [showFutureModal, setShowFutureModal] = useState(false);
    const [futureForm, setFutureForm] = useState<Omit<FutureEntry, 'id' | 'created_at'>>({
        date: getLocalDateString(),
        description: '',
        amount: 0,
        category: 'ESPN',
        approved: false
    });

    const [showLoanModal, setShowLoanModal] = useState(false);
    const [loanForm, setLoanForm] = useState<Omit<FenixLoan, 'id' | 'created_at'>>({
        date: getLocalDateString(),
        description: '',
        amount: 0
    });

    // Calculate All-Time Balances
    const totalDailyPayments = state.dailyPayments.reduce((acc, curr) => acc + extractValue(curr.total), 0);
    const totalApprovedESPN = state.futureEntries.filter(e => e.category === 'ESPN' && e.approved).reduce((acc, curr) => acc + Number(curr.amount), 0);
    const totalFenixLoansAccumulated = state.fenixLoans.reduce((acc, curr) => acc + Number(curr.amount), 0);

    const saldoESPN = totalDailyPayments - totalApprovedESPN - totalFenixLoansAccumulated;

    // Filtered by Month
    const currentMonthDailyPayments = state.dailyPayments.filter(p => selectedMonth === 'all' || p.date.startsWith(selectedMonth));
    const currentMonthFutureEntries = state.futureEntries.filter(e => selectedMonth === 'all' || e.date.startsWith(selectedMonth));
    const currentMonthFenixLoans = state.fenixLoans.filter(e => selectedMonth === 'all' || e.date.startsWith(selectedMonth));

    const fenixLoansMes = currentMonthFenixLoans.reduce((acc, curr) => acc + Number(curr.amount), 0);
    const receitaBrutaMes = currentMonthDailyPayments.reduce((acc, curr) => acc + extractValue(curr.total), 0) - fenixLoansMes;
    // Despesas based on all future entries of the month
    const despesasMes = currentMonthFutureEntries.reduce((acc, curr) => acc + Number(curr.amount), 0);
    const liquidoMes = receitaBrutaMes - despesasMes;

    // Month Options
    const months = new Set<string>();
    const now = new Date();
    for (let m = 0; m <= now.getMonth(); m++) {
        months.add(new Date(now.getFullYear(), m, 1).toISOString().slice(0, 7));
    }
    state.dailyPayments.forEach(p => months.add(p.date.slice(0, 7)));
    state.futureEntries.forEach(p => months.add(p.date.slice(0, 7)));
    const monthOptions = Array.from(months).sort().reverse();

    const handleSaveFutureEntry = () => {
        onAddFutureEntry(futureForm);
        setShowFutureModal(false);
        setFutureForm({ date: getLocalDateString(), description: '', amount: 0, category: 'ESPN', approved: false });
    };

    const handleSaveLoan = () => {
        onAddFenixLoan(loanForm);
        setShowLoanModal(false);
        setLoanForm({ date: getLocalDateString(), description: '', amount: 0 });
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8">
            {/* HEADER & FILTER */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <nav className="flex text-sm text-slate-500 mb-2 gap-2 items-center">
                        <span>Sistema</span>
                        <span className="material-symbols-outlined text-xs">chevron_right</span>
                        <span className="text-primary font-medium">Financeiro</span>
                    </nav>
                    <h2 className="text-3xl font-black tracking-tight text-slate-900">Financeiro Geral</h2>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex flex-col">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1 ml-1">Mês de Referência</label>
                        <select
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="bg-white border-2 border-slate-200 px-4 py-2.5 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-blue-500 transition-all cursor-pointer shadow-sm"
                        >
                            <option value="all">TODOS OS MESES</option>
                            {monthOptions.map(m => (
                                <option key={m} value={m}>
                                    {new Date(m + '-02').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase()}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* DASHBOARD WIDGETS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* SALDO ESPN ALL-TIME */}
                <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-lg shadow-blue-500/30 flex flex-col justify-between relative overflow-hidden">
                    <span className="material-symbols-outlined absolute -right-4 -bottom-4 text-8xl text-white/10 select-none">account_balance_wallet</span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-blue-200 mb-2 block">Saldo ESPN (Global)</span>
                    <span className="text-3xl font-black tracking-tighter">{formatCurrency(saldoESPN)}</span>
                </div>

                {/* FLUXO DE CAIXA: RECEITA BRUTA */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs text-emerald-500">trending_up</span> Receita Bruta ({selectedMonth === 'all' ? 'Total' : 'Mês'})
                    </span>
                    <span className="text-2xl font-black text-slate-800 tracking-tighter">{formatCurrency(receitaBrutaMes)}</span>
                </div>

                {/* FLUXO DE CAIXA: DESPESAS */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs text-rose-500">trending_down</span> Despesas ({selectedMonth === 'all' ? 'Total' : 'Mês'})
                    </span>
                    <span className="text-2xl font-black text-slate-800 tracking-tighter">{formatCurrency(despesasMes)}</span>
                </div>

                {/* FLUXO DE CAIXA: LIQUIDO */}
                <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 text-white shadow-lg shadow-slate-900/20 flex flex-col justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs text-emerald-400">account_balance</span> Líquido do Mês
                    </span>
                    <span className={`text-3xl font-black tracking-tighter ${liquidoMes >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {formatCurrency(liquidoMes)}
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                {/* LANÇAMENTOS FUTUROS */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-black text-slate-800 tracking-tight">Lançamentos Futuros</h3>
                        <button
                            onClick={() => setShowFutureModal(true)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors"
                        >
                            <span className="material-symbols-outlined text-sm">add</span> Add
                        </button>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                        <ul className="divide-y divide-slate-100">
                            {currentMonthFutureEntries.length === 0 ? (
                                <li className="p-6 text-center text-slate-400 text-sm font-medium">Nenhum lançamento futuro neste período.</li>
                            ) : currentMonthFutureEntries.map(entry => (
                                <li key={entry.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`text-[10px] px-2 py-0.5 rounded-md font-black uppercase tracking-widest ${entry.category === 'ESPN' ? 'bg-orange-100 text-orange-700' : 'bg-indigo-100 text-indigo-700'}`}>
                                                {entry.category}
                                            </span>
                                            <span className="text-xs font-bold text-slate-400">{new Date(entry.date + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                                        </div>
                                        <p className="font-bold text-slate-800 text-sm">{entry.description}</p>
                                        <div className="text-sm font-black text-slate-600">{formatCurrency(entry.amount)}</div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => onToggleFutureEntryApproval(entry.id, !entry.approved)}
                                            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors ${entry.approved ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500 hover:bg-emerald-50 hover:text-emerald-600'}`}
                                        >
                                            <span className="material-symbols-outlined text-sm">{entry.approved ? 'check_circle' : 'pending'}</span>
                                            {entry.approved ? 'Aprovado' : 'Aprovar'}
                                        </button>
                                        <button onClick={() => onDeleteFutureEntry(entry.id)} className="text-rose-400 hover:text-rose-600 p-1">
                                            <span className="material-symbols-outlined text-lg">delete</span>
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* EMPRÉSTIMOS FENIX */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <h3 className="text-lg font-black text-slate-800 tracking-tight">Empréstimos FENIX</h3>
                            <div className="bg-amber-100 text-amber-800 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest">
                                Acumulado: {formatCurrency(totalFenixLoansAccumulated)}
                            </div>
                        </div>
                        <button
                            onClick={() => setShowLoanModal(true)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-amber-50 text-amber-600 hover:bg-amber-100 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors"
                        >
                            <span className="material-symbols-outlined text-sm">add</span> Add
                        </button>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                        <ul className="divide-y divide-slate-100">
                            {currentMonthFenixLoans.length === 0 ? (
                                <li className="p-6 text-center text-slate-400 text-sm font-medium">Nenhum empréstimo FENIX neste período.</li>
                            ) : currentMonthFenixLoans.map(loan => (
                                <li key={loan.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                    <div>
                                        <div className="text-xs font-bold text-slate-400 mb-0.5">{new Date(loan.date + 'T12:00:00').toLocaleDateString('pt-BR')}</div>
                                        <p className="font-bold text-slate-800 text-sm">{loan.description}</p>
                                        <div className="text-sm font-black text-amber-600">{formatCurrency(loan.amount)}</div>
                                    </div>
                                    <button onClick={() => onDeleteFenixLoan(loan.id)} className="text-rose-400 hover:text-rose-600 p-1">
                                        <span className="material-symbols-outlined text-lg">delete</span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

            </div>

            {/* TARIFAS BANCÁRIAS */}
            <div className="space-y-4 pt-4 border-t border-slate-200">
                <div className="flex items-center gap-4">
                    <div className="size-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                        <span className="material-symbols-outlined text-[20px]">account_balance</span>
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-slate-800 tracking-tight">Tarifas Bancárias</h3>
                        <p className="text-xs font-semibold text-slate-500">Controle diário de taxas e impostos</p>
                    </div>
                </div>
                <BankFeesTable
                    bankFees={state.bankFees}
                    onAddBankFee={onAddBankFee}
                    onUpdateBankFee={onUpdateBankFee}
                    onDeleteBankFee={onDeleteBankFee}
                />
            </div>

            {/* MODALS */}
            {showFutureModal && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden p-6 animate-in zoom-in-95">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-black text-slate-800">Novo Lançamento Futuro</h3>
                            <button onClick={() => setShowFutureModal(false)} className="text-slate-400 hover:text-slate-600"><span className="material-symbols-outlined">close</span></button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Data</label>
                                <input type="date" value={futureForm.date} onChange={e => setFutureForm({ ...futureForm, date: e.target.value })} className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Categoria</label>
                                <select value={futureForm.category} onChange={e => setFutureForm({ ...futureForm, category: e.target.value as 'ESPN' | 'FENIX' })} className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold">
                                    <option value="ESPN">ESPN</option>
                                    <option value="FENIX">FENIX</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Descrição</label>
                                <input type="text" value={futureForm.description} onChange={e => setFutureForm({ ...futureForm, description: e.target.value })} className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl" placeholder="Motivo/Despesa" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Valor</label>
                                <input type="number" step="0.01" value={futureForm.amount || ''} onChange={e => setFutureForm({ ...futureForm, amount: parseFloat(e.target.value) })} className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-blue-600" />
                            </div>
                            <button onClick={handleSaveFutureEntry} className="w-full py-4 bg-blue-600 text-white font-black uppercase tracking-widest rounded-xl hover:bg-blue-700 transition">Salvar Lançamento</button>
                        </div>
                    </div>
                </div>
            )}

            {showLoanModal && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden p-6 animate-in zoom-in-95">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-black text-slate-800">Novo Empréstimo FENIX</h3>
                            <button onClick={() => setShowLoanModal(false)} className="text-slate-400 hover:text-slate-600"><span className="material-symbols-outlined">close</span></button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Data</label>
                                <input type="date" value={loanForm.date} onChange={e => setLoanForm({ ...loanForm, date: e.target.value })} className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Descrição</label>
                                <input type="text" value={loanForm.description} onChange={e => setLoanForm({ ...loanForm, description: e.target.value })} className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl" placeholder="Motivo do Empréstimo" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Valor</label>
                                <input type="number" step="0.01" value={loanForm.amount || ''} onChange={e => setLoanForm({ ...loanForm, amount: parseFloat(e.target.value) })} className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-amber-600" />
                            </div>
                            <button onClick={handleSaveLoan} className="w-full py-4 bg-amber-500 text-white font-black uppercase tracking-widest rounded-xl hover:bg-amber-600 transition">Salvar Empréstimo</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FinanceiroPage;
