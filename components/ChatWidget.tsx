import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../utils/supabase';
import { User } from '../types';

interface Message {
    id: string;
    content: string;
    sender_id: string;
    receiver_id: string;
    created_at: string;
    sender_name?: string;
    file_url?: string;
    file_type?: string;
    file_name?: string;
}

interface ChatWidgetProps {
    currentUser: User;
    onClose: () => void;
}

const ChatWidget: React.FC<ChatWidgetProps> = ({ currentUser, onClose }) => {
    const [view, setView] = useState<'list' | 'chat'>('list');
    const [employees, setEmployees] = useState<User[]>([]);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [hasNewMessage, setHasNewMessage] = useState(false);

    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);

    // 1. Fetch Employees list on mount
    useEffect(() => {
        const fetchEmployees = async () => {
            setLoading(true);
            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .neq('id', currentUser.id); // Exclude self

                if (data && !error) {
                    // Basic mapping to User type (assuming profile structure matches somewhat)
                    const mappedUsers: User[] = data.map((p: any) => ({
                        id: p.id,
                        name: p.name,
                        email: p.email,
                        profile: p.role || 'usuario'
                    }));
                    setEmployees(mappedUsers);
                }
            } catch (error) {
                console.error('Error fetching employees:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchEmployees();
    }, [currentUser.id]);

    // 2. Fetch Messages when entering chat with a user
    useEffect(() => {
        if (view === 'chat' && selectedUser) {
            setLoading(true);
            fetchMessages(selectedUser.id);

            // Realtime subscription
            const channel = supabase
                .channel(`chat:${currentUser.id}-${selectedUser.id}`)
                .on('postgres_changes', {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `receiver_id=eq.${currentUser.id}`
                },
                    (payload) => {
                        const newMsg = payload.new as Message;
                        // Check if this message is from the user we are currently chatting with
                        if (newMsg.sender_id === selectedUser.id) {
                            setMessages(prev => [...prev, newMsg]);
                        } else {
                            // Message from someone else - show notification
                            setHasNewMessage(true);
                            // Simple beep notification
                            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3');
                            audio.play().catch(e => console.log('Audio blocked', e));
                        }
                    }
                )
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        }
    }, [view, selectedUser, currentUser.id]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const fetchMessages = async (otherUserId: string) => {
        try {
            const { data, error } = await supabase
                .from('messages')
                .select('*')
                .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${currentUser.id})`)
                .order('created_at', { ascending: true })
                .limit(50);

            if (data && !error) {
                setMessages(data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleUserSelect = (user: User) => {
        setSelectedUser(user);
        setView('chat');
    };

    const handleBack = () => {
        setView('list');
        setSelectedUser(null);
        setMessages([]);
        setHasNewMessage(false); // Clear notification when going back to list
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0 || !selectedUser) return;

        const file = e.target.files[0];
        setUploading(true);

        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `${currentUser.id}/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('chat-uploads')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('chat-uploads')
                .getPublicUrl(filePath);

            await sendMessage(
                file.name, // Content fallback
                publicUrl,
                file.type.startsWith('image/') ? 'image' : 'file',
                file.name
            );

        } catch (error: any) {
            console.error("Error uploading:", error);
            alert('Erro ao enviar arquivo: ' + error.message);
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const sendMessage = async (content: string, fileUrl?: string, fileType?: string, fileName?: string) => {
        if (!selectedUser) return;

        const tempId = Math.random().toString();
        const msg: Message = {
            id: tempId,
            content,
            sender_id: currentUser.id,
            receiver_id: selectedUser.id,
            created_at: new Date().toISOString(),
            sender_name: currentUser.name,
            file_url: fileUrl,
            file_type: fileType,
            file_name: fileName
        };

        setMessages(prev => [...prev, msg]);
        setNewMessage('');

        try {
            const { error } = await supabase
                .from('messages')
                .insert([{
                    content: msg.content,
                    sender_id: currentUser.id,
                    receiver_id: selectedUser.id,
                    file_url: fileUrl,
                    file_type: fileType,
                    file_name: fileName
                }]);

            if (error) {
                console.error('Error sending message:', error);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleClearChat = async () => {
        if (!selectedUser || !confirm('Tem certeza que deseja apagar TODA a conversa com este usuário? Isso não pode ser desfeito.')) return;

        try {
            const { error } = await supabase
                .from('messages')
                .delete()
                .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${selectedUser.id}),and(sender_id.eq.${selectedUser.id},receiver_id.eq.${currentUser.id})`);

            if (error) throw error;

            setMessages([]);
            alert('Conversa apagada com sucesso.');
        } catch (error: any) {
            console.error('Error clearing chat:', error);
            alert('Erro ao apagar conversa. Verifique se você tem permissão.');
        }
    };

    const handleSend = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim()) return;
        sendMessage(newMessage);
    };

    const isAdminUser = currentUser.email === 'laercio@laercio.com.br';

    return (
        <div className="fixed bottom-4 right-4 w-80 h-96 bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden z-50 border border-slate-200 animate-in slide-in-from-bottom-10 fade-in duration-300">

            {/* HEADER */}
            <div className="bg-brand-navy p-4 shrink-0 flex items-center justify-between text-white">
                <div className="flex items-center gap-2">
                    {view === 'chat' && (
                        <button onClick={handleBack} className="hover:bg-white/10 rounded-full p-1 mr-1 transition-colors relative">
                            <span className="material-symbols-outlined text-base">arrow_back</span>
                            {hasNewMessage && (
                                <span className="absolute -top-1 -right-1 size-2 bg-red-500 rounded-full border border-white"></span>
                            )}
                        </button>
                    )}
                    <h3 className="font-bold text-sm tracking-wide">
                        {view === 'list' ? 'Equipe Fenix' : selectedUser?.name || 'Chat'}
                        {view === 'list' && hasNewMessage && <span className="ml-2 inline-block size-2 bg-red-500 rounded-full animate-pulse"></span>}
                    </h3>
                </div>
                <div className="flex items-center gap-1">
                    {view === 'chat' && isAdminUser && (
                        <button
                            onClick={handleClearChat}
                            className="text-white/70 hover:text-red-400 transition-colors flex p-1"
                            title="Apagar conversa (Restrito)"
                        >
                            <span className="material-symbols-outlined text-lg">delete</span>
                        </button>
                    )}
                    <button onClick={onClose} className="text-white/70 hover:text-white transition-colors flex p-1">
                        <span className="material-symbols-outlined text-lg">close</span>
                    </button>
                </div>
            </div>

            {/* CONTENT */}
            <div className="flex-1 overflow-y-auto bg-slate-50 relative">
                {loading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/50 z-10">
                        <span className="material-symbols-outlined animate-spin text-brand-orange">progress_activity</span>
                    </div>
                )}

                {view === 'list' ? (
                    /* USER LIST VIEW */
                    <div className="p-2 space-y-1">
                        {employees.length === 0 && !loading ? (
                            <div className="p-4 text-center text-slate-400 text-xs">
                                Nenhum outro funcionário encontrado.
                            </div>
                        ) : (
                            employees.map(user => (
                                <button
                                    key={user.id}
                                    onClick={() => handleUserSelect(user)}
                                    className="w-full flex items-center gap-3 p-3 bg-white hover:bg-slate-100 rounded-xl transition-all shadow-sm border border-slate-100 text-left group"
                                >
                                    <div className="h-10 w-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-bold bg-cover bg-center shrink-0 border border-slate-300"
                                        style={{ backgroundImage: `url('https://picsum.photos/seed/${user.id}/100/100')` }}>
                                        {!user.id && user.name.charAt(0)}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-bold text-slate-800 text-sm group-hover:text-brand-orange transition-colors truncate">{user.name}</p>
                                        <p className="text-[10px] text-slate-400 font-medium uppercase tracking-tight">{user.profile === 'admin' ? 'Administrador' : 'Funcionário'}</p>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                ) : (
                    /* CHAT VIEW */
                    <div className="p-4 space-y-4 min-h-full flex flex-col justify-end" ref={scrollRef}>
                        {messages.length === 0 && !loading && (
                            <p className="text-center text-xs text-slate-400 py-4">Inicie a conversa com {selectedUser?.name.split(' ')[0]}</p>
                        )}
                        {messages.map((msg, idx) => {
                            const isMe = msg.sender_id === currentUser.id;
                            return (
                                <div key={msg.id || idx} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                    <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-sm ${isMe
                                        ? 'bg-brand-orange text-white rounded-tr-none'
                                        : 'bg-white border border-slate-200 text-slate-700 rounded-tl-none'
                                        }`}>
                                        {/* FILE / IMAGE RENDERING */}
                                        {msg.file_url ? (
                                            <div className="flex flex-col gap-2">
                                                {msg.file_type === 'image' ? (
                                                    <div className="relative group cursor-pointer">
                                                        <img
                                                            src={msg.file_url}
                                                            alt="Anexo"
                                                            className="rounded-lg max-w-full max-h-48 object-cover border border-white/20"
                                                            onClick={() => window.open(msg.file_url, '_blank')}
                                                        />
                                                    </div>
                                                ) : (
                                                    <a href={msg.file_url} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-2 px-2 py-1 rounded bg-black/10 hover:bg-black/20 text-xs font-semibold break-all transition-colors ${isMe ? 'text-white' : 'text-slate-700'}`}>
                                                        <span className="material-symbols-outlined text-lg">description</span>
                                                        {msg.file_name || 'Arquivo'}
                                                        <span className="material-symbols-outlined text-base">download</span>
                                                    </a>
                                                )}
                                                <span className="text-[10px] opacity-75">{msg.content}</span>
                                            </div>
                                        ) : (
                                            <span>{msg.content}</span>
                                        )}
                                    </div>
                                    <span className="text-[9px] text-slate-400 mt-1 px-1 opacity-70">
                                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* FOOTER (INPUT) */}
            {view === 'chat' && (
                <form onSubmit={handleSend} className="p-3 bg-white border-t border-slate-100 flex gap-2 shrink-0 items-center">
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        onChange={handleFileSelect}
                    />
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-slate-400 hover:text-brand-orange transition-colors"
                        title="Anexar arquivo"
                        disabled={uploading}
                    >
                        <span className="material-symbols-outlined text-2xl">{uploading ? 'hourglass_empty' : 'attach_file'}</span>
                    </button>

                    <input
                        type="text"
                        value={newMessage}
                        onChange={e => setNewMessage(e.target.value)}
                        placeholder={uploading ? "Enviando arquivo..." : "Digite algo..."}
                        disabled={uploading}
                        className="flex-1 bg-slate-100 border-none rounded-full px-4 py-2 text-sm focus:ring-2 focus:ring-brand-orange/20"
                    />
                    <button
                        type="submit"
                        disabled={!newMessage.trim() || uploading}
                        className="size-9 bg-brand-orange text-white rounded-full flex items-center justify-center hover:bg-orange-600 disabled:opacity-50 transition-colors shadow-md shadow-brand-orange/20"
                    >
                        <span className="material-symbols-outlined text-lg pb-0.5 ml-0.5">send</span>
                    </button>
                </form>
            )}
        </div>
    );
};

export default ChatWidget;
