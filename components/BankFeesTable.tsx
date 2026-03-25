import React, { useState, useEffect } from 'react';
import { BankFee } from '../types';

interface BankFeesTableProps {
    bankFees: BankFee[];
    onAddBankFee: (fee: Omit<BankFee, 'id' | 'created_at'>) => void;
    onUpdateBankFee: (fee: BankFee) => void;
    onDeleteBankFee: (id: string) => void;
}

const extractValue = (val: string | number | undefined): number => {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    let cleaned = String(val);
    if (cleaned.includes(',')) {
        cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    }
    cleaned = cleaned.replace(/[^0-9.-]/g, '');
    return parseFloat(cleaned) || 0;
};

const formatValue = (val: number): string => {
    return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);
};

export const BankFeesTable: React.FC<BankFeesTableProps> = ({ bankFees, onAddBankFee, onUpdateBankFee, onDeleteBankFee }) => {
    const getLocalDateString = () => {
        const d = new Date();
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
        return d.toISOString().split('T')[0];
    };

    const todayStr = getLocalDateString();
    const [startDate, setStartDate] = useState(`${todayStr.substring(0, 7)}-01`);
    const [endDate, setEndDate] = useState(todayStr);

    const [dateInput, setDateInput] = useState(todayStr);
    const [editingRowId, setEditingRowId] = useState<string | null>(null);
    const [editingValue, setEditingValue] = useState<string>('');
    const [editingField, setEditingField] = useState<keyof BankFee | null>(null);

    // Filter bank fees
    const filteredFees = bankFees.filter(f => f.date >= startDate && f.date <= endDate).sort((a, b) => b.date.localeCompare(a.date));

    const handleAddRow = () => {
        // Check if same date already exists
        if (bankFees.some(f => f.date === dateInput)) {
            alert('Já existe um registro para esta data. Edite-o.');
            return;
        }
        onAddBankFee({
            date: dateInput,
            fee_registro_cobranca: '0,00',
            fee_titulos_beneficiario: '0,00',
            fee_titulo_vencido_baixado: '0,00',
            fee_alteracao_vencimento: '0,00',
            fee_cesta_max_empresarial: '0,00',
            fee_cesta_taxa_protesto: '0,00',
            fee_pagamento_taxa_func: '0,00',
            fee_extrato_protesto: '0,00',
            fee_doc_taxa: '0,00',
            total: '0,00'
        });
    };

    const calculateTotal = (fee: BankFee, useEditingValue = false): string => {
        const getValue = (field: keyof BankFee) => {
            if (useEditingValue && editingRowId === fee.id && editingField === field) {
                return extractValue(editingValue);
            }
            return extractValue(fee[field] as string);
        };

        const sum = getValue('fee_registro_cobranca') +
            getValue('fee_titulos_beneficiario') +
            getValue('fee_titulo_vencido_baixado') +
            getValue('fee_alteracao_vencimento') +
            getValue('fee_cesta_max_empresarial') +
            getValue('fee_cesta_taxa_protesto') +
            getValue('fee_pagamento_taxa_func') +
            getValue('fee_extrato_protesto') +
            getValue('fee_doc_taxa');
        return formatValue(sum);
    };

    const handleCellClick = (id: string, field: keyof BankFee, value: string | undefined) => {
        setEditingRowId(id);
        setEditingField(field);
        setEditingValue(value || '0,00');
    };

    const handleCellSave = (fee: BankFee, field: keyof BankFee) => {
        const updatedFee: BankFee = { ...fee, [field]: editingValue || '0,00' };
        const newTotal = calculateTotal(updatedFee, false);
        updatedFee.total = newTotal;

        // Only update if changed
        if (fee[field] !== updatedFee[field]) {
            onUpdateBankFee(updatedFee);
        }

        setEditingRowId(null);
        setEditingField(null);
    };

    const handleBlur = (fee: BankFee, field: keyof BankFee) => {
        handleCellSave(fee, field);
    };

    const handleKeyDown = (e: React.KeyboardEvent, fee: BankFee, field: keyof BankFee) => {
        if (e.key === 'Enter') {
            handleCellSave(fee, field);
        }
    };

    const exportToCSV = () => {
        if (filteredFees.length === 0) return;

        const headers = [
            'DATA',
            'TARIFA REGISTRO COBRANÇA',
            'TARIFA BANCÁRIA TÍTULOS PELO BENEFICIÁRIO',
            'TARIFA TÍTULO VENCIDO / BAIXADO',
            'TARIFA ALTERAÇÃO DE VENCIMENTO',
            'TARIFA CESTA + MAX EMPRESARIAL',
            'TARIFA CESTA + TAXA DE PROTESTO',
            'PAGAMENTOS TAXA FUNC',
            'TARIFA EXTRATO DE PROTESTO',
            'DOC TAXA',
            'TOTAL'
        ];

        const rows = filteredFees.map(f => [
            f.date,
            f.fee_registro_cobranca || '0,00',
            f.fee_titulos_beneficiario || '0,00',
            f.fee_titulo_vencido_baixado || '0,00',
            f.fee_alteracao_vencimento || '0,00',
            f.fee_cesta_max_empresarial || '0,00',
            f.fee_cesta_taxa_protesto || '0,00',
            f.fee_pagamento_taxa_func || '0,00',
            f.fee_extrato_protesto || '0,00',
            f.fee_doc_taxa || '0,00',
            f.total || '0,00'
        ]);

        const csvContent = "data:text/csv;charset=utf-8,"
            + [headers.join(';'), ...rows.map(e => e.join(';'))].join('\n');

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `tarifas_bancarias_${startDate}_a_${endDate}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const renderEditableCell = (fee: BankFee, field: keyof BankFee) => {
        const isEditing = editingRowId === fee.id && editingField === field;
        const val = fee[field] as string || '0,00';

        if (isEditing) {
            return (
                <td key={field} className="border border-slate-200 p-0 m-0">
                    <input
                        type="text"
                        className="w-full h-full min-h-[32px] px-2 py-1 text-right outline-none ring-2 ring-blue-500 font-bold bg-blue-50"
                        value={editingValue}
                        onChange={(e) => setEditingValue(e.target.value)}
                        onBlur={() => handleBlur(fee, field)}
                        onKeyDown={(e) => handleKeyDown(e, fee, field)}
                        autoFocus
                    />
                </td>
            );
        }

        return (
            <td
                key={field}
                className="border border-slate-200 px-3 py-2 text-right text-sm hover:bg-slate-50 cursor-pointer min-w-[120px]"
                onClick={() => handleCellClick(fee.id, field, val)}
            >
                <div className="flex justify-between items-center w-full">
                    <span className="text-slate-400 text-[10px] mr-1">R$</span>
                    <span className="font-medium text-slate-700">{val}</span>
                </div>
            </td>
        );
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">A Partir de</label>
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-sm font-semibold" />
                    </div>
                    <div className="flex items-center gap-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">Até</label>
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-sm font-semibold" />
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <button onClick={exportToCSV} className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg text-xs font-bold uppercase transition-colors">
                        <span className="material-symbols-outlined text-[16px]">download</span> Excel
                    </button>
                    <div className="h-6 w-px bg-slate-200"></div>
                    <div className="flex items-center gap-2">
                        <input type="date" value={dateInput} onChange={e => setDateInput(e.target.value)} className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-sm font-semibold" />
                        <button onClick={handleAddRow} className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white hover:bg-blue-700 rounded-lg text-xs font-bold uppercase transition-colors shadow-sm">
                            <span className="material-symbols-outlined text-[16px]">add</span> Dia
                        </button>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                        <thead>
                            <tr className="bg-slate-100 border-b border-slate-300">
                                <th className="px-4 py-3 text-xs font-black text-slate-600 uppercase tracking-tight sticky left-0 bg-slate-100 border-r border-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] z-10 w-24 text-center">Data</th>
                                <th className="px-3 py-3 text-[10px] font-black text-slate-600 uppercase text-right border-r border-slate-200 w-32">Registro Cobrança</th>
                                <th className="px-3 py-3 text-[10px] font-black text-slate-600 uppercase text-right border-r border-slate-200 w-32">Títulos P/ Benefic.</th>
                                <th className="px-3 py-3 text-[10px] font-black text-slate-600 uppercase text-right border-r border-slate-200 w-32">Tít. Vencido/Baixado</th>
                                <th className="px-3 py-3 text-[10px] font-black text-slate-600 uppercase text-right border-r border-slate-200 w-32">Alt. Vencimento</th>
                                <th className="px-3 py-3 text-[10px] font-black text-slate-600 uppercase text-right border-r border-slate-200 w-32">Cesta + Max Emp.</th>
                                <th className="px-3 py-3 text-[10px] font-black text-slate-600 uppercase text-right border-r border-slate-200 w-32">Cesta + Tx Protesto</th>
                                <th className="px-3 py-3 text-[10px] font-black text-slate-600 uppercase text-right border-r border-slate-200 w-32">Pag. Taxa Func</th>
                                <th className="px-3 py-3 text-[10px] font-black text-slate-600 uppercase text-right border-r border-slate-200 w-32">Extrato Protesto</th>
                                <th className="px-3 py-3 text-[10px] font-black text-slate-600 uppercase text-right border-r border-slate-200 w-32">Doc Taxa</th>
                                <th className="px-4 py-3 text-xs font-black text-blue-700 bg-blue-50 uppercase text-right shadow-sm w-36">Total</th>
                                <th className="px-2 py-3 w-10 text-center"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredFees.length === 0 ? (
                                <tr>
                                    <td colSpan={12} className="p-8 text-center text-slate-400 font-medium text-sm">Nenhum registro para este período. Adicione um novo Dia.</td>
                                </tr>
                            ) : filteredFees.map(fee => (
                                <tr key={fee.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-4 py-2 text-sm font-bold text-slate-700 text-center border-b border-r border-slate-200 bg-white sticky left-0 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                                        {new Date(fee.date + 'T12:00:00').toLocaleDateString('pt-BR').substring(0, 5)}
                                    </td>
                                    {renderEditableCell(fee, 'fee_registro_cobranca')}
                                    {renderEditableCell(fee, 'fee_titulos_beneficiario')}
                                    {renderEditableCell(fee, 'fee_titulo_vencido_baixado')}
                                    {renderEditableCell(fee, 'fee_alteracao_vencimento')}
                                    {renderEditableCell(fee, 'fee_cesta_max_empresarial')}
                                    {renderEditableCell(fee, 'fee_cesta_taxa_protesto')}
                                    {renderEditableCell(fee, 'fee_pagamento_taxa_func')}
                                    {renderEditableCell(fee, 'fee_extrato_protesto')}
                                    {renderEditableCell(fee, 'fee_doc_taxa')}
                                    <td className="px-4 py-2 border-b border-l border-slate-200 text-right font-black text-blue-600 bg-blue-50/30">
                                        <div className="flex justify-between items-center w-full">
                                            <span className="text-blue-400 text-[10px] mr-1">R$</span>
                                            <span>{editingRowId === fee.id ? calculateTotal(fee, true) : (fee.total || '0,00')}</span>
                                        </div>
                                    </td>
                                    <td className="px-2 py-2 border-b border-slate-200 text-center">
                                        <button onClick={() => onDeleteBankFee(fee.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-1">
                                            <span className="material-symbols-outlined text-[18px]">delete</span>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default BankFeesTable;
