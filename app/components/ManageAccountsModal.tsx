'use client';

import { useState } from 'react';
import { supabase } from '../lib/supabase';
import AppleEmoji from './AppleEmoji';

export interface AccountItem {
  id: string;
  name: string;
  color?: string;
  icon?: string;
}

const PRESET_ACCOUNTS = [
  { name: 'Nubank', icon: '🟣', color: '#8a05be' },
  { name: 'Inter', icon: '🟠', color: '#ff7a00' },
  { name: 'Caixa', icon: '🔵', color: '#005ca9' },
  { name: 'Mercado Pago', icon: '🔷', color: '#009ee3' },
  { name: 'Bradesco', icon: '🔴', color: '#cc092f' },
  { name: 'Itaú', icon: '🟧', color: '#ec7000' },
  { name: 'Santander', icon: '🔺', color: '#ea1d25' },
  { name: 'Banco do Brasil', icon: '🟡', color: '#fcf000' },
  { name: 'C6 Bank', icon: '⚫', color: '#242424' },
  { name: 'PicPay', icon: '🟢', color: '#11c76f' },
  { name: 'Dinheiro em Espécie', icon: '💵', color: '#10b981' },
  { name: 'Outro Banco / Carteira', icon: '💼', color: '#38bdf8' },
];

interface ManageAccountsModalProps {
  isOpen: boolean;
  userId: string;
  accounts: AccountItem[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function ManageAccountsModal({
  isOpen,
  userId,
  accounts,
  onClose,
  onSuccess,
}: ManageAccountsModalProps) {
  const [selectedPreset, setSelectedPreset] = useState(PRESET_ACCOUNTS[0]);
  const [customName, setCustomName] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const nameToSave = customName.trim() || selectedPreset.name;

    await supabase.from('accounts').insert([
      {
        user_id: userId,
        name: nameToSave,
        icon: selectedPreset.icon,
        color: selectedPreset.color,
      },
    ]);

    setCustomName('');
    setLoading(false);
    onSuccess();
  };

  const handleDeleteAccount = async (id: string) => {
    if (confirm('Deseja excluir esta carteira? As transações vinculadas a ela não serão apagadas.')) {
      await supabase.from('accounts').delete().eq('id', id);
      onSuccess();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md animate-fade-in"
      style={{ backgroundColor: 'var(--modal-overlay)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md p-6 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-2xl space-y-5 backdrop-blur-2xl select-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-2">
            <AppleEmoji emoji="🏦" size={20} />
            <h3 className="text-base font-black text-[var(--text-main)]">Minhas Carteiras & Bancos</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--accent-light)] text-xs font-bold"
          >
            ✕
          </button>
        </div>

        {/* Lista de contas existentes */}
        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
          {accounts.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)] text-center py-3">
              Nenhuma carteira adicionada ainda.
            </p>
          ) : (
            accounts.map((acc) => (
              <div
                key={acc.id}
                className="flex items-center justify-between p-2.5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)]"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-base">{acc.icon || '🏦'}</span>
                  <span className="text-xs font-bold text-[var(--text-main)]">{acc.name}</span>
                </div>
                <button
                  onClick={() => handleDeleteAccount(acc.id)}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 text-xs"
                >
                  ✕
                </button>
              </div>
            ))
          )}
        </div>

        {/* Formulário para adicionar nova carteira */}
        <form onSubmit={handleAddAccount} className="space-y-3 pt-2 border-t border-[var(--border-subtle)]">
          <label className="block text-[11px] font-bold text-[var(--text-muted)]">
            Adicionar Nova Opção
          </label>

          <div className="grid grid-cols-4 gap-2">
            {PRESET_ACCOUNTS.map((preset) => (
              <button
                type="button"
                key={preset.name}
                onClick={() => setSelectedPreset(preset)}
                className={`p-2 rounded-xl border text-[11px] font-bold flex flex-col items-center gap-1 transition-all ${
                  selectedPreset.name === preset.name
                    ? 'border-[var(--accent)] bg-[var(--accent-light)] text-[var(--text-main)] shadow-sm'
                    : 'border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
                }`}
              >
                <span className="text-sm">{preset.icon}</span>
                <span className="truncate w-full text-center text-[10px]">{preset.name.split(' ')[0]}</span>
              </button>
            ))}
          </div>

          <input
            type="text"
            placeholder={`Nome personalizado (opcional, padrão: ${selectedPreset.name})`}
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs text-[var(--text-main)] focus:outline-none focus:border-[var(--accent)] select-text"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-bold text-xs transition-all shadow-md active:scale-95 disabled:opacity-50"
          >
            {loading ? 'Salvando...' : '+ Vincular Carteira'}
          </button>
        </form>
      </div>
    </div>
  );
}