'use client';

import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import Auth from './components/Auth';

export default function Home() {
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [newUsername, setNewUsername] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [savingUsername, setSavingUsername] = useState(false);

  const loadUserData = async (currentSession: any) => {
    if (!currentSession?.user) {
      setProfile(null);
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
      } else {
        setProfile(null);
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
    setLoading(false);
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-400"></div>
          <span className="text-xs text-slate-400">Carregando painel...</span>
        </div>
      </main>
    );
  }

  // 1. Não autenticado -> Formulário de login/cadastro
  if (!session) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4 bg-slate-900">
        <Auth onSuccess={() => loadUserData(session)} />
      </main>
    );
  }

  // 2. Autenticado mas sem username (ex: login Google inicial)
  if (!profile) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4 bg-slate-900 text-white">
        <div className="w-full max-w-md p-8 rounded-2xl bg-slate-800 border border-slate-700 shadow-2xl space-y-4">
          <div className="text-center">
            <h2 className="text-xl font-black text-sky-400">Quase pronto!</h2>
            <p className="text-xs text-slate-400 mt-1">
              Escolha seu nome de usuário único para o Horizon Finances:
            </p>
          </div>

          {usernameError && (
            <p className="text-xs text-rose-400 text-center font-bold bg-rose-500/10 p-2 rounded-lg border border-rose-500/20">
              {usernameError}
            </p>
          )}

          <form onSubmit={handleCreateProfile} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">Seu @username</label>
              <input
                type="text"
                required
                placeholder="ex: guilherme"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-sky-500"
              />
            </div>
            <button
              type="submit"
              disabled={savingUsername}
              className="w-full py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 font-bold text-xs transition-all disabled:opacity-50"
            >
              {savingUsername ? 'Salvando...' : 'Confirmar e Continuar'}
            </button>
          </form>
        </div>
      </main>
    );
  }

  // 3. Autenticado e com perfil pronto
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-900 text-white">
      <div className="w-full max-w-lg p-6 rounded-2xl bg-slate-800 border border-slate-700 shadow-xl text-center space-y-4">
        <h1 className="text-2xl font-black text-sky-400">Sessão Ativa 🎉</h1>
        <div className="text-xs text-slate-300 space-y-1">
          <p><strong>Usuário:</strong> @{profile.username}</p>
          <p><strong>E-mail:</strong> {session.user?.email}</p>
          <p><strong>Tema Atual:</strong> {profile.theme_preference}</p>
        </div>
        <button
          onClick={handleLogout}
          className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs transition-all shadow-md active:scale-95"
        >
          Sair da Conta
        </button>
      </div>
    </main>
  );
}