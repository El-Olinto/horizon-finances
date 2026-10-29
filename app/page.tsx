'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from './lib/supabase';
import Auth from './components/Auth';
import ThemeSelector from './components/ThemeSelector';
import NewTransactionModal from './components/NewTransactionModal';
import NewGoalModal from './components/NewGoalModal';
import CategoryChart from './components/CategoryChart';

interface Transaction {
  id: string;
  title: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  date: string;
}

interface Goal {
  id: string;
  title: string;
  target_amount: number;
  current_amount: number;
  deadline?: string;
  category: string;
}

export default function Home() {
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [checkingProfile, setCheckingProfile] = useState(false);
  const [theme, setTheme] = useState('day');

  // Transações
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingTx, setLoadingTx] = useState(false);
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);

  // Filtros de Transações
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Metas
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loadingGoals, setLoadingGoals] = useState(false);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);

  // Cadastro de Username para 1º Login Google
  const [newUsername, setNewUsername] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [savingUsername, setSavingUsername] = useState(false);

  const applyTheme = (themeName: string) => {
    if (typeof document !== 'undefined') {
      document.body.classList.remove('theme-day', 'theme-interestelar', 'theme-vintage_cute');
      document.body.classList.add(`theme-${themeName}`);
    }
    setTheme(themeName);
  };

  const fetchTransactions = async (userId: string) => {
    setLoadingTx(true);
    const { data } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false });

    if (data) setTransactions(data);
    setLoadingTx(false);
  };

  const fetchGoals = async (userId: string) => {
    setLoadingGoals(true);
    const { data } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (data) setGoals(data);
    setLoadingGoals(false);
  };

  const handleDeleteTransaction = async (txId: string) => {
    if (!confirm('Deseja realmente excluir esta transação?')) return;

    const { error } = await supabase.from('transactions').delete().eq('id', txId);
    if (!error && session?.user) {
      await fetchTransactions(session.user.id);
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    if (!confirm('Deseja realmente remover esta meta?')) return;

    const { error } = await supabase.from('goals').delete().eq('id', goalId);
    if (!error && session?.user) {
      await fetchGoals(session.user.id);
    }
  };

  const handleAddAmountToGoal = async (goalId: string, currentAmount: number, addition: number) => {
    const updated = Number(currentAmount) + addition;
    const { error } = await supabase
      .from('goals')
      .update({ current_amount: updated })
      .eq('id', goalId);

    if (!error && session?.user) {
      await fetchGoals(session.user.id);
    }
  };

  const refreshUser = async () => {
    setLoading(true);
    setCheckingProfile(true);

    try {
      const { data: { session: freshSession } } = await supabase.auth.getSession();
      setSession(freshSession);

      if (!freshSession?.user) {
        setProfile(null);
        applyTheme('day');
        return;
      }

      let { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', freshSession.user.id)
        .maybeSingle();

      if (!data && freshSession.user.email) {
        const { data: dataByEmail } = await supabase
          .from('profiles')
          .select('*')
          .eq('email', freshSession.user.email.toLowerCase())
          .maybeSingle();

        if (dataByEmail) {
          data = dataByEmail;
          if (data.id !== freshSession.user.id) {
            await supabase
              .from('profiles')
              .update({ id: freshSession.user.id })
              .eq('email', freshSession.user.email.toLowerCase());
          }
        }
      }

      if (data && data.username) {
        setProfile(data);
        applyTheme(data.theme_preference || 'day');
        await Promise.all([
          fetchTransactions(freshSession.user.id),
          fetchGoals(freshSession.user.id),
        ]);
      } else {
        setProfile(null);
        applyTheme('day');
      }
    } catch (e) {
      console.error('Erro ao sincronizar usuário:', e);
      setProfile(null);
    } finally {
      setCheckingProfile(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        await refreshUser();
      } else if (event === 'SIGNED_OUT') {
        setSession(null);
        setProfile(null);
        setTransactions([]);
        setGoals([]);
        applyTheme('day');
        setCheckingProfile(false);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user) return;

    const cleanUsername = newUsername.trim().toLowerCase();
    if (cleanUsername.length < 3) {
      setUsernameError('O nome de usuário precisa ter pelo menos 3 letras.');
      return;
    }

    setSavingUsername(true);
    setUsernameError('');

    try {
      const { data: existing } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', cleanUsername)
        .maybeSingle();

      if (existing) throw new Error('Este @username já está em uso.');

      const { data, error } = await supabase
        .from('profiles')
        .upsert([
          {
            id: session.user.id,
            username: cleanUsername,
            full_name: session.user.user_metadata?.full_name || cleanUsername,
            email: session.user.email?.toLowerCase(),
            avatar_url: session.user.user_metadata?.avatar_url || '',
            theme_preference: 'day',
          },
        ])
        .select()
        .single();

      if (error) throw error;
      setProfile(data);
      applyTheme('day');
    } catch (err: any) {
      setUsernameError(err.message || 'Erro ao registrar perfil');
    } finally {
      setSavingUsername(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
    setTransactions([]);
    setGoals([]);
    applyTheme('day');
    setLoading(false);
  };

  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((acc, t) => acc + Number(t.amount), 0);

  const totalExpense = transactions
    .filter((t) => t.type === 'expense')
    .reduce((acc, t) => acc + Number(t.amount), 0);

  const currentBalance = totalIncome - totalExpense;

  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const matchesType = filterType === 'all' || tx.type === filterType;
      const matchesCategory = filterCategory === 'all' || tx.category === filterCategory;
      const matchesSearch = tx.title.toLowerCase().includes(searchTerm.toLowerCase().trim());
      return matchesType && matchesCategory && matchesSearch;
    });
  }, [transactions, filterType, filterCategory, searchTerm]);

  if (loading || checkingProfile) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent)]"></div>
          <span className="text-xs text-[var(--text-muted)] font-medium">Carregando Horizon Finances...</span>
        </div>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <Auth onSuccess={refreshUser} />
      </main>
    );
  }

  if (!profile || !profile.username) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md p-8 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-2xl space-y-5 animate-fade-in">
          <div className="text-center">
            <h2 className="text-xl font-black text-[var(--accent)]">Primeiro acesso com Google!</h2>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Para concluir seu cadastro, escolha seu @username exclusivo:
            </p>
          </div>

          {usernameError && (
            <p className="text-xs text-rose-500 text-center font-bold bg-rose-500/10 p-2 rounded-xl border border-rose-500/20">
              {usernameError}
            </p>
          )}

          <form onSubmit={handleCreateProfile} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-[var(--text-main)] mb-1">Seu @username</label>
              <input
                type="text"
                required
                placeholder="ex: guilherme"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs text-[var(--text-main)] focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
            <button
              type="submit"
              disabled={savingUsername}
              className="w-full py-2.5 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-bold text-xs transition-all shadow-md disabled:opacity-50"
            >
              {savingUsername ? 'Salvando...' : 'Confirmar e Entrar'}
            </button>
          </form>

          <div className="pt-2 border-t border-[var(--border-subtle)] text-center">
            <button
              type="button"
              onClick={handleLogout}
              className="text-xs text-[var(--text-muted)] hover:text-rose-500 transition-colors font-medium"
            >
              Cancelar e voltar para o login
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col p-4 sm:p-6 max-w-5xl mx-auto space-y-6 animate-fade-in">
      {/* Topbar */}
      <header className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[var(--accent-light)] text-[var(--accent)] flex items-center justify-center font-black text-sm shadow-inner">
            {profile.username?.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-sm font-black tracking-tight leading-none text-[var(--text-main)]">Horizon Finances</h1>
            <p className="text-xs text-[var(--text-muted)] mt-0.5 font-medium">@{profile.username}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeSelector
            currentTheme={theme}
            userId={session.user.id}
            onThemeChange={applyTheme}
          />
          <button
            onClick={handleLogout}
            className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500 hover:text-white text-rose-500 text-xs font-bold transition-all border border-rose-500/20 active:scale-95"
          >
            Sair
          </button>
        </div>
      </header>

      {/* Cards de Métricas */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-sm space-y-1">
          <span className="text-[10px] font-bold tracking-wider uppercase text-[var(--text-muted)]">Saldo Atual</span>
          <p className={`text-2xl font-black ${currentBalance >= 0 ? 'text-[var(--text-main)]' : 'text-rose-500'}`}>
            R$ {currentBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>

        <div className="p-5 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-sm space-y-1">
          <span className="text-[10px] font-bold tracking-wider uppercase text-emerald-500">Entradas</span>
          <p className="text-2xl font-black text-emerald-500">
            + R$ {totalIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>

        <div className="p-5 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-sm space-y-1">
          <span className="text-[10px] font-bold tracking-wider uppercase text-rose-500">Saídas</span>
          <p className="text-2xl font-black text-rose-500">
            - R$ {totalExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </section>

      {/* Gráfico de Distribuição por Categorias */}
      <section className="p-6 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-sm space-y-4">
        <div>
          <h2 className="text-base font-bold text-[var(--text-main)]">Distribuição de Despesas</h2>
          <p className="text-xs text-[var(--text-muted)]">Visão percentual dos gastos por categoria</p>
        </div>
        <CategoryChart transactions={transactions} />
      </section>

      {/* Metas & Objetivos */}
      <section className="p-6 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-sm space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-[var(--text-main)]">Metas & Objetivos</h2>
            <p className="text-xs text-[var(--text-muted)]">Acompanhe e gerencie a evolução das suas economias</p>
          </div>
          <button
            onClick={() => setIsGoalModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs font-bold transition-all shadow-md active:scale-95"
          >
            <span>+</span> Nova Meta
          </button>
        </div>

        {loadingGoals ? (
          <div className="py-6 text-center text-xs text-[var(--text-muted)]">Carregando metas...</div>
        ) : goals.length === 0 ? (
          <div className="py-8 text-center rounded-2xl border border-dashed border-[var(--border-subtle)] bg-[var(--bg-card)]">
            <p className="text-xs font-medium text-[var(--text-muted)]">Você ainda não tem metas cadastradas.</p>
            <p className="text-[11px] text-[var(--text-muted)] mt-1">Crie um objetivo para acompanhar suas economias.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {goals.map((g) => {
              const current = Number(g.current_amount || 0);
              const target = Number(g.target_amount || 1);
              const progress = Math.min(Math.round((current / target) * 100), 100);

              return (
                <div
                  key={g.id}
                  className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] space-y-3 relative group"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-[var(--text-main)]">{g.title}</h4>
                      <span className="text-[10px] text-[var(--text-muted)]">
                        {g.category} {g.deadline ? `• até ${g.deadline}` : ''}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-[var(--accent)]">{progress}%</span>
                      <button
                        onClick={() => handleDeleteGoal(g.id)}
                        title="Remover meta"
                        className="w-6 h-6 rounded-lg flex items-center justify-center text-rose-400 hover:bg-rose-500/10 hover:text-rose-600 transition-colors text-xs"
                      >
                        ✕
                      </button>
                    </div>
                  </div>

                  <div className="w-full h-2 rounded-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] overflow-hidden">
                    <div
                      className="h-full bg-[var(--accent)] transition-all duration-500 rounded-full"
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <p className="text-[11px] text-[var(--text-muted)]">
                      R$ {current.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} de R${' '}
                      {target.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                    <button
                      onClick={() => handleAddAmountToGoal(g.id, current, 50)}
                      className="px-2.5 py-1 rounded-lg bg-[var(--accent-light)] text-[var(--accent)] text-[10px] font-bold hover:opacity-80 transition-opacity"
                    >
                      + R$ 50
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Histórico e Transações com Filtros */}
      <section className="p-6 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-sm space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-[var(--text-main)]">Transações Recentes</h2>
            <p className="text-xs text-[var(--text-muted)]">Filtre e pesquise suas movimentações</p>
          </div>
          <button
            onClick={() => setIsTxModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs font-bold transition-all shadow-md active:scale-95"
          >
            <span>+</span> Nova Movimentação
          </button>
        </div>

        {/* Barra de Filtros */}
        <div className="flex flex-wrap items-center gap-2.5 pt-1">
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Buscar pelo título..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs text-[var(--text-main)] focus:outline-none focus:border-[var(--accent)]"
            />
          </div>

          <div className="flex items-center p-1 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)]">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filterType === 'all'
                  ? 'bg-[var(--accent)] text-white shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              Todas
            </button>
            <button
              onClick={() => setFilterType('income')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filterType === 'income'
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              Entradas
            </button>
            <button
              onClick={() => setFilterType('expense')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filterType === 'expense'
                  ? 'bg-rose-500 text-white shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              Saídas
            </button>
          </div>

          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs text-[var(--text-main)] focus:outline-none focus:border-[var(--accent)]"
          >
            <option value="all">Todas Categorias</option>
            <option value="Geral">Geral</option>
            <option value="Alimentação">Alimentação</option>
            <option value="Transporte">Transporte</option>
            <option value="Lazer">Lazer</option>
            <option value="Trabalho">Trabalho</option>
            <option value="Contas">Contas</option>
          </select>
        </div>

        {/* Lista de Transações Filtradas */}
        {loadingTx ? (
          <div className="py-8 text-center text-xs text-[var(--text-muted)]">Carregando movimentações...</div>
        ) : filteredTransactions.length === 0 ? (
          <div className="py-10 text-center rounded-2xl border border-dashed border-[var(--border-subtle)] bg-[var(--bg-card)]">
            <p className="text-xs font-medium text-[var(--text-muted)]">
              {transactions.length === 0
                ? 'Nenhuma transação registrada ainda.'
                : 'Nenhuma movimentação corresponde aos filtros selecionados.'}
            </p>
            {transactions.length === 0 && (
              <p className="text-[11px] text-[var(--text-muted)] mt-1">Clique em "Nova Movimentação" para começar.</p>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredTransactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between p-3.5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] hover:border-[var(--accent)] transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                      tx.type === 'income' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
                    }`}
                  >
                    {tx.type === 'income' ? '↓' : '↑'}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[var(--text-main)]">{tx.title}</p>
                    <p className="text-[10px] text-[var(--text-muted)]">
                      {tx.category} • {tx.date}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`text-xs font-bold ${
                      tx.type === 'income' ? 'text-emerald-500' : 'text-rose-500'
                    }`}
                  >
                    {tx.type === 'income' ? '+' : '-'} R${' '}
                    {Number(tx.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                  <button
                    onClick={() => handleDeleteTransaction(tx.id)}
                    title="Excluir movimentação"
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors text-xs opacity-70 group-hover:opacity-100"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Modais */}
      <NewTransactionModal
        userId={session.user.id}
        isOpen={isTxModalOpen}
        onClose={() => setIsTxModalOpen(false)}
        onSuccess={() => fetchTransactions(session.user.id)}
      />

      <NewGoalModal
        userId={session.user.id}
        isOpen={isGoalModalOpen}
        onClose={() => setIsGoalModalOpen(false)}
        onSuccess={() => fetchGoals(session.user.id)}
      />
    </main>
  );
}