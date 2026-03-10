import React, { useState } from 'react';
import { AppState, Contract } from '../types';
import { formatCNPJ, formatCurrency } from '../utils/calculations';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ContractRenewalPageProps {
    state: AppState;
    onSaveContract: (contract: Contract) => Promise<void>;
    onDeleteContract: (id: string) => Promise<void>;
}

const ContractRenewalPage: React.FC<ContractRenewalPageProps> = ({ state, onSaveContract, onDeleteContract }) => {
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [searchTerm, setSearchTerm] = useState('');
    const [showRenewalModal, setShowRenewalModal] = useState(false);
    const [renewalData, setRenewalData] = useState<{ client_id: string, readjustment: number }[]>([]);

    // Local state for inputs to allow smooth typing without immediate DB hits
    const [localValues, setLocalValues] = useState<Record<string, any>>({});

    const filteredClients = state.clients.filter(client => {
        const searchLower = searchTerm.toLowerCase();
        const searchNumbers = searchTerm.replace(/\D/g, '');
        return client.name.toLowerCase().includes(searchLower) ||
            (searchNumbers !== '' && client.cnpj.replace(/\D/g, '').includes(searchNumbers));
    });

    const getContract = (clientId: string, year: number) => {
        return state.contracts.find(c => c.client_id === clientId && c.year === year);
    };

    const generateRenewalPDF = (nextYear: number, updatedContracts: any[]) => {
        const doc = new jsPDF();

        // Header Background
        doc.setFillColor(15, 23, 42); // Navy 900
        doc.rect(0, 0, 210, 40, 'F');

        // Header Text
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        doc.setTextColor(255, 255, 255);
        doc.text('Relatório de Renovação Contratual', 14, 20);

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Ano de Referência: ${nextYear}`, 14, 30);
        doc.text(`Fenix Contábil - Emitido em: ${new Date().toLocaleDateString('pt-BR')}`, 196, 30, { align: 'right' });

        const tableData = updatedContracts.map(item => {
            const client = state.clients.find(c => c.id === item.client_id);
            const prev = item.prevContract;
            return [
                client?.name || 'Desconhecido',
                formatCurrency(prev?.monthly_fee || 0),
                formatCurrency(prev?.invoice_value || 0),
                `+ ${formatCurrency(item.readjustment)}`,
                formatCurrency(item.newMonthlyFee),
                formatCurrency(item.newInvoiceValue)
            ];
        });

        autoTable(doc, {
            startY: 50,
            head: [['Cliente', 'Ant. Mensal', 'Ant. Nota', 'Reajuste', 'Novo Mensal', 'Novo Nota']],
            body: tableData,
            theme: 'grid',
            headStyles: { fillColor: [249, 115, 22], textColor: [255, 255, 255] }, // Brand orange
            styles: { fontSize: 8 },
            columnStyles: {
                1: { halign: 'right' },
                2: { halign: 'right' },
                3: { halign: 'right', fontStyle: 'bold' },
                4: { halign: 'right', fontStyle: 'bold' },
                5: { halign: 'right', fontStyle: 'bold' }
            }
        });

        const totalOld = updatedContracts.reduce((acc, item) => acc + (item.prevContract?.monthly_fee || 0), 0);
        const totalNew = updatedContracts.reduce((acc, item) => acc + item.newMonthlyFee, 0);
        const totalReadjust = updatedContracts.reduce((acc, item) => acc + item.readjustment, 0);

        let currentY = (doc as any).lastAutoTable.finalY + 15;
        doc.setFontSize(10);
        doc.setTextColor(30, 41, 59);
        doc.text(`Total Anterior: ${formatCurrency(totalOld)}`, 196, currentY, { align: 'right' });
        currentY += 6;
        doc.text(`Total Reajustes: ${formatCurrency(totalReadjust)}`, 196, currentY, { align: 'right' });
        currentY += 8;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(249, 115, 22);
        doc.text(`NOVO TOTAL MENSAL: ${formatCurrency(totalNew)}`, 196, currentY, { align: 'right' });

        doc.save(`Renovacao_Contratos_${nextYear}.pdf`);
    };

    const handleBlurSave = async (clientId: string, field: keyof Contract, value: any) => {
        const existing = getContract(clientId, selectedYear);
        const contractData: any = existing
            ? { ...existing, [field]: value }
            : {
                client_id: clientId,
                year: selectedYear,
                copan: '',
                status: 'Ativo',
                annual_duration: 'Anual',
                due_day: 10,
                monthly_fee: 0,
                invoice_value: 0,
                readjustment: 0,
                [field]: value
            };

        await onSaveContract(contractData);
        // Clear local value after save
        setLocalValues(prev => {
            const next = { ...prev };
            delete next[`${clientId}-${field}`];
            return next;
        });
    };

    const handleDelete = async (contractId: string) => {
        if (confirm('Deseja realmente cancelar/excluir este contrato para este ano?')) {
            await onDeleteContract(contractId);
        }
    };

    const handleBulkRenewal = async () => {
        const nextYear = selectedYear + 1;
        const itemsToRenew = renewalData.filter(item => {
            const currentContract = getContract(item.client_id, selectedYear);
            const nextContract = getContract(item.client_id, nextYear);
            return currentContract && !nextContract;
        });

        if (itemsToRenew.length === 0) {
            alert('Nenhum contrato novo para renovar.');
            return;
        }

        const updatedContractsReport = [];

        for (const item of itemsToRenew) {
            const currentContract = getContract(item.client_id, selectedYear);

            if (currentContract) {
                const newMonthlyFee = Number(currentContract.monthly_fee) + Number(item.readjustment);
                const newInvoiceValue = Number(currentContract.invoice_value) + Number(item.readjustment);

                await onSaveContract({
                    client_id: item.client_id,
                    year: nextYear,
                    copan: currentContract.copan,
                    status: currentContract.status,
                    annual_duration: currentContract.annual_duration,
                    due_day: currentContract.due_day,
                    monthly_fee: newMonthlyFee,
                    invoice_value: newInvoiceValue,
                    readjustment: item.readjustment
                } as Contract);

                updatedContractsReport.push({
                    client_id: item.client_id,
                    prevContract: currentContract,
                    readjustment: item.readjustment,
                    newMonthlyFee,
                    newInvoiceValue
                });
            }
        }

        if (confirm('Renovação concluída! Deseja emitir o relatório PDF das renovações agora?')) {
            generateRenewalPDF(nextYear, updatedContractsReport);
        }

        setSelectedYear(nextYear);
        setShowRenewalModal(false);
    };

    return (
        <div className="max-w-7xl mx-auto pb-20">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Renovação de Contrato</h1>
                    <p className="text-slate-500 text-sm mt-1">Gerencie os valores contratuais e realize renovações anuais com reajuste.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center bg-white border border-slate-200 rounded-lg p-1 shadow-sm">
                        {[selectedYear - 1, selectedYear, selectedYear + 1].map(year => (
                            <button
                                key={year}
                                onClick={() => setSelectedYear(year)}
                                className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${selectedYear === year ? 'bg-primary text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'
                                    }`}
                            >
                                {year}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={() => {
                            const initialRenewalData = state.clients.map(client => ({
                                client_id: client.id,
                                readjustment: 0
                            }));
                            setRenewalData(initialRenewalData);
                            setShowRenewalModal(true);
                        }}
                        className="flex items-center justify-center gap-2 px-5 py-2.5 bg-brand-orange hover:bg-orange-600 text-white rounded-lg text-sm font-bold shadow-lg shadow-orange-500/20 transition-all active:scale-95"
                    >
                        <span className="material-symbols-outlined text-xl">autorenew</span>
                        <span>Renovar para {selectedYear + 1}</span>
                    </button>
                </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6 flex flex-wrap items-center justify-between gap-4 shadow-sm">
                <div className="relative flex-1 max-w-md">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
                    <input
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-primary/20 text-slate-900 outline-none"
                        placeholder="Buscar por cliente ou CNPJ..."
                        type="text"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[1000px]">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="px-4 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider w-40">Cliente / CNPJ</th>
                            <th className="px-4 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider w-20 text-center">Copan</th>
                            <th className="px-4 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider w-28 text-center">Situação</th>
                            <th className="px-4 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider w-24 text-center">Vigência</th>
                            <th className="px-4 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider w-20 text-center">Venc.</th>
                            <th className="px-4 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider w-32 text-center">Valor Mensal</th>
                            <th className="px-4 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider w-32 text-center">Valor Nota</th>
                            <th className="px-4 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider w-24 text-center">Reajuste</th>
                            <th className="px-4 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider w-20 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredClients.map(client => {
                            const contract = getContract(client.id, selectedYear);

                            const getVal = (field: string) => localValues[`${client.id}-${field}`] ?? (contract as any)?.[field] ?? '';
                            const setVal = (field: string, val: any) => setLocalValues(prev => ({ ...prev, [`${client.id}-${field}`]: val }));

                            return (
                                <tr key={client.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-4 py-3">
                                        <div className="flex flex-col">
                                            <span className="text-[13px] font-bold text-slate-900 leading-tight mb-0.5">{client.name}</span>
                                            <span className="text-[10px] text-slate-400 font-medium tracking-wider">{formatCNPJ(client.cnpj)}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <input
                                            type="text"
                                            className="w-16 text-center text-xs p-1 border border-slate-200 rounded focus:ring-2 focus:ring-primary/20 outline-none"
                                            value={getVal('copan')}
                                            onChange={(e) => setVal('copan', e.target.value)}
                                            onBlur={(e) => handleBlurSave(client.id, 'copan', e.target.value)}
                                        />
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <select
                                            className="text-xs p-1 border border-slate-200 rounded focus:ring-2 focus:ring-primary/20 outline-none bg-white"
                                            value={contract?.status || 'Ativo'}
                                            onChange={(e) => handleBlurSave(client.id, 'status', e.target.value)}
                                        >
                                            <option value="Ativo">Ativo</option>
                                            <option value="Inativo">Inativo</option>
                                            <option value="Outros">Outros</option>
                                        </select>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <input
                                            type="text"
                                            className="w-20 text-center text-xs p-1 border border-slate-200 rounded focus:ring-2 focus:ring-primary/20 outline-none"
                                            value={getVal('annual_duration') || (contract ? '' : 'Anual')}
                                            onChange={(e) => setVal('annual_duration', e.target.value)}
                                            onBlur={(e) => handleBlurSave(client.id, 'annual_duration', e.target.value)}
                                        />
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <input
                                            type="number"
                                            className="w-12 text-center text-xs p-1 border border-slate-200 rounded focus:ring-2 focus:ring-primary/20 outline-none"
                                            value={getVal('due_day') || (contract ? '' : 10)}
                                            onChange={(e) => setVal('due_day', e.target.value)}
                                            onBlur={(e) => handleBlurSave(client.id, 'due_day', parseInt(e.target.value))}
                                        />
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <div className="relative">
                                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold">R$</span>
                                            <input
                                                type="number"
                                                step="0.01"
                                                className="w-28 pl-7 text-right text-xs p-1 border border-slate-200 rounded focus:ring-2 focus:ring-primary/10 outline-none font-bold text-slate-700"
                                                value={getVal('monthly_fee') || (contract ? 0 : '')}
                                                onChange={(e) => setVal('monthly_fee', e.target.value)}
                                                onBlur={(e) => handleBlurSave(client.id, 'monthly_fee', parseFloat(e.target.value))}
                                            />
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <div className="relative">
                                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold">R$</span>
                                            <input
                                                type="number"
                                                step="0.01"
                                                className="w-28 pl-7 text-right text-xs p-1 border border-slate-200 rounded focus:ring-2 focus:ring-primary/10 outline-none font-bold text-primary"
                                                value={getVal('invoice_value') || (contract ? 0 : '')}
                                                onChange={(e) => setVal('invoice_value', e.target.value)}
                                                onBlur={(e) => handleBlurSave(client.id, 'invoice_value', parseFloat(e.target.value))}
                                            />
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <div className="text-xs font-bold text-slate-500">
                                            {contract?.readjustment ? `+ R$ ${contract.readjustment.toFixed(2)}` : '-'}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        {contract && (
                                            <button
                                                onClick={() => handleDelete(contract.id)}
                                                className="p-1 px-2 bg-red-50 text-red-500 hover:bg-red-100 rounded text-xs font-bold flex items-center gap-1 transition-colors"
                                                title="Cancelar/Excluir Renovação"
                                            >
                                                <span className="material-symbols-outlined text-[14px]">delete</span>
                                                Limpar
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {showRenewalModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl animate-in zoom-in duration-200 flex flex-col max-h-[90vh]">
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
                            <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                                <span className="material-symbols-outlined text-brand-orange">autorenew</span>
                                Renovar Contratos para {selectedYear + 1}
                            </h3>
                            <button onClick={() => setShowRenewalModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto">
                            <p className="text-sm text-slate-500 mb-6 bg-slate-50 p-3 rounded-lg border border-slate-100 italic">
                                Insira o valor do reajuste para cada cliente. O novo valor do contrato será: <b>Valor Atual + Reajuste</b>.
                            </p>

                            <div className="space-y-3">
                                {filteredClients.map(client => {
                                    const currentContract = getContract(client.id, selectedYear);
                                    const nextContract = getContract(client.id, selectedYear + 1);
                                    const renewalItem = renewalData.find(item => item.client_id === client.id);

                                    if (!currentContract) return null;

                                    return (
                                        <div key={client.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-slate-800">{client.name}</span>
                                                <div className="flex gap-3 mt-0.5">
                                                    <span className="text-[10px] text-slate-400">Mensal: R$ {currentContract.monthly_fee.toFixed(2)}</span>
                                                    <span className="text-[10px] text-slate-400">Nota: R$ {currentContract.invoice_value.toFixed(2)}</span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-4">
                                                {nextContract ? (
                                                    <span className="text-[11px] font-bold text-green-600 bg-green-50 px-2 py-1 rounded">Já Renovado</span>
                                                ) : (
                                                    <>
                                                        <div className="flex flex-col items-end">
                                                            <span className="text-[10px] font-bold text-slate-400 uppercase">Reajuste (R$)</span>
                                                            <input
                                                                type="number"
                                                                step="0.01"
                                                                className="w-24 text-right text-sm p-1.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-orange/20 outline-none font-bold"
                                                                value={renewalItem?.readjustment || 0}
                                                                onChange={(e) => {
                                                                    const val = parseFloat(e.target.value) || 0;
                                                                    setRenewalData(prev => prev.map(item => item.client_id === client.id ? { ...item, readjustment: val } : item));
                                                                }}
                                                            />
                                                        </div>
                                                        <div className="flex flex-col items-end min-w-[120px]">
                                                            <span className="text-[9px] font-bold text-slate-400 uppercase">Novos Valores</span>
                                                            <div className="flex flex-col items-end">
                                                                <span className="text-[11px] font-black text-slate-900 italic">
                                                                    Mensal: R$ {((currentContract.monthly_fee || 0) + (renewalItem?.readjustment || 0)).toFixed(2)}
                                                                </span>
                                                                <span className="text-[11px] font-black text-primary italic">
                                                                    Nota: R$ {((currentContract.invoice_value || 0) + (renewalItem?.readjustment || 0)).toFixed(2)}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="px-6 py-4 border-t border-slate-100 flex gap-3 shrink-0">
                            <button
                                type="button"
                                onClick={() => setShowRenewalModal(false)}
                                className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleBulkRenewal}
                                className="flex-1 py-3 rounded-xl bg-brand-orange text-white font-bold text-sm hover:bg-orange-600 shadow-lg shadow-orange-500/20 transition-all active:scale-[0.98]"
                            >
                                Confirmar Renovação
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ContractRenewalPage;
