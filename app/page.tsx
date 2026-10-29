'use client';

import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import Auth from './components/Auth';
import ThemeSelector from './components/ThemeSelector';

export default function Home() {
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState('day');

  const [newUsername, setNewUsername] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [savingUsername, setSavingUsername] = useState(false);

  // Aplica a classe do tema no body do HTML
  const applyTheme = (themeName: string) => {
    if (typeof document !== 'undefined') {
      document.body.classList.remove('theme-day', 'theme-interestelar', 'theme-vintage_cute');
      document.body.classList.add(`theme-${themeName}`);
    }
    setTheme(themeName);
  };

  const loadUserData = async (currentSession: any) => {
    if (!currentSession?.user) {
      setProfile(null);
      applyTheme('day');
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentSession.user.id)
        .maybeSingle();

      if (!error && data) {
        setProfile(data);
        applyTheme(data.theme_preference || 'day');
      } else {
        setProfile(null);
        applyTheme('day');
      }
    } catch (e) {
      console.error(e);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      const { data: { session: existingSession } } = await supabase.auth.getSession();
      setSession(existingSession);
      await loadUserData(existingSession);
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      await loadUserData(newSession);
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

      if (existing) {
        throw new Error('Este @username já está em uso.');
      }

      const { data, error } = await supabase
        .from('profiles')
        .insert([
          {
            id: session.user.id,
            username: cleanUsername,
            full_name: session.user.user_metadata?.full_name || cleanUsername,
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
    applyTheme('day');
    setLoading(false);
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500"></div>
          <span className="text-xs text-slate-400">Carregando Horizon Finances...</span>
        </div>
      </main>
    );
  }

  // 1. Tela de Login/Cadastro
  if (!session) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <Auth onSuccess={() => loadUserData(session)} />
      </main>
    );
  }

  // 2. Primeiro Login Google sem Username
  if (!profile) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md p-8 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-2xl space-y-4">
          <div className="text-center">
            <h2 className="text-xl font-black text-[var(--accent)]">Quase pronto!</h2>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Escolha seu nome de usuário único para o Horizon Finances:
            </p>
          </div>

          {usernameError && (
            <p className="text-xs text-rose-500 text-center font-bold bg-rose-500/10 p-2 rounded-lg border border-rose-500/20">
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
                className="w-full px-3.5 py-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs text-[var(--text-main)] focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
            <button
              type="submit"
              disabled={savingUsername}
              className="w-full py-2.5 rounded-xl bg-[var(--accent)] hover:opacity-90 text-white font-bold text-xs transition-all disabled:opacity-50"
            >
              {savingUsername ? 'Salvando...' : 'Confirmar e Continuar'}
            </button>
          </form>
        </div>
      </main>
    );
  }

  // 3. Painel Autenticado com os 3 Temas Ativos
  return (
    <main className="min-h-screen flex flex-col p-6 max-w-5xl mx-auto space-y-6">
      {/* Topbar */}
      <header className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-sm backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--accent-light)] text-[var(--accent)] flex items-center justify-center font-black text-base shadow-inner">
            {profile.username?.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-base font-black tracking-tight leading-none text-[var(--text-main)]">Horizon Finances</h1>
            <p className="text-xs text-[var(--text-muted)] mt-0.5 font-medium">@{profile.username}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ThemeSelector
            currentTheme={theme}
            userId={session.user.id}
            onThemeChange={applyTheme}
          />
          <button
            onClick={handleLogout}
            className="px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500 hover:text-white text-rose-500 text-xs font-bold transition-all border border-rose-500/20 active:scale-95"
          >
            Sair
          </button>
        </div>
      </header>

      {/* Cartão de Boas-Vindas & Status */}
      <section className="p-6 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-sm space-y-2">
        <h2 className="text-xl font-bold tracking-tight text-[var(--text-main)]">
          Bem-vindo de volta, @{profile.username}!
        </h2>
        <p className="text-xs text-[var(--text-muted)]">
          Seu tema selecionado é <strong>{theme}</strong> e está sincronizado com o banco de dados.
        </p>
      </section>
    </main>
  );
}