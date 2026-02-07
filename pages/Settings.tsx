
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../utils/supabase';
import { User } from '../types';
import { playRobustAlarm, stopRobustAlarm } from '../utils/alarm';

interface SettingsProps {
    currentUser: User;
}

const Settings: React.FC<SettingsProps> = ({ currentUser }) => {
    const [locked, setLocked] = useState(true);
    const [password, setPassword] = useState('');
    const [errorTimer, setErrorTimer] = useState<NodeJS.Timeout | null>(null);
    const [shake, setShake] = useState(false);

    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [volume, setVolume] = useState(() => {
        const saved = localStorage.getItem('fenix_alarm_volume');
        return saved ? parseFloat(saved) : 0.5;
    });

    // Edit State
    const [editingUser, setEditingUser] = useState<any | null>(null);
    const [editForm, setEditForm] = useState({ name: '', job_title: '', email: '' });
    const [saving, setSaving] = useState(false);

    const isAdmin = currentUser.email === 'laercio@laercio.com.br';

    const handleUnlock = (e: React.FormEvent) => {
        e.preventDefault();
        if (password === 'Fenix') {
            setLocked(false);
            fetchUsers();
        } else {
            setShake(true);
            setTimeout(() => setShake(false), 500);
            setPassword('');
        }
    };

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .order('name');

            if (error) throw error;
            setUsers(data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const startEdit = (user: any) => {
        setEditingUser(user);
        setEditForm({
            name: user.name,
            job_title: user.job_title || '',
            email: user.email // Readonly usually
        });
    };

    const handleSaveUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingUser) return;
        setSaving(true);

        try {
            const updates: any = {
                name: editForm.name,
            };

            if (isAdmin) {
                updates.job_title = editForm.job_title;
            }

            const { error } = await supabase
                .from('profiles')
                .update(updates)
                .eq('id', editingUser.id);

            if (error) throw error;

            // Update local list
            setUsers(users.map(u => u.id === editingUser.id ? { ...u, ...updates } : u));
            setEditingUser(null);
            alert('Usuário atualizado com sucesso!');
        } catch (err: any) {
            console.error(err);
            alert('Erro ao atualizar: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    if (locked) {
        return (
            <div className="flex flex-col items-center justify-center h-full animate-in zoom-in-95 duration-500">
                <div className={`bg-white p-10 rounded-3xl shadow-2xl w-full max-w-sm text-center border border-slate-100 ${shake ? 'animate-shake' : ''}`}>
                    <div className="size-20 bg-brand-orange/10 rounded-full flex items-center justify-center mx-auto mb-6 text-brand-orange">
                        <span className="material-symbols-outlined text-4xl">lock</span>
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">Acesso Restrito</h2>
                    <p className="text-slate-500 mb-8 text-sm">Digite a senha de administrador para acessar as configurações.</p>

                    <form onSubmit={handleUnlock} className="space-y-4">
                        <input
                            type="password"
                            autoFocus
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full text-center text-2xl tracking-widest px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-brand-orange focus:ring-4 focus:ring-brand-orange/10 transition-all outline-none bg-slate-50"
                            placeholder="•••••"
                        />
                        <button
                            type="submit"
                            className="w-full bg-brand-navy text-white font-bold py-3 rounded-xl hover:bg-slate-800 transition-colors shadow-lg shadow-brand-navy/20"
                        >
                            Acessar
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto animate-in fade-in duration-500">
            <header className="mb-10 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 mb-2">Gestão de Equipe e Permissões</h1>
                    <p className="text-slate-500">Gerencie os colaboradores e suas funções no sistema.</p>
                </div>
                <button onClick={() => setLocked(true)} className="flex items-center gap-2 text-slate-500 hover:text-red-500 transition-colors bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm">
                    <span className="material-symbols-outlined text-sm">lock</span>
                    <span className="text-sm font-semibold">Bloquear</span>
                </button>
            </header>

            {/* GLOBAL SETTINGS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="size-10 bg-brand-orange/10 rounded-xl flex items-center justify-center text-brand-orange">
                            <span className="material-symbols-outlined">volume_up</span>
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800">Volume do Alarme</h3>
                            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Ajuste a intensidade do som</p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="flex items-center gap-4">
                            <span className="material-symbols-outlined text-slate-400">volume_down</span>
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.05"
                                value={volume}
                                onChange={(e) => {
                                    const val = parseFloat(e.target.value);
                                    setVolume(val);
                                    localStorage.setItem('fenix_alarm_volume', val.toString());
                                }}
                                className="flex-1 h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-brand-orange"
                            />
                            <span className="material-symbols-outlined text-slate-400">volume_up</span>
                            <span className="text-sm font-bold text-slate-700 min-w-[3ch]">
                                {Math.round(volume * 100)}%
                            </span>
                        </div>

                        <div className="pt-2">
                            <button
                                onClick={() => {
                                    playRobustAlarm(volume);
                                    setTimeout(stopRobustAlarm, 2000);
                                }}
                                className="w-full py-3 bg-slate-50 border-2 border-slate-100 rounded-xl text-slate-600 font-bold text-sm hover:bg-slate-100 transition-all flex items-center justify-center gap-2"
                            >
                                <span className="material-symbols-outlined text-lg">play_circle</span>
                                TESTAR SOM (2s)
                            </button>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center items-center text-center opacity-50 grayscale">
                    <div className="size-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-2">
                        <span className="material-symbols-outlined">more_horiz</span>
                    </div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Opções Adicionais</p>
                    <p className="text-[10px] text-slate-300 font-medium">Em breve: Temas e Sons personalizados</p>
                </div>
            </div>

            {/* USERS LIST */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                <th className="px-6 py-4">Colaborador</th>
                                <th className="px-6 py-4">Email</th>
                                <th className="px-6 py-4">Cargo / Função</th>
                                <th className="px-6 py-4">Permissão</th>
                                <th className="px-6 py-4 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {users.map(user => (
                                <tr key={user.id} className="hover:bg-slate-50/80 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-full bg-slate-200 bg-cover bg-center border border-white shadow-sm"
                                                style={{ backgroundImage: user.avatar_url ? `url('${user.avatar_url}')` : `url('https://picsum.photos/seed/${user.id}/100/100')` }}
                                            ></div>
                                            <span className="font-semibold text-slate-700">{user.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-600">{user.email}</td>
                                    <td className="px-6 py-4">
                                        {user.job_title ? (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                                                {user.job_title}
                                            </span>
                                        ) : (
                                            <span className="text-slate-400 text-sm italic">Não definido</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${user.role === 'admin'
                                            ? 'bg-purple-50 text-purple-700 border-purple-100'
                                            : 'bg-slate-100 text-slate-600 border-slate-200'
                                            }`}>
                                            {user.role === 'admin' ? 'Administrador' : 'Colaborador'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => startEdit(user)}
                                            className="text-slate-400 hover:text-brand-orange hover:bg-orange-50 p-2 rounded-lg transition-colors"
                                        >
                                            <span className="material-symbols-outlined">edit</span>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {loading && (
                    <div className="p-8 text-center text-slate-400">Carregando equipe...</div>
                )}
            </div>

            {/* EDIT MODAL */}
            {editingUser && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 text-slate-800">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 animate-in zoom-in-95">
                        <h3 className="text-xl font-bold mb-6">Editar Colaborador</h3>
                        <form onSubmit={handleSaveUser} className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold mb-1">Nome</label>
                                <input
                                    type="text"
                                    className="w-full border border-slate-200 rounded-lg px-4 py-2 bg-slate-50 focus:bg-white transition-colors"
                                    value={editForm.name}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold mb-1">Email</label>
                                <input
                                    type="text"
                                    disabled
                                    className="w-full border border-slate-200 rounded-lg px-4 py-2 bg-slate-100 text-slate-500 cursor-not-allowed"
                                    value={editForm.email}
                                />
                            </div>
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <label className="block text-sm font-semibold">Função / Cargo</label>
                                    {!isAdmin && (
                                        <span className="text-[10px] text-brand-orange bg-orange-50 px-2 py-0.5 rounded-full font-bold">
                                            Restrito
                                        </span>
                                    )}
                                </div>
                                <input
                                    type="text"
                                    disabled={!isAdmin}
                                    className={`w-full border rounded-lg px-4 py-2 transition-colors ${isAdmin ? 'bg-slate-50 focus:bg-white border-slate-200' : 'bg-slate-100 text-slate-500 border-transparent cursor-not-allowed'
                                        }`}
                                    value={editForm.job_title}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, job_title: e.target.value }))}
                                />
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setEditingUser(null)}
                                    className="flex-1 py-3 font-semibold text-slate-600 hover:bg-slate-50 rounded-lg border border-slate-200"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="flex-1 py-3 font-bold text-white bg-brand-orange hover:bg-orange-600 rounded-lg shadow-lg shadow-brand-orange/20"
                                >
                                    {saving ? 'Salvando...' : 'Salvar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Settings;
