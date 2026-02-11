
import React, { useState } from 'react';
import { AppState, Payable, InvoiceStatus } from '../types';
import { formatCurrency } from '../utils/calculations';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface PayablesPageProps {
    state: AppState;
    onAdd: (payable: Omit<Payable, 'id' | 'status'>) => void;
    onUpdate: (payable: Payable) => void;
    onPay: (id: string) => void;
    onDelete: (id: string) => void;
}

const PayablesPage: React.FC<PayablesPageProps> = ({ state, onAdd, onPay, onUpdate, onDelete }) => {
    const [showModal, setShowModal] = useState(false);
    const [editingPayable, setEditingPayable] = useState<Payable | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [monthFilter, setMonthFilter] = useState<number | 'ALL'>(new Date().getMonth());
    const [yearFilter, setYearFilter] = useState<number | 'ALL'>(new Date().getFullYear());

    const months = [
        "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
        "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];

    const currentYear = new Date().getFullYear();
    const years = [currentYear - 1, currentYear, currentYear + 1];

    const [newPayable, setNewPayable] = useState({
        description: '',
        value: 0,
        due_date: new Date().toISOString().split('T')[0],
        prazo: '',
    });

    const handleOpenEdit = (payable: Payable) => {
        setEditingPayable(payable);
        setNewPayable({
            description: payable.description,
            value: payable.value,
            due_date: payable.due_date,
            prazo: payable.prazo || '',
        });
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingPayable(null);
        setNewPayable({
            description: '',
            value: 0,
            due_date: new Date().toISOString().split('T')[0],
            prazo: '',
        });
    };

    const filteredPayables = (state.payables || []).filter(p => {
        const matchesSearch = p.description.toLowerCase().includes(searchTerm.toLowerCase());
        const date = new Date(p.due_date + 'T12:00:00');
        const matchesMonth = monthFilter === 'ALL' || date.getMonth() === monthFilter;
        const matchesYear = yearFilter === 'ALL' || date.getFullYear() === yearFilter;
        return matchesSearch && matchesMonth && matchesYear;
    }).sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());

    const generatePDF = () => {
        const doc = new jsPDF();

        // Header Background
        doc.setFillColor(225, 29, 72); // Rose-600
        doc.rect(0, 0, 210, 40, 'F');

        // Header Text
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(22);
        doc.setTextColor(255, 255, 255);
        doc.text('Relatório de Contas a Pagar', 14, 20);

        doc.setFontSize(10);
        const periodText = monthFilter === 'ALL' ? `Todo o Ano de ${yearFilter}` : `${months[monthFilter as number]} de ${yearFilter}`;
        doc.text(`Período: ${periodText}`, 14, 30);
        doc.text(`Fenix Contábil - Emitido em: ${new Date().toLocaleDateString('pt-BR')}`, 196, 30, { align: 'right' });

        // Summary Statistics
        const totalValue = filteredPayables.reduce((acc, p) => acc + p.value, 0);
        const paidValue = filteredPayables.filter(p => p.status === InvoiceStatus.PAID).reduce((acc, p) => acc + p.value, 0);
        const pendingValue = totalValue - paidValue;

        doc.setFillColor(248, 250, 252);
        doc.roundedRect(14, 45, 182, 25, 3, 3, 'F');

        doc.setTextColor(51, 65, 85);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('RESUMO FINANCEIRO', 20, 52);
        doc.setFont('helvetica', 'normal');
        doc.text(`Total Bruto: ${formatCurrency(totalValue)}`, 20, 58);
        doc.text(`Total Liquidado: ${formatCurrency(paidValue)}`, 80, 58);
        doc.text(`Total Pendente: ${formatCurrency(pendingValue)}`, 140, 58);
        doc.text(`Quantidade de Lançamentos: ${filteredPayables.length}`, 20, 64);

        const tableData = filteredPayables.map(p => [
            p.description,
            formatCurrency(p.value),
            new Date(p.due_date + 'T12:00:00').toLocaleDateString('pt-BR'),
            p.prazo || '---',
            p.payment_date ? new Date(p.payment_date + 'T12:00:00').toLocaleDateString('pt-BR') : '---',
            p.value > 0 ? (p.status === InvoiceStatus.PAID ? 'PAGO' : p.status === InvoiceStatus.OVERDUE ? 'ATRASADO' : 'PENDENTE') : '---'
        ]);

        autoTable(doc, {
            startY: 75,
            head: [['Descrição', 'Valor', 'Vencimento', 'Prazo', 'Pagamento', 'Status']],
            body: tableData,
            theme: 'grid',
            headStyles: { fillColor: [225, 29, 72], textColor: [255, 255, 255] },
            columnStyles: {
                1: { halign: 'right', fontStyle: 'bold' },
                5: { halign: 'center' }
            },
            didParseCell: (data) => {
                if (data.section === 'body' && data.column.index === 5) {
                    const val = data.cell.text[0];
                    if (val === 'PAGO') data.cell.styles.textColor = [16, 185, 129];
                    if (val === 'ATRASADO') data.cell.styles.textColor = [225, 29, 72];
                    if (val === 'PENDENTE') data.cell.styles.textColor = [217, 119, 6];
                }
            }
        });

        doc.save(`Contas_a_Pagar_${periodText.replace(/ /g, '_')}.pdf`);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newPayable.description) return alert('Insira uma descrição');

        if (editingPayable) {
            onUpdate({
                ...editingPayable,
                ...newPayable
            });
        } else {
            onAdd(newPayable);
        }

        handleCloseModal();
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
                <div className="flex gap-3">
                    <button
                        onClick={generatePDF}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-colors shadow-sm"
                    >
                        <span className="material-symbols-outlined text-sm">picture_as_pdf</span>
                        Exportar PDF
                    </button>
                    <button
                        onClick={() => setShowModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-lg text-sm font-semibold hover:bg-rose-700 transition-colors shadow-lg shadow-rose-200"
                    >
                        <span className="material-symbols-outlined text-sm">add</span>
                        Nova Conta
                    </button>
                </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6 flex items-center justify-between flex-wrap gap-4">
                <div className="relative max-w-sm flex-1">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
                    <input
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-primary/20 text-slate-900"
                        placeholder="Buscar por descrição..."
                        type="text"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="flex items-center gap-2">
                    <select
                        className="bg-slate-50 border-none rounded-lg py-2 text-sm focus:ring-2 focus:ring-rose-500/20 text-slate-900"
                        value={monthFilter}
                        onChange={e => setMonthFilter(e.target.value === 'ALL' ? 'ALL' : parseInt(e.target.value))}
                    >
                        <option value="ALL">Todo o Ano</option>
                        {months.map((m, idx) => (
                            <option key={m} value={idx}>{m}</option>
                        ))}
                    </select>

                    <select
                        className="bg-slate-50 border-none rounded-lg py-2 text-sm focus:ring-2 focus:ring-rose-500/20 text-slate-900"
                        value={yearFilter}
                        onChange={e => setYearFilter(e.target.value === 'ALL' ? 'ALL' : parseInt(e.target.value))}
                    >
                        <option value="ALL">Todos os Anos</option>
                        {years.map(y => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>
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
                                            {p.value > 0 && (
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-black uppercase ${p.status === InvoiceStatus.PAID
                                                    ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                                                    : p.status === InvoiceStatus.OVERDUE
                                                        ? 'bg-rose-100 text-rose-700 border-rose-200'
                                                        : 'bg-amber-100 text-amber-700 border-amber-200'
                                                    }`}>
                                                    {p.status === InvoiceStatus.PAID ? 'Pago' : p.status === InvoiceStatus.OVERDUE ? 'Atrasado' : 'Pendente'}
                                                </span>
                                            )}
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
                                                    onClick={() => handleOpenEdit(p)}
                                                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                    title="Editar"
                                                >
                                                    <span className="material-symbols-outlined text-lg">edit</span>
                                                </button>
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
                            <h3 className="font-black uppercase tracking-tight">
                                {editingPayable ? 'Editar Conta' : 'Nova Conta a Pagar'}
                            </h3>
                            <button onClick={handleCloseModal} className="hover:rotate-90 transition-transform">
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
                                    {editingPayable ? 'Salvar Alterações' : 'Confirmar Cadastro'}
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
