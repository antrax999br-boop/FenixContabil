
import React, { useState, useEffect, useRef } from 'react';
import {
  User, Client, Invoice, Payable, CalendarEvent, AppState,
  UserProfile, InvoiceStatus, DailyPayment, CreditCardExpense, CreditCardPayment
} from './types';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ClientsPage from './pages/Clients';
import InvoicesPage from './pages/Invoices';
import PayablesPage from './pages/Payables';
import CalendarPage from './pages/Calendar';
import SettingsPage from './pages/Settings';
import ReportsPage from './pages/Reports';
import DailyPaymentsPage from './pages/DailyPayments';
import CreditCardExpensesPage from './pages/CreditCardExpenses';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import ChatWidget from './components/ChatWidget';
import NotificationsDropdown from './components/NotificationsDropdown';
import ProfileModal from './components/ProfileModal';
import { calculateInvoiceStatusAndValues } from './utils/calculations';
import { supabase } from './utils/supabase';
import { playRobustAlarm, stopRobustAlarm } from './utils/alarm';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    currentUser: null,
    users: [],
    clients: [],
    invoices: [],
    payables: [],
    dailyPayments: [],
    creditCardExpenses: [],
    creditCardPayments: [],
    events: [],
    loading: true
  });

  const [activeTab, setActiveTab] = useState('inicio');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [hasNewChatMessage, setHasNewChatMessage] = useState(false);

  // Auth & Data Fetching
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchData(session.user.id);
      } else {
        setState(prev => ({ ...prev, loading: false }));
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        // Avoid showing loading screen on token refresh, updates, or returning to tab
        const isSilent = event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED' || event === 'SIGNED_IN';
        if (event !== 'SIGNED_OUT') {
          fetchData(session.user.id, isSilent);
        }
      } else if (event === 'SIGNED_OUT') {
        setState(prev => ({
          ...prev,
          currentUser: null,
          users: [], clients: [], invoices: [], payables: [], dailyPayments: [], events: [],
          creditCardExpenses: [], creditCardPayments: [],
          loading: false
        }));
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchData = async (userId: string, silent = false) => {
    if (!silent) setState(prev => ({ ...prev, loading: true }));
    try {
      // Fetch Profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      // Fetch App Data
      const [clientsRes, invoicesRes, eventsRes, payablesRes, dailyPaymentsRes, creditCardExpensesRes, creditCardPaymentsRes] = await Promise.all([
        supabase.from('clients').select('*'),
        supabase.from('invoices').select('*'),
        supabase.from('calendar_events').select('id, title, description, event_date, event_time, created_by, profiles(name)'),
        supabase.from('payables').select('*'),
        supabase.from('daily_payments').select('*').order('date', { ascending: false }),
        supabase.from('credit_card_expenses').select('*').order('purchase_date', { ascending: false }),
        supabase.from('credit_card_payments').select('*')
      ]);

      if (profile) {
        let invoices = (invoicesRes.data || []) as Invoice[];
        const clients = (clientsRes.data || []) as Client[];

        // Handle Payables with Fallback
        let payables: Payable[] = [];
        if (payablesRes.error) {
          console.warn('Payables table not found in Supabase, using localStorage:', payablesRes.error);
          const localPayables = localStorage.getItem('fenix_payables');
          payables = localPayables ? JSON.parse(localPayables) : [];
        } else {
          payables = (payablesRes.data || []) as Payable[];
        }

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

        // Auto-update status for payables
        const today = new Date().toISOString().split('T')[0];
        payables = payables.map(p => {
          if (p.status !== InvoiceStatus.PAID && p.due_date < today) {
            return { ...p, status: InvoiceStatus.OVERDUE };
          }
          return p;
        });

        const creditCardExpenses = (creditCardExpensesRes.data || []) as CreditCardExpense[];
        const creditCardPayments = (creditCardPaymentsRes.data || []) as CreditCardPayment[];

        setState(prev => ({
          ...prev,
          currentUser: profile as User,
          clients: clients,
          invoices: invoices,
          payables: payables,
          dailyPayments: (dailyPaymentsRes.data || []) as DailyPayment[],
          creditCardExpenses,
          creditCardPayments,
          events: events,
          loading: false
        }));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setState(prev => ({ ...prev, loading: false }));
    }
  };

  // Periodic Update for Multi-User Sync (Shared Ledger)
  useEffect(() => {
    if (!state.currentUser) return;

    // Call DB function to update backend statuses
    const updateBackendStatuses = async () => {
      await supabase.rpc('update_invoice_statuses');
    };

    updateBackendStatuses();

    const interval = setInterval(() => {
      // 1. Update statuses on server
      updateBackendStatuses();

      // 2. Sync Shared Data (Hunter <-> Laercio)
      if (state.currentUser) {
        fetchData(state.currentUser.id, true);
      }
    }, 45000); // Sync every 45 seconds

    return () => clearInterval(interval);
  }, [state.currentUser]); // Re-run when user logs in

  // Realtime Chat Notifications
  useEffect(() => {
    if (!state.currentUser) return;

    const channel = supabase
      .channel(`global-chat-notifications:${state.currentUser.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `receiver_id=eq.${state.currentUser.id}`
      }, (payload) => {
        // Only show notification if chat is not open OR if it is open but not in the chat with this person
        // For simplicity, we'll just trigger it if showChat is false
        if (!showChat) {
          setHasNewChatMessage(true);
          // Play notification sound
          const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3');
          audio.play().catch(e => console.log('Audio blocked', e));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [state.currentUser, showChat]);

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

  const updateClient = async (client: Client) => {
    const { error } = await supabase
      .from('clients')
      .update({
        name: client.name,
        cnpj: client.cnpj,
        interest_percent: client.interest_percent,
        observations: client.observations
      })
      .eq('id', client.id);

    if (!error) {
      setState(prev => ({
        ...prev,
        clients: prev.clients.map(c => c.id === client.id ? client : c)
      }));
    } else {
      console.error(error);
      alert('Erro ao atualizar cliente: ' + error.message);
    }
  };

  const deleteClient = async (id: string) => {
    if (!confirm('Tem certeza? Isso apagará todas as notas associadas.')) return;

    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', id);

    if (!error) {
      setState(prev => ({
        ...prev,
        clients: prev.clients.filter(c => c.id !== id)
      }));
    } else {
      console.error(error);
      alert('Erro ao excluir cliente: ' + error.message);
    }
  };

  const addInvoice = async (invoiceData: Omit<Invoice, 'id' | 'status' | 'days_overdue' | 'final_value'> & { individual_name?: string }) => {
    // Initial calculation for insertion
    const client = state.clients.find(c => c.id === invoiceData.client_id);

    // If no client, we use default values for status/value (no interest)
    const tempInv = {
      ...invoiceData,
      id: 'temp',
      status: InvoiceStatus.NOT_PAID,
      days_overdue: 0,
      final_value: invoiceData.original_value
    };

    const calculated = client
      ? calculateInvoiceStatusAndValues(tempInv, client)
      : tempInv;

    const { data, error } = await supabase
      .from('invoices')
      .insert([{
        client_id: invoiceData.client_id || null,
        invoice_number: invoiceData.invoice_number,
        original_value: invoiceData.original_value,
        due_date: invoiceData.due_date,
        status: calculated.status,
        days_overdue: calculated.days_overdue,
        final_value: calculated.final_value,
        individual_name: invoiceData.individual_name
      }])
      .select()
      .single();

    if (data && !error) {
      setState(prev => ({ ...prev, invoices: [...prev.invoices, data] }));
    } else if (error) {
      console.error(error);
      alert('Erro ao adicionar boleto: ' + error.message);
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
  // Persist read notifications
  const [readNotifications, setReadNotifications] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem('fenix_read_notifications');
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  useEffect(() => {
    localStorage.setItem('fenix_read_notifications', JSON.stringify(Array.from(readNotifications)));
  }, [readNotifications]);

  const markNotificationRead = (id: string) => {
    setReadNotifications(prev => {
      const newSet = new Set(prev);
      newSet.add(id);
      return newSet;
    });
  };

  const dismissAlarm = () => {
    stopRobustAlarm();
    setActiveAlarm(null);
  };

  const [notifiedEvents, setNotifiedEvents] = useState<Set<string>>(new Set());

  // Event Reminder Check
  useEffect(() => {
    const checkReminders = () => {
      const now = new Date();
      const currentDate = now.toLocaleDateString('en-CA');
      const currentTime = now.toTimeString().slice(0, 5); // HH:MM

      // Log para auxílio no debug (pode ser removido após verificação)
      // console.log(`Checando alarmes: ${currentDate} ${currentTime}`);

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
            const savedVolume = localStorage.getItem('fenix_alarm_volume');
            const volume = savedVolume ? parseFloat(savedVolume) : 0.5;
            playRobustAlarm(volume);

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

  const addPayable = async (payableData: Omit<Payable, 'id' | 'status'>) => {
    const newP: Payable = {
      ...payableData,
      id: crypto.randomUUID(),
      status: payableData.due_date < new Date().toISOString().split('T')[0] ? InvoiceStatus.OVERDUE : InvoiceStatus.NOT_PAID,
      created_at: new Date().toISOString()
    };

    // Try Supabase first
    const { error } = await supabase.from('payables').insert([newP]);

    if (error) {
      console.warn('Failed to save payable to Supabase, saving to localStorage:', error);
      const updated = [...state.payables, newP];
      localStorage.setItem('fenix_payables', JSON.stringify(updated));
      setState(prev => ({ ...prev, payables: updated }));
    } else {
      setState(prev => ({ ...prev, payables: [...prev.payables, newP] }));
    }
  };

  const markPayablePaid = async (id: string) => {
    const today = new Date().toISOString().split('T')[0];
    const { error } = await supabase
      .from('payables')
      .update({ status: InvoiceStatus.PAID, payment_date: today })
      .eq('id', id);

    if (error) {
      console.warn('Failed to update payable in Supabase, updating localStorage');
      const updated = state.payables.map(p =>
        p.id === id ? { ...p, status: InvoiceStatus.PAID, payment_date: today } : p
      );
      localStorage.setItem('fenix_payables', JSON.stringify(updated));
      setState(prev => ({ ...prev, payables: updated }));
    } else {
      setState(prev => ({
        ...prev,
        payables: prev.payables.map(p => p.id === id ? { ...p, status: InvoiceStatus.PAID, payment_date: today } : p)
      }));
    }
  };

  const deletePayable = async (id: string) => {
    const { error } = await supabase.from('payables').delete().eq('id', id);
    if (error) {
      console.warn('Failed to delete payable from Supabase, removing from localStorage');
    }
    const updated = state.payables.filter(p => p.id !== id);
    localStorage.setItem('fenix_payables', JSON.stringify(updated));
    setState(prev => ({ ...prev, payables: updated }));
  };

  const updatePayable = async (payable: Payable) => {
    const { id, created_at, ...updateData } = payable;

    // Auto-status update logic
    const today = new Date().toISOString().split('T')[0];
    if (updateData.status !== InvoiceStatus.PAID) {
      updateData.status = updateData.due_date < today ? InvoiceStatus.OVERDUE : InvoiceStatus.NOT_PAID;
    }

    const { error } = await supabase
      .from('payables')
      .update(updateData)
      .eq('id', id);

    if (error) {
      console.warn('Failed to update payable in Supabase, updating localStorage');
      const updated = state.payables.map(p => p.id === id ? payable : p);
      localStorage.setItem('fenix_payables', JSON.stringify(updated));
      setState(prev => ({ ...prev, payables: updated }));
    } else {
      setState(prev => ({
        ...prev,
        payables: prev.payables.map(p => p.id === id ? { ...payable, status: updateData.status } : p)
      }));
    }
  };

  const addDailyPayment = async (payment: Omit<DailyPayment, 'id' | 'created_at'>) => {
    const { data, error } = await supabase
      .from('daily_payments')
      .insert([payment])
      .select()
      .single();

    if (data && !error) {
      setState(prev => ({ ...prev, dailyPayments: [data, ...prev.dailyPayments] }));
    } else {
      console.error(error);
      alert('Erro ao adicionar lançamento diário.');
    }
  };

  const deleteDailyPayment = async (id: string) => {
    const { error } = await supabase.from('daily_payments').delete().eq('id', id);
    if (!error) {
      setState(prev => ({
        ...prev,
        dailyPayments: prev.dailyPayments.filter(p => p.id !== id)
      }));
    } else {
      console.error(error);
      alert('Erro ao excluir lançamento diário.');
    }
  };

  const updateDailyPayment = async (payment: DailyPayment) => {
    // We send the whole object except internal supabase fields if necessary, 
    // but supabase.update() with the object is fine.
    const { id, created_at, ...updateData } = payment;
    const { error } = await supabase
      .from('daily_payments')
      .update(updateData)
      .eq('id', id);

    if (!error) {
      setState(prev => ({
        ...prev,
        dailyPayments: prev.dailyPayments.map(p => p.id === payment.id ? payment : p)
      }));
    } else {
      console.error(error);
      alert('Erro ao atualizar lançamento diário.');
    }
  };

  const addCreditCardExpense = async (expense: Omit<CreditCardExpense, 'id' | 'created_at'>) => {
    const { data, error } = await supabase.from('credit_card_expenses').insert([expense]).select().single();
    if (data && !error) {
      setState(prev => ({ ...prev, creditCardExpenses: [data, ...prev.creditCardExpenses] }));
    } else {
      console.error(error);
      alert('Erro ao adicionar compra no cartão.');
    }
  };

  const updateCreditCardExpense = async (expense: CreditCardExpense) => {
    const { id, created_at, ...updateData } = expense;
    const { error } = await supabase.from('credit_card_expenses').update(updateData).eq('id', id);
    if (!error) {
      setState(prev => ({
        ...prev,
        creditCardExpenses: prev.creditCardExpenses.map(e => e.id === id ? expense : e)
      }));
    } else {
      console.error(error);
      alert('Erro ao atualizar compra.');
    }
  };

  const deleteCreditCardExpense = async (id: string) => {
    const { error } = await supabase.from('credit_card_expenses').delete().eq('id', id);
    if (!error) {
      setState(prev => ({
        ...prev,
        creditCardExpenses: prev.creditCardExpenses.filter(e => e.id !== id)
      }));
    } else {
      console.error(error);
      alert('Erro ao excluir compra.');
    }
  };

  const toggleCreditCardPayment = async (yearMonth: string, card: string, isPaid: boolean) => {
    const existing = state.creditCardPayments.find(p => p.year_month === yearMonth && p.card === card);
    if (existing) {
      const { error } = await supabase.from('credit_card_payments').update({ is_paid: isPaid }).eq('id', existing.id);
      if (!error) {
        setState(prev => ({
          ...prev,
          creditCardPayments: prev.creditCardPayments.map(p => p.id === existing.id ? { ...p, is_paid: isPaid } : p)
        }));
      }
    } else {
      const { data, error } = await supabase.from('credit_card_payments').insert([{ year_month: yearMonth, card, is_paid: isPaid }]).select().single();
      if (data && !error) {
        setState(prev => ({ ...prev, creditCardPayments: [...prev.creditCardPayments, data] }));
      }
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
      case 'clientes': return <ClientsPage clients={state.clients} onAdd={addClient} onUpdate={updateClient} onDelete={deleteClient} />;
      case 'notas': return <InvoicesPage key={activeTab} state={state} onAdd={addInvoice} onPay={markInvoicePaid} onDelete={deleteInvoice} />;
      case 'notas-ativas': return <InvoicesPage key={activeTab} state={state} onAdd={addInvoice} onPay={markInvoicePaid} onDelete={deleteInvoice} initialFilter="ATIVOS" />;
      case 'notas-sem-nota': return <InvoicesPage key={activeTab} state={state} onAdd={addInvoice} onPay={markInvoicePaid} onDelete={deleteInvoice} initialFilter="SEM_NOTA" />;
      case 'notas-internet': return <InvoicesPage key={activeTab} state={state} onAdd={addInvoice} onPay={markInvoicePaid} onDelete={deleteInvoice} initialFilter="INTERNET" />;
      case 'contas-pagar': return <PayablesPage state={state} onAdd={addPayable} onPay={markPayablePaid} onUpdate={updatePayable} onDelete={deletePayable} />;
      case 'pagamentos-diarios': return <DailyPaymentsPage dailyPayments={state.dailyPayments} onAdd={addDailyPayment} onUpdate={updateDailyPayment} onDelete={deleteDailyPayment} />;
      case 'controle_cartao':
        return <CreditCardExpensesPage
          expenses={state.creditCardExpenses}
          payments={state.creditCardPayments}
          onAddExpense={addCreditCardExpense}
          onUpdateExpense={updateCreditCardExpense}
          onDeleteExpense={deleteCreditCardExpense}
          onTogglePayment={toggleCreditCardPayment}
        />;
      case 'relatorios': return <ReportsPage state={state} />;
      case 'calendario':
        return <CalendarPage
          events={state.events}
          onAdd={addEvent}
          onRemove={removeEvent}
        />;
      case 'configuracoes':
        return <SettingsPage currentUser={state.currentUser!} />; // We know user exists here
      default:
        return <Dashboard
          user={state.currentUser!}
          clients={state.clients}
          invoices={state.invoices}
          previousInvoices={[]} // TODO
        />;
    }
  };

  // Calculate Unread Notifications
  const todayStr = new Date().toLocaleDateString('en-CA');
  const hasUnread = state.events.some(e => e.date === todayStr && !readNotifications.has(e.id));

  return (
    <div className="flex h-screen overflow-hidden bg-background-light">
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        currentUserEmail={state.currentUser?.email}
      />
      <div className="flex flex-col flex-1 min-w-0">
        <Header
          user={state.currentUser}
          onNotificationsClick={() => setShowNotifications(!showNotifications)}
          onChatClick={() => {
            setShowChat(!showChat);
            setHasNewChatMessage(false);
          }}
          onProfileClick={() => setShowProfile(true)}
          onSettingsClick={() => setActiveTab('configuracoes')}
          onLogout={logout}
          hasUnreadNotifications={hasUnread || hasNewChatMessage}
        />
        {showNotifications && (
          <div className="fixed top-16 right-24 z-50">
            <NotificationsDropdown
              events={state.events}
              onClose={() => setShowNotifications(false)}
              readNotifications={readNotifications}
              onMarkRead={markNotificationRead}
            />
          </div>
        )}
        <main className="flex-1 overflow-y-auto p-4 sm:p-8">
          {renderContent()}
        </main>
      </div>

      {showChat && (
        <ChatWidget
          currentUser={state.currentUser}
          onClose={() => setShowChat(false)}
        />
      )}

      {showProfile && state.currentUser && (
        <ProfileModal
          user={state.currentUser}
          onClose={() => setShowProfile(false)}
          onUpdate={() => fetchData(state.currentUser!.id)}
        />
      )}

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
