'use client';

import { useState } from 'react';
import { supabase } from '../lib/supabase';

interface Goal {
  id: string;
  title: string;
  target_amount: number;
  current_amount: number;
}

interface ManageGoalMoneyModalProps {
  goal: Goal | null;
  userId: string;
  currentBalance: number;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ManageGoalMoneyModal({
  goal,
  userId,
  currentBalance,
  isOpen,
  onClose,
  onSuccess,
}: ManageGoalMoneyModalProps) {
  const [type, setType] = useState<'deposit' | 'withdraw'>('deposit');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen || !goal) return null;

  const currentGoalAmount = Number(goal.current_amount || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount.replace(',', '.'));

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMsg('Informe um valor válido maior que zero.');
      return;
    }

    if (type === 'deposit') {
      if (parsedAmount > currentBalance) {
        setErrorMsg(
          `Saldo insuficiente em conta! Você tem apenas R$ ${currentBalance.toLocaleString('pt-BR', {
            minimumFractionDigits: 2,
          })}.`
        );
        return;
      }
    } else {
      if (parsedAmount > currentGoalAmount) {
        setErrorMsg(
          `Você só pode resgatar até R$ ${currentGoalAmount.toLocaleString('pt-BR', {
            minimumFractionDigits: 2,
          })} desta caixinha.`
        );
        return;
      }
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const newGoalAmount =
        type === 'deposit'
          ? currentGoalAmount + parsedAmount
          : currentGoalAmount - parsedAmount;

      // 1. Atualiza o saldo da caixinha
      const { error: goalErr } = await supabase
        .from('goals')
        .update({ current_amount: newGoalAmount })
        .eq('id', goal.id);

      if (goalErr) throw goalErr;

      // 2. Cria a transação correspondente para debitar ou creditar o saldo em conta
      const { error: txErr } = await supabase.from('transactions').insert([
        {
          user_id: userId,
          title:
            type === 'deposit'
              ? `Aporte: ${goal.title}`
              : `Resgate: ${goal.title}`,
          amount: parsedAmount,
          type: type === 'deposit' ? 'expense' : 'income',
          category: 'Caixinhas',
          date: new Date().toISOString().split('T')[0],
        },
      ]);

      if (txErr) throw txErr;

      setAmount('');
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao movimentar caixinha.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-sm p-6 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-2xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-[var(--text-main)]">
              {type === 'deposit' ? 'Guardar na Caixinha' : 'Resgatar da Caixinha'}
            </h3>
            <p className="text-[11px] text-[var(--text-muted)]">{goal.title}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--accent-light)] transition-colors text-xs font-bold"
          >
            ✕
          </button>
        </div>

        {/* Alternador Guardar vs Resgatar */}
        <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)]">
          <button
            type="button"
            onClick={() => {
              setType('deposit');
              setErrorMsg('');
            }}
            className={`py-1.5 rounded-xl text-xs font-bold transition-all ${
              type === 'deposit'
                ? 'bg-[var(--accent)] text-white shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            + Guardar do Saldo
          </button>
          <button
            type="button"
            onClick={() => {
              setType('withdraw');
              setErrorMsg('');
            }}
            className={`py-1.5 rounded-xl text-xs font-bold transition-all ${
              type === 'withdraw'
                ? 'bg-rose-500 text-white shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            - Resgatar p/ Saldo
          </button>
        </div>

        {/* Resumo de saldos para transparência do usuário */}
        <div className="p-3 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[11px] space-y-1">
          <div className="flex justify-between text-[var(--text-muted)]">
            <span>Saldo em Conta:</span>
            <strong className="text-[var(--text-main)]">
              R$ {currentBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </strong>
          </div>
          <div className="flex justify-between text-[var(--text-muted)]">
            <span>Guardado nesta Caixinha:</span>
            <strong className="text-[var(--text-main)]">
              R$ {currentGoalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </strong>
          </div>
        </div>

        {errorMsg && (
          <p className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-medium text-center">
            {errorMsg}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-[var(--text-muted)] mb-1 uppercase tracking-wider">
              Valor (R$)
            </label>
            <input
              type="text"
              required
              placeholder="0,00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs text-[var(--text-main)] focus:outline-none focus:border-[var(--accent)]"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-2.5 rounded-xl text-white font-bold text-xs transition-all shadow-md active:scale-95 disabled:opacity-50 ${
              type === 'deposit'
                ? 'bg-[var(--accent)] hover:bg-[var(--accent-hover)]'
                : 'bg-rose-500 hover:bg-rose-600'
            }`}
          >
            {loading
              ? 'Processando...'
              : type === 'deposit'
              ? 'Confirmar e Transferir da Conta'
              : 'Confirmar e Devolver para a Conta'}
          </button>
        </form>
      </div>
    </div>
  );
}