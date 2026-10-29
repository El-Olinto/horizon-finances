'use client';

interface Transaction {
  id: string;
  title: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  date: string;
}

interface CategoryChartProps {
  transactions: Transaction[];
}

const CATEGORY_COLORS: Record<string, string> = {
  Geral: 'bg-slate-500',
  Alimentação: 'bg-amber-500',
  Transporte: 'bg-blue-500',
  Lazer: 'bg-purple-500',
  Trabalho: 'bg-emerald-500',
  Contas: 'bg-rose-500',
  Poupança: 'bg-teal-500',
};

export default function CategoryChart({ transactions }: CategoryChartProps) {
  const expenseTransactions = transactions.filter((t) => t.type === 'expense');
  const totalExpense = expenseTransactions.reduce((acc, t) => acc + Number(t.amount), 0);

  // Agrupa os valores por categoria
  const categoryTotals = expenseTransactions.reduce((acc, tx) => {
    const cat = tx.category || 'Geral';
    acc[cat] = (acc[cat] || 0) + Number(tx.amount);
    return acc;
  }, {} as Record<string, number>);

  const sortedCategories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);

  if (totalExpense === 0) {
    return (
      <div className="py-6 text-center rounded-2xl border border-dashed border-[var(--border-subtle)] bg-[var(--bg-card)]">
        <p className="text-xs text-[var(--text-muted)] font-medium">
          Nenhuma despesa registada para gerar o gráfico de distribuição.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Barra de Distribuição Segmentada */}
      <div className="w-full h-3.5 rounded-full overflow-hidden flex bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-inner">
        {sortedCategories.map(([cat, amount]) => {
          const percentage = (amount / totalExpense) * 100;
          const colorClass = CATEGORY_COLORS[cat] || 'bg-slate-400';
          return (
            <div
              key={cat}
              style={{ width: `${percentage}%` }}
              className={`h-full ${colorClass} transition-all duration-500 relative group`}
              title={`${cat}: R$ ${amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${percentage.toFixed(1)}%)`}
            />
          );
        })}
      </div>

      {/* Legenda detalhada por categoria */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
        {sortedCategories.map(([cat, amount]) => {
          const percentage = (amount / totalExpense) * 100;
          const colorClass = CATEGORY_COLORS[cat] || 'bg-slate-400';

          return (
            <div
              key={cat}
              className="p-3 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${colorClass}`} />
                <div>
                  <p className="text-xs font-bold text-[var(--text-main)]">{cat}</p>
                  <p className="text-[10px] text-[var(--text-muted)]">{percentage.toFixed(1)}%</p>
                </div>
              </div>
              <span className="text-xs font-bold text-[var(--text-main)]">
                R$ {amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}