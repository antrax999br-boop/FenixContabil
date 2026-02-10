import React, { useState } from 'react';
import { DailyPayment } from '../types';
import { formatCurrency } from '../utils/calculations';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface DailyPaymentsPageProps {
    dailyPayments: DailyPayment[];
    onAdd: (payment: Omit<DailyPayment, 'id' | 'created_at'>) => void;
    onUpdate: (payment: DailyPayment) => void;
    onDelete: (id: string) => void;
}

const categoryFields: (keyof Omit<DailyPayment, 'id' | 'date' | 'created_at' | 'total'>)[] = [
    'ativos', 'inativos', 'alteracao', 'distrato',
    'remissao_gps', 'recal_guia', 'regularizacao',
    'rent_invest_facil', 'abertura', 'parcelamentos', 'outros'
];

const categoryLabels: Record<string, string> = {
    ativos: 'Ativos',
    inativos: 'Inativos',
    alteracao: 'Alteração',
    distrato: 'Distrato',
    remissao_gps: 'Remissão de GPS',
    recal_guia: 'Recal Guia',
    regularizacao: 'Regularização',
    rent_invest_facil: 'Rent Invest Fácil',
    abertura: 'Abertura',
    parcelamentos: 'Parcelamentos',
    outros: 'Outros'
};

