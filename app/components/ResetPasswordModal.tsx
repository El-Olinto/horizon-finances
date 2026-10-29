'use client';

import { useState } from 'react';
import { supabase } from '../lib/supabase';
import Logo from './Logo';
import AppleEmoji from './AppleEmoji';

interface ResetPasswordModalProps {
  isOpen: boolean;
  onSuccess: () => void;
  onClose: () => void;
}

export default function ResetPasswordModal({ isOpen, onSuccess, onClose }: ResetPasswordModalProps) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  if (!isOpen) return null;

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (newPassword.length < 6) {
      setErrorMessage('A nova senha precisa ter no mínimo 6 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('As senhas não coincidem.');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      setSuccessMessage('Senha atualizada com sucesso!');
      setTimeout(() => {
        onSuccess();
      }, 1200);
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao redefinir a senha.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md animate-fade-in"
      style={{ backgroundColor: 'var(--modal-overlay)' }}
    >
      <div
        className="w-full max-w-sm p-6 sm:p-8 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-2xl space-y-5 backdrop-blur-2xl relative select-none"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--accent-light)] transition-colors text-xs font-bold"
        >
          ✕
        </button>

        <div className="text-center space-y-1">
          <div className="flex justify-center pb-1">
            <Logo size={42} />
          </div>
          <h2 className="text-xl font-black text-[var(--text-main)] flex items-center justify-center gap-1.5">
            <span>Criar Nova Senha</span>
            <AppleEmoji emoji="🔑" size={18} />
          </h2>
          <p className="text-xs text-[var(--text-muted)]">
            Digite a nova senha que deseja utilizar para acessar sua conta.
          </p>
        </div>

        {errorMessage && (
          <p className="p-2.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-medium text-center">
            {errorMessage}
          </p>
        )}

        {successMessage && (
          <p className="p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-medium text-center">
            {successMessage}
          </p>
        )}

        <form onSubmit={handleUpdatePassword} className="space-y-3">
          <div>
            <label className="block text-[11px] font-bold text-[var(--text-muted)] mb-1">
              Nova Senha
            </label>
            <input
              type="password"
              required
              minLength={6}
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-2 rounded-full bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs text-[var(--text-main)] focus:outline-none focus:border-[var(--accent)] select-text"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[var(--text-muted)] mb-1">
              Confirmar Nova Senha
            </label>
            <input
              type="password"
              required
              minLength={6}
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2 rounded-full bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs text-[var(--text-main)] focus:outline-none focus:border-[var(--accent)] select-text"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-bold text-xs transition-all shadow-md active:scale-95 disabled:opacity-50 mt-2"
          >
            {loading ? 'Salvando nova senha...' : 'Confirmar e Salvar'}
          </button>
        </form>
      </div>
    </div>
  );
}