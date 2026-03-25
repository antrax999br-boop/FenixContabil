import React, { useState } from 'react';
import { IrpfReceipt } from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency } from '../utils/calculations';

interface IrpfReceiptsTableProps {
    receipts: IrpfReceipt[];
    onAddReceipt: (receipt: Omit<IrpfReceipt, 'id' | 'created_at'>) => void;
    onUpdateReceipt: (receipt: IrpfReceipt) => void;
    onDeleteReceipt: (id: string) => void;
}

export const IrpfReceiptsTable: React.FC<IrpfReceiptsTableProps> = ({ receipts, onAddReceipt, onUpdateReceipt, onDeleteReceipt }) => {
    const getLocalDateString = () => {
        const d = new Date();
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
        return d.toISOString().split('T')[0];
    };

    const currentYear = new Date().getFullYear().toString();
    const [yearFilter, setYearFilter] = useState(currentYear);

    const [dateInput, setDateInput] = useState(getLocalDateString());
    const [nameInput, setNameInput] = useState('');
    const [valueInput, setValueInput] = useState('');

    const [editingRowId, setEditingRowId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState('');
    const [editingValue, setEditingValue] = useState('');
    const [editingDate, setEditingDate] = useState('');

    const filteredReceipts = receipts
        .filter(r => r.date.startsWith(yearFilter))
        .sort((a, b) => a.date.localeCompare(b.date)); // Sort by date ascending (month by month)

    const handleAdd = () => {
        if (!nameInput.trim()) {
            alert('Por favor, informe o NOME DA PESSOA.');
            return;
        }

        let numericValue = 0;
        if (valueInput) {
            let cleaned = valueInput.replace(/\./g, '').replace(',', '.');
            cleaned = cleaned.replace(/[^0-9.-]/g, '');
            numericValue = parseFloat(cleaned) || 0;
        }

        onAddReceipt({
            date: dateInput,
            person_name: nameInput.trim(),
            value: numericValue,
        });

        setNameInput('');
        setValueInput('');
    };

    const handleEditClick = (receipt: IrpfReceipt) => {
        setEditingRowId(receipt.id);
        setEditingName(receipt.person_name);
        setEditingValue(receipt.value.toString());
        setEditingDate(receipt.date);
    };

    const handleSaveEdit = (receipt: IrpfReceipt) => {
        let numericValue = 0;
        if (editingValue) {
            let cleaned = editingValue.replace(/\./g, '').replace(',', '.');
            cleaned = cleaned.replace(/[^0-9.-]/g, '');
            numericValue = parseFloat(cleaned) || 0;
        }

        onUpdateReceipt({
            ...receipt,
            date: editingDate,
            person_name: editingName.trim(),
            value: numericValue
        });

        setEditingRowId(null);
    };

    const formatInputValue = (val: string) => {
        if (!val) return '';
        let cleaned = val.replace(/\./g, '').replace(',', '.');
        cleaned = cleaned.replace(/[^0-9.-]/g, '');
        const floatVal = parseFloat(cleaned);
        if (isNaN(floatVal)) return '';
        return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(floatVal);
    };

    const exportToPDF = () => {
        if (filteredReceipts.length === 0) return;

        const doc = new jsPDF();

        doc.setFontSize(16);
        doc.text(`Recebimentos IRPF - Ano ${yearFilter}`, 14, 20);

        const headers = ['DATA', 'NOME DA PESSOA', 'VALOR'];

        let total = 0;
        const rows = filteredReceipts.map(r => {
            total += (r.value || 0);
            return [
                new Date(r.date + 'T12:00:00').toLocaleDateString('pt-BR'),
                r.person_name,
                formatCurrency(r.value || 0)
            ];
        });

        rows.push([
            'TOTAL GERAL',
            '',
            formatCurrency(total)
        ]);

        autoTable(doc, {
            startY: 30,
            head: [headers],
            body: rows,
            theme: 'striped',
            headStyles: { fillColor: [16, 185, 129] }, // Emerald color for this module
            styles: { fontSize: 10, cellPadding: 3 },
            columnStyles: {
                0: { halign: 'center', cellWidth: 30 },
                2: { halign: 'right', fontStyle: 'bold', cellWidth: 40 }
            },
            didParseCell: function (data: any) {
                if (data.row.index === rows.length - 1) {
                    data.cell.styles.fontStyle = 'bold';
                    data.cell.styles.fillColor = [209, 250, 229]; // Emerald 50
                    if (data.column.index === 2) {
                        data.cell.styles.textColor = [5, 150, 105]; // Emerald 600
                    }
                }
            }
        });

        doc.save(`recebimentos_irpf_${yearFilter}.pdf`);
    };

    const totalAno = filteredReceipts.reduce((acc, current) => acc + (current.value || 0), 0);

    return (
        <div className="space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">Ano Base IRPF</label>
                        <select
                            value={yearFilter}
                            onChange={e => setYearFilter(e.target.value)}
                            className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-sm font-semibold"
                        >
                            {[2024, 2025, 2026, 2027, 2028].map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <button onClick={exportToPDF} className="flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg text-xs font-bold uppercase transition-colors">
                        <span className="material-symbols-outlined text-[16px]">picture_as_pdf</span> Imprimir PDF
                    </button>
                </div>
            </div>

            {/* Cadastro Inline */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-wrap items-end gap-3">
                <div className="flex-1 min-w-[150px]">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Data</label>
                    <input type="date" value={dateInput} onChange={e => setDateInput(e.target.value)} className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-emerald-500/20" />
                </div>
                <div className="flex-[3] min-w-[200px]">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome da Pessoa</label>
                    <input type="text" placeholder="Nome do contribuinte..." value={nameInput} onChange={e => setNameInput(e.target.value)} className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-emerald-500/20" />
                </div>
                <div className="flex-1 min-w-[150px]">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Valor</label>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">R$</span>
                        <input type="text" placeholder="0,00" value={valueInput} onChange={e => setValueInput(e.target.value)} onBlur={() => setValueInput(formatInputValue(valueInput))} className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-emerald-500/20 text-emerald-700" />
                    </div>
                </div>
                <button onClick={handleAdd} className="flex items-center gap-1 px-4 py-2 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg text-sm font-bold uppercase transition-colors shadow-sm">
                    <span className="material-symbols-outlined text-[18px]">add</span> Adicionar
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                        <thead>
                            <tr className="bg-slate-100 border-b border-slate-300">
                                <th className="px-4 py-3 text-xs font-black text-slate-600 uppercase tracking-tight text-center w-32 border-r border-slate-200">Data</th>
                                <th className="px-4 py-3 text-xs font-black text-slate-600 uppercase tracking-tight w-auto max-w-[500px]">Nome da Pessoa</th>
                                <th className="px-4 py-3 text-xs font-black text-slate-600 uppercase tracking-tight text-right w-48 border-l border-slate-200">Valor (R$)</th>
                                <th className="px-4 py-3 text-xs font-black text-slate-600 uppercase tracking-tight text-center w-24 border-l border-slate-200">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredReceipts.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="p-8 text-center text-slate-400 font-medium text-sm">Nenhum recebimento registrado para {yearFilter}.</td>
                                </tr>
                            ) : filteredReceipts.map(receipt => {
                                const isEditing = editingRowId === receipt.id;

                                return (
                                    <tr key={receipt.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-4 py-3 border-r border-slate-100 text-center">
                                            {isEditing ? (
                                                <input type="date" value={editingDate} onChange={e => setEditingDate(e.target.value)} className="w-full px-2 py-1 border text-sm" />
                                            ) : (
                                                <span className="font-semibold text-sm text-slate-700">{new Date(receipt.date + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 font-medium text-sm text-slate-800">
                                            {isEditing ? (
                                                <input type="text" value={editingName} onChange={e => setEditingName(e.target.value)} className="w-full px-2 py-1 border text-sm" />
                                            ) : (
                                                receipt.person_name
                                            )}
                                        </td>
                                        <td className="px-4 py-3 border-l border-slate-100 text-right">
                                            {isEditing ? (
                                                <input type="text" value={editingValue} onChange={e => setEditingValue(e.target.value)} onBlur={() => setEditingValue(formatInputValue(editingValue))} className="w-full px-2 py-1 border text-sm text-right" />
                                            ) : (
                                                <span className="font-black text-emerald-600 text-sm block">
                                                    {formatCurrency(receipt.value || 0)}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 border-l border-slate-100 text-center">
                                            {isEditing ? (
                                                <div className="flex justify-center gap-1">
                                                    <button onClick={() => handleSaveEdit(receipt)} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"><span className="material-symbols-outlined text-sm">check</span></button>
                                                    <button onClick={() => setEditingRowId(null)} className="p-1 text-slate-400 hover:bg-slate-50 rounded"><span className="material-symbols-outlined text-sm">close</span></button>
                                                </div>
                                            ) : (
                                                <div className="flex justify-center gap-2">
                                                    <button onClick={() => handleEditClick(receipt)} title="Editar" className="p-1 text-blue-500 hover:bg-blue-50 rounded"><span className="material-symbols-outlined text-md">edit</span></button>
                                                    <button onClick={() => onDeleteReceipt(receipt.id)} title="Excluir" className="p-1 text-red-500 hover:bg-red-50 rounded"><span className="material-symbols-outlined text-md">delete</span></button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                        {filteredReceipts.length > 0 && (
                            <tfoot>
                                <tr className="bg-emerald-50 border-t-2 border-emerald-200">
                                    <td colSpan={2} className="px-4 py-3 text-sm font-black text-emerald-800 text-right">TOTAL ARRECADADO DE IRPF NESTE ANO:</td>
                                    <td className="px-4 py-3 text-right text-sm font-black text-emerald-700 border-l border-emerald-200 bg-emerald-100/50">
                                        {formatCurrency(totalAno)}
                                    </td>
                                    <td className="px-4 py-3"></td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>
        </div>
    );
};

export default IrpfReceiptsTable;
