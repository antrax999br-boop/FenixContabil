
import React, { useState, useMemo } from 'react';
import { AppState, InvoiceStatus } from '../types';
import { formatCurrency } from '../utils/calculations';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ReportsProps {
    state: AppState;
}

const Reports: React.FC<ReportsProps> = ({ state }) => {
    // Get current month and year in YYYY-MM format
    const currentMonthYear = new Date().toISOString().substring(0, 7);
    const [selectedMonth, setSelectedMonth] = useState(currentMonthYear);

    // Filter invoices for the selected month (based on due_date)
    const filteredInvoices = useMemo(() => {
        return state.invoices.filter(inv => inv.due_date.startsWith(selectedMonth));
    }, [state.invoices, selectedMonth]);

    // Totals for the selected month
    const totals = useMemo(() => {
        const stats = {
            pago: { count: 0, value: 0 },
            atrasado: { count: 0, value: 0 },
            pendente: { count: 0, value: 0 },
            total: { count: 0, value: 0 }
        };

        filteredInvoices.forEach(inv => {
            stats.total.count++;
            stats.total.value += inv.final_value;

            if (inv.status === InvoiceStatus.PAID) {
                stats.pago.count++;
                stats.pago.value += inv.final_value;
            } else if (inv.status === InvoiceStatus.OVERDUE) {
                stats.atrasado.count++;
                stats.atrasado.value += inv.final_value;
            } else {
                stats.pendente.count++;
                stats.pendente.value += inv.final_value;
            }
        });

        return stats;
    }, [filteredInvoices]);

    // Data for Chart
    const chartData = [
        { name: 'Pago', valor: totals.pago.value, color: '#10B981' }, // green-500
        { name: 'Pendente', valor: totals.pendente.value, color: '#FFC83D' }, // status-pending
        { name: 'Atrasado', valor: totals.atrasado.value, color: '#EF4444' } // red-500
    ];

    const pieData = [
        { name: 'Pago', value: totals.pago.count, color: '#10B981' },
        { name: 'Pendente', value: totals.pendente.count, color: '#FFC83D' },
        { name: 'Atrasado', value: totals.atrasado.count, color: '#EF4444' }
    ].filter(d => d.value > 0);

    const generatePDF = () => {
        const doc = new jsPDF();
        const [year, month] = selectedMonth.split('-');
        const dateObj = new Date(parseInt(year), parseInt(month) - 1);
        const monthName = dateObj.toLocaleString('pt-BR', { month: 'long' });

        // Background decoration
        doc.setFillColor(15, 63, 168); // Brand Navy
        doc.rect(0, 0, 210, 40, 'F');

        // Header
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(22);
        doc.setTextColor(255, 255, 255);
        doc.text('Relatório Mensal de Notas Fiscais', 14, 20);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(12);
        doc.text(`Período: ${monthName.charAt(0).toUpperCase() + monthName.slice(1)} de ${year}`, 14, 30);
        doc.text(`Fenix Contábil - Emitido em: ${new Date().toLocaleDateString('pt-BR')}`, 140, 30);

        // Summary Box
        doc.setDrawColor(230);
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(14, 45, 182, 35, 3, 3, 'F');

        doc.setFontSize(11);
        doc.setTextColor(51, 65, 85);
        doc.setFont('helvetica', 'bold');
        doc.text('RESUMO FINANCEIRO', 20, 55);

        doc.setFont('helvetica', 'normal');
        doc.text(`Total de Notas: ${totals.total.count}`, 20, 62);
        doc.text(`Valor Total: ${formatCurrency(totals.total.value)}`, 20, 69);

        doc.setFontSize(10);
        doc.text(`• Pagas: ${totals.pago.count} (${formatCurrency(totals.pago.value)})`, 100, 62);
        doc.text(`• Pendentes: ${totals.pendente.count} (${formatCurrency(totals.pendente.value)})`, 100, 69);
        doc.text(`• Atrasadas: ${totals.atrasado.count} (${formatCurrency(totals.atrasado.value)})`, 100, 76);

        // Table
        const tableData = filteredInvoices.map(inv => {
            const client = state.clients.find(c => c.id === inv.client_id);
            return [
                inv.invoice_number || 'N/A',
                client?.name || 'Desconhecido',
                inv.due_date,
                formatCurrency(inv.final_value),
                inv.status === InvoiceStatus.PAID ? 'PAGO' : inv.status === InvoiceStatus.OVERDUE ? 'ATRASADO' : 'PENDENTE'
            ];
        });

        autoTable(doc, {
            startY: 85,
            head: [['Nº Nota', 'Cliente', 'Vencimento', 'Valor Final', 'Status']],
            body: tableData,
            theme: 'grid',
            headStyles: { fillColor: [15, 63, 168], textColor: [255, 255, 255], fontStyle: 'bold' },
            styles: { fontSize: 9, cellPadding: 3 },
            columnStyles: {
                3: { halign: 'right', fontStyle: 'bold' },
                4: { halign: 'center' }
            },
            didParseCell: (data) => {
                if (data.section === 'body' && data.column.index === 4) {
                    const val = data.cell.text[0];
                    if (val === 'PAGO') data.cell.styles.textColor = [16, 185, 129];
                    if (val === 'ATRASADO') data.cell.styles.textColor = [239, 68, 68];
                    if (val === 'PENDENTE') data.cell.styles.textColor = [255, 200, 61];
                }
            }
        });

        // Save
        doc.save(`Relatorio_Fenix_${selectedMonth}.pdf`);
    };

    return (
        <div className="space-y-8 max-w-7xl mx-auto pb-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="material-symbols-outlined text-primary">assessment</span>
                        <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Relatórios Gerais</h2>
                    </div>
                    <p className="text-slate-500 font-medium">Levantamento de notas e performance mensal do sistema.</p>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                    <div className="bg-white p-2.5 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-3">
                        <span className="material-symbols-outlined text-slate-400 text-lg pl-1">calendar_month</span>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-slate-400 uppercase leading-none mb-1">Mês de Referência</span>
                            <input
                                type="month"
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(e.target.value)}
                                className="border-none p-0 focus:ring-0 text-sm font-black text-slate-700 bg-transparent cursor-pointer"
                            />
                        </div>
                    </div>
                    <button
                        onClick={generatePDF}
                        className="bg-brand-orange hover:bg-orange-600 text-white px-6 py-3 rounded-2xl font-bold text-sm shadow-xl shadow-brand-orange/20 transition-all hover:scale-[1.02] active:scale-95 flex items-center gap-2"
                    >
                        <span className="material-symbols-outlined text-xl">picture_as_pdf</span>
                        EMITIR PDF
                    </button>
                </div>
            </header>

            {/* Stats Grid */}
            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-7 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col justify-between group hover:shadow-md transition-shadow">
                    <div>
                        <div className="size-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 mb-4">
                            <span className="material-symbols-outlined">receipt_long</span>
                        </div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Faturamento Mensal</p>
                        <h3 className="text-3xl font-black text-slate-800">{formatCurrency(totals.total.value)}</h3>
                    </div>
                    <p className="text-xs font-bold text-slate-400 mt-6 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-sm">filter_none</span>
                        {totals.total.count} notas filtradas
                    </p>
                </div>

                <div className="bg-white p-7 rounded-[2rem] shadow-sm border border-slate-100 border-l-8 border-l-green-500 hover:shadow-md transition-shadow">
                    <div className="size-10 rounded-xl bg-green-50 flex items-center justify-center text-green-600 mb-4">
                        <span className="material-symbols-outlined">payments</span>
                    </div>
                    <p className="text-xs font-bold text-green-600/70 uppercase tracking-widest mb-1">Total Liquidado</p>
                    <h3 className="text-3xl font-black text-slate-800">{formatCurrency(totals.pago.value)}</h3>
                    <p className="text-xs font-black text-green-600 mt-6 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-sm">check_circle</span>
                        {totals.pago.count} notas pagas
                    </p>
                </div>

                <div className="bg-white p-7 rounded-[2rem] shadow-sm border border-slate-100 border-l-8 border-l-status-pending hover:shadow-md transition-shadow">
                    <div className="size-10 rounded-xl bg-yellow-50 flex items-center justify-center text-yellow-600 mb-4">
                        <span className="material-symbols-outlined">hourglass_top</span>
                    </div>
                    <p className="text-xs font-bold text-yellow-600/70 uppercase tracking-widest mb-1">Aguardando Pagamento</p>
                    <h3 className="text-3xl font-black text-slate-800">{formatCurrency(totals.pendente.value)}</h3>
                    <p className="text-xs font-black text-yellow-600 mt-6 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-sm">schedule</span>
                        {totals.pendente.count} notas pendentes
                    </p>
                </div>

                <div className="bg-white p-7 rounded-[2rem] shadow-sm border border-slate-100 border-l-8 border-l-red-500 hover:shadow-md transition-shadow">
                    <div className="size-10 rounded-xl bg-red-50 flex items-center justify-center text-red-600 mb-4">
                        <span className="material-symbols-outlined">warning</span>
                    </div>
                    <p className="text-xs font-bold text-red-600/70 uppercase tracking-widest mb-1">Montante em Atraso</p>
                    <h3 className="text-3xl font-black text-slate-800">{formatCurrency(totals.atrasado.value)}</h3>
                    <p className="text-xs font-black text-red-600 mt-6 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-sm">error</span>
                        {totals.atrasado.count} notas vencidas
                    </p>
                </div>
            </section>

            {/* Charts Section */}
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
                    <div className="flex items-center justify-between mb-8">
                        <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary text-xl">bar_chart</span>
                            Análise Financeira (R$)
                        </h4>
                        <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2.5 py-1 rounded-full uppercase">Valores Brutos</span>
                    </div>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis
                                    dataKey="name"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                                />
                                <YAxis hide />
                                <Tooltip
                                    cursor={{ fill: '#f8fafc' }}
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '12px' }}
                                    formatter={(val: number) => [formatCurrency(val), 'Valor']}
                                />
                                <Bar dataKey="valor" radius={[10, 10, 0, 0]} barSize={60}>
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col">
                    <div className="flex items-center justify-between mb-8">
                        <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary text-xl">pie_chart</span>
                            Composição de Carteira
                        </h4>
                        <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2.5 py-1 rounded-full uppercase">Por Quantidade</span>
                    </div>
                    <div className="flex-1 h-[300px] w-full flex items-center justify-center relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={80}
                                    outerRadius={105}
                                    paddingAngle={8}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                                />
                                <Legend
                                    verticalAlign="bottom"
                                    align="center"
                                    iconType="circle"
                                    formatter={(value) => <span className="text-xs font-bold text-slate-500 uppercase tracking-wider px-2">{value}</span>}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-x-0 top-[42%] flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Total</span>
                            <span className="text-2xl font-black text-slate-800">{totals.total.count}</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* List section */}
            <section className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
                <div className="px-10 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">list_alt</span>
                        Detalhamento do Período
                    </h4>
                    <span className="text-xs font-bold text-slate-500 bg-white px-3 py-1.5 rounded-xl border border-slate-200">
                        Lista Ordenada por Vencimento
                    </span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/80">
                                <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Identificação</th>
                                <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Cliente Associado</th>
                                <th className="px-10 py-5 text-[10px) font-black text-slate-400 uppercase tracking-widest">Data Limite</th>
                                <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Valor Final</th>
                                <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status Físico</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredInvoices.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-10 py-16 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <span className="material-symbols-outlined text-5xl text-slate-200">folder_off</span>
                                            <p className="text-slate-400 text-sm font-bold uppercase tracking-widest">Nenhuma nota para este período</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredInvoices
                                    .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
                                    .map(inv => {
                                        const client = state.clients.find(c => c.id === inv.client_id);
                                        return (
                                            <tr key={inv.id} className="hover:bg-slate-50/80 transition-all group">
                                                <td className="px-10 py-6">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-black text-slate-800 leading-none mb-1">Nota #{inv.invoice_number}</span>
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase leading-none">REF: {inv.id.substring(0, 8).toUpperCase()}</span>
                                                    </div>
                                                </td>
                                                <td className="px-10 py-6">
                                                    <div className="flex items-center gap-3">
                                                        <div className="size-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-400">
                                                            <span className="material-symbols-outlined text-sm">person</span>
                                                        </div>
                                                        <span className="text-sm font-bold text-slate-600 truncate max-w-[150px]">{client?.name || '---'}</span>
                                                    </div>
                                                </td>
                                                <td className="px-10 py-6 text-sm text-slate-500 font-bold">{new Date(inv.due_date).toLocaleDateString('pt-BR')}</td>
                                                <td className="px-10 py-6 text-sm font-black text-primary group-hover:scale-110 transition-transform origin-left">{formatCurrency(inv.final_value)}</td>
                                                <td className="px-10 py-6">
                                                    <div className="flex justify-center">
                                                        <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-tighter shadow-sm border border-transparent ${inv.status === InvoiceStatus.PAID ? 'bg-green-50 text-green-700 border-green-100' :
                                                            inv.status === InvoiceStatus.OVERDUE ? 'bg-red-50 text-red-700 border-red-100' :
                                                                'bg-yellow-50 text-yellow-700 border-yellow-100'
                                                            }`}>
                                                            {inv.status === InvoiceStatus.PAID ? 'Liquidado' : inv.status === InvoiceStatus.OVERDUE ? 'Vencido' : 'Pendente'}
                                                        </span>
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    })
                            )}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
};

export default Reports;
