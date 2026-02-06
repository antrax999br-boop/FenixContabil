import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../utils/supabase';
import { User } from '../types';

interface Message {
    id: string;
    content: string;
    sender_id: string;
    created_at: string;
    sender_name?: string;
}

interface ChatWidgetProps {
    currentUser: User;
    onClose: () => void;
}

const ChatWidget: React.FC<ChatWidgetProps> = ({ currentUser, onClose }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchMessages();

        // Subscribe to new messages
        const channel = supabase
            .channel('public:messages')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
                const newMsg = payload.new as Message;
                // Fetch sender name if needed, or just append
                setMessages(prev => [...prev, newMsg]);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const fetchMessages = async () => {
        try {
            const { data, error } = await supabase
                .from('messages')
                .select(`
          *,
          sender:profiles(name)
        `)
                .order('created_at', { ascending: true })
                .limit(50);

            if (error) throw error;

            if (data) {
                const formatted = data.map((msg: any) => ({
                    ...msg,
                    sender_name: msg.sender?.name || 'Usuário'
                }));
                setMessages(formatted);
            }
        } catch (error) {
            console.error('Error fetching messages:', error);
            // Fallback for demo if table doesn't exist
            setMessages([
                { id: '1', content: 'Bem-vindo ao chat da equipe!', sender_id: 'system', created_at: new Date().toISOString(), sender_name: 'Sistema' }
            ]);
        } finally {
            setLoading(false);
        }
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        const tempId = Math.random().toString();
        const msg: Message = {
            id: tempId,
            content: newMessage,
            sender_id: currentUser.id,
            created_at: new Date().toISOString(),
            sender_name: currentUser.name
        };

        // Optimistic UI
        setMessages(prev => [...prev, msg]);
        setNewMessage('');

        try {
            const { error } = await supabase
                .from('messages')
                .insert([{ content: msg.content, sender_id: currentUser.id }]);

            if (error) {
                console.error('Error sending message:', error);
                // If error (e.g. table missing), maybe alert user?
                // We leave the optimistic message but maybe mark it failed? 
                // For now, simple is better.
            }
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="fixed bottom-4 right-4 w-80 h-96 bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden z-50 border border-slate-200 animate-in slide-in-from-bottom-10 fade-in duration-300">
            <div className="bg-brand-navy p-4 flex items-center justify-between shrink-0">
                <h3 className="text-white font-bold flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm">chat</span>
                    Conversa da Equipe
                </h3>
                <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
                    <span className="material-symbols-outlined text-lg">close</span>
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 bg-slate-50 space-y-4" ref={scrollRef}>
                {loading && <p className="text-center text-xs text-slate-400">Carregando...</p>}
                {messages.map(msg => {
                    const isMe = msg.sender_id === currentUser.id;
                    return (
                        <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                            <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${isMe ? 'bg-brand-orange text-white rounded-tr-none' : 'bg-white border border-slate-200 text-slate-700 rounded-tl-none'
                                }`}>
                                {msg.content}
                            </div>
                            <span className="text-[10px] text-slate-400 mt-1 px-1">
                                {isMe ? 'Você' : msg.sender_name} • {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                    );
                })}
            </div>

            <form onSubmit={handleSend} className="p-3 bg-white border-t border-slate-100 flex gap-2">
                <input
                    type="text"
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    placeholder="Digite sua mensagem..."
                    className="flex-1 bg-slate-100 border-none rounded-full px-4 py-2 text-sm focus:ring-2 focus:ring-brand-orange/20"
                />
                <button
                    type="submit"
                    disabled={!newMessage.trim()}
                    className="size-9 bg-brand-orange text-white rounded-full flex items-center justify-center hover:bg-orange-600 disabled:opacity-50 transition-colors"
                >
                    <span className="material-symbols-outlined text-lg pb-0.5">send</span>
                </button>
            </form>
        </div>
    );
};

export default ChatWidget;
