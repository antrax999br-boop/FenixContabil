
import React, { useState } from 'react';
import { Employee, EmployeePayment, EmployeePaymentStatus } from '../types';
import { formatCurrency } from '../utils/calculations';

interface EmployeesPageProps {
    employees: Employee[];
    employeePayments: EmployeePayment[];
    onAddEmployee: (employee: Omit<Employee, 'id' | 'created_at'>) => void;
    onUpdateEmployee: (employee: Employee) => void;
    onDeleteEmployee: (id: string) => void;
    onUpdatePayment: (payment: Omit<EmployeePayment, 'id' | 'created_at'>) => void;
}

const EmployeesPage: React.FC<EmployeesPageProps> = ({
    employees,
    employeePayments,
    onAddEmployee,
    onUpdateEmployee,
    onDeleteEmployee,
    onUpdatePayment
}) => {
    const [showModal, setShowModal] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
    const [monthFilter, setMonthFilter] = useState<number>(new Date().getMonth());
    const [yearFilter, setYearFilter] = useState<number>(new Date().getFullYear());
    const [searchTerm, setSearchTerm] = useState('');

    const [newEmployee, setNewEmployee] = useState({
        name: '',
        job_title: '',
        meal_voucher_day: '',
        transport_voucher_day: '',
        payment_method: '',
        payment_day: '5',
        active: true
    });

    const months = [
        "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
        "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];

    const currentYear = new Date().getFullYear();
    const years = [currentYear - 1, currentYear, currentYear + 1];

    const filteredEmployees = employees.filter(e =>
        e.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getYearMonthKey = (y: number, m: number) => `${y}.${(m + 1).toString().padStart(2, '0')}`;
    const currentYM = getYearMonthKey(yearFilter, monthFilter);

    const getPaymentForEmployee = (employeeId: string) => {
        return employeePayments.find(p => p.employee_id === employeeId && p.year_month === currentYM);
    };

    const handleEmployeeSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const employeeData = {
            name: newEmployee.name,
            job_title: newEmployee.job_title,
            meal_voucher_day: parseFloat(newEmployee.meal_voucher_day) || 0,
            transport_voucher_day: parseFloat(newEmployee.transport_voucher_day) || 0,
            payment_method: newEmployee.payment_method,
            payment_day: parseInt(newEmployee.payment_day) || 5,
            active: newEmployee.active
        };

        if (editingEmployee) {
            onUpdateEmployee({ ...editingEmployee, ...employeeData });
        } else {
            onAddEmployee(employeeData);
        }

        setNewEmployee({
            name: '',
            job_title: '',
            meal_voucher_day: '',
            transport_voucher_day: '',
            payment_method: '',
            payment_day: '5',
            active: true
        });
        setEditingEmployee(null);
        setShowModal(false);
    };

    const openEditModal = (employee: Employee) => {
        setNewEmployee({
            name: employee.name,
            job_title: employee.job_title || '',
            meal_voucher_day: employee.meal_voucher_day.toString(),
            transport_voucher_day: employee.transport_voucher_day.toString(),
            payment_method: employee.payment_method || '',
            payment_day: employee.payment_day.toString(),
            active: employee.active
        });
        setEditingEmployee(employee);
        setShowModal(true);
    };

    const handleStatusChange = (employeeId: string, status: EmployeePaymentStatus) => {
        const existing = getPaymentForEmployee(employeeId);
        onUpdatePayment({
            employee_id: employeeId,
            year_month: currentYM,
            status,
            meal_voucher_total: existing?.meal_voucher_total || 0,
            transport_voucher_total: existing?.transport_voucher_total || 0
        });
    };

    const calculateMonthlyTotals = (employee: Employee) => {
        // Default to 22 working days as a common standard
        const days = 22;
        const mealTotal = employee.meal_voucher_day * days;
        const transportTotal = employee.transport_voucher_day * days;

        onUpdatePayment({
            employee_id: employee.id,
            year_month: currentYM,
            status: getPaymentForEmployee(employee.id)?.status || EmployeePaymentStatus.PENDING,
            meal_voucher_total: mealTotal,
            transport_voucher_total: transportTotal
        });
    };

    return (
        <div className="max-w-7xl mx-auto pb-20">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
                <div>
                    <nav className="flex text-sm text-slate-500 mb-2 gap-2 items-center">
                        <span>Gestão</span>
                        <span className="material-symbols-outlined text-xs">chevron_right</span>
                        <span className="text-primary font-medium">Funcionários</span>
                    </nav>
                    <h2 className="text-3xl font-black tracking-tight text-slate-900">
                        Controle de Funcionários
                    </h2>
                </div>
                <button
                    onClick={() => {
                        setEditingEmployee(null);
                        setNewEmployee({
                            name: '',
                            job_title: '',
                            meal_voucher_day: '',
                            transport_voucher_day: '',
                            payment_method: '',
                            payment_day: '5',
                            active: true
                        });
                        setShowModal(true);
                    }}
                    className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-lg shadow-primary/25 hover:-translate-y-0.5"
                >
                    <span className="material-symbols-outlined text-lg">person_add</span>
                    Novo Funcionário
                </button>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-8 flex flex-wrap items-center justify-between gap-6 shadow-sm">
                <div className="flex items-center gap-4 flex-1 min-w-[300px]">
                    <div className="relative flex-1">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
                        <input
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-primary/20 text-slate-900 placeholder:text-slate-400"
                            placeholder="Buscar funcionário por nome..."
                            type="text"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <select
                            className="bg-slate-50 border-none rounded-xl py-2.5 px-4 text-sm font-bold focus:ring-2 focus:ring-primary/20 text-slate-900 cursor-pointer"
                            value={monthFilter}
                            onChange={e => setMonthFilter(parseInt(e.target.value))}
                        >
                            {months.map((m, idx) => (
                                <option key={m} value={idx}>{m}</option>
                            ))}
                        </select>

                        <select
                            className="bg-slate-50 border-none rounded-xl py-2.5 px-4 text-sm font-bold focus:ring-2 focus:ring-primary/20 text-slate-900 cursor-pointer"
                            value={yearFilter}
                            onChange={e => setYearFilter(parseInt(e.target.value))}
                        >
                            {years.map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="text-sm font-medium text-slate-500 bg-slate-50 px-4 py-2 rounded-full border border-slate-100 italic">
                    Mês de Referência: <span className="text-primary font-bold">{months[monthFilter]} {yearFilter}</span>
                </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden glass-morphism">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-100 bg-slate-50/50">
                                <th className="px-6 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest">Funcionário</th>
                                <th className="px-6 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">Dia Pgto</th>
                                <th className="px-6 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest">Vale Refeição</th>
                                <th className="px-6 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest">Vale Transporte</th>
                                <th className="px-6 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest">Pagamento</th>
                                <th className="px-6 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                                <th className="px-6 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredEmployees.length > 0 ? filteredEmployees.map(emp => {
                                const payment = getPaymentForEmployee(emp.id);
                                const status = payment?.status || EmployeePaymentStatus.PENDING;

                                return (
                                    <tr key={emp.id} className="hover:bg-slate-50/80 transition-all group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="size-10 rounded-xl bg-gradient-to-br from-primary to-blue-600 text-white flex items-center justify-center font-black text-sm shadow-md shadow-primary/20">
                                                    {emp.name.substring(0, 1).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-slate-900">{emp.name}</p>
                                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">{emp.job_title || 'Sem Função'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-md text-xs font-bold">
                                                Dia {emp.payment_day}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div>
                                                    <p className="text-xs font-black text-slate-800">{formatCurrency(payment?.meal_voucher_total || 0)}</p>
                                                    <p className="text-[10px] text-slate-400 italic">Diário: {formatCurrency(emp.meal_voucher_day)}</p>
                                                </div>
                                                <button
                                                    onClick={() => calculateMonthlyTotals(emp)}
                                                    className="p-1.5 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                                    title="Calcular Total Mensal (22 dias)"
                                                >
                                                    <span className="material-symbols-outlined text-lg">calculate</span>
                                                </button>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div>
                                                    <p className="text-xs font-black text-slate-800">{formatCurrency(payment?.transport_voucher_total || 0)}</p>
                                                    <p className="text-[10px] text-slate-400 italic">Diário: {formatCurrency(emp.transport_voucher_day)}</p>
                                                </div>
                                                <button
                                                    onClick={() => calculateMonthlyTotals(emp)}
                                                    className="p-1.5 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                                    title="Calcular Total Mensal (22 dias)"
                                                >
                                                    <span className="material-symbols-outlined text-lg">calculate</span>
                                                </button>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-xs font-semibold text-slate-700">{emp.payment_method || 'Não inf.'}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col items-center gap-1">
                                                <select
                                                    value={status}
                                                    onChange={(e) => handleStatusChange(emp.id, e.target.value as EmployeePaymentStatus)}
                                                    className={`text-[10px] font-black px-3 py-1.5 rounded-full border cursor-pointer outline-none transition-all
                            ${status === EmployeePaymentStatus.PAID ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                                                            status === EmployeePaymentStatus.OVERDUE ? 'bg-rose-100 text-rose-700 border-rose-200' :
                                                                'bg-amber-100 text-amber-700 border-amber-200'}`}
                                                >
                                                    <option value={EmployeePaymentStatus.PENDING}>PENDENTE</option>
                                                    <option value={EmployeePaymentStatus.PAID}>PAGO</option>
                                                    <option value={EmployeePaymentStatus.OVERDUE}>ATRASADO</option>
                                                </select>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex justify-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                                <button
                                                    onClick={() => openEditModal(emp)}
                                                    className="p-2 text-blue-500 hover:bg-blue-50 rounded-xl transition-all"
                                                    title="Editar Cadastro"
                                                >
                                                    <span className="material-symbols-outlined text-xl">edit_note</span>
                                                </button>
                                                <button
                                                    onClick={() => onDeleteEmployee(emp.id)}
                                                    className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                                                    title="Excluir"
                                                >
                                                    <span className="material-symbols-outlined text-xl">delete</span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            }) : (
                                <tr>
                                    <td colSpan={7} className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center gap-3 text-slate-400">
                                            <span className="material-symbols-outlined text-5xl opacity-20">group_off</span>
                                            <p className="font-semibold italic">Nenhum funcionário encontrado.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="px-8 py-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                            <div>
                                <h3 className="font-black text-xl text-slate-800">{editingEmployee ? 'Editar Funcionário' : 'Novo Cadastro'}</h3>
                                <p className="text-xs text-slate-500 font-medium tracking-tight">Preencha os dados principais do colaborador.</p>
                            </div>
                            <button
                                onClick={() => { setShowModal(false); setEditingEmployee(null); }}
                                className="size-10 flex items-center justify-center bg-white rounded-full text-slate-400 hover:text-slate-600 hover:shadow-md transition-all border border-slate-100"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <form onSubmit={handleEmployeeSubmit} className="p-8 space-y-6">
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Nome Completo</label>
                                        <input
                                            required
                                            type="text"
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-primary/10 outline-none transition-all font-bold text-slate-800 placeholder:text-slate-300"
                                            value={newEmployee.name}
                                            onChange={e => setNewEmployee(prev => ({ ...prev, name: e.target.value }))}
                                            placeholder="Ex: João da Silva"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Função / Cargo</label>
                                        <input
                                            type="text"
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-primary/10 outline-none transition-all font-bold text-slate-800 placeholder:text-slate-300"
                                            value={newEmployee.job_title}
                                            onChange={e => setNewEmployee(prev => ({ ...prev, job_title: e.target.value }))}
                                            placeholder="Ex: Vendedor 01"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">VR Diário (R$)</label>
                                        <input
                                            required
                                            type="text"
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-primary/10 outline-none transition-all font-bold text-slate-800"
                                            value={newEmployee.meal_voucher_day}
                                            onChange={e => setNewEmployee(prev => ({ ...prev, meal_voucher_day: e.target.value }))}
                                            placeholder="0.00"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">VT Diário (R$)</label>
                                        <input
                                            required
                                            type="text"
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-primary/10 outline-none transition-all font-bold text-slate-800"
                                            value={newEmployee.transport_voucher_day}
                                            onChange={e => setNewEmployee(prev => ({ ...prev, transport_voucher_day: e.target.value }))}
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Meio de Pagamento</label>
                                        <input
                                            type="text"
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-primary/10 outline-none transition-all font-bold text-slate-800 placeholder:text-slate-300"
                                            value={newEmployee.payment_method}
                                            onChange={e => setNewEmployee(prev => ({ ...prev, payment_method: e.target.value }))}
                                            placeholder="Pix ou Dados Bancários"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Dia de Pagamento</label>
                                        <input
                                            required
                                            type="number"
                                            min="1"
                                            max="31"
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-primary/10 outline-none transition-all font-bold text-slate-800"
                                            value={newEmployee.payment_day}
                                            onChange={e => setNewEmployee(prev => ({ ...prev, payment_day: e.target.value }))}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="pt-6 flex gap-4">
                                <button
                                    type="button"
                                    onClick={() => { setShowModal(false); setEditingEmployee(null); }}
                                    className="flex-1 py-4 rounded-xl border border-slate-200 text-slate-500 font-bold text-sm hover:bg-slate-50 transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-4 rounded-xl bg-primary text-white font-bold text-sm hover:bg-blue-700 shadow-xl shadow-primary/20 transition-all"
                                >
                                    {editingEmployee ? 'Salvar Alterações' : 'Cadastrar agora'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EmployeesPage;
