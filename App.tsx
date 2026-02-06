
import React, { useState, useEffect, useRef } from 'react';
import {
  User, Client, Invoice, CalendarEvent, AppState,
  UserProfile, InvoiceStatus
} from './types';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ClientsPage from './pages/Clients';
import InvoicesPage from './pages/Invoices';
import CalendarPage from './pages/Calendar';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import { calculateInvoiceStatusAndValues } from './utils/calculations';
import { supabase } from './utils/supabase';
import { playRobustAlarm, stopRobustAlarm } from './utils/alarm';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    currentUser: null,
    users: [],
    clients: [],
    invoices: [],
    events: [],
    loading: true
  });

  const [activeTab, setActiveTab] = useState('inicio');

  // Auth & Data Fetching
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchData(session.user.id);
      } else {
        setState(prev => ({ ...prev, loading: false }));
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        fetchData(session.user.id);
      } else {
        setState(prev => ({
          ...prev,
          currentUser: null,
          users: [], clients: [], invoices: [], events: [],
          loading: false
        }));
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchData = async (userId: string) => {
    setState(prev => ({ ...prev, loading: true }));
    try {
      // Fetch Profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      // Fetch App Data
      const [clientsRes, invoicesRes, eventsRes] = await Promise.all([
        supabase.from('clients').select('*'),
        supabase.from('invoices').select('*'),
        supabase.from('calendar_events').select('id, title, description, event_date, event_time, created_by, profiles(name)')
      ]);

      if (profile) {
        let invoices = (invoicesRes.data || []) as Invoice[];
        const clients = (clientsRes.data || []) as Client[];

        // Calculate current status for invoices
        invoices = invoices.map(inv => {
          const client = clients.find(c => c.id === inv.client_id);
          return client ? calculateInvoiceStatusAndValues(inv, client) : inv;
        });

        const events = (eventsRes.data || []).map((e: any) => ({
          id: e.id,
          title: e.title,
          description: e.description,
          date: e.event_date,
          time: e.event_time,
          created_by: e.profiles?.name || 'Unknown'
        }));

        setState(prev => ({
          ...prev,
          currentUser: profile as User,
          clients: clients,
          invoices: invoices,
          events: events,
          loading: false
        }));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setState(prev => ({ ...prev, loading: false }));
    }
  };

  // Periodic Update for Invoice Statuses
  useEffect(() => {
    if (!state.currentUser) return;

    // Call DB function to update statuses on load/interval
    const updateBackendStatuses = async () => {
      await supabase.rpc('update_invoice_statuses');
      // Refetch strictly invoices if needed, or just rely on local calc for now
    };

    updateBackendStatuses();

    const interval = setInterval(() => {
      updateBackendStatuses();
      // Re-calculate locally for immediate UI update
      setState(prev => {
        const updatedInvoices = prev.invoices.map(inv => {
          const client = prev.clients.find(c => c.id === inv.client_id);
          if (!client) return inv;
          return calculateInvoiceStatusAndValues(inv, client);
        });
        if (JSON.stringify(updatedInvoices) === JSON.stringify(prev.invoices)) return prev;
        return { ...prev, invoices: updatedInvoices };
      });
    }, 60000);

    return () => clearInterval(interval);
  }, [state.currentUser]); // Re-run when user logs in

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    if (error) alert(error.message);
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  const addClient = async (clientData: Omit<Client, 'id'>) => {
    const { data, error } = await supabase
      .from('clients')
      .insert([{ ...clientData }])
      .select()
      .single();

    if (data && !error) {
      setState(prev => ({ ...prev, clients: [...prev.clients, data] }));
    } else if (error) {
      console.error(error);
      alert('Erro ao adicionar cliente');
    }
  };

  const addInvoice = async (invoiceData: Omit<Invoice, 'id' | 'status' | 'days_overdue' | 'final_value'>) => {
    // Initial calculation for insertion
    const client = state.clients.find(c => c.id === invoiceData.client_id);
    if (!client) return;

    // We can insert just the basics and let the DB defaults handle status, 
    // or calculate explicitly.
    // The DB has defaults, but let's be explicit to match local logic.
    const tempInv = {
      ...invoiceData,
      id: 'temp',
      status: InvoiceStatus.NOT_PAID,
      days_overdue: 0,
      final_value: invoiceData.original_value
    };
    const calculated = calculateInvoiceStatusAndValues(tempInv, client);

    const { data, error } = await supabase
      .from('invoices')
      .insert([{
        client_id: invoiceData.client_id,
        invoice_number: invoiceData.invoice_number,
        original_value: invoiceData.original_value,
        due_date: invoiceData.due_date,
        status: calculated.status,
        days_overdue: calculated.days_overdue,
        final_value: calculated.final_value
      }])
      .select()
      .single();

    if (data && !error) {
      setState(prev => ({ ...prev, invoices: [...prev.invoices, data] }));
    }
  };

  const markInvoicePaid = async (id: string) => {
    const { data, error } = await supabase
      .from('invoices')
      .update({ status: InvoiceStatus.PAID, payment_date: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (data && !error) {
      setState(prev => ({
        ...prev,
        invoices: prev.invoices.map(inv => inv.id === id ? data : inv)
      }));
    }
  };

  const deleteInvoice = async (id: string) => {
    const { error } = await supabase
      .from('invoices')
      .delete()
      .eq('id', id);

    if (!error) {
      setState(prev => ({
        ...prev,
        invoices: prev.invoices.filter(inv => inv.id !== id)
      }));
    }
  };



  /* Alarm Logic */
  const [activeAlarm, setActiveAlarm] = useState<CalendarEvent | null>(null);

  const dismissAlarm = () => {
    stopRobustAlarm();
    setActiveAlarm(null);
  };

  const [notifiedEvents, setNotifiedEvents] = useState<Set<string>>(new Set());

  // Event Reminder Check
  useEffect(() => {
    const checkReminders = () => {
      const now = new Date();
      const currentDate = now.toISOString().split('T')[0];
      const currentTime = now.toTimeString().slice(0, 5); // HH:MM

      state.events.forEach(event => {
        // Ensure event time is in HH:MM format for comparison
        const eventTimeShort = event.time.substring(0, 5);

        if (event.date === currentDate && eventTimeShort === currentTime) {
          if (!notifiedEvents.has(event.id)) {
            console.log('Alarme ativado para:', event.title);

            // Mark as notified immediately
            setNotifiedEvents(prev => new Set(prev).add(event.id));

            // Set Active Alarm to show Modal
            setActiveAlarm(event);

            // Play Robust Sound (Web Audio API)
            playRobustAlarm();

            // Browser Notification
            if (Notification.permission === 'granted') {
              new Notification(`ALARME: ${event.title}`, {
                body: event.description || `Horário: ${event.time}`,
                requireInteraction: true
              });
            }
          }
        }
      });
    };

    // Request notification permission on load
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }

    const interval = setInterval(checkReminders, 10000); // Check every 10 seconds
    return () => clearInterval(interval);
  }, [state.events, notifiedEvents]);

  const addEvent = async (eventData: Omit<CalendarEvent, 'id' | 'created_by'>) => {
    if (!state.currentUser) return;

    // Remove application-specific keys and map to DB
    const { date, time, title, description } = eventData;

    const { data, error } = await supabase
      .from('calendar_events')
      .insert([{
        title,
        description,
        event_date: date,
        event_time: time,
        created_by: state.currentUser.id
      }])
      .select()
      .single();

    if (data && !error) {
      const newEvent: CalendarEvent = {
        id: data.id,
        title: data.title,
        description: data.description,
        date: data.event_date,
        time: data.event_time,
        created_by: state.currentUser.name
      };
      setState(prev => ({ ...prev, events: [...prev.events, newEvent] }));
    } else if (error) {
      console.error(error);
      alert('Erro ao criar evento: ' + error.message);
    }
  };

  const removeEvent = async (id: string) => {
    const { error } = await supabase
      .from('calendar_events')
      .delete()
      .eq('id', id);

    if (!error) {
      setState(prev => ({
        ...prev,
        events: prev.events.filter(e => e.id !== id)
      }));
    }
  };

  if (state.loading) {
    return <div className="h-screen flex items-center justify-center bg-background-light text-primary">Carregando Sistema...</div>;
  }

  if (!state.currentUser) {
    return <Login onLogin={login} />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'inicio': return <Dashboard state={state} onTabChange={setActiveTab} />;
      case 'clientes': return <ClientsPage clients={state.clients} onAdd={addClient} />;
      case 'notas': return <InvoicesPage state={state} onAdd={addInvoice} onPay={markInvoicePaid} onDelete={deleteInvoice} />;
      case 'calendario': return <CalendarPage events={state.events} onAdd={addEvent} onRemove={removeEvent} />;
      default: return <Dashboard state={state} onTabChange={setActiveTab} />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background-light">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} onLogout={logout} />
      <div className="flex flex-col flex-1 min-w-0">
        <Header user={state.currentUser} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-8">
          {renderContent()}
        </main>
      </div>

      {/* TELA DE ALARME / MODAL */}
      {activeAlarm && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-8 text-center relative overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col items-center">

            <div className="mb-6 relative">
              <div className="h-20 w-20 bg-orange-100 rounded-full flex items-center justify-center relative">
                <span className="material-symbols-outlined text-4xl text-brand-orange">notifications_active</span>
                <span className="absolute top-1 right-1 h-3 w-3 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>
              </div>
            </div>

            <h2 className="text-2xl font-black text-slate-800 mb-2 uppercase tracking-tight">{activeAlarm.title}</h2>
            <p className="text-slate-500 mb-8 font-medium text-sm px-4">{activeAlarm.description || 'Horário do evento chegou!'}</p>

            <button
              onClick={dismissAlarm}
              className="w-full bg-brand-orange hover:bg-orange-600 text-white font-bold py-3.5 px-6 rounded-xl shadow-lg shadow-brand-orange/30 transition-all hover:scale-[1.02] active:scale-95 text-base flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined">check_circle</span>
              ACEITAR
            </button>

            <div className="mt-6 flex items-center gap-1.5 text-slate-400 font-bold text-xs uppercase tracking-widest bg-slate-50 py-1.5 px-3 rounded-lg">
              <span className="material-symbols-outlined text-sm">schedule</span>
              {activeAlarm.time.substring(0, 5)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
