
import React, { useState, useMemo } from 'react';
import { CalendarEvent } from '../types';

interface CalendarPageProps {
  events: CalendarEvent[];
  onAdd: (event: Omit<CalendarEvent, 'id' | 'created_by'>) => void;
  onRemove: (id: string) => void;
}

const CalendarPage: React.FC<CalendarPageProps> = ({ events, onAdd, onRemove }) => {
  const [showModal, setShowModal] = useState(false);
  const [viewDate, setViewDate] = useState(new Date());
  
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    time: '09:00'
  });

  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  const calendarData = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    // Dias vazios do mês anterior
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(null);
    }
    // Dias do mês atual
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    return days;
  }, [viewDate]);

  const changeMonth = (offset: number) => {
    setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEvent.title || !newEvent.date) return;
    onAdd(newEvent);
    setNewEvent({ 
      title: '', 
      description: '', 
      date: new Date().toISOString().split('T')[0], 
      time: '09:00' 
    });
    setShowModal(false);
  };

  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.time}`);
      const dateB = new Date(`${b.date}T${b.time}`);
      return dateA.getTime() - dateB.getTime();
    });
  }, [events]);

  return (
    <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-8">
      {/* Grid do Calendário */}
      <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col min-h-[600px]">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h2 className="text-xl font-bold text-slate-800">
            {monthNames[viewDate.getMonth()]} <span className="text-primary">{viewDate.getFullYear()}</span>
          </h2>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => changeMonth(-1)}
              className="size-10 flex items-center justify-center bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-primary transition-all shadow-sm group"
              aria-label="Mês Anterior"
            >
              <span className="material-symbols-outlined text-xl text-slate-600 group-hover:text-primary">chevron_left</span>
            </button>
            <button 
              onClick={() => setViewDate(new Date())}
              className="px-4 py-2 text-xs font-bold text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors"
            >
              Hoje
            </button>
            <button 
              onClick={() => changeMonth(1)}
              className="size-10 flex items-center justify-center bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-primary transition-all shadow-sm group"
              aria-label="Próximo Mês"
            >
              <span className="material-symbols-outlined text-xl text-slate-600 group-hover:text-primary">chevron_right</span>
            </button>
          </div>
        </div>
        
        <div className="flex-1 grid grid-cols-7 border-l border-t border-slate-100">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
            <div key={day} className="py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center border-b border-r border-slate-100 bg-slate-50/30">
              {day}
            </div>
          ))}
          
          {calendarData.map((dayNum, i) => {
            const isToday = dayNum === new Date().getDate() && 
                            viewDate.getMonth() === new Date().getMonth() && 
                            viewDate.getFullYear() === new Date().getFullYear();
            
            const dayString = dayNum ? `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}` : null;
            
            const dayEvents = dayString ? events.filter(e => e.date === dayString) : [];

            return (
              <div 
                key={i} 
                className={`min-h-[100px] border-r border-b border-slate-100 p-2 text-left relative group transition-colors ${
                  !dayNum ? 'bg-slate-50/30' : 'hover:bg-slate-50/80 cursor-default'
                } ${isToday ? 'bg-primary/5' : ''}`}
              >
                {dayNum && (
                  <>
                    <span className={`text-sm font-bold ${isToday ? 'text-primary' : 'text-slate-400'}`}>
                      {dayNum}
                    </span>
                    <div className="mt-1 space-y-1 max-h-[100px] overflow-y-auto scrollbar-hide">
                      {dayEvents.map(e => (
                        <div 
                          key={e.id} 
                          className="bg-primary text-white text-[9px] px-1.5 py-1 rounded-md truncate font-bold shadow-sm flex items-center gap-1"
                          title={`${e.time} - ${e.title}`}
                        >
                          <span className="opacity-75">{e.time}</span>
                          <span className="truncate">{e.title}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Sidebar de Eventos */}
      <div className="w-full lg:w-80 flex flex-col gap-6">
        <button 
          onClick={() => setShowModal(true)}
          className="w-full bg-brand-orange hover:bg-orange-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-brand-orange/20 flex items-center justify-center gap-2 transition-all active:scale-95"
        >
          <span className="material-symbols-outlined">add_circle</span>
          Adicionar Evento
        </button>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-100 font-bold text-slate-800 bg-slate-50/50 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">event_upcoming</span>
            Próximos Compromissos
          </div>
          <div className="p-4 space-y-3 max-h-[500px] overflow-y-auto">
            {sortedEvents.length === 0 ? (
              <div className="text-center py-10">
                <span className="material-symbols-outlined text-slate-200 text-5xl mb-2">calendar_today</span>
                <p className="text-xs text-slate-400 font-medium">Nenhum evento agendado</p>
              </div>
            ) : (
              sortedEvents.map(event => (
                <div key={event.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 group relative hover:border-primary/30 transition-all">
                  <button 
                    onClick={() => onRemove(event.id)}
                    className="absolute top-2 right-2 size-6 bg-white text-slate-400 hover:text-red-500 rounded-full flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition-all border border-slate-100"
                  >
                    <span className="material-symbols-outlined text-[14px]">delete</span>
                  </button>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">{event.date}</span>
                    <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[12px]">schedule</span>
                      {event.time}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-800 leading-tight">{event.title}</h4>
                  {event.description && <p className="text-xs text-slate-500 mt-2 line-clamp-2">{event.description}</p>}
                  <div className="mt-3 pt-3 border-t border-slate-200/60 flex items-center gap-2">
                    <div className="size-5 rounded-full bg-slate-300 flex-shrink-0"></div>
                    <span className="text-[9px] text-slate-400 font-medium truncate">Por: {event.created_by}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Modal de Criação */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-in zoom-in duration-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">edit_calendar</span>
                Novo Evento
              </h3>
              <button 
                onClick={() => setShowModal(false)} 
                className="size-8 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-full transition-all"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Título do Evento</label>
                <input 
                  required
                  autoFocus
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-slate-400"
                  value={newEvent.title}
                  onChange={e => setNewEvent({...newEvent, title: e.target.value})}
                  placeholder="Ex: Reunião com Cliente Stellar"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Data</label>
                  <input 
                    required
                    type="date"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                    value={newEvent.date}
                    onChange={e => setNewEvent({...newEvent, date: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Horário</label>
                  <input 
                    required
                    type="time"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                    value={newEvent.time}
                    onChange={e => setNewEvent({...newEvent, time: e.target.value})}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Descrição (Opcional)</label>
                <textarea 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all h-24 resize-none placeholder:text-slate-400"
                  value={newEvent.description}
                  onChange={e => setNewEvent({...newEvent, description: e.target.value})}
                  placeholder="Detalhes adicionais sobre o compromisso..."
                />
              </div>
              <div className="pt-2 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all active:scale-95"
                >
                  Confirmar Agendamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarPage;
