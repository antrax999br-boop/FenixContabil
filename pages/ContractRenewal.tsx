import React, { useState } from 'react';
import { AppState, Contract } from '../types';
import { formatCNPJ, formatCurrency } from '../utils/calculations';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ContractRenewalPageProps {
    state: AppState;
    onSaveContract: (contract: Contract) => Promise<void>;
    onSaveContracts: (contracts: Contract[]) => Promise<void>;
    onDeleteContract: (id: string) => Promise<void>;
}

const ContractRenewalPage: React.FC<ContractRenewalPageProps> = ({ state, onSaveContract, onSaveContracts, onDeleteContract }) => {
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [searchTerm, setSearchTerm] = useState('');
    const [showRenewalModal, setShowRenewalModal] = useState(false);
    const [renewalReadjustments, setRenewalReadjustments] = useState<Record<string, number>>({});
    const [isRenewing, setIsRenewing] = useState(false);

    // Local state for inputs to allow smooth typing without immediate DB hits
    const [localValues, setLocalValues] = useState<Record<string, any>>({});

    // Optimization: Pre-calculate a nested map for O(1) contract lookups: map[year][client_id]
    const contractsMap = React.useMemo(() => {
        const map: Record<number, Record<string, Contract>> = {};
        state.contracts.forEach(c => {
            if (!map[c.year]) map[c.year] = {};
            map[c.year][c.client_id] = c;
        });
        return map;
    }, [state.contracts]);

    const getContract = (clientId: string, year: number) => {
        return contractsMap[year]?.[clientId];
    };

    const currentYearContracts = React.useMemo(() => contractsMap[selectedYear] || {}, [contractsMap, selectedYear]);

    // Optimization: Create a map of the last contract for each client
    const lastContractsMap = React.useMemo(() => {
        const map: Record<string, Contract> = {};
        const sorted = [...state.contracts].sort((a, b) => b.year - a.year);
        sorted.forEach(c => {
            if (!map[c.client_id]) map[c.client_id] = c;
        });
        return map;
    }, [state.contracts]);

    const filteredClients = React.useMemo(() => {
        const searchLower = searchTerm.toLowerCase();
        const searchNumbers = searchTerm.replace(/\D/g, '');
        return state.clients.filter(client => {
            const name = client.name || '';
            const cnpj = client.cnpj || '';
            return name.toLowerCase().includes(searchLower) ||
                (searchNumbers !== '' && cnpj.replace(/\D/g, '').includes(searchNumbers));
        });
    }, [state.clients, searchTerm]);

    // PRE-FILTER clients for the renewal modal to avoid heavy mapping during render
    const renewalCandidates = React.useMemo(() => {
        const nextYear = selectedYear + 1;
        return filteredClients
            .map(client => {
                const current = currentYearContracts[client.id]; // Contract for selectedYear
                const next = contractsMap[nextYear]?.[client.id]; // Contract for nextYear
                const last = lastContractsMap[client.id]; // Latest available contract

                // Candidate if: has some contract, and no contract for nextYear
                if (last && !next) {
                    return { client, baseContract: current || last };
                }
                return null;
            })
            .filter((item): item is { client: any, baseContract: Contract } => item !== null);
    }, [filteredClients, contractsMap, selectedYear, lastContractsMap, currentYearContracts]);


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

    const generateAnnualReportPDF = () => {
        const doc = new jsPDF();
        doc.setFillColor(15, 23, 42); // Navy 900
        doc.rect(0, 0, 210, 40, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        doc.setTextColor(255, 255, 255);
        doc.text(`Relatório de Contratos - Ano ${selectedYear}`, 14, 20);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Fenix Contábil - Emitido em: ${new Date().toLocaleDateString('pt-BR')}`, 196, 30, { align: 'right' });

        const yearContracts = state.contracts.filter(c => c.year === selectedYear);

        const monthNames = [
            'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
            'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro', 'Sem Mês Definido'
        ];

        const groupedContracts: Record<string, any[]> = {};

        yearContracts.forEach(c => {
            let monthIdx = 12; // Default
            if (c.annual_duration && /^\d{2}\/\d{2}\/\d{2,4}$/.test(c.annual_duration)) {
                const month = parseInt(c.annual_duration.split('/')[1]);
                if (month >= 1 && month <= 12) monthIdx = month - 1;
            }

            const monthKey = monthNames[monthIdx];
            if (!groupedContracts[monthKey]) groupedContracts[monthKey] = [];

            const client = state.clients.find(cl => cl.id === c.client_id);
            groupedContracts[monthKey].push({
                clientName: client?.name || 'Desconhecido',
                copan: c.copan,
                status: c.status,
                vigencia: c.annual_duration,
                venc: c.due_day,
                mensal: c.monthly_fee,
                nota: c.invoice_value
            });
        });

        let currentY = 50;
        const sortedMonthKeys = monthNames.filter(m => groupedContracts[m]);

        sortedMonthKeys.forEach(month => {
            if (currentY > 250) {
                doc.addPage();
                currentY = 20;
            }

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(12);
            doc.setTextColor(15, 23, 42);
            doc.text(`Mês da Vigência: ${month}`, 14, currentY);
            currentY += 5;

            const tableData = groupedContracts[month].map(item => [
                item.clientName,
                item.copan,
                item.status,
                item.vigencia,
                item.venc.toString(),
                formatCurrency(item.mensal),
                formatCurrency(item.nota)
            ]);

            autoTable(doc, {
                startY: currentY,
                head: [['Cliente', 'Copan', 'Status', 'Vigência', 'Venc.', 'Mensal', 'Nota']],
                body: tableData,
                theme: 'grid',
                headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255] },
                styles: { fontSize: 8 },
                columnStyles: {
                    5: { halign: 'right' },
                    6: { halign: 'right' }
                }
            });

            currentY = (doc as any).lastAutoTable.finalY + 15;
        });

        const totalMensal = yearContracts.reduce((acc, c) => acc + c.monthly_fee, 0);
        const totalNota = yearContracts.reduce((acc, c) => acc + c.invoice_value, 0);

        if (currentY > 270) {
            doc.addPage();
            currentY = 20;
        }

        doc.setFontSize(10);
        doc.setTextColor(30, 41, 59);
        doc.text(`Total Mensal Geral: ${formatCurrency(totalMensal)}`, 196, currentY, { align: 'right' });
        currentY += 6;
        doc.text(`Total Nota Geral: ${formatCurrency(totalNota)}`, 196, currentY, { align: 'right' });

        doc.save(`Relatorio_Contratos_${selectedYear}.pdf`);
    };

    const generateOverdueRenewalPDF = () => {
        const doc = new jsPDF();
        const nextYear = selectedYear + 1;

        // Header
        doc.setFillColor(153, 27, 27); // Deep Red
        doc.rect(0, 0, 210, 40, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(22);
        doc.setTextColor(255, 255, 255);
        doc.text('Relatório de Renovações Pendentes', 14, 20);

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Referência: Contratos de ${selectedYear} pendentes para ${nextYear}`, 14, 32);
        doc.text(`Emitido em: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}`, 196, 32, { align: 'right' });

        // Logic: Find clients who HAVE an active contract in the selected year but DON'T have one in the next year
        const baseContracts = state.contracts.filter(c => c.year === selectedYear && c.status === 'Ativo');

        const pendingRenewalRows = baseContracts.filter(contract => {
            return !state.contracts.some(nc => nc.client_id === contract.client_id && nc.year === nextYear);
        });

        const monthNames = [
            'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
            'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro', 'Mês não identificado'
        ];

        const groupedClients: Record<string, any[]> = {};

        // Grouping logic based on the CURRENT (selectedYear) contract's month
        pendingRenewalRows.forEach(contract => {
            const client = state.clients.find(c => c.id === contract.client_id);
            if (!client) return;

            let monthIdx = 12; // Default: 'Mês não identificado'

            if (contract.annual_duration) {
                const dateMatch = contract.annual_duration.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
                if (dateMatch) {
                    const month = parseInt(dateMatch[2]);
                    if (month >= 1 && month <= 12) monthIdx = month - 1;
                }
            }

            const monthKey = monthNames[monthIdx];
            if (!groupedClients[monthKey]) groupedClients[monthKey] = [];

            groupedClients[monthKey].push({
                name: client.name,
                cnpj: formatCNPJ(client.cnpj),
                value: formatCurrency(contract.monthly_fee),
                vigencia: contract.annual_duration || '-'
            });
        });

        let currentY = 50;

        monthNames.forEach(month => {
            if (!groupedClients[month]) return;

            if (currentY > 240) {
                doc.addPage();
                currentY = 20;
            }

            // Month Header
            doc.setFillColor(241, 245, 249);
            doc.rect(14, currentY - 5, 182, 10, 'F');
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(11);
            doc.setTextColor(153, 27, 27);
            doc.text(`PENDENTE PARA: ${month.toUpperCase()}`, 18, currentY + 2);
            currentY += 8;

            const tableData = groupedClients[month].map(item => [
                item.name,
                item.cnpj,
                item.vigencia,
                item.value
            ]);

            autoTable(doc, {
                startY: currentY,
                head: [['Cliente', 'CNPJ', `Vigência (${selectedYear})`, `Valor Atual (${selectedYear})`]],
                body: tableData,
                theme: 'grid',
                headStyles: { fillColor: [153, 27, 27], textColor: [255, 255, 255], fontSize: 9 },
                bodyStyles: { fontSize: 8 },
                margin: { left: 14, right: 14 }
            });

            currentY = (doc as any).lastAutoTable.finalY + 15;
        });

        if (pendingRenewalRows.length === 0) {
            doc.setFontSize(14);
            doc.setTextColor(100, 116, 139);
            doc.text(`Tudo em dia para ${nextYear}! Todos os contratos de ${selectedYear} foram renovados.`, 105, 100, { align: 'center' });
        }

        doc.save(`Pendencias_Renovacao_${nextYear}.pdf`);
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
        if (isRenewing) return;
        setIsRenewing(true);

        try {
            const nextYear = selectedYear + 1;
            const contractsToSave: Contract[] = [];
            const updatedContractsReport = [];

            renewalCandidates.forEach(({ client, baseContract }) => {
                const readjustment = renewalReadjustments[client.id] || 0;
                const newMonthlyFee = Number(baseContract.monthly_fee || 0) + Number(readjustment);
                const newInvoiceValue = Number(baseContract.invoice_value || 0) + Number(readjustment);

                let newAnnualDuration = baseContract.annual_duration;
                if (newAnnualDuration && /^\d{2}\/\d{2}\/\d{2,4}$/.test(newAnnualDuration)) {
                    const parts = newAnnualDuration.split('/');
                    if (parts.length === 3) {
                        parts[2] = String(nextYear).length === 2 ? String(nextYear).slice(-2) : String(nextYear);
                        newAnnualDuration = parts.join('/');
                    }
                }

                contractsToSave.push({
                    client_id: client.id,
                    year: nextYear,
                    copan: baseContract.copan || '',
                    status: baseContract.status || 'Ativo',
                    annual_duration: newAnnualDuration || 'Anual',
                    due_day: baseContract.due_day || 10,
                    monthly_fee: newMonthlyFee,
                    invoice_value: newInvoiceValue,
                    readjustment: readjustment
                } as Contract);

                updatedContractsReport.push({
                    client_id: client.id,
                    prevContract: baseContract,
                    readjustment,
                    newMonthlyFee,
                    newInvoiceValue
                });
            });

            if (contractsToSave.length === 0) {
                alert('Nenhum contrato novo para renovar.');
                return;
            }

            await onSaveContracts(contractsToSave);

            if (confirm('Renovação concluída! Deseja emitir o relatório PDF das renovações agora?')) {
                generateRenewalPDF(nextYear, updatedContractsReport);
            }

            setSelectedYear(nextYear);
            setShowRenewalModal(false);
        } catch (error) {
            console.error('Erro na renovação em lote:', error);
            alert('Erro durante a renovação. Verifique o console.');
        } finally {
            setIsRenewing(false);
        }
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
                    <div className="flex gap-2 mr-2">
                        <button
                            onClick={generateAnnualReportPDF}
                            className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold shadow-md transition-all active:scale-95"
                            title={`Gerar PDF de todos os contratos de ${selectedYear}`}
                        >
                            <span className="material-symbols-outlined text-lg">description</span>
                            <span>Relatório {selectedYear}</span>
                        </button>
                        <button
                            onClick={generateOverdueRenewalPDF}
                            className="flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold shadow-md transition-all active:scale-95"
                            title="Gerar PDF de empresas com renovação pendente"
                        >
                            <span className="material-symbols-outlined text-lg">warning</span>
                            <span>Pendências</span>
                        </button>
                    </div>
                    <button
                        onClick={() => {
                            setRenewalReadjustments({});
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
                        {(() => {
                            const monthNames = [
                                'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                                'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro', 'Sem Mês Definido'
                            ];

                            const groupedDisplay: Record<string, any[]> = {};

                            filteredClients.forEach(client => {
                                const contract = getContract(client.id, selectedYear);

                                // Optimization: use pre-calculated map instead of filtering on the fly
                                const referenceContract = contract || lastContractsMap[client.id];

                                let monthIdx = 12; // Default
                                if (referenceContract?.annual_duration && /^\d{2}\/\d{2}\/\d{2,4}$/.test(referenceContract.annual_duration)) {
                                    const month = parseInt(referenceContract.annual_duration.split('/')[1]);
                                    if (month >= 1 && month <= 12) monthIdx = month - 1;
                                }
                                const monthKey = monthNames[monthIdx];
                                if (!groupedDisplay[monthKey]) groupedDisplay[monthKey] = [];
                                groupedDisplay[monthKey].push({ client, contract });
                            });

                            return monthNames.filter(m => groupedDisplay[m]).map(month => (
                                <React.Fragment key={month}>
                                    <tr className="bg-slate-50/80">
                                        <td colSpan={9} className="px-4 py-2 text-[11px] font-black text-primary uppercase tracking-widest border-y border-slate-200">
                                            Vigências de {month}
                                        </td>
                                    </tr>
                                    {groupedDisplay[month].map(({ client, contract }) => {
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
                                                        {contract?.readjustment ? `+ R$ ${(Number(contract.readjustment) || 0).toFixed(2)}` : '-'}
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
                                </React.Fragment>
                            ));
                        })()}
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
                                {renewalCandidates.length === 0 ? (
                                    <div className="text-center py-12 text-slate-400 font-medium">
                                        Nenhum contrato disponível para renovação nesta visão.
                                    </div>
                                ) : (
                                    renewalCandidates.map(({ client, baseContract }) => {
                                        const readjustment = renewalReadjustments[client.id] || 0;

                                        return (
                                            <div key={client.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-slate-800">{client.name}</span>
                                                    <div className="flex gap-3 mt-0.5">
                                                        <span className="text-[10px] text-slate-400">Mensal: R$ {(Number(baseContract.monthly_fee) || 0).toFixed(2)}</span>
                                                        <span className="text-[10px] text-slate-400">Nota: R$ {(Number(baseContract.invoice_value) || 0).toFixed(2)}</span>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-4">
                                                    <div className="flex flex-col items-end">
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase">Reajuste (R$)</span>
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            className="w-24 text-right text-sm p-1.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-orange/20 outline-none font-bold"
                                                            value={readjustment || 0}
                                                            onChange={(e) => {
                                                                const val = parseFloat(e.target.value) || 0;
                                                                setRenewalReadjustments(prev => ({ ...prev, [client.id]: val }));
                                                            }}
                                                        />
                                                    </div>
                                                    <div className="flex flex-col items-end min-w-[120px]">
                                                        <span className="text-[9px] font-bold text-slate-400 uppercase">Novos Valores</span>
                                                        <div className="flex flex-col items-end">
                                                            <span className="text-[11px] font-black text-slate-900 italic">
                                                                Mensal: R$ {((Number(baseContract.monthly_fee) || 0) + readjustment).toFixed(2)}
                                                            </span>
                                                            <span className="text-[11px] font-black text-primary italic">
                                                                Nota: R$ {((Number(baseContract.invoice_value) || 0) + readjustment).toFixed(2)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>

                        <div className="px-6 py-4 border-t border-slate-100 flex gap-3 shrink-0">
                            <button
                                type="button"
                                onClick={() => setShowRenewalModal(false)}
                                className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors"
                                disabled={isRenewing}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleBulkRenewal}
                                disabled={isRenewing || renewalCandidates.length === 0}
                                className={`flex-1 py-3 rounded-xl text-white font-bold text-sm shadow-lg transition-all active:scale-[0.98] ${isRenewing || renewalCandidates.length === 0 ? 'bg-slate-400 cursor-not-allowed' : 'bg-brand-orange hover:bg-orange-600 shadow-orange-500/20'
                                    }`}
                            >
                                {isRenewing ? 'Processando...' : 'Confirmar Renovação'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ContractRenewalPage;
