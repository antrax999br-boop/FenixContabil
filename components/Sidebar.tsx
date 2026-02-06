
import React from 'react';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange, onLogout }) => {
  const menuItems = [
    { id: 'inicio', label: 'Início', icon: 'dashboard' },
    { id: 'notas', label: 'Notas Fiscais', icon: 'receipt_long' },
    { id: 'clientes', label: 'Clientes', icon: 'group' },
    { id: 'relatorios', label: 'Relatórios', icon: 'bar_chart' },
    { id: 'calendario', label: 'Calendário', icon: 'calendar_today' },
    { id: 'configuracoes', label: 'Configurações', icon: 'settings' },
  ];

  // Logo Phoenix (Versão otimizada para o sistema)
  const phoenixLogo = "/phoenix-logo.png";

  return (
    <aside className="w-64 bg-brand-navy shrink-0 flex flex-col h-full">
      <div className="p-6 flex items-center gap-3">
        <div className="size-12 bg-white rounded-xl flex items-center justify-center relative overflow-hidden p-1 shadow-md">
          <img
            src={phoenixLogo}
            alt="Phoenix Logo"
            className="w-full h-full object-contain z-10"
            onError={(e) => {
              // Fallback caso a imagem falhe
              (e.target as HTMLImageElement).src = "https://img.icons8.com/color/96/phoenix.png";
            }}
          />
        </div>
        <div>
          <h1 className="text-white text-lg font-bold leading-tight">Phoenix</h1>
          <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest">Contabilidade</p>
        </div>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-1">
        {menuItems.map(item => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${activeTab === item.id
              ? 'bg-white/10 text-white shadow-sm'
              : 'text-white/70 hover:bg-white/5 hover:text-white'
              }`}
          >
            <span className="material-symbols-outlined text-[22px]">{item.icon}</span>
            <span className="text-sm font-medium">{item.label}</span>
          </button>
        ))}

        <div className="pt-8 pb-2 px-3">
          <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Sistema</p>
        </div>

        <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-white/70 hover:bg-white/5 hover:text-white transition-all">
          <span className="material-symbols-outlined text-[22px]">settings</span>
          <span className="text-sm font-medium">Configurações</span>
        </button>

        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-white/70 hover:bg-red-500/20 hover:text-red-400 transition-all"
        >
          <span className="material-symbols-outlined text-[22px]">logout</span>
          <span className="text-sm font-medium">Sair</span>
        </button>
      </nav>

      <div className="p-4 border-t border-white/10">
        <button
          onClick={() => onTabChange('notas')}
          className="w-full bg-brand-orange hover:bg-orange-600 transition-colors text-white py-2.5 rounded-lg flex items-center justify-center gap-2 text-sm font-bold shadow-lg shadow-brand-orange/20"
        >
          <span className="material-symbols-outlined text-base">add_circle</span>
          Nova Nota Fiscal
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
