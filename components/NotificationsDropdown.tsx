import React from 'react';
import { CalendarEvent } from '../types';

interface NotificationsDropdownProps {
    events: CalendarEvent[];
    onClose: () => void;
}

const NotificationsDropdown: React.FC<NotificationsDropdownProps> = ({ events, onClose }) => {
    // Filter for today and future events
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    const upcomingEvents = events
        .filter(e => e.date >= todayStr)
        .sort((a, b) => {
            if (a.date !== b.date) return a.date.localeCompare(b.date);
            return a.time.localeCompare(b.time);
        })
        .slice(0, 5); // Show only top 5

    return (
        <div className="absolute top-12 right-0 w-80 bg-white rounded-xl shadow-xl border border-slate-100 py-2 z-50 animate-in zoom-in-95 duration-200">
            <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-slate-800 text-sm">Notificações</h3>
                <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                    <span className="material-symbols-outlined text-base">close</span>
                </button>
            </div>

            <div className="max-h-80 overflow-y-auto">
                {upcomingEvents.length === 0 ? (
                    <div className="p-8 text-center text-slate-400">
                        <span className="material-symbols-outlined text-4xl mb-2 opacity-50">notifications_off</span>
                        <p className="text-xs">Nenhuma notificação pendente</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-50">
                        {upcomingEvents.map(event => (
                            <div key={event.id} className="p-3 hover:bg-slate-50 transition-colors">
                                <div className="flex items-start gap-3">
                                    <div className="h-2 w-2 mt-1.5 rounded-full bg-brand-orange shrink-0"></div>
                                    <div>
                                        <h4 className="text-sm font-semibold text-slate-800 leading-tight mb-1">{event.title}</h4>
                                        <p className="text-xs text-slate-500 mb-1 line-clamp-2">{event.description}</p>
                                        <div className="flex items-center gap-2 text-[10px] font-medium text-slate-400 bg-slate-100 inline-flex px-1.5 py-0.5 rounded">
                                            <span>{new Date(event.date).toLocaleDateString()}</span>
                                            <span>•</span>
                                            <span>{event.time.slice(0, 5)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="px-4 py-2 border-t border-slate-100 text-center">
                <button className="text-xs font-bold text-brand-orange hover:text-orange-700">
                    Ver todas as notificações
                </button>
            </div>
        </div>
    );
};

export default NotificationsDropdown;
