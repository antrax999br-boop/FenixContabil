import React, { useState, useRef } from 'react';
import { supabase } from '../utils/supabase';
import { User } from '../types';

interface ProfileModalProps {
    user: User;
    onClose: () => void;
    onUpdate: () => void; // Trigger refresh in parent
}

const ProfileModal: React.FC<ProfileModalProps> = ({ user, onClose, onUpdate }) => {
    const [name, setName] = useState(user.name);
    const [jobTitle, setJobTitle] = useState(user.job_title || '');
    const [avatarUrl, setAvatarUrl] = useState(user.avatar_url || '');
    const [uploading, setUploading] = useState(false);
    const [saving, setSaving] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Check if current user is the admin allowed to edit titles
    const canEditTitle = user.email === 'laercio@laercio.com.br';

    const handleAvatarSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;

        const file = e.target.files[0];
        setUploading(true);

        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${user.id}-${Math.random()}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            setAvatarUrl(publicUrl);
        } catch (error: any) {
            console.error('Error uploading avatar:', error);
            alert('Erro ao enviar imagem: ' + error.message);
        } finally {
            setUploading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        try {
            const updates: any = {
                name,
                avatar_url: avatarUrl,
                updated_at: new Date(),
            };

            // Only include job_title if allowed
            if (canEditTitle) {
                updates.job_title = jobTitle;
            }

            const { error } = await supabase
                .from('profiles')
                .update(updates)
                .eq('id', user.id);

            if (error) throw error;

            onUpdate(); // Refresh parent state
            onClose();
        } catch (error: any) {
            console.error('Error updating profile:', error);
            alert('Erro ao salvar perfil: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-slate-800">Editar Perfil</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <form onSubmit={handleSave} className="space-y-6">
                    {/* AVATAR */}
                    <div className="flex justify-center">
                        <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                            <div className="h-24 w-24 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden border-4 border-white shadow-lg">
                                {avatarUrl ? (
                                    <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                                ) : (
                                    <span className="text-2xl font-bold text-slate-400">{user.name.charAt(0)}</span>
                                )}
                            </div>
                            <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="material-symbols-outlined text-white">camera_alt</span>
                            </div>
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept="image/*"
                                onChange={handleAvatarSelect}
                                disabled={uploading}
                            />
                        </div>
                    </div>

                    {/* NAME */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Nome de Exibição</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-800 focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange transition-all"
                            placeholder="Seu nome"
                            required
                        />
                    </div>

                    {/* EMAIL (Readonly) */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-400 mb-1">Email</label>
                        <input
                            type="email"
                            value={user.email}
                            disabled
                            className="w-full bg-slate-100 border-none rounded-lg px-4 py-2.5 text-slate-500 cursor-not-allowed"
                        />
                    </div>

                    {/* JOB TITLE */}
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <label className="block text-sm font-semibold text-slate-700">Função / Cargo</label>
                            {!canEditTitle && (
                                <span className="text-[10px] text-brand-orange bg-orange-50 px-2 py-0.5 rounded-full font-bold">
                                    Restrito ao Admin
                                </span>
                            )}
                        </div>
                        <input
                            type="text"
                            value={jobTitle}
                            onChange={(e) => setJobTitle(e.target.value)}
                            disabled={!canEditTitle}
                            className={`w-full border rounded-lg px-4 py-2.5 transition-all ${canEditTitle
                                    ? 'bg-slate-50 border-slate-200 text-slate-800 focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange'
                                    : 'bg-slate-100 border-none text-slate-500 cursor-not-allowed'
                                }`}
                            placeholder="Ex: Analista Júnior"
                        />
                    </div>

                    <div className="pt-2 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-3 rounded-lg border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={saving || uploading}
                            className="flex-1 px-4 py-3 rounded-lg bg-brand-orange text-white font-bold hover:bg-orange-600 transition-colors shadow-lg shadow-brand-orange/20 flex items-center justify-center gap-2"
                        >
                            {saving ? 'Salvando...' : 'Salvar Alterações'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ProfileModal;
