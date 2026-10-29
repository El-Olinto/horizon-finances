'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
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
import AppleEmoji from './components/AppleEmoji';

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
  const [theme, setTheme] = useState('interestelar');

  const [currentNavTab, setCurrentNavTab] = useState<'inicio' | 'transacoes' | 'metas' | 'analises'>('inicio');
  const [activeSidebarView, setActiveSidebarView] = useState<'dashboard' | 'coming_soon'>('dashboard');

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const metasSectionRef = useRef<HTMLElement>(null);
  const transacoesSectionRef = useRef<HTMLElement>(null);
  const analisesSectionRef = useRef<HTMLElement>(null);

  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingTx, setLoadingTx] = useState(false);
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const [goals, setGoals] = useState<Goal[]>([]);
  const [loadingGoals, setLoadingGoals] = useState(false);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);

  const [openDropdownGoalId, setOpenDropdownGoalId] = useState<string | null>(null);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [managingGoal, setManagingGoal] = useState<Goal | null>(null);

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

  const [newUsername, setNewUsername] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [savingUsername, setSavingUsername] = useState(false);

  const isAnyModalOpen =
    isProfileModalOpen ||
    isTxModalOpen ||
    Boolean(editingTransaction) ||
    isGoalModalOpen ||
    Boolean(editingGoal) ||
    Boolean(managingGoal) ||
    confirmDeleteConfig.isOpen;

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
      title: theme === 'vintage_cute' ? 'Eliminar Registo?' : 'Eliminar Movimentação',
      message: `Tem a certeza de que pretende eliminar a transação "${tx.title}" no montante de R$ ${Number(tx.amount).toFixed(2)}?`,
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
      title: theme === 'vintage_cute' ? 'Remover Caixinha?' : 'Eliminar Caixinha',
      message: `Pretende mesmo eliminar a caixinha "${goal.title}"? O montante guardado nela (R$ ${Number(goal.current_amount || 0).toFixed(2)}) não regressará ao saldo automaticamente a menos que faça o resgate antes.`,
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
        applyTheme('interestelar');
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
        applyTheme('interestelar');
      }
    } catch (e) {
      console.error('Erro ao sincronizar perfil:', e);
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
        applyTheme('interestelar');
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
      setUsernameError('O nome de utilizador tem de ter pelo menos 3 carateres.');
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

      if (existing) throw new Error('Este @username já se encontra registado.');

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
    applyTheme('interestelar');
    setLoading(false);
  };

  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((acc, t) => acc + Number(t.amount), 0);

  const totalExpense = transactions
    .filter((t) => t.type === 'expense')
    .reduce((acc, t) => acc + Number(t.amount), 0);

  const currentBalance = totalIncome - totalExpense;
  const totalInGoals = goals.reduce((acc, g) => acc + Number(g.current_amount || 0), 0);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const matchesType = filterType === 'all' || tx.type === filterType;
      const matchesCategory = filterCategory === 'all' || tx.category === filterCategory;
      const matchesSearch = tx.title.toLowerCase().includes(searchTerm.toLowerCase().trim());
      return matchesType && matchesCategory && matchesSearch;
    });
  }, [transactions, filterType, filterCategory, searchTerm]);

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

  const handleNavClick = (tab: 'inicio' | 'transacoes' | 'metas' | 'analises') => {
    setCurrentNavTab(tab);
    setActiveSidebarView('dashboard');

    if (!scrollContainerRef.current) return;

    if (tab === 'inicio') {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (tab === 'metas') {
      metasSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (tab === 'transacoes') {
      transacoesSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (tab === 'analises') {
      analisesSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
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
    return <Auth onSuccess={refreshUser} />;
  }

  if (!profile || !profile.username) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md p-6 sm:p-8 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-2xl space-y-5 animate-fade-in">
          <div className="text-center">
            <h2 className="text-xl font-black text-[var(--accent)] flex items-center justify-center gap-2">
              <span>Primeiro acesso com a Google!</span>
              <AppleEmoji emoji="🎉" size={20} />
            </h2>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Para concluir a sua configuração, defina o seu @username exclusivo:
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
                className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs text-[var(--text-main)] focus:outline-none focus:border-[var(--accent)] select-text"
              />
            </div>
            <button
              type="submit"
              disabled={savingUsername}
              className="w-full py-2.5 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-bold text-xs transition-all shadow-md disabled:opacity-50"
            >
              {savingUsername ? 'A guardar...' : 'Confirmar e Iniciar'}
            </button>
          </form>

          <div className="pt-2 border-t border-[var(--border-subtle)] text-center">
            <button
              type="button"
              onClick={handleLogout}
              className="text-xs text-[var(--text-muted)] hover:text-rose-500 transition-colors font-medium"
            >
              Cancelar e voltar
            </button>
          </div>
        </div>
      </main>
    );
  }

  const navTabs = [
    { id: 'inicio', label: 'Início', emoji: theme === 'vintage_cute' ? '🌸' : '🏠' },
    { id: 'transacoes', label: 'Transações', emoji: theme === 'vintage_cute' ? '✨' : '💳' },
    { id: 'metas', label: 'Metas', emoji: theme === 'vintage_cute' ? '🎀' : '📦' },
    { id: 'analises', label: 'Análises', emoji: theme === 'vintage_cute' ? '📊' : '📈' },
  ];

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden flex flex-col select-none">
      <div
        className={`flex-1 flex h-full w-full overflow-hidden transition-all duration-300 ${
          isAnyModalOpen ? 'blur-md pointer-events-none scale-[0.995]' : ''
        }`}
        onClick={() => setOpenDropdownGoalId(null)}
      >
        {/* ========================================================
            BARRA LATERAL ESQUERDA (DESKTOP md:flex)
        ======================================================== */}
        <aside className="hidden md:flex w-16 sm:w-20 h-full flex-shrink-0 flex-col items-center justify-between py-6 px-2 border-r border-[var(--border-subtle)] bg-[var(--bg-surface)] backdrop-blur-xl z-30 select-none">
          <div className="flex flex-col items-center gap-6 w-full">
            <button
              onClick={() => {
                setActiveSidebarView('dashboard');
                setCurrentNavTab('inicio');
                scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              title="Painel Principal"
              className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all ${
                activeSidebarView === 'dashboard'
                  ? 'bg-[var(--accent)] text-white shadow-lg shadow-[var(--accent)]/30 scale-105'
                  : 'text-[var(--text-muted)] hover:bg-[var(--accent-light)] hover:text-[var(--text-main)]'
              }`}
            >
              <AppleEmoji emoji={theme === 'vintage_cute' ? '🏠' : '📊'} size={20} />
            </button>

            <button
              onClick={() => setActiveSidebarView('coming_soon')}
              title="Partilhar Metas? Brevemente..."
              className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all relative ${
                activeSidebarView === 'coming_soon'
                  ? 'bg-[var(--accent)] text-white shadow-lg shadow-[var(--accent)]/30 scale-105'
                  : 'text-[var(--text-muted)] hover:bg-[var(--accent-light)] hover:text-[var(--text-main)]'
              }`}
            >
              <AppleEmoji emoji={theme === 'vintage_cute' ? '🎀' : '👥'} size={20} />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-400 rounded-full animate-ping" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-400 rounded-full" />
            </button>

            <button
              onClick={() => handleNavClick('transacoes')}
              title="Aceder a Transações"
              className="w-11 h-11 rounded-2xl flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--accent-light)] hover:text-[var(--text-main)] transition-all"
            >
              <AppleEmoji emoji={theme === 'vintage_cute' ? '📖' : '💳'} size={20} />
            </button>
          </div>

          <button
            onClick={() => setIsProfileModalOpen(true)}
            title="Definições de Perfil"
            className="w-10 h-10 rounded-2xl flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--accent-light)] hover:text-[var(--text-main)] transition-all"
          >
            <AppleEmoji emoji={theme === 'vintage_cute' ? '🌸' : '⚙️'} size={20} />
          </button>
        </aside>

        {/* ========================================================
            CONTENTOR PRINCIPAL (CABEÇALHO LIQUID GLASS + PAINEL)
        ======================================================== */}
        <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
          {/* CABEÇALHO SUPERIOR COMPACTO COM LIQUID GLASS */}
          <header className="flex-shrink-0 w-full bg-[var(--bg-surface)]/85 backdrop-blur-2xl border-b border-[var(--border-subtle)] shadow-[0_8px_32px_0_rgba(0,0,0,0.18)] z-30 transition-all">
            {/* Linha 1: Marca & Ações Principais */}
            <div className="px-3 sm:px-8 py-2.5 sm:py-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Logo size={32} />
              </div>

              {/* Pílula Central Exclusiva para Desktop */}
              <nav
                translate="no"
                className="notranslate hidden md:flex items-center p-1 rounded-full bg-[var(--bg-card)] border border-[var(--border-subtle)] shadow-inner"
              >
                {navTabs.map((tab) => (
                  <button
                    key={tab.id}
                    translate="no"
                    onClick={() => handleNavClick(tab.id as any)}
                    className={`notranslate flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                      currentNavTab === tab.id && activeSidebarView === 'dashboard'
                        ? 'bg-[var(--accent)] text-white shadow-sm'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                    }`}
                  >
                    <AppleEmoji emoji={tab.emoji} size={14} />
                    <span>{tab.label}</span>
                  </button>
                ))}
              </nav>

              {/* Botões do Topo */}
              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  onClick={() => setIsTxModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs font-bold transition-all shadow-md active:scale-95"
                >
                  <AppleEmoji emoji={theme === 'vintage_cute' ? '✨' : '➕'} size={12} />
                  <span className="hidden sm:inline">Novo Lançamento</span>
                  <span className="sm:hidden">Novo</span>
                </button>

                <button
                  onClick={() => setIsProfileModalOpen(true)}
                  className="flex items-center gap-2 p-1 sm:px-3 sm:py-1.5 rounded-full bg-[var(--bg-card)] hover:border-[var(--accent)] border border-[var(--border-subtle)] transition-all shadow-sm active:scale-95 group"
                >
                  <div className="w-7 h-7 rounded-full bg-[var(--accent-light)] text-[var(--accent)] flex items-center justify-center font-black text-xs overflow-hidden">
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
                  <div className="text-left hidden lg:block">
                    <p className="text-xs font-bold text-[var(--text-main)] leading-none">
                      {profile.full_name || `@${profile.username}`}
                    </p>
                    <span className="text-[10px] text-[var(--text-muted)]">Definições</span>
                  </div>
                </button>

                <button
                  onClick={handleLogout}
                  className="px-2.5 sm:px-3 py-1.5 rounded-full bg-rose-500/10 hover:bg-rose-500 hover:text-white text-rose-500 text-xs font-bold transition-all border border-rose-500/20 active:scale-95"
                >
                  Sair
                </button>
              </div>
            </div>

            {/* Linha 2: Pílula de Navegação Integrada ao Topo Móvel (md:hidden) */}
            <div className="md:hidden px-3 pb-2.5 pt-0.5 flex items-center justify-between gap-1 overflow-x-auto no-scrollbar">
              <div
                translate="no"
                className="notranslate w-full flex items-center justify-between p-1 rounded-2xl bg-[var(--bg-card)]/80 border border-[var(--border-subtle)] shadow-inner"
              >
                {navTabs.map((tab) => (
                  <button
                    key={tab.id}
                    translate="no"
                    onClick={() => handleNavClick(tab.id as any)}
                    className={`notranslate flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-xl text-[11px] font-bold transition-all ${
                      currentNavTab === tab.id && activeSidebarView === 'dashboard'
                        ? 'bg-[var(--accent)] text-white shadow-sm scale-[1.02]'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                    }`}
                  >
                    <AppleEmoji emoji={tab.emoji} size={13} />
                    <span>{tab.label}</span>
                  </button>
                ))}

                <button
                  translate="no"
                  onClick={() => setActiveSidebarView('coming_soon')}
                  className={`notranslate flex items-center justify-center gap-1 py-1.5 px-2 rounded-xl text-[11px] font-bold transition-all relative ${
                    activeSidebarView === 'coming_soon'
                      ? 'bg-[var(--accent)] text-white shadow-sm scale-[1.02]'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                  }`}
                >
                  <AppleEmoji emoji="👥" size={13} />
                  <span className="hidden xs:inline">Metas+</span>
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-amber-400 rounded-full animate-ping" />
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-amber-400 rounded-full" />
                </button>
              </div>
            </div>
          </header>

          {/* ÁREA INTERNA COM ROLAGEM INDEPENDENTE */}
          <div
            ref={scrollContainerRef}
            className="flex-1 overflow-y-auto overscroll-contain p-3 sm:p-8 pb-12"
          >
            <div className="max-w-7xl w-full mx-auto space-y-5 sm:space-y-6">
              {activeSidebarView === 'coming_soon' ? (
                /* ECRÃ DE SUSPENSE */
                <div className="py-16 sm:py-24 flex flex-col items-center justify-center text-center animate-fade-in space-y-6 px-2">
                  <div className="relative flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24">
                    <div className="absolute inset-0 rounded-full border-4 border-[var(--accent-light)] border-t-[var(--accent)] animate-spin" />
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-xl flex items-center justify-center">
                      <AppleEmoji emoji={theme === 'vintage_cute' ? '🌸' : '👥'} size={28} />
                    </div>
                  </div>

                  <div className="space-y-3 max-w-lg">
                    <span className="px-3 py-1 rounded-full text-[10px] sm:text-[11px] font-black uppercase tracking-widest bg-rose-400/20 text-rose-500 border border-rose-400/30">
                      Funcionalidade em Desenvolvimento
                    </span>
                    <h2 className="text-2xl sm:text-4xl font-black text-[var(--text-main)] tracking-tight">
                      Que tal partilhar metas?
                    </h2>
                    <p className="text-xs sm:text-sm font-bold text-[var(--accent)] tracking-widest uppercase animate-pulse flex items-center justify-center gap-1.5">
                      <span>Brevemente...</span>
                      <AppleEmoji emoji="✨" size={15} />
                    </p>
                    <p className="text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed pt-1">
                      Imagine poupar para viagens, remodelações ou sonhos a dois e em grupo, com saldos e progresso sincronizados em tempo real na mesma caixinha.
                    </p>
                  </div>

                  <button
                    onClick={() => setActiveSidebarView('dashboard')}
                    className="px-6 py-2.5 rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs font-bold transition-all shadow-md active:scale-95"
                  >
                    ← Voltar ao Painel
                  </button>
                </div>
              ) : (
                /* PAINEL FINANCEIRO */
                <>
                  <div className="px-1">
                    <h2 className="text-xl sm:text-2xl font-black text-[var(--text-main)] tracking-tight flex items-center gap-2">
                      <span>Olá, {profile.full_name?.split(' ')[0] || profile.username}!</span>
                      {theme === 'vintage_cute' && <AppleEmoji emoji="🌸" size={20} />}
                    </h2>
                    <div className="text-[11px] sm:text-xs font-semibold text-[var(--text-muted)] mt-0.5 flex items-center gap-1.5">
                      {theme === 'day' ? (
                        <>
                          <span>Vamos planear o dia sob céu limpo?</span>
                          <AppleEmoji emoji="☀️" size={14} />
                        </>
                      ) : theme === 'interestelar' ? (
                        <>
                          <span>A navegar pelas suas órbitas financeiras</span>
                          <AppleEmoji emoji="🚀" size={14} />
                        </>
                      ) : (
                        <>
                          <span>Tudo com muito carinho, fofura e organização</span>
                          <AppleEmoji emoji="🌸" size={14} />
                          <AppleEmoji emoji="✨" size={14} />
                        </>
                      )}
                    </div>
                  </div>

                  {/* Cartões de Métricas */}
                  <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    <div className="p-4 sm:p-5 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-sm space-y-1">
                      <span className="text-[9px] sm:text-[10px] font-bold tracking-wider uppercase text-[var(--text-muted)] flex items-center gap-1">
                        {theme === 'vintage_cute' ? (
                          <AppleEmoji emoji="🌸" size={12} />
                        ) : (
                          <AppleEmoji emoji="💰" size={12} />
                        )}
                        <span>Saldo</span>
                      </span>
                      <p className={`text-lg sm:text-2xl font-black ${currentBalance >= 0 ? 'text-[var(--text-main)]' : 'text-rose-500'}`}>
                        R$ {currentBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>

                    <div className="p-4 sm:p-5 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-sm space-y-1">
                      <span className="text-[9px] sm:text-[10px] font-bold tracking-wider uppercase text-[var(--accent)] flex items-center gap-1">
                        {theme === 'vintage_cute' ? (
                          <AppleEmoji emoji="🎀" size={12} />
                        ) : (
                          <AppleEmoji emoji="📦" size={12} />
                        )}
                        <span>Caixinhas</span>
                      </span>
                      <p className="text-lg sm:text-2xl font-black text-[var(--accent)]">
                        R$ {totalInGoals.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>

                    <div className="p-4 sm:p-5 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-sm space-y-1">
                      <span className="text-[9px] sm:text-[10px] font-bold tracking-wider uppercase text-emerald-500 flex items-center gap-1">
                        {theme === 'vintage_cute' && <AppleEmoji emoji="✨" size={12} />}
                        <span>Entradas</span>
                      </span>
                      <p className="text-lg sm:text-2xl font-black text-emerald-500">
                        + R$ {totalIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>

                    <div className="p-4 sm:p-5 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-sm space-y-1">
                      <span className="text-[9px] sm:text-[10px] font-bold tracking-wider uppercase text-rose-500 flex items-center gap-1">
                        {theme === 'vintage_cute' && <AppleEmoji emoji="🍓" size={12} />}
                        <span>Saídas</span>
                      </span>
                      <p className="text-lg sm:text-2xl font-black text-rose-500">
                        - R$ {totalExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </section>

                  {/* Gráfico de Distribuição */}
                  <section
                    ref={analisesSectionRef}
                    className="p-4 sm:p-6 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-sm space-y-4"
                  >
                    <div>
                      <h2 className="text-sm sm:text-base font-bold text-[var(--text-main)] flex items-center gap-1.5">
                        {theme === 'vintage_cute' ? (
                          <>
                            <AppleEmoji emoji="🌸" size={16} />
                            <span>Para onde foi o dinheiro?</span>
                          </>
                        ) : (
                          <>
                            <AppleEmoji emoji="📊" size={16} />
                            <span>Distribuição de Despesas</span>
                          </>
                        )}
                      </h2>
                      <p className="text-[11px] sm:text-xs text-[var(--text-muted)]">Visão percentual dos gastos por categoria</p>
                    </div>
                    <CategoryChart transactions={transactions} />
                  </section>

                  {/* Caixinhas e Metas */}
                  <section
                    ref={metasSectionRef}
                    className="p-4 sm:p-6 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-sm space-y-4 sm:space-y-5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h2 className="text-sm sm:text-base font-bold text-[var(--text-main)] flex items-center gap-1.5">
                          {theme === 'vintage_cute' ? (
                            <>
                              <AppleEmoji emoji="🎀" size={16} />
                              <span>Caixinhas e Sonhos</span>
                            </>
                          ) : (
                            <>
                              <AppleEmoji emoji="📦" size={16} />
                              <span>Caixinhas e Objetivos</span>
                            </>
                          )}
                        </h2>
                        <p className="text-[11px] sm:text-xs text-[var(--text-muted)]">O montante reservado sai do saldo corrente</p>
                      </div>
                      <button
                        onClick={() => setIsGoalModalOpen(true)}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs font-bold transition-all shadow-md active:scale-95"
                      >
                        {theme === 'vintage_cute' ? (
                          <AppleEmoji emoji="✨" size={13} />
                        ) : (
                          <AppleEmoji emoji="➕" size={11} />
                        )}
                        <span>Nova Caixinha</span>
                      </button>
                    </div>

                    {loadingGoals ? (
                      <div className="py-6 text-center text-xs text-[var(--text-muted)] flex items-center justify-center gap-2">
                        <AppleEmoji emoji="⏳" size={16} />
                        <span>A carregar caixinhas...</span>
                      </div>
                    ) : goals.length === 0 ? (
                      <div className="py-8 text-center rounded-2xl border border-dashed border-[var(--border-subtle)] bg-[var(--bg-card)]">
                        <p className="text-xs font-medium text-[var(--text-muted)]">Ainda não tem caixinhas criadas.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                        {goals.map((g) => {
                          const current = Number(g.current_amount || 0);
                          const target = Number(g.target_amount || 1);
                          const progress = Math.min(Math.round((current / target) * 100), 100);
                          const isDropdownOpen = openDropdownGoalId === g.id;

                          return (
                            <div
                              key={g.id}
                              className="p-4 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)] space-y-3 relative"
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

                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOpenDropdownGoalId(isDropdownOpen ? null : g.id);
                                    }}
                                    className="w-7 h-7 rounded-full flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--accent-light)] transition-colors text-sm font-bold"
                                    title="Opções da caixinha"
                                  >
                                    ⋯
                                  </button>

                                  {isDropdownOpen && (
                                    <div
                                      className="absolute right-0 top-8 z-30 w-36 py-1 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-xl animate-fade-in"
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
                                        <AppleEmoji emoji="✏️" size={14} />
                                        <span>Editar</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => promptDeleteGoal(g)}
                                        className="w-full text-left px-3 py-2 text-xs font-medium text-rose-500 hover:bg-rose-500/10 flex items-center gap-2 transition-colors"
                                      >
                                        <AppleEmoji emoji="🗑️" size={14} />
                                        <span>Eliminar</span>
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="w-full h-2.5 rounded-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] overflow-hidden p-0.5">
                                <div
                                  className="h-full bg-[var(--accent)] transition-all duration-500 rounded-full"
                                  style={{ width: `${progress}%` }}
                                ></div>
                              </div>

                              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                                <p className="text-[11px] text-[var(--text-muted)] font-medium">
                                  R$ {current.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} de R${' '}
                                  {target.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </p>

                                <button
                                  type="button"
                                  onClick={() => setManagingGoal(g)}
                                  className="px-3 py-1.5 rounded-full bg-[var(--accent-light)] text-[var(--accent)] text-[11px] font-bold hover:opacity-80 transition-all shadow-sm"
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
                  <section
                    ref={transacoesSectionRef}
                    className="p-4 sm:p-6 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-sm space-y-4 sm:space-y-5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h2 className="text-sm sm:text-base font-bold text-[var(--text-main)] flex items-center gap-1.5">
                          {theme === 'vintage_cute' ? (
                            <>
                              <AppleEmoji emoji="✨" size={16} />
                              <span>Extrato Fofinho</span>
                            </>
                          ) : (
                            <>
                              <AppleEmoji emoji="💳" size={16} />
                              <span>Transações Recentes</span>
                            </>
                          )}
                        </h2>
                        <p className="text-[11px] sm:text-xs text-[var(--text-muted)]">Filtre e consulte as suas movimentações</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleExportCSV}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-[var(--bg-card)] hover:bg-[var(--accent-light)] text-[var(--text-main)] border border-[var(--border-subtle)] text-xs font-bold transition-all shadow-sm active:scale-95"
                        >
                          <AppleEmoji emoji="📥" size={14} />
                          <span>CSV</span>
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
                      <div className="flex-1">
                        <input
                          type="text"
                          placeholder="Pesquisar por título..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full px-4 py-2 rounded-full bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs text-[var(--text-main)] focus:outline-none focus:border-[var(--accent)] select-text"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex items-center p-1 rounded-full bg-[var(--bg-card)] border border-[var(--border-subtle)] flex-1 sm:flex-none justify-center">
                          <button
                            onClick={() => setFilterType('all')}
                            className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                              filterType === 'all'
                                ? 'bg-[var(--accent)] text-white shadow-sm'
                                : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                            }`}
                          >
                            Todas
                          </button>
                          <button
                            onClick={() => setFilterType('income')}
                            className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                              filterType === 'income'
                                ? 'bg-emerald-500 text-white shadow-sm'
                                : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                            }`}
                          >
                            +
                          </button>
                          <button
                            onClick={() => setFilterType('expense')}
                            className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                              filterType === 'expense'
                                ? 'bg-rose-500 text-white shadow-sm'
                                : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                            }`}
                          >
                            -
                          </button>
                        </div>

                        <select
                          value={filterCategory}
                          onChange={(e) => setFilterCategory(e.target.value)}
                          className="px-3 py-2 rounded-full bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs text-[var(--text-main)] focus:outline-none focus:border-[var(--accent)] select-text"
                        >
                          <option value="all">Categorias</option>
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

                    {loadingTx ? (
                      <div className="py-8 text-center text-xs text-[var(--text-muted)] flex items-center justify-center gap-2">
                        <AppleEmoji emoji="⏳" size={16} />
                        <span>A carregar movimentações...</span>
                      </div>
                    ) : filteredTransactions.length === 0 ? (
                      <div className="py-8 text-center rounded-3xl border border-dashed border-[var(--border-subtle)] bg-[var(--bg-card)]">
                        <p className="text-xs font-medium text-[var(--text-muted)]">Nenhuma transação encontrada.</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {filteredTransactions.map((tx) => (
                          <div
                            key={tx.id}
                            className="flex items-center justify-between p-3 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] hover:border-[var(--accent)] transition-colors"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                                  tx.type === 'income' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
                                }`}
                              >
                                {tx.type === 'income' ? '↓' : '↑'}
                              </div>
                              <div className="truncate">
                                <p className="text-xs font-bold text-[var(--text-main)] truncate">{tx.title}</p>
                                <p className="text-[10px] text-[var(--text-muted)]">
                                  {tx.category} • {tx.date}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 flex-shrink-0">
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
                                className="w-6 h-6 rounded-full flex items-center justify-center text-slate-400 hover:text-[var(--accent)] transition-colors"
                              >
                                <AppleEmoji emoji="✏️" size={12} />
                              </button>

                              <button
                                onClick={() => promptDeleteTransaction(tx)}
                                title="Eliminar movimentação"
                                className="w-6 h-6 rounded-full flex items-center justify-center text-slate-400 hover:text-rose-500 transition-colors"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* JANELAS MODAIS */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        profile={profile}
        currentTheme={theme}
        totalBalance={currentBalance}
        totalGoals={totalInGoals}
        onClose={() => setIsProfileModalOpen(false)}
        onThemeChange={applyTheme}
        onProfileUpdated={refreshUser}
        onAccountDeleted={handleLogout}
      />

      <NewTransactionModal
        userId={session.user.id}
        isOpen={isTxModalOpen}
        onClose={() => setIsTxModalOpen(false)}
        onSuccess={() => fetchTransactions(session.user.id)}
      />

      <EditTransactionModal
        transaction={editingTransaction}
        isOpen={Boolean(editingTransaction)}
        onClose={() => setEditingTransaction(null)}
        onSuccess={() => {
          if (session?.user) fetchTransactions(session.user.id);
        }}
      />

      <NewGoalModal
        userId={session.user.id}
        isOpen={isGoalModalOpen}
        onClose={() => setIsGoalModalOpen(false)}
        onSuccess={() => fetchGoals(session.user.id)}
      />

      <EditGoalModal
        goal={editingGoal}
        isOpen={Boolean(editingGoal)}
        onClose={() => setEditingGoal(null)}
        onSuccess={() => {
          if (session?.user) fetchGoals(session.user.id);
        }}
      />

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

      <ConfirmModal
        isOpen={confirmDeleteConfig.isOpen}
        title={confirmDeleteConfig.title}
        message={confirmDeleteConfig.message}
        confirmText="Sim, confirmar"
        cancelText="Voltar"
        isDestructive={true}
        onConfirm={handleExecuteConfirm}
        onCancel={() => setConfirmDeleteConfig((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}