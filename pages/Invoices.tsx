
import React, { useState } from 'react';
import { AppState, Invoice, InvoiceStatus } from '../types';
import { formatCurrency } from '../utils/calculations';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface InvoicesPageProps {
  state: AppState;
  onAdd: (invoice: Omit<Invoice, 'id' | 'status' | 'days_overdue' | 'final_value' | 'penalty_applied' | 'fine_value' | 'interest_value' | 'reissue_tax' | 'postage_tax'> & { individual_name?: string }) => void;
  onPay: (id: string) => void;
  onUpdate: (invoice: Invoice) => void;
  onDelete: (id: string) => void;
  initialFilter?: InvoiceStatus | 'ALL' | 'ATIVOS' | 'SEM_NOTA' | 'INTERNET' | 'AGUARDANDO';
}

const InvoicesPage: React.FC<InvoicesPageProps> = ({ state, onAdd, onPay, onUpdate, onDelete, initialFilter }) => {
  const [showModal, setShowModal] = useState(false);
  const [showClientReportModal, setShowClientReportModal] = useState(false);
  const [reportClientId, setReportClientId] = useState('');
  const [reportYear, setReportYear] = useState<number>(new Date().getFullYear());
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [filter, setFilter] = useState<InvoiceStatus | 'ALL' | 'ATIVOS' | 'SEM_NOTA' | 'INTERNET' | 'AGUARDANDO'>(initialFilter || 'ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [monthFilter, setMonthFilter] = useState<number | 'ALL'>(new Date().getMonth());
  const [yearFilter, setYearFilter] = useState<number | 'ALL'>(new Date().getFullYear());
  const [newInvoice, setNewInvoice] = useState({
    invoice_number: '',
    client_id: '',
    individual_name: '',
    original_value: '',
    due_date: new Date().toISOString().split('T')[0],
    status: InvoiceStatus.NOT_PAID
  });

  const months = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  const currentYear = new Date().getFullYear();
  const years = [currentYear - 1, currentYear, currentYear + 1];

  const filteredInvoices = state.invoices.filter((i: Invoice) => {
    const client = state.clients.find(c => c.id === i.client_id);

    const isAguardando = i.invoice_number?.startsWith('AGU-');
    const isInternet = !isAguardando && (i.invoice_number?.startsWith('INT-') || (i.individual_name && !i.client_id));
    const isSemNota = !isAguardando && !isInternet && (!i.invoice_number || i.invoice_number.trim() === '' || i.invoice_number.toUpperCase() === 'S/N' || i.invoice_number.toUpperCase() === 'S/AN');
    const isStandard = !isAguardando && !isInternet && !isSemNota;

    let matchesStatus = false;
    if (filter === 'ALL') {
      // General view: show everything
      matchesStatus = true;
    } else if (filter === 'ATIVOS') {
      matchesStatus = isStandard;
    } else if (filter === 'SEM_NOTA') {
      matchesStatus = isSemNota;
    } else if (filter === 'INTERNET') {
      matchesStatus = isInternet;
    } else if (filter === 'AGUARDANDO') {
      matchesStatus = isAguardando;
    } else {
      matchesStatus = i.status === filter;
    }

    const invoiceDate = new Date(i.due_date + 'T12:00:00');
    const matchesMonth = monthFilter === 'ALL' || invoiceDate.getMonth() === monthFilter;
    const matchesYear = yearFilter === 'ALL' || invoiceDate.getFullYear() === yearFilter;

    const searchLower = searchTerm.toLowerCase();
    const clientName = client?.name || i.individual_name || '';
    const matchesSearch = searchTerm === '' ||
      clientName.toLowerCase().includes(searchLower) ||
      (i.invoice_number || '').toLowerCase().includes(searchLower);

    return matchesStatus && matchesMonth && matchesYear && matchesSearch;
  }).sort((a: Invoice, b: Invoice) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());

  const groupedInvoices = filteredInvoices.reduce((acc: Record<number, Invoice[]>, inv: Invoice) => {
    // Safer month extraction from YYYY-MM-DD string
    const month = parseInt(inv.due_date.split('-')[1]) - 1;
    if (!acc[month]) acc[month] = [];
    acc[month].push(inv);
    return acc;
  }, {} as Record<number, Invoice[]>);

  const sortedMonthKeys = Object.keys(groupedInvoices).map(Number).sort((a, b) => a - b);

  const getDefaultType = () => {
    if (filter === 'INTERNET') return 'INTERNET';
    if (filter === 'SEM_NOTA') return 'SEM_NOTA';
    if (filter === 'AGUARDANDO') return 'AGUARDANDO';
    return 'STANDARD';
  };

  const [regType, setRegType] = useState<'STANDARD' | 'INTERNET' | 'SEM_NOTA' | 'AGUARDANDO'>(getDefaultType());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (regType !== 'INTERNET' && !newInvoice.client_id) return alert('Selecione um cliente');
    if (regType === 'INTERNET' && !newInvoice.individual_name) return alert('Informe o nome/serviço para cobrança');

    let finalNumber = newInvoice.invoice_number;
    if (regType === 'SEM_NOTA') finalNumber = 'S/N';
    else if (regType === 'INTERNET' && !finalNumber.startsWith('INT-')) {
      finalNumber = 'INT-' + (finalNumber || 'AUTOGEN');
    } else if (regType === 'AGUARDANDO' && !finalNumber.startsWith('AGU-')) {
      finalNumber = 'AGU-' + (finalNumber || 'PEND');
    }

    if (editingInvoice) {
      onUpdate({
        ...editingInvoice,
        client_id: newInvoice.client_id,
        invoice_number: finalNumber,
        original_value: parseFloat(newInvoice.original_value) || 0,
        due_date: newInvoice.due_date,
        status: newInvoice.status,
        individual_name: newInvoice.individual_name,
        payment_date: newInvoice.status === InvoiceStatus.PAID ? (editingInvoice.payment_date || new Date().toISOString()) : null
      });
    } else {
      onAdd({
        ...newInvoice,
        original_value: parseFloat(newInvoice.original_value) || 0,
        invoice_number: finalNumber,
      });
    }

    setNewInvoice({
      invoice_number: '',
      client_id: '',
      individual_name: '',
      original_value: '',
      due_date: new Date().toISOString().split('T')[0],
      status: InvoiceStatus.NOT_PAID
    });
    setEditingInvoice(null);
    setShowModal(false);
  };

  const openEditModal = (inv: Invoice) => {
    let type: 'STANDARD' | 'INTERNET' | 'SEM_NOTA' | 'AGUARDANDO' = 'STANDARD';
    if (inv.invoice_number?.startsWith('AGU-')) type = 'AGUARDANDO';
    else if (inv.invoice_number?.startsWith('INT-') || (inv.individual_name && !inv.client_id)) type = 'INTERNET';
    else if (!inv.invoice_number || inv.invoice_number.trim() === '' || inv.invoice_number.toUpperCase() === 'S/N' || inv.invoice_number.toUpperCase() === 'S/AN') type = 'SEM_NOTA';

    setRegType(type);
    setNewInvoice({
      invoice_number: getDisplayNumber(inv.invoice_number),
      client_id: inv.client_id || '',
      individual_name: inv.individual_name || '',
      original_value: inv.original_value.toString(),
      due_date: inv.due_date,
      status: inv.status
    });
    setEditingInvoice(inv);
    setShowModal(true);
  };

  // Helper to get display number (hide technical prefixes)
  const getDisplayNumber = (num?: string) => {
    if (!num) return 'S/N';
    if (num.startsWith('INT-')) return num.replace('INT-', '');
    if (num.startsWith('AGU-')) return num.replace('AGU-', '');
    return num;
  };

  const renderStatusBadge = (invoice: Invoice, categoryIcon: string, iconColor: string) => {
    const isPaid = invoice.status === InvoiceStatus.PAID;
    const isOverdue = invoice.status === InvoiceStatus.OVERDUE;

    let badgeColor = "bg-amber-100 text-amber-700 border-amber-200";
    let statusText = "PENDENTE";

    if (isPaid) {
      badgeColor = "bg-emerald-100 text-emerald-700 border-emerald-200";
      statusText = "PAGO";
    } else if (isOverdue) {
      badgeColor = "bg-rose-100 text-rose-700 border-rose-200";
      statusText = "ATRASADO";
    }

    return (
      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-black tracking-wider uppercase ${badgeColor}`}>
        <span className={`material-symbols-outlined text-[14px] ${iconColor}`}>{categoryIcon}</span>
        {statusText}
      </div>
    );
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    const title = filter === 'AGUARDANDO' ? 'Relatório: Aguardando Nota Do Cliente' : 'Relatório de Boletos e Registros';
    const period = `${monthFilter === 'ALL' ? 'Ano Todo' : months[monthFilter]} / ${yearFilter === 'ALL' ? 'Todos os Anos' : yearFilter}`;

    // Header Background
    doc.setFillColor(15, 23, 42); // Navy 900
    doc.rect(0, 0, 210, 40, 'F');

    // Header Text
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(255, 255, 255);
    doc.text(title, 14, 20);

    doc.setFontSize(10);
    doc.text(`Período: ${period.toUpperCase()}`, 14, 30);
    doc.text(`Fenix Contábil - Emitido em: ${new Date().toLocaleDateString('pt-BR')}`, 196, 30, { align: 'right' });

    const tableData = filteredInvoices.map((inv: Invoice) => {
      const client = state.clients.find(c => c.id === inv.client_id);
      let details = '';
      if (inv.penalty_applied) {
        details = `\n(Multa: ${formatCurrency(inv.fine_value)} + Juros: ${formatCurrency(inv.interest_value)} + Taxas: ${formatCurrency(inv.reissue_tax)} e ${formatCurrency(inv.postage_tax)})`;
      }
      return [
        client?.name || inv.individual_name || 'Diversos',
        getDisplayNumber(inv.invoice_number),
        new Date(inv.due_date + 'T12:00:00').toLocaleDateString('pt-BR'),
        inv.status,
        formatCurrency(inv.original_value),
        formatCurrency(inv.final_value) + details
      ];
    });

    autoTable(doc, {
      startY: 50,
      head: [['Cliente', 'ID/Número', 'Vencimento', 'Status', 'Vlr. Original', 'Vlr. Final']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255] },
      styles: { fontSize: 8 },
      columnStyles: {
        4: { halign: 'right' },
        5: { halign: 'right', fontStyle: 'bold' }
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 3) {
          const val = data.cell.text[0];
          if (val === 'PAGO') data.cell.styles.textColor = [16, 185, 129];
          else if (val === 'ATRASADO') data.cell.styles.textColor = [225, 29, 72];
        }
      }
    });

    const total = filteredInvoices.reduce((acc: number, inv: Invoice) => acc + inv.final_value, 0);
    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59);
    doc.text(`TOTAL GERAL: ${formatCurrency(total)}`, 196, (doc as any).lastAutoTable.finalY + 15, { align: 'right' });

    doc.save(`Relatorio_Fenix_${filter}_${period.replace(/\s/g, '')}.pdf`);
  };

  const generateClientReportPDF = () => {
    if (!reportClientId) return alert('Selecione um cliente para gerar o relatório.');

    const client = state.clients.find(c => c.id === reportClientId);
    if (!client) return;

    const clientInvoices = state.invoices.filter(inv =>
      inv.client_id === reportClientId &&
      new Date(inv.due_date + 'T12:00:00').getFullYear() === reportYear
    ).sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());

    if (clientInvoices.length === 0) {
      return alert('Nenhum boleto encontrado para este cliente no ano selecionado.');
    }

    const doc = new jsPDF();

    // Custom Header for Client Report
    doc.setFillColor(15, 23, 42); // Navy 900
    doc.rect(0, 0, 210, 50, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(255, 255, 255);
    doc.text('Relatório Financeiro Individual', 14, 22);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Cliente: ${client.name}`, 14, 32);
    doc.text(`CNPJ: ${client.cnpj}`, 14, 38);
    doc.text(`Ano de Referência: ${reportYear}`, 14, 44);
    doc.text(`Emissão: ${new Date().toLocaleDateString('pt-BR')}`, 196, 44, { align: 'right' });

    // Summary Box
    const totalOriginal = clientInvoices.reduce((acc, inv) => acc + inv.original_value, 0);
    const totalFinal = clientInvoices.reduce((acc, inv) => acc + inv.final_value, 0);
    const totalPaid = clientInvoices.filter(inv => inv.status === InvoiceStatus.PAID).reduce((acc, inv) => acc + inv.final_value, 0);
    const totalPending = totalFinal - totalPaid;
    const totalFines = clientInvoices.reduce((acc: number, inv: Invoice) => acc + inv.fine_value, 0);
    const totalInterest = clientInvoices.reduce((acc: number, inv: Invoice) => acc + inv.interest_value, 0);
    const totalTaxes = clientInvoices.reduce((acc: number, inv: Invoice) => acc + (inv.reissue_tax || 0) + (inv.postage_tax || 0), 0);

    doc.setFillColor(248, 250, 252);
    doc.roundedRect(14, 55, 182, 35, 3, 3, 'F');

    doc.setTextColor(51, 65, 85);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('RESUMO FINANCEIRO DO ANO', 20, 62);

    doc.setFont('helvetica', 'normal');
    doc.text(`Total Original: ${formatCurrency(totalOriginal)}`, 20, 70);
    doc.text(`Total c/ Encargos: ${formatCurrency(totalFinal)}`, 20, 76);
    doc.text(`Total Multas: ${formatCurrency(totalFines)}`, 80, 70);
    doc.text(`Total Juros: ${formatCurrency(totalInterest)}`, 80, 76);
    doc.text(`Total Taxas: ${formatCurrency(totalTaxes)}`, 80, 82);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(16, 185, 129); // Success
    doc.text(`Total Liquidado: ${formatCurrency(totalPaid)}`, 145, 70);
    doc.setTextColor(225, 29, 72); // Danger
    doc.text(`Total em Aberto: ${formatCurrency(totalPending)}`, 145, 76);

    const tableData = clientInvoices.map((inv: Invoice) => [
      getDisplayNumber(inv.invoice_number),
      new Date(inv.due_date + 'T12:00:00').toLocaleDateString('pt-BR'),
      inv.status,
      formatCurrency(inv.original_value),
      formatCurrency(inv.fine_value),
      formatCurrency(inv.interest_value),
      formatCurrency((inv.reissue_tax || 0) + (inv.postage_tax || 0)),
      formatCurrency(inv.final_value)
    ]);

    (doc as any).autoTable({
      startY: 100,
      head: [['Número', 'Vencimento', 'Status', 'Vlr. Original', 'Multa', 'Juros', 'Taxas', 'Vlr. Final']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255] },
      styles: { fontSize: 8 },
      columnStyles: {
        3: { halign: 'right' },
        4: { halign: 'right' },
        5: { halign: 'right' },
        6: { halign: 'right', fontStyle: 'bold' }
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 2) {
          const val = data.cell.text[0];
          if (val === 'PAGO') data.cell.styles.textColor = [16, 185, 129];
          else if (val === 'ATRASADO') data.cell.styles.textColor = [225, 29, 72];
        }
      }
    });

    doc.save(`Relatorio_Cliente_${client.name.replace(/\s/g, '_')}_${reportYear}.pdf`);
    setShowClientReportModal(false);
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <nav className="flex text-sm text-slate-500 mb-2 gap-2 items-center">
            <span>Financeiro</span>
            <span className="material-symbols-outlined text-xs">chevron_right</span>
            <span className="text-primary font-medium">Boletos</span>
          </nav>
          <h2 className="text-3xl font-black tracking-tight text-slate-900">
            {filter === 'AGUARDANDO' ? 'Aguardando Nota Do Cliente' : 'Boletos e Registros'}
          </h2>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowClientReportModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white border border-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-900 transition-colors shadow-sm"
          >
            <span className="material-symbols-outlined text-sm">person_search</span>
            Relatório p/ Cliente
          </button>
          <button
            onClick={generatePDF}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-colors shadow-sm"
          >
            <span className="material-symbols-outlined text-sm">picture_as_pdf</span>
            Emitir Relatório PDF
          </button>
          <button
            onClick={() => {
              setRegType(getDefaultType());
              setShowModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors shadow-lg shadow-primary/20"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            Novo Boleto
          </button>
        </div>
      </div>

      {/* ... filter section remains same but update current display ... */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative flex-1 max-w-sm">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
            <input
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-primary/20 text-slate-900"
              placeholder="Buscar por cliente ou ID do boleto..."
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              className="bg-slate-50 border-none rounded-lg py-2 text-sm focus:ring-2 focus:ring-primary/20 text-slate-900"
              value={monthFilter}
              onChange={e => setMonthFilter(e.target.value === 'ALL' ? 'ALL' : parseInt(e.target.value))}
            >
              <option value="ALL">Todo o Ano</option>
              {months.map((m, idx) => (
                <option key={m} value={idx}>{m}</option>
              ))}
            </select>

            <select
              className="bg-slate-50 border-none rounded-lg py-2 text-sm focus:ring-2 focus:ring-primary/20 text-slate-900"
              value={yearFilter}
              onChange={e => setYearFilter(e.target.value === 'ALL' ? 'ALL' : parseInt(e.target.value))}
            >
              <option value="ALL">Todos os Anos</option>
              {years.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>

            <select
              className="bg-slate-50 border-none rounded-lg py-2 text-sm focus:ring-2 focus:ring-primary/20 text-slate-900 font-bold"
              value={filter}
              onChange={e => setFilter(e.target.value as any)}
            >
              <option value="ALL">📋 Visualização Geral</option>
              <option value="ATIVOS">🔥 Boletos Iniciais</option>
              <option value="SEM_NOTA">📄 Boletos Sem Nota</option>
              <option value="INTERNET">🌐 Boletos Internet</option>
              <option value="AGUARDANDO">⏳ Aguardando Nota</option>
              <option value={InvoiceStatus.PAID}>Somente Pagos</option>
              <option value={InvoiceStatus.NOT_PAID}>Somente Pendentes</option>
              <option value={InvoiceStatus.OVERDUE}>Somente Atrasados</option>
            </select>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <span>Mostrando {filteredInvoices.length} de {state.invoices.length}</span>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/50">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Cliente</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Valor Original</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Vencimento</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Boletos Ativos</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Boletos S/ Nota</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Boletos Internet</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Aguardando Nota</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Valor Final</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedMonthKeys.map(monthIdx => (
                <React.Fragment key={monthIdx}>
                  {monthFilter === 'ALL' && (
                    <tr className="bg-slate-100/50">
                      <td colSpan={9} className="px-6 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-sm text-primary">calendar_month</span>
                          <span className="text-xs font-black text-slate-700 uppercase tracking-widest">
                            {months[monthIdx]}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400 ml-auto">
                            {groupedInvoices[monthIdx].length} {groupedInvoices[monthIdx].length === 1 ? 'Boleto' : 'Boletos'}
                          </span>
                        </div>
                      </td>
                    </tr>
                  )}
                  {groupedInvoices[monthIdx].map(inv => {
                    const client = state.clients.find(c => c.id === inv.client_id);
                    const isAguardando = inv.invoice_number?.startsWith('AGU-');
                    const isInternet = !isAguardando && (inv.invoice_number?.startsWith('INT-') || (inv.individual_name && !inv.client_id));
                    const isSemNota = !isAguardando && !isInternet && (!inv.invoice_number || inv.invoice_number.trim() === '' || inv.invoice_number.toUpperCase() === 'S/N' || inv.invoice_number.toUpperCase() === 'S/AN');
                    const isStandard = !isAguardando && !isInternet && !isSemNota;

                    return (
                      <tr key={inv.id} className="hover:bg-primary/5 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="size-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs uppercase">
                              {(client?.name || inv.individual_name || '??').substring(0, 2)}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-slate-900">{client?.name || inv.individual_name || 'Diversos'}</p>
                              <p className="text-xs text-slate-500">ID: {getDisplayNumber(inv.invoice_number)}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">{formatCurrency(inv.original_value)}</td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {new Date(inv.due_date + 'T12:00:00').toLocaleDateString('pt-BR')}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {isStandard ? renderStatusBadge(inv, 'local_fire_department', 'text-orange-500') : <span className="text-slate-300">-</span>}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {isSemNota ? renderStatusBadge(inv, 'assignment_late', 'text-amber-500') : <span className="text-slate-300">-</span>}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {isInternet ? renderStatusBadge(inv, 'language', 'text-blue-500') : <span className="text-slate-300">-</span>}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {isAguardando ? renderStatusBadge(inv, 'hourglass_empty', 'text-purple-500') : <span className="text-slate-300">-</span>}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex flex-col items-end">
                            <span className="text-sm font-bold text-slate-900">{formatCurrency(inv.final_value)}</span>
                            {inv.penalty_applied && (
                              <span className="text-[9px] text-rose-500 font-medium text-right leading-tight">
                                Inclui multa, juros e taxas<br />
                                (R$ 2,50 + R$ 5,00)
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => openEditModal(inv)}
                              className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Editar"
                            >
                              <span className="material-symbols-outlined text-lg">edit</span>
                            </button>
                            {inv.status !== InvoiceStatus.PAID && (
                              <button
                                onClick={() => onPay(inv.id)}
                                className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                title="Marcar como Pago"
                              >
                                <span className="material-symbols-outlined text-lg">check_circle</span>
                              </button>
                            )}
                            <button
                              onClick={() => onDelete(inv.id)}
                              className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Excluir"
                            >
                              <span className="material-symbols-outlined text-lg">delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl animate-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-lg text-slate-800">{editingInvoice ? 'Editar Registro' : 'Novo Registro de Boleto'}</h3>
              <button onClick={() => { setShowModal(false); setEditingInvoice(null); }} className="text-slate-400 hover:text-slate-600 transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Tipo de Registro</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setRegType('STANDARD')}
                      className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all ${regType === 'STANDARD' ? 'bg-primary text-white border-primary' : 'bg-slate-50 text-slate-500 border-slate-200'}`}
                    >
                      Boleto Inicial
                    </button>
                    <button
                      type="button"
                      onClick={() => setRegType('INTERNET')}
                      className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all ${regType === 'INTERNET' ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 text-slate-500 border-slate-200'}`}
                    >
                      Internet
                    </button>
                    <button
                      type="button"
                      onClick={() => setRegType('SEM_NOTA')}
                      className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all ${regType === 'SEM_NOTA' ? 'bg-amber-500 text-white border-amber-500' : 'bg-slate-50 text-slate-500 border-slate-200'}`}
                    >
                      Sem Nota
                    </button>
                    <button
                      type="button"
                      onClick={() => setRegType('AGUARDANDO')}
                      className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all ${regType === 'AGUARDANDO' ? 'bg-purple-600 text-white border-purple-600' : 'bg-slate-50 text-slate-500 border-slate-200'}`}
                    >
                      Aguardando Nota
                    </button>
                  </div>
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    {regType === 'INTERNET' ? 'Nome / Descrição do Cobrado' : 'Cliente'}
                  </label>
                  {regType === 'INTERNET' ? (
                    <input
                      required
                      type="text"
                      id="individual_name"
                      name="individual_name"
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none bg-white text-slate-900 placeholder:text-slate-400 font-bold"
                      value={newInvoice.individual_name}
                      onChange={e => setNewInvoice(prev => ({ ...prev, individual_name: e.target.value }))}
                      placeholder="Ex: Hunter (Internet Mensal)"
                    />
                  ) : (
                    <select
                      required
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none bg-white text-slate-900"
                      value={newInvoice.client_id}
                      onChange={e => {
                        const val = e.target.value;
                        setNewInvoice(prev => ({ ...prev, client_id: val }));
                      }}
                    >
                      <option value="" className="text-slate-400">Selecione um cliente...</option>
                      {state.clients.map(c => <option key={c.id} value={c.id} className="text-slate-900">{c.name}</option>)}
                    </select>
                  )}
                </div>

                {regType !== 'SEM_NOTA' && (
                  <div className="col-span-2">
                    <label className="block text-sm font-semibold text-slate-700 mb-1">
                      {regType === 'INTERNET' ? 'ID do Registro Internet' : 'Número do Boleto'}
                    </label>
                    <input
                      id="invoice_number"
                      name="invoice_number"
                      type="text"
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none bg-white text-slate-900 placeholder:text-slate-400"
                      value={newInvoice.invoice_number}
                      onChange={e => setNewInvoice(prev => ({ ...prev, invoice_number: e.target.value }))}
                      placeholder={regType === 'INTERNET' ? 'Ex: INT-2024-001' : 'Ex: NF-2024-001'}
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Valor Original (R$)</label>
                  <input
                    required
                    id="original_value"
                    name="original_value"
                    type="text"
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none bg-white text-slate-900 font-bold"
                    value={newInvoice.original_value}
                    onChange={e => {
                      const val = e.target.value;
                      setNewInvoice(prev => ({ ...prev, original_value: val }));
                    }}
                    placeholder="0,00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Vencimento</label>
                  <input
                    required
                    id="due_date"
                    name="due_date"
                    type="date"
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none bg-white text-slate-900"
                    value={newInvoice.due_date}
                    onChange={e => setNewInvoice(prev => ({ ...prev, due_date: e.target.value }))}
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Status</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setNewInvoice(prev => ({ ...prev, status: InvoiceStatus.NOT_PAID }))}
                      className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all ${newInvoice.status !== InvoiceStatus.PAID ? 'bg-amber-100 text-amber-700 border-amber-300' : 'bg-slate-50 text-slate-500 border-slate-200'}`}
                    >
                      EM ABERTO
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewInvoice(prev => ({ ...prev, status: InvoiceStatus.PAID }))}
                      className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all ${newInvoice.status === InvoiceStatus.PAID ? 'bg-emerald-100 text-emerald-700 border-emerald-300' : 'bg-slate-50 text-slate-500 border-slate-200'}`}
                    >
                      PAGO
                    </button>
                  </div>
                </div>
              </div>
              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setEditingInvoice(null); }}
                  className="flex-1 py-2.5 rounded-lg border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-lg bg-primary text-white font-bold text-sm hover:bg-primary/90 shadow-lg shadow-primary/20"
                >
                  {editingInvoice ? 'Salvar Alterações' : 'Cadastrar Registro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showClientReportModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-lg text-slate-800">Gerar Relatório por Cliente</h3>
              <button onClick={() => setShowClientReportModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-500">Selecione o cliente e o ano para gerar um PDF detalhado com todos os boletos do período.</p>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Cliente</label>
                <select
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none bg-white text-slate-900"
                  value={reportClientId}
                  onChange={e => setReportClientId(e.target.value)}
                >
                  <option value="">Selecione um cliente...</option>
                  {state.clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Ano de Referência</label>
                <select
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none bg-white text-slate-900"
                  value={reportYear}
                  onChange={e => setReportYear(parseInt(e.target.value))}
                >
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowClientReportModal(false)}
                  className="flex-1 py-2.5 rounded-lg border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={generateClientReportPDF}
                  className="flex-1 py-2.5 rounded-lg bg-slate-800 text-white font-bold text-sm hover:bg-slate-900 shadow-lg shadow-slate-900/10"
                >
                  Gerar PDF Detalhado
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoicesPage;
