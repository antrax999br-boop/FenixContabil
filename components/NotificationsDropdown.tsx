import React from 'react';
import { CalendarEvent } from '../types';

interface NotificationsDropdownProps {
    events: CalendarEvent[];
    onClose: () => void;
    readNotifications: Set<string>;
    onMarkRead: (id: string) => void;
}

const NotificationsDropdown: React.FC<NotificationsDropdownProps> = ({ events, onClose, readNotifications, onMarkRead }) => {
    // Filter for TODAY's events
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    // Show ALL events for today, sorted by time
    const todayEvents = events
        .filter(e => e.date === todayStr)
        .sort((a, b) => a.time.localeCompare(b.time));

    return (
        <div className="absolute top-12 right-0 w-80 bg-white rounded-xl shadow-xl border border-slate-100 py-2 z-50 animate-in zoom-in-95 duration-200">
            <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-slate-800 text-sm">Notificações de Hoje</h3>
                <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                    <span className="material-symbols-outlined text-base">close</span>
                </button>
            </div>

            <div className="max-h-80 overflow-y-auto">
                {todayEvents.length === 0 ? (
                    <div className="p-8 text-center text-slate-400">
                        <span className="material-symbols-outlined text-4xl mb-2 opacity-50">notifications_off</span>
                        <p className="text-xs">Nenhuma notificação para hoje</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-50">
                        {todayEvents.map(event => {
                            const isRead = readNotifications.has(event.id);
                            return (
                                <div
                                    key={event.id}
                                    onClick={() => onMarkRead(event.id)}
                                    className={`p-3 transition-colors cursor-pointer ${isRead ? 'bg-green-50 hover:bg-green-100' : 'hover:bg-slate-50'}`}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className={`h-2.5 w-2.5 mt-1.5 rounded-full shrink-0 ${isRead ? 'bg-green-500' : 'bg-brand-orange'}`}></div>
                                        <div>
                                            <h4 className={`text-sm font-semibold leading-tight mb-1 ${isRead ? 'text-green-800' : 'text-slate-800'}`}>
                                                {event.title}
                                            </h4>
                                            <p className={`text-xs mb-1 line-clamp-2 ${isRead ? 'text-green-600' : 'text-slate-500'}`}>
                                                {event.description}
                                            </p>
                                            <div className="flex items-center gap-2 text-[10px] font-medium bg-white/50 inline-flex px-1.5 py-0.5 rounded text-slate-400">
                                                <span className="material-symbols-outlined text-[10px]">schedule</span>
                                                <span>{event.time.slice(0, 5)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
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
