'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface Transaction {
  id: string;
  title: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  date: string;
}

interface EditTransactionModalProps {
  transaction: Transaction | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditTransactionModal({
  transaction,
  isOpen,
  onClose,
  onSuccess,
}: EditTransactionModalProps) {
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [category, setCategory] = useState('Geral');
  const [date, setDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (transaction) {
      setTitle(transaction.title || '');
      setAmount(String(transaction.amount || ''));
      setType(transaction.type || 'expense');
      setCategory(transaction.category || 'Geral');
      setDate(transaction.date || new Date().toISOString().split('T')[0]);
      setErrorMsg('');
    }
  }, [transaction]);

  if (!isOpen || !transaction) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount.replace(',', '.'));

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMsg('Informe um valor válido maior que zero.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const { error } = await supabase
        .from('transactions')
        .update({
          title: title.trim(),
          amount: parsedAmount,
          type,
          category,
          date,
        })
        .eq('id', transaction.id);

      if (error) throw error;

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao atualizar movimentação.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md p-6 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-2xl space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-[var(--text-main)]">Editar Movimentação ✏️</h3>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--accent-light)] transition-colors text-xs font-bold"
          >
            ✕
          </button>
        </div>

        {/* Tipo da movimentação */}
        <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)]">
          <button
            type="button"
            onClick={() => setType('expense')}
            className={`py-2 rounded-xl text-xs font-bold transition-all ${
              type === 'expense'
                ? 'bg-rose-500 text-white shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            ↑ Saída (Despesa)
          </button>
          <button
            type="button"
            onClick={() => setType('income')}
            className={`py-2 rounded-xl text-xs font-bold transition-all ${
              type === 'income'
                ? 'bg-emerald-500 text-white shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            ↓ Entrada (Receita)
          </button>
        </div>

        {errorMsg && (
          <p className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-medium text-center">
            {errorMsg}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-[var(--text-muted)] mb-1 uppercase tracking-wider">
              Título da Movimentação
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs text-[var(--text-main)] focus:outline-none focus:border-[var(--accent)]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-[var(--text-muted)] mb-1 uppercase tracking-wider">
                Valor (R$)
              </label>
              <input
                type="text"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs text-[var(--text-main)] focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[var(--text-muted)] mb-1 uppercase tracking-wider">
                Categoria
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs text-[var(--text-main)] focus:outline-none focus:border-[var(--accent)]"
              >
                <option value="Geral">Geral</option>
                <option value="Caixinhas">Caixinhas</option>
                <option value="Alimentação">Alimentação</option>
                <option value="Transporte">Transporte</option>
                <option value="Lazer">Lazer</option>
                <option value="Trabalho">Trabalho</option>
                <option value="Contas">Contas</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[var(--text-muted)] mb-1 uppercase tracking-wider">
              Data da Movimentação
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs text-[var(--text-main)] focus:outline-none focus:border-[var(--accent)]"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-bold text-xs transition-all shadow-md active:scale-95 disabled:opacity-50"
          >
            {loading ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </form>
      </div>
    </div>
  );
}