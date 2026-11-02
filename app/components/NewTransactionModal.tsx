'use client';

import { useState } from 'react';
import { supabase } from '../lib/supabase';
import AppleEmoji from './AppleEmoji';
import { AccountItem } from './ManageAccountsModal';

interface NewTransactionModalProps {
  userId: string;
  accounts: AccountItem[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const CATEGORIES = [
  'Geral',
  'Alimentação',
  'Transporte',
  'Lazer',
  'Trabalho',
  'Contas',
  'Saúde',
  'Educação',
  'Investimentos',
  'Outros',
];

export default function NewTransactionModal({
  userId,
  accounts,
  isOpen,
  onClose,
  onSuccess,
}: NewTransactionModalProps) {
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [category, setCategory] = useState('Geral');
  const [accountId, setAccountId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const parsedAmount = parseFloat(amount.replace(',', '.'));
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMsg('Informe um valor numérico válido maior que zero.');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.from('transactions').insert([
        {
          user_id: userId,
          title: title.trim(),
          amount: parsedAmount,
          type,
          category,
          account_id: accountId || null,
          date,
        },
      ]);

      if (error) throw error;

      setTitle('');
      setAmount('');
      setType('expense');
      setCategory('Geral');
      setAccountId('');
      setDate(new Date().toISOString().split('T')[0]);

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao registrar movimentação.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md animate-fade-in"
      style={{ backgroundColor: 'var(--modal-overlay)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm p-6 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-2xl space-y-4 backdrop-blur-2xl select-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
          <h3 className="text-sm font-black text-[var(--text-main)] flex items-center gap-1.5">
            <AppleEmoji emoji={type === 'income' ? '📈' : '📉'} size={18} />
            <span>Novo Lançamento</span>
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--accent-light)] text-xs font-bold"
          >
            ✕
          </button>
        </div>

        {errorMsg && (
          <p className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-medium text-center">
            {errorMsg}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Alternador Entrada / Saída */}
          <div className="flex items-center p-1 rounded-full bg-[var(--bg-card)] border border-[var(--border-subtle)]">
            <button
              type="button"
              onClick={() => setType('expense')}
              className={`flex-1 py-1.5 rounded-full text-xs font-bold transition-all ${
                type === 'expense'
                  ? 'bg-rose-500 text-white shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              Saída (-)
            </button>
            <button
              type="button"
              onClick={() => setType('income')}
              className={`flex-1 py-1.5 rounded-full text-xs font-bold transition-all ${
                type === 'income'
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              Entrada (+)
            </button>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[var(--text-muted)] mb-1">
              Descrição
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Mercado, Salário, Café"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs text-[var(--text-main)] focus:outline-none focus:border-[var(--accent)] select-text"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[var(--text-muted)] mb-1">
              Valor (R$)
            </label>
            <input
              type="text"
              required
              placeholder="0,00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs text-[var(--text-main)] focus:outline-none focus:border-[var(--accent)] select-text"
            />
          </div>

          {/* Onde está o dinheiro (Carteira / Banco) */}
          <div>
            <label className="block text-[11px] font-bold text-[var(--text-muted)] mb-1">
              Onde está o dinheiro? (Carteira/Banco)
            </label>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs text-[var(--text-main)] focus:outline-none focus:border-[var(--accent)]"
            >
              <option value="">Não especificado / Geral</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.icon} {acc.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-bold text-[var(--text-muted)] mb-1">
                Categoria
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs text-[var(--text-main)] focus:outline-none focus:border-[var(--accent)]"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[var(--text-muted)] mb-1">
                Data
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs text-[var(--text-main)] focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-bold text-xs transition-all shadow-md active:scale-95 disabled:opacity-50 mt-2"
          >
            {loading ? 'Salvando...' : 'Adicionar Movimentação'}
          </button>
        </form>
      </div>
    </div>
  );
}