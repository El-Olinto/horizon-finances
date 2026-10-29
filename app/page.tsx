'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from './lib/supabase';
import Auth from './components/Auth';
import Logo from './components/Logo';
import ProfileModal from './components/ProfileModal';
import NewTransactionModal from './components/NewTransactionModal';
import EditTransactionModal from './components/EditTransactionModal';
import NewGoalModal from './components/NewGoalModal';
import EditGoalModal from './components/EditGoalModal';
import ManageGoalMoneyModal from './components/ManageGoalMoneyModal';
import CategoryChart from './components/CategoryChart';
import ConfirmModal from './components/ConfirmModal';

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

  // Modal Perfil & Configurações
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Transações
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingTx, setLoadingTx] = useState(false);
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // Filtros de Transações
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Caixinhas
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loadingGoals, setLoadingGoals] = useState(false);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);

  // Controlo de menu de opções (3 pontinhos) e modais das caixinhas
  const [openDropdownGoalId, setOpenDropdownGoalId] = useState<string | null>(null);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [managingGoal, setManagingGoal] = useState<Goal | null>(null);

  // Modal Customizado de Confirmação (Eliminação)
  const [confirmDeleteConfig, setConfirmDeleteConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    action: () => Promise<void>;
  }>({
    isOpen: false,
    title: '',
    message: '',
    action: async () => {},
  });

  // Registo de Username para 1º Login Google
  const [newUsername, setNewUsername] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [savingUsername, setSavingUsername] = useState(false);

  const applyTheme = async (themeName: string) => {
    if (typeof document !== 'undefined') {
      document.body.classList.remove('theme-day', 'theme-interestelar', 'theme-vintage_cute');
      document.body.classList.add(`theme-${themeName}`);
    }
    setTheme(themeName);

    if (session?.user) {
      await supabase
        .from('profiles')
        .update({ theme_preference: themeName })
        .eq('id', session.user.id);
    }
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

  const promptDeleteTransaction = (tx: Transaction) => {
    setConfirmDeleteConfig({
      isOpen: true,
      title: 'Eliminar Movimentação 🗑️',
      message: `Tem a certeza de que pretende apagar a transação "${tx.title}" no valor de R$ ${Number(tx.amount).toFixed(2)}? Esta ação não pode ser desfeita.`,
      action: async () => {
        const { error } = await supabase.from('transactions').delete().eq('id', tx.id);
        if (!error && session?.user) {
          await fetchTransactions(session.user.id);
        }
      },
    });
  };

  const promptDeleteGoal = (goal: Goal) => {
    setOpenDropdownGoalId(null);
    setConfirmDeleteConfig({
      isOpen: true,
      title: 'Eliminar Caixinha 📦',
      message: `Pretende realmente remover a caixinha "${goal.title}"? O saldo guardado nela (R$ ${Number(goal.current_amount || 0).toFixed(2)}) não será devolvido à conta a menos que faça o resgate previamente.`,
      action: async () => {
        const { error } = await supabase.from('goals').delete().eq('id', goal.id);
        if (!error && session?.user) {
          await fetchGoals(session.user.id);
        }
      },
    });
  };

  const handleExecuteConfirm = async () => {
    await confirmDeleteConfig.action();
    setConfirmDeleteConfig((prev) => ({ ...prev, isOpen: false }));
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
      console.error('Erro ao sincronizar utilizador:', e);
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
      setUsernameError('O nome de utilizador precisa de ter pelo menos 3 carateres.');
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

      if (existing) throw new Error('Este @username já se encontra em uso.');

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
      setUsernameError(err.message || 'Erro ao registar perfil');
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

  // Cálculos financeiros consolidados
  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((acc, t) => acc + Number(t.amount), 0);

  const totalExpense = transactions
    .filter((t) => t.type === 'expense')
    .reduce((acc, t) => acc + Number(t.amount), 0);

  const currentBalance = totalIncome - totalExpense;
  const totalInGoals = goals.reduce((acc, g) => acc + Number(g.current_amount || 0), 0);

  // Transações com filtros e pesquisa
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const matchesType = filterType === 'all' || tx.type === filterType;
      const matchesCategory = filterCategory === 'all' || tx.category === filterCategory;
      const matchesSearch = tx.title.toLowerCase().includes(searchTerm.toLowerCase().trim());
      return matchesType && matchesCategory && matchesSearch;
    });
  }, [transactions, filterType, filterCategory, searchTerm]);

  // Exportar dados filtrados ou completos em CSV
  const handleExportCSV = () => {
    const listToExport = filteredTransactions.length > 0 ? filteredTransactions : transactions;

    if (listToExport.length === 0) {
      alert('Não existem movimentações para exportar.');
      return;
    }

    const headers = ['Título', 'Tipo', 'Categoria', 'Valor (R$)', 'Data'];
    const rows = listToExport.map((t) => [
      `"${t.title.replace(/"/g, '""')}"`,
      t.type === 'income' ? 'Entrada' : 'Saída',
      `"${t.category}"`,
      Number(t.amount).toFixed(2).replace('.', ','),
      t.date,
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.setAttribute('href', url);
    link.setAttribute('download', `horizon_finances_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (loading || checkingProfile) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent)]"></div>
          <span className="text-xs text-[var(--text-muted)] font-medium">A carregar Horizon Finances...</span>
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
              Para concluir o seu registo, escolha o seu @username exclusivo:
            </p>
          </div>

          {usernameError && (
            <p className="text-xs text-rose-500 text-center font-bold bg-rose-500/10 p-2 rounded-xl border border-rose-500/20">
              {usernameError}
            </p>
          )}

          <form onSubmit={handleCreateProfile} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-[var(--text-main)] mb-1">O seu @username</label>
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
              {savingUsername ? 'A guardar...' : 'Confirmar e Entrar'}
            </button>
          </form>

          <div className="pt-2 border-t border-[var(--border-subtle)] text-center">
            <button
              type="button"
              onClick={handleLogout}
              className="text-xs text-[var(--text-muted)] hover:text-rose-500 transition-colors font-medium"
            >
              Cancelar e regressar ao ecrã de início de sessão
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main
      className="min-h-screen flex flex-col p-4 sm:p-6 max-w-5xl mx-auto space-y-6 animate-fade-in"
      onClick={() => setOpenDropdownGoalId(null)}
    >
      {/* Topbar com Logo e Menu de Perfil */}
      <header className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-sm">
        <Logo size={36} />

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => setIsProfileModalOpen(true)}
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-2xl bg-[var(--bg-card)] hover:border-[var(--accent)] border border-[var(--border-subtle)] transition-all shadow-sm active:scale-95 group"
          >
            <div className="w-7 h-7 rounded-xl bg-[var(--accent-light)] text-[var(--accent)] flex items-center justify-center font-black text-xs overflow-hidden">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.username}
                  className="w-full h-full object-cover"
                />
              ) : (
                profile.username?.charAt(0).toUpperCase()
              )}
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-xs font-bold text-[var(--text-main)] leading-none">
                {profile.full_name || `@${profile.username}`}
              </p>
              <span className="text-[10px] text-[var(--text-muted)]">Configurações</span>
            </div>
          </button>

          <button
            onClick={handleLogout}
            className="px-3 py-2 rounded-2xl bg-rose-500/10 hover:bg-rose-500 hover:text-white text-rose-500 text-xs font-bold transition-all border border-rose-500/20 active:scale-95"
          >
            Sair
          </button>
        </div>
      </header>

      {/* Cartões de Métricas Principais (4 Colunas) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-sm space-y-1">
          <span className="text-[10px] font-bold tracking-wider uppercase text-[var(--text-muted)]">Saldo em Conta</span>
          <p className={`text-2xl font-black ${currentBalance >= 0 ? 'text-[var(--text-main)]' : 'text-rose-500'}`}>
            R$ {currentBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>

        <div className="p-5 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-sm space-y-1">
          <span className="text-[10px] font-bold tracking-wider uppercase text-[var(--accent)]">Em Caixinhas 📦</span>
          <p className="text-2xl font-black text-[var(--accent)]">
            R$ {totalInGoals.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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

      {/* Caixinhas & Metas */}
      <section className="p-6 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-sm space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-[var(--text-main)]">Caixinhas & Objetivos 📦</h2>
            <p className="text-xs text-[var(--text-muted)]">O dinheiro guardado sai do saldo e volta quando for resgatado</p>
          </div>
          <button
            onClick={() => setIsGoalModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs font-bold transition-all shadow-md active:scale-95"
          >
            <span>+</span> Nova Caixinha
          </button>
        </div>

        {loadingGoals ? (
          <div className="py-6 text-center text-xs text-[var(--text-muted)]">A carregar caixinhas...</div>
        ) : goals.length === 0 ? (
          <div className="py-8 text-center rounded-2xl border border-dashed border-[var(--border-subtle)] bg-[var(--bg-card)]">
            <p className="text-xs font-medium text-[var(--text-muted)]">Ainda não tem caixinhas criadas.</p>
            <p className="text-[11px] text-[var(--text-muted)] mt-1">Crie a sua primeira caixinha para reservar parte do seu saldo.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {goals.map((g) => {
              const current = Number(g.current_amount || 0);
              const target = Number(g.target_amount || 1);
              const progress = Math.min(Math.round((current / target) * 100), 100);
              const isDropdownOpen = openDropdownGoalId === g.id;

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

                    <div className="flex items-center gap-2 relative">
                      <span className="text-xs font-black text-[var(--accent)]">{progress}%</span>

                      {/* Botão Opções (3 pontinhos) */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenDropdownGoalId(isDropdownOpen ? null : g.id);
                        }}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--accent-light)] transition-colors text-sm font-bold"
                        title="Opções da caixinha"
                      >
                        ⋯
                      </button>

                      {isDropdownOpen && (
                        <div
                          className="absolute right-0 top-8 z-30 w-36 py-1 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-xl animate-fade-in"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setEditingGoal(g);
                              setOpenDropdownGoalId(null);
                            }}
                            className="w-full text-left px-3 py-2 text-xs font-medium text-[var(--text-main)] hover:bg-[var(--accent-light)] flex items-center gap-2 transition-colors"
                          >
                            <span>✏️</span> Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => promptDeleteGoal(g)}
                            className="w-full text-left px-3 py-2 text-xs font-medium text-rose-500 hover:bg-rose-500/10 flex items-center gap-2 transition-colors"
                          >
                            <span>🗑️</span> Eliminar
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="w-full h-2 rounded-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] overflow-hidden">
                    <div
                      className="h-full bg-[var(--accent)] transition-all duration-500 rounded-full"
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <p className="text-[11px] text-[var(--text-muted)]">
                      R$ {current.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} de R${' '}
                      {target.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>

                    <button
                      type="button"
                      onClick={() => setManagingGoal(g)}
                      className="px-3 py-1.5 rounded-xl bg-[var(--accent-light)] text-[var(--accent)] text-[11px] font-bold hover:opacity-80 transition-all shadow-sm"
                    >
                      Guardar / Resgatar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Histórico e Transações */}
      <section className="p-6 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-sm space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-[var(--text-main)]">Transações Recentes</h2>
            <p className="text-xs text-[var(--text-muted)]">Filtre, edite e exporte as suas movimentações</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-[var(--bg-card)] hover:bg-[var(--accent-light)] text-[var(--text-main)] border border-[var(--border-subtle)] text-xs font-bold transition-all shadow-sm active:scale-95"
            >
              <span>📥</span> Exportar CSV
            </button>
            <button
              onClick={() => setIsTxModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs font-bold transition-all shadow-md active:scale-95"
            >
              <span>+</span> Nova Movimentação
            </button>
          </div>
        </div>

        {/* Barra de Filtros */}
        <div className="flex flex-wrap items-center gap-2.5 pt-1">
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Pesquisar por título..."
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
            <option value="all">Todas as Categorias</option>
            <option value="Geral">Geral</option>
            <option value="Caixinhas">Caixinhas</option>
            <option value="Alimentação">Alimentação</option>
            <option value="Transporte">Transporte</option>
            <option value="Lazer">Lazer</option>
            <option value="Trabalho">Trabalho</option>
            <option value="Contas">Contas</option>
          </select>
        </div>

        {/* Lista de Transações */}
        {loadingTx ? (
          <div className="py-8 text-center text-xs text-[var(--text-muted)]">A carregar movimentações...</div>
        ) : filteredTransactions.length === 0 ? (
          <div className="py-10 text-center rounded-2xl border border-dashed border-[var(--border-subtle)] bg-[var(--bg-card)]">
            <p className="text-xs font-medium text-[var(--text-muted)]">
              {transactions.length === 0
                ? 'Nenhuma transação registada até ao momento.'
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

                <div className="flex items-center gap-2 sm:gap-3">
                  <span
                    className={`text-xs font-bold ${
                      tx.type === 'income' ? 'text-emerald-500' : 'text-rose-500'
                    }`}
                  >
                    {tx.type === 'income' ? '+' : '-'} R${' '}
                    {Number(tx.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>

                  <button
                    onClick={() => setEditingTransaction(tx)}
                    title="Editar movimentação"
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-[var(--accent)] hover:bg-[var(--accent-light)] transition-colors text-xs opacity-70 group-hover:opacity-100"
                  >
                    ✏️
                  </button>

                  <button
                    onClick={() => promptDeleteTransaction(tx)}
                    title="Eliminar movimentação"
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

      {/* Modal: Meu Perfil + Configurações */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        profile={profile}
        currentTheme={theme}
        totalBalance={currentBalance}
        totalGoals={totalInGoals}
        onClose={() => setIsProfileModalOpen(false)}
        onThemeChange={applyTheme}
        onProfileUpdated={refreshUser}
      />

      {/* Modal: Nova Transação */}
      <NewTransactionModal
        userId={session.user.id}
        isOpen={isTxModalOpen}
        onClose={() => setIsTxModalOpen(false)}
        onSuccess={() => fetchTransactions(session.user.id)}
      />

      {/* Modal: Editar Transação */}
      <EditTransactionModal
        transaction={editingTransaction}
        isOpen={Boolean(editingTransaction)}
        onClose={() => setEditingTransaction(null)}
        onSuccess={() => {
          if (session?.user) fetchTransactions(session.user.id);
        }}
      />

      {/* Modal: Nova Caixinha */}
      <NewGoalModal
        userId={session.user.id}
        isOpen={isGoalModalOpen}
        onClose={() => setIsGoalModalOpen(false)}
        onSuccess={() => fetchGoals(session.user.id)}
      />

      {/* Modal: Editar Caixinha */}
      <EditGoalModal
        goal={editingGoal}
        isOpen={Boolean(editingGoal)}
        onClose={() => setEditingGoal(null)}
        onSuccess={() => {
          if (session?.user) fetchGoals(session.user.id);
        }}
      />

      {/* Modal: Guardar / Resgatar Dinheiro da Caixinha */}
      <ManageGoalMoneyModal
        goal={managingGoal}
        userId={session.user.id}
        currentBalance={currentBalance}
        isOpen={Boolean(managingGoal)}
        onClose={() => setManagingGoal(null)}
        onSuccess={async () => {
          if (session?.user) {
            await Promise.all([
              fetchTransactions(session.user.id),
              fetchGoals(session.user.id),
            ]);
          }
        }}
      />

      {/* Modal Customizado de Confirmação de Eliminação */}
      <ConfirmModal
        isOpen={confirmDeleteConfig.isOpen}
        title={confirmDeleteConfig.title}
        message={confirmDeleteConfig.message}
        confirmText="Sim, eliminar"
        cancelText="Voltar"
        isDestructive={true}
        onConfirm={handleExecuteConfirm}
        onCancel={() => setConfirmDeleteConfig((prev) => ({ ...prev, isOpen: false }))}
      />
    </main>
  );
}