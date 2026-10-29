'use client';

import { useState } from 'react';
import { supabase } from '../lib/supabase';

interface NewGoalModalProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function NewGoalModal({
  userId,
  isOpen,
  onClose,
  onSuccess,
}: NewGoalModalProps) {
  const [title, setTitle] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [deadline, setDeadline] = useState('');
  const [category, setCategory] = useState('Poupança');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedTarget = parseFloat(targetAmount.replace(',', '.'));
    const parsedCurrent = currentAmount ? parseFloat(currentAmount.replace(',', '.')) : 0;

    if (isNaN(parsedTarget) || parsedTarget <= 0) {
      setErrorMsg('Informe um valor alvo válido.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const { error } = await supabase.from('goals').insert([
        {
          user_id: userId,
          title: title.trim(),
          target_amount: parsedTarget,
          current_amount: isNaN(parsedCurrent) ? 0 : parsedCurrent,
          deadline: deadline || null,
          category,
        },
      ]);

      if (error) throw error;

      setTitle('');
      setTargetAmount('');
      setCurrentAmount('');
      setDeadline('');
      setCategory('Poupança');
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao registrar meta.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md p-6 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-2xl space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-[var(--text-main)]">Nova Meta Financeira 🎯</h3>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--accent-light)] transition-colors text-xs font-bold"
          >
            ✕
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
              Nome do Objetivo
            </label>
            <input
              type="text"
              required
              placeholder="ex: Reserva de Emergência, PC Gamer..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs text-[var(--text-main)] focus:outline-none focus:border-[var(--accent)]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-[var(--text-muted)] mb-1 uppercase tracking-wider">
                Valor Alvo (R$)
              </label>
              <input
                type="text"
                required
                placeholder="ex: 5000,00"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs text-[var(--text-main)] focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[var(--text-muted)] mb-1 uppercase tracking-wider">
                Já Guardado (R$)
              </label>
              <input
                type="text"
                placeholder="0,00"
                value={currentAmount}
                onChange={(e) => setCurrentAmount(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs text-[var(--text-main)] focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-[var(--text-muted)] mb-1 uppercase tracking-wider">
                Data Limite
              </label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs text-[var(--text-main)] focus:outline-none focus:border-[var(--accent)]"
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
                <option value="Poupança">Poupança</option>
                <option value="Eletrônicos">Eletrônicos</option>
                <option value="Viagem">Viagem</option>
                <option value="Estudos">Estudos</option>
                <option value="Veículo">Veículo</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-bold text-xs transition-all shadow-md active:scale-95 disabled:opacity-50"
          >
            {loading ? 'Criando meta...' : 'Salvar Meta'}
          </button>
        </form>
      </div>
    </div>
  );
}