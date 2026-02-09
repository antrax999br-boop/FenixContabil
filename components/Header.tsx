
import React from 'react';
import { User } from '../types';

interface HeaderProps {
  user: User;
  onNotificationsClick: () => void;
  onChatClick: () => void;
  onProfileClick: () => void;
  onSettingsClick: () => void;
  onLogout: () => void;
  hasUnreadNotifications: boolean;
}

const Header: React.FC<HeaderProps> = ({ user, onNotificationsClick, onChatClick, onProfileClick, onSettingsClick, onLogout, hasUnreadNotifications }) => {
  return (
    <header className="h-16 shrink-0 bg-white border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-20">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 h-10">
          <div className="h-10 w-16 overflow-hidden flex items-center justify-center">
            <img
              src="/fenix-logo.png"
              alt="Fenix Logo Parte 1"
              className="h-20 w-auto max-w-none object-contain"
              style={{ objectPosition: 'top' }}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
          <div className="h-10 w-12 overflow-hidden flex items-center justify-center">
            <img
              src="/fenix-logo.png"
              alt="Fenix Logo Parte 2"
              className="h-20 w-auto max-w-none object-contain"
              style={{ objectPosition: 'bottom' }}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
        </div>
        <h2 className="text-lg font-bold text-slate-800 sm:block hidden">Fenix Contábil</h2>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={onNotificationsClick}
          className="size-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors relative"
          title="Notificações"
        >
          <span className="material-symbols-outlined text-xl">notifications</span>
          {hasUnreadNotifications && (
            <span className="absolute top-2 right-2 size-2 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>
          )}
        </button>
        <button
          onClick={onChatClick}
          className="size-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors"
          title="Chat"
        >
          <span className="material-symbols-outlined text-xl">chat_bubble_outline</span>
        </button>

        <div className="h-8 w-px bg-slate-200 mx-1"></div>

        <div
          className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity p-1 rounded-lg hover:bg-slate-50"
          onClick={onProfileClick}
        >
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-slate-800">{user.name}</p>
            <p className="text-[11px] font-medium text-slate-500 uppercase tracking-tight leading-none">
              {user.job_title || (user.profile === 'admin' ? 'Contador Sênior' : 'Analista Júnior')}
            </p>
          </div>
          <div
            className="size-10 rounded-full bg-primary/10 border border-slate-200 bg-cover bg-center"
            style={{
              backgroundImage: user.avatar_url
                ? `url('${user.avatar_url}')`
                : `url('https://picsum.photos/seed/${user.id}/100/100')`
            }}
          />
        </div>

        <button
          onClick={onSettingsClick}
          className="size-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          title="Configurações"
        >
          <span className="material-symbols-outlined text-xl">settings</span>
        </button>

        <button
          onClick={onLogout}
          className="size-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
          title="Sair"
        >
          <span className="material-symbols-outlined text-xl">logout</span>
        </button>
      </div>
    </header>
  );
};

export default Header;
