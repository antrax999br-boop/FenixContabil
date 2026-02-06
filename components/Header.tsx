
import React from 'react';
import { User } from '../types';

interface HeaderProps {
  user: User;
  onNotificationsClick: () => void;
  onChatClick: () => void;
  onProfileClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ user, onNotificationsClick, onChatClick, onProfileClick }) => {
  return (
    <header className="h-16 shrink-0 bg-white border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-20">
      <div className="flex items-center gap-8">
        <h2 className="text-lg font-bold text-slate-800">Phoenix Contábil</h2>
        <div className="relative w-64">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl leading-none">search</span>
          <input
            className="w-full bg-slate-100 border-none rounded-lg py-1.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary/20 placeholder:text-slate-400"
            placeholder="Buscar transações..."
            type="text"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button onClick={onNotificationsClick} className="size-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors relative">
          <span className="material-symbols-outlined text-xl">notifications</span>
          <span className="absolute top-2 right-2 size-2 bg-red-500 rounded-full border-2 border-white"></span>
        </button>
        <button onClick={onChatClick} className="size-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors">
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
      </div>
    </header>
  );
};

export default Header;
