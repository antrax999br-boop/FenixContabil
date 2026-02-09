
import React from 'react';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  currentUserEmail?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange, currentUserEmail }) => {
  type MenuItem = {
    id: string;
    label: string;
    icon: string;
    sub?: boolean;
  };

  const menuItems: MenuItem[] = [
    { id: 'inicio', label: 'Início', icon: 'dashboard' },
    { id: 'notas', label: 'Boletos', icon: 'receipt_long' },
    { id: 'notas-ativas', label: 'Boletos Ativos', icon: 'local_fire_department' },
    { id: 'notas-sem-nota', label: 'Boletos Sem Nota', icon: 'assignment_late' },
    { id: 'notas-internet', label: 'Boletos Pela Internet', icon: 'language' },
    { id: 'contas-pagar', label: 'Contas a Pagar', icon: 'payments' },
    { id: 'clientes', label: 'Clientes', icon: 'group' },
    { id: 'relatorios', label: 'Relatórios', icon: 'bar_chart' },
  ];

  const adminEmails = ['laercio@laercio.com.br', 'eliane@fenix.com.br'];
  const isAdmin = adminEmails.includes(currentUserEmail || '');

  // Tabs that only admin (Laercio/Eliane) can see
  const restrictedTabs = ['notas', 'notas-internet', 'contas-pagar', 'relatorios'];

  const filteredMenuItems = menuItems.filter(item => {
    if (restrictedTabs.includes(item.id)) {
      return isAdmin;
    }
    return true;
  });

  if (isAdmin) {
    filteredMenuItems.push({ id: 'calendario', label: 'Calendário', icon: 'calendar_today' });
  }

  // Logo Fenix (Versão otimizada para o sistema)
  const fenixLogo = "/fenix-logo.png";

  return (
    <aside className="w-64 bg-brand-navy shrink-0 flex flex-col h-full">
      <div className="p-6">
        <div className="flex items-center justify-center bg-white/5 rounded-xl p-2.5 backdrop-blur-sm border border-white/10 overflow-hidden">
          <div className="flex items-center justify-center h-16 w-full">
            <img
              src={fenixLogo}
              alt="Fenix Contábil"
              className="h-full w-auto object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "https://img.icons8.com/color/96/phoenix.png";
              }}
            />
          </div>
        </div>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-1">
        {filteredMenuItems.map(item => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            style={item.sub ? { paddingLeft: '2.5rem', backgroundColor: 'rgba(0,0,0,0.2)' } : undefined}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${item.sub ? 'py-1.5 text-sm opacity-90' : ''} ${activeTab === item.id
              ? 'bg-white/10 text-white shadow-sm'
              : 'text-white/70 hover:bg-white/5 hover:text-white'
              }`}
          >
            <span className={`material-symbols-outlined flex-shrink-0 ${item.sub ? 'text-[18px]' : 'text-[20px]'}`}>{item.icon}</span>
            <span className={`${item.sub ? 'text-xs' : 'text-[13px]'} font-semibold whitespace-nowrap overflow-hidden text-ellipsis`}>{item.label}</span>
          </button>
        ))}

      </nav>

      {isAdmin && (
        <div className="p-4 border-t border-white/10">
          <button
            onClick={() => onTabChange('notas')}
            className="w-full bg-brand-orange hover:bg-orange-600 transition-colors text-white py-2.5 rounded-lg flex items-center justify-center gap-2 text-sm font-bold shadow-lg shadow-brand-orange/20"
          >
            <span className="material-symbols-outlined text-base">add_circle</span>
            Novo Boleto
          </button>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
