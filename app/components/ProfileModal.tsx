'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import AvatarCropModal from './AvatarCropModal';
import AppleEmoji from './AppleEmoji';

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
  onAccountDeleted?: () => void;
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
  onAccountDeleted,
}: ProfileModalProps) {
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Estados para exclusão de conta
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');

  // Estados do Recorte de Avatar
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
      setShowDeleteConfirm(false);
      setDeletePassword('');
      setDeleteError('');
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

      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

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
    const cleanUsername = username.trim().toLowerCase().replace(/^@/, '');
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

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deletePassword) {
      setDeleteError('Digite sua senha para confirmar a exclusão.');
      return;
    }

    setIsDeleting(true);
    setDeleteError('');

    try {
      // 1. Valida a senha atual autenticando diretamente no Supabase Auth
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: profile.email,
        password: deletePassword,
      });

      if (authError) {
        throw new Error('A senha informada está incorreta.');
      }

      // 2. Com a senha validada, executa a RPC segura para deletar o usuário
      const { error: rpcError } = await supabase.rpc('delete_user_account');

      if (rpcError) {
        throw rpcError;
      }

      // 3. Encerra a sessão local
      await supabase.auth.signOut();
      if (onAccountDeleted) {
        onAccountDeleted();
      } else {
        window.location.reload();
      }
    } catch (err: any) {
      setDeleteError(err.message || 'Erro ao excluir a conta.');
      setIsDeleting(false);
    }
  };

  const netWorth = totalBalance + totalGoals;

  return (
    <>
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-transparent backdrop-blur-md animate-fade-in"
        onClick={onClose}
      >
        <div 
          className="w-full max-w-lg p-6 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto backdrop-blur-2xl select-none"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
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
                  <AppleEmoji emoji="📷" size={13} />
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

          {/* Dados Pessoais */}
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
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs text-[var(--text-main)] focus:outline-none focus:border-[var(--accent)] select-text"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[var(--text-muted)] mb-1">Nome de Usuário (@)</label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs text-[var(--text-main)] focus:outline-none focus:border-[var(--accent)] select-text"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[var(--text-muted)] mb-1">E-mail Cadastrado</label>
                <input
                  type="email"
                  disabled
                  value={profile.email}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs text-[var(--text-muted)] opacity-70 cursor-not-allowed select-text"
                />
              </div>
            </div>

            {/* Configuração de Tema */}
            <div className="space-y-2 pt-2 border-t border-[var(--border-subtle)]">
              <h4 className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider">
                Aparência do Painel
              </h4>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'day', label: 'Day', emoji: '☀️' },
                  { id: 'interestelar', label: 'Interestelar', emoji: '🚀' },
                  { id: 'vintage_cute', label: 'Vintage', emoji: '🌸' },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => onThemeChange(t.id)}
                    className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1.5 ${
                      currentTheme === t.id
                        ? 'bg-[var(--accent)] text-white border-transparent shadow-sm'
                        : 'bg-[var(--bg-card)] text-[var(--text-muted)] border-[var(--border-subtle)] hover:text-[var(--text-main)]'
                    }`}
                  >
                    <AppleEmoji emoji={t.emoji} size={14} />
                    <span>{t.label}</span>
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

          {/* ========================================================
              ZONA DE PERIGO: EXCLUSÃO DE CONTA COM CONFIRMAÇÃO POR SENHA
          ======================================================== */}
          <div className="pt-4 border-t border-rose-500/20 space-y-3">
            <h4 className="text-xs font-bold text-rose-500 uppercase tracking-wider flex items-center gap-1.5">
              <AppleEmoji emoji="⚠️" size={14} />
              <span>Zona de Perigo</span>
            </h4>

            {!showDeleteConfirm ? (
              <div className="p-4 rounded-2xl bg-rose-500/5 border border-rose-500/20 flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-[var(--text-main)]">Excluir minha conta</p>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    Apaga permanentemente seu perfil, saldo, caixinhas e transações.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500 hover:text-white text-rose-500 text-xs font-bold transition-all border border-rose-500/30 active:scale-95"
                >
                  Excluir Conta
                </button>
              </div>
            ) : (
              <form onSubmit={handleDeleteAccount} className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 space-y-3 animate-fade-in">
                <div className="space-y-1">
                  <p className="text-xs font-bold text-rose-500">Ação irreversível!</p>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    Digite sua senha atual para confirmar a exclusão definitiva da sua conta:
                  </p>
                </div>

                {deleteError && (
                  <p className="p-2 rounded-xl bg-rose-500/20 text-rose-500 text-[11px] font-bold text-center">
                    {deleteError}
                  </p>
                )}

                <div>
                  <input
                    type="password"
                    required
                    placeholder="Sua senha atual"
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-[var(--bg-card)] border border-rose-500/30 text-xs text-[var(--text-main)] focus:outline-none focus:border-rose-500 select-text"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={isDeleting}
                    className="flex-1 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs transition-all shadow-md active:scale-95 disabled:opacity-50"
                  >
                    {isDeleting ? 'Excluindo conta...' : 'Confirmar e Deletar'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setDeletePassword('');
                      setDeleteError('');
                    }}
                    className="px-4 py-2 rounded-xl bg-[var(--bg-card)] hover:bg-[var(--accent-light)] text-[var(--text-muted)] text-xs font-bold transition-all border border-[var(--border-subtle)]"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>

      <AvatarCropModal
        imageSrc={tempImageSrc}
        isOpen={isCropOpen}
        onClose={() => setIsCropOpen(false)}
        onCropComplete={handleCropComplete}
      />
    </>
  );
}