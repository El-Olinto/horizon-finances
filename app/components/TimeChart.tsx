'use client';

import { useState, useMemo } from 'react';
import AppleEmoji from './AppleEmoji';

interface Transaction {
  id: string;
  title: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  date: string;
}

interface TimeChartProps {
  transactions: Transaction[];
}

export default function TimeChart({ transactions }: TimeChartProps) {
  const [viewMode, setViewMode] = useState<'monthly' | 'yearly'>('monthly');

  const currentYear = new Date().getFullYear();

  const chartData = useMemo(() => {
    const expenses = transactions.filter((t) => t.type === 'expense');

    if (viewMode === 'monthly') {
      const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      const monthlyTotals = new Array(12).fill(0);

      expenses.forEach((t) => {
        if (!t.date) return;
        const [yearStr, monthStr] = t.date.split('-');
        if (parseInt(yearStr) === currentYear) {
          const monthIndex = parseInt(monthStr) - 1;
          if (monthIndex >= 0 && monthIndex < 12) {
            monthlyTotals[monthIndex] += Number(t.amount);
          }
        }
      });

      const maxVal = Math.max(...monthlyTotals, 1);

      return monthNames.map((name, idx) => ({
        label: name,
        amount: monthlyTotals[idx],
        heightPercent: Math.round((monthlyTotals[idx] / maxVal) * 100),
      }));
    } else {
      const yearlyMap: Record<string, number> = {};

      expenses.forEach((t) => {
        if (!t.date) return;
        const yearStr = t.date.split('-')[0];
        yearlyMap[yearStr] = (yearlyMap[yearStr] || 0) + Number(t.amount);
      });

      const years = Object.keys(yearlyMap).sort();
      if (years.length === 0) {
        years.push(String(currentYear));
        yearlyMap[String(currentYear)] = 0;
      }

      const maxVal = Math.max(...Object.values(yearlyMap), 1);

      return years.map((yr) => ({
        label: yr,
        amount: yearlyMap[yr] || 0,
        heightPercent: Math.round(((yearlyMap[yr] || 0) / maxVal) * 100),
      }));
    }
  }, [transactions, viewMode, currentYear]);

  const totalPeriod = useMemo(() => {
    return chartData.reduce((acc, d) => acc + d.amount, 0);
  }, [chartData]);

  return (
    <div className="space-y-4">
      {/* Alternador Mensal / Anual */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <span className="text-[11px] font-bold text-[var(--text-muted)]">
          Total analisado: <strong className="text-[var(--text-main)]">R$ {totalPeriod.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
        </span>

        <div className="flex items-center p-0.5 rounded-full bg-[var(--bg-card)] border border-[var(--border-subtle)]">
          <button
            type="button"
            onClick={() => setViewMode('monthly')}
            className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all ${
              viewMode === 'monthly'
                ? 'bg-[var(--accent)] text-white shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            Mensal ({currentYear})
          </button>
          <button
            type="button"
            onClick={() => setViewMode('yearly')}
            className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all ${
              viewMode === 'yearly'
                ? 'bg-[var(--accent)] text-white shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            Anual
          </button>
        </div>
      </div>

      {/* Gráfico de Barras Responsivo */}
      <div className="h-44 pt-4 flex items-end justify-between gap-1.5 sm:gap-2 px-1">
        {chartData.map((col) => (
          <div key={col.label} className="flex-1 flex flex-col items-center h-full justify-end group relative">
            {/* Tooltip com valor ao passar o mouse ou tocar */}
            <div className="absolute -top-7 opacity-0 group-hover:opacity-100 transition-opacity bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[10px] font-bold text-[var(--text-main)] px-2 py-0.5 rounded-lg shadow-md whitespace-nowrap pointer-events-none z-10">
              R$ {col.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>

            <div className="w-full bg-[var(--bg-card)] rounded-t-xl overflow-hidden flex items-end h-32">
              <div
                className="w-full bg-gradient-to-t from-[var(--accent)] to-cyan-400 rounded-t-xl transition-all duration-500 group-hover:brightness-125"
                style={{ height: `${Math.max(col.heightPercent, col.amount > 0 ? 8 : 2)}%` }}
              />
            </div>
            <span className="text-[10px] font-bold text-[var(--text-muted)] mt-1.5 truncate">
              {col.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}