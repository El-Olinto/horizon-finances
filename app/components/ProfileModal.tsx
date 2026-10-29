'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import AvatarCropModal from './AvatarCropModal';

interface Profile {
  id: string;
  username: string;
  full_name: string;
  email: string;
  avatar_url?: string;
  theme_preference?: string;
}

interface ProfileModalProps {
  isOpen: boolean;
  profile: Profile | null;
  currentTheme: string;
  totalBalance: number;
  totalGoals: number;
  onClose: () => void;
  onThemeChange: (theme: string) => void;
  onProfileUpdated: () => void;
}

export default function ProfileModal({
  isOpen,
  profile,
  currentTheme,
  totalBalance,
  totalGoals,
  onClose,
  onThemeChange,
  onProfileUpdated,
}: ProfileModalProps) {
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Estados do Recorte
  const [tempImageSrc, setTempImageSrc] = useState<string | null>(null);
  const [isCropOpen, setIsCropOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setUsername(profile.username || '');
      setAvatarUrl(profile.avatar_url || '');
      setErrorMsg('');
      setSuccessMsg('');
    }
  }, [profile, isOpen]);

  if (!isOpen || !profile) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        setTempImageSrc(reader.result as string);
        setIsCropOpen(true);
      };
      reader.readAsDataURL(file);
      e.target.value = '';
    }
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    setIsCropOpen(false);
    setUploadingAvatar(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const fileName = `${profile.id}/avatar_${Date.now()}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, croppedBlob, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      const publicUrl = urlData.publicUrl;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', profile.id);

      if (updateError) throw updateError;

      setAvatarUrl(publicUrl);
      setSuccessMsg('Foto de perfil atualizada com sucesso!');
      onProfileUpdated();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao salvar foto de perfil.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUsername = username.trim().toLowerCase();
    const cleanFullName = fullName.trim();

    if (cleanUsername.length < 3) {
      setErrorMsg('O username deve possuir pelo menos 3 caracteres.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      if (cleanUsername !== profile.username) {
        const { data: existing } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', cleanUsername)
          .neq('id', profile.id)
          .maybeSingle();

        if (existing) {
          throw new Error('Este @username já está registrado por outro usuário.');
        }
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: cleanFullName,
          username: cleanUsername,
        })
        .eq('id', profile.id);

      if (error) throw error;

      setSuccessMsg('Perfil atualizado com sucesso!');
      onProfileUpdated();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao atualizar dados do perfil.');
    } finally {
      setLoading(false);
    }
  };

  const netWorth = totalBalance + totalGoals;

  return (
    <>
      {/* Overlay transparente com desfoque total de fundo sem nada escurecido */}
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-transparent backdrop-blur-md animate-fade-in"
        onClick={onClose}
      >
        <div 
          className="w-full max-w-lg p-6 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto backdrop-blur-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header do Perfil com Avatar e Botão de Foto */}
          <div className="flex items-center justify-between pb-4 border-b border-[var(--border-subtle)]">
            <div className="flex items-center gap-3">
              <div className="relative group">
                <div className="w-14 h-14 rounded-2xl bg-[var(--accent-light)] text-[var(--accent)] flex items-center justify-center font-black text-xl shadow-inner overflow-hidden border border-[var(--border-subtle)]">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={profile.username}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    profile.username?.charAt(0).toUpperCase()
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  title="Alterar foto de perfil"
                  className="absolute -bottom-1 -right-1 w-6 h-6 rounded-lg bg-[var(--accent)] text-white flex items-center justify-center text-xs shadow-md hover:scale-110 transition-transform active:scale-95"
                >
                  📷
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png, image/jpeg, image/webp"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>

              <div>
                <h3 className="text-base font-black text-[var(--text-main)]">Meu Perfil</h3>
                <p className="text-xs text-[var(--text-muted)] font-medium">
                  {uploadingAvatar ? 'Atualizando foto...' : `@${profile.username}`}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--accent-light)] transition-colors text-xs font-bold"
            >
              ✕
            </button>
          </div>

          {/* Resumo de Patrimônio */}
          <div className="grid grid-cols-3 gap-3 p-3.5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] text-center">
            <div>
              <span className="text-[10px] uppercase font-bold text-[var(--text-muted)]">Em Conta</span>
              <p className="text-xs font-bold text-[var(--text-main)] mt-0.5">
                R$ {totalBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-[var(--text-muted)]">Caixinhas</span>
              <p className="text-xs font-bold text-[var(--accent)] mt-0.5">
                R$ {totalGoals.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-[var(--text-muted)]">Patrimônio</span>
              <p className="text-xs font-black text-emerald-500 mt-0.5">
                R$ {netWorth.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          {/* Mensagens de Feedback */}
          {errorMsg && (
            <p className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-medium text-center">
              {errorMsg}
            </p>
          )}
          {successMsg && (
            <p className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-medium text-center">
              {successMsg}
            </p>
          )}

          {/* Formulário de Dados Pessoais */}
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider">
                Dados da Conta
              </h4>

              <div>
                <label className="block text-[11px] font-bold text-[var(--text-muted)] mb-1">Nome Completo</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs text-[var(--text-main)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[var(--text-muted)] mb-1">Nome de Usuário (@)</label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs text-[var(--text-main)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[var(--text-muted)] mb-1">E-mail Cadastrado</label>
                <input
                  type="email"
                  disabled
                  value={profile.email}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs text-[var(--text-muted)] opacity-70 cursor-not-allowed"
                />
              </div>
            </div>

            {/* Configuração de Tema */}
            <div className="space-y-2 pt-2 border-t border-[var(--border-subtle)]">
              <h4 className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider">
                Aparência do Dashboard
              </h4>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'day', label: '☀️ Day' },
                  { id: 'interestelar', label: '🌌 Interestelar' },
                  { id: 'vintage_cute', label: '🌸 Vintage' },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => onThemeChange(t.id)}
                    className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all border ${
                      currentTheme === t.id
                        ? 'bg-[var(--accent)] text-white border-transparent shadow-sm'
                        : 'bg-[var(--bg-card)] text-[var(--text-muted)] border-[var(--border-subtle)] hover:text-[var(--text-main)]'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-bold text-xs transition-all shadow-md active:scale-95 disabled:opacity-50 mt-4"
            >
              {loading ? 'Salvando alterações...' : 'Salvar Alterações'}
            </button>
          </form>
        </div>
      </div>

      {/* Modal de Zoom e Panning da Foto */}
      <AvatarCropModal
        imageSrc={tempImageSrc}
        isOpen={isCropOpen}
        onClose={() => setIsCropOpen(false)}
        onCropComplete={handleCropComplete}
      />
    </>
  );
}