const DailyPaymentsPage: React.FC<DailyPaymentsPageProps> = ({ dailyPayments, onAdd, onUpdate, onDelete }) => {
    const [showModal, setShowModal] = useState(false);
    const [editingPayment, setEditingPayment] = useState<DailyPayment | null>(null);
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
    const [newPayment, setNewPayment] = useState<Omit<DailyPayment, 'id' | 'created_at'>>({
        date: new Date().toISOString().split('T')[0],
        description: '',
        ativos: '', inativos: '', alteracao: '', distrato: '',
        remissao_gps: '', recal_guia: '', regularizacao: '',
        rent_invest_facil: '', abertura: '', parcelamentos: '', outros: ''
    });

    const getDayOfWeek = (dateStr: string) => {
        const date = new Date(dateStr + 'T12:00:00');
        return date.toLocaleDateString('pt-BR', { weekday: 'long' }).split('-')[0].toUpperCase();
    };

    const extractValue = (val: string | number | undefined): number => {
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

    const filteredPayments = selectedMonth === 'all'
        ? dailyPayments
        : dailyPayments.filter(p => p.date.startsWith(selectedMonth));

    const currentForm = editingPayment || newPayment;

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingPayment(null);
        setNewPayment({
            date: new Date().toISOString().split('T')[0],
            description: '',
            ativos: '', inativos: '', alteracao: '', distrato: '',
            remissao_gps: '', recal_guia: '', regularizacao: '',
            rent_invest_facil: '', abertura: '', parcelamentos: '', outros: ''
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

    // Calculate total for a single payment row
    const calculateRowTotal = (p: DailyPayment | Omit<DailyPayment, 'id' | 'created_at'>) => {
        return categoryFields.reduce((sum, field) => sum + extractValue(p[field]), 0);
    };

    // Overall total
    const totalValue = filteredPayments.reduce((acc, curr) => acc + calculateRowTotal(curr), 0);

    // Generate a list of months to show in the filter
    const generateMonthOptions = () => {
        const months = new Set<string>();

        // Add months of the CURRENT year (2026) up to current month
        const now = new Date();
        const currentYear = now.getFullYear();
        for (let m = 0; m <= now.getMonth(); m++) {
            const d = new Date(currentYear, m, 1);
            months.add(d.toISOString().slice(0, 7));
        }

        // Add any months that have data (if any exist from other years)
        dailyPayments.forEach(p => {
            months.add(p.date.slice(0, 7));
        });

        return Array.from(months).sort().reverse();
    };

    const monthOptions = generateMonthOptions();

    const generatePDF = () => {
        const doc = new jsPDF('l', 'mm', 'a4'); // Landscape
        const monthLabel = selectedMonth === 'all'
            ? 'Todos os Meses'
            : new Date(selectedMonth + '-02').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase();

        // Header Background
        doc.setFillColor(15, 23, 42); // Navy 900
        doc.rect(0, 0, 297, 40, 'F');

        // Header Text
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(22);
        doc.setTextColor(255, 255, 255);
        doc.text('Relatório de Pagamentos Diários', 14, 20);

        doc.setFontSize(10);
        doc.text(`Referência: ${monthLabel}`, 14, 30);
        doc.text(`Fenix Contábil - Emitido em: ${new Date().toLocaleDateString('pt-BR')}`, 283, 30, { align: 'right' });

        const tableBody = filteredPayments.map(p => {
            const row: any[] = [
                new Date(p.date + 'T12:00:00').toLocaleDateString('pt-BR'),
                p.description || ''
            ];

            // Add each category value
            categoryFields.forEach(field => {
                const val = p[field];
                if (!val) {
                    row.push('');
                } else if (!isNaN(extractValue(val)) && extractValue(val) > 0 && String(val).match(/^[0-9,.]+$/)) {
                    row.push(formatCurrency(extractValue(val)));
                } else {
                    row.push(val);
                }
            });

            row.push(formatCurrency(calculateRowTotal(p)));
            return row;
        });

        const headers = [['Data', 'Descrição', ...categoryFields.map(f => categoryLabels[f]), 'TOTAL']];

        autoTable(doc, {
            startY: 50,
            head: headers,
            body: tableBody,
            theme: 'grid',
            headStyles: { fillColor: [37, 99, 235], fontSize: 7 },
            styles: { fontSize: 7, cellPadding: 2 },
            columnStyles: {
                0: { cellWidth: 20 },
                1: { cellWidth: 40 },
                [headers[0].length - 1]: { halign: 'right', fontStyle: 'bold' }
            }
        });

        doc.setFontSize(12);
        doc.setTextColor(30, 41, 59);
        doc.text(`TOTAL GERAL NO PERÍODO: ${formatCurrency(totalValue)}`, 283, (doc as any).lastAutoTable.finalY + 15, { align: 'right' });

        doc.save(`Pagamentos_Diarios_${selectedMonth.replace('-', '_')}.pdf`);
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

                <div className="flex flex-col md:flex-row items-center gap-4">
                    <button
                        onClick={generatePDF}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors shadow-sm h-[52px]"
                    >
                        <span className="material-symbols-outlined text-sm">picture_as_pdf</span>
                        Relatório PDF
                    </button>

                    <div className="flex flex-col">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1 ml-1">Mês de Referência</label>
                        <select
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="bg-white border-2 border-slate-200 px-4 py-2.5 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-blue-500 transition-all cursor-pointer shadow-sm"
                        >
                            <option value="all">VER TODOS OS MESES</option>
                            {monthOptions.map(month => (
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
                        Novo Lançamento
                    </button>
                </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                        <thead>
                            <tr className="border-b border-slate-200 bg-slate-50/50">
                                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">Data / Dia</th>
                                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">Nome do Item / Descrição</th>
                                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">Itens Lançados</th>
                                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest text-right">Total do Dia</th>
                                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredPayments.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-medium">
                                        Nenhum lançamento encontrado para este mês.
                                    </td>
                                </tr>
                            ) : (
                                filteredPayments.map((p) => (
                                    <tr key={p.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-6 py-4 align-top">
                                            <div className="text-sm font-bold text-slate-700">{new Date(p.date + 'T12:00:00').toLocaleDateString('pt-BR')}</div>
                                            <div className="text-[10px] font-black text-blue-600 uppercase tracking-tighter">{getDayOfWeek(p.date)}</div>
                                        </td>
                                        <td className="px-6 py-4 align-top">
                                            <div className="text-sm font-medium text-slate-900">{p.description || '-'}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-wrap gap-2 max-w-2xl">
                                                {categoryFields.map(field => {
                                                    const val = p[field];
                                                    if (!val) return null;
                                                    return (
                                                        <div key={field} className="bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-lg flex flex-col">
                                                            <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest leading-none mb-1">{categoryLabels[field]}</span>
                                                            <span className="text-sm font-bold text-slate-700">
                                                                {!isNaN(extractValue(val)) && extractValue(val) > 0 && String(val).match(/^[0-9,.]+$/) ?
                                                                    formatCurrency(extractValue(val)) :
                                                                    val}
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right align-top">
                                            <span className="text-base font-black text-emerald-600">
                                                {formatCurrency(calculateRowTotal(p))}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center align-top">
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
                            <h3 className="font-black uppercase tracking-widest text-sm">{editingPayment ? 'Editar Lançamento' : 'Novo Lançamento Diário'}</h3>
                            <button onClick={handleCloseModal} className="hover:rotate-90 transition-transform p-1">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="p-8 max-h-[80vh] overflow-y-auto">
                            <div className="mb-6 grid grid-cols-2 gap-4 items-end">
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Data</label>
                                        <input
                                            required
                                            className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl text-sm focus:border-blue-500 focus:bg-white outline-none transition-all font-medium"
                                            type="date"
                                            value={currentForm.date}
                                            onChange={e => handleInputChange('date', e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Nome do Item / Descrição</label>
                                        <input
                                            className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl text-sm focus:border-blue-500 focus:bg-white outline-none transition-all font-medium"
                                            type="text"
                                            placeholder="Ex: Hunter, Pago em dinheiro, etc"
                                            value={currentForm.description}
                                            onChange={e => handleInputChange('description', e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="text-right pb-2">
                                    <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total do Lançamento</span>
                                    <span className="text-2xl font-black text-blue-600">{formatCurrency(calculateRowTotal(currentForm))}</span>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                                    {categoryFields.map(field => (
                                        <div key={field}>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">{categoryLabels[field]}</label>
                                            <input
                                                className="w-full px-4 py-2.5 bg-slate-50 border-2 border-slate-100 rounded-xl text-sm focus:border-blue-500 focus:bg-white outline-none transition-all font-bold text-slate-700"
                                                type="text"
                                                placeholder="---"
                                                value={currentForm[field] || ''}
                                                onChange={e => handleInputChange(field, e.target.value)}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="mt-10 flex gap-3">
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
                                        const total = String(calculateRowTotal(currentForm));
                                        if (editingPayment) {
                                            onUpdate({ ...editingPayment, total });
                                        } else {
                                            onAdd({ ...newPayment, total });
                                        }
                                        handleCloseModal();
                                    }}
                                    className="flex-[2] px-6 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-lg shadow-blue-200 active:scale-95 hover:bg-blue-700"
                                >
                                    {editingPayment ? 'Salvar Alterações' : 'Gravar Lançamento'}
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
