'use client';

import { useState } from 'react';
import { supabase } from '../lib/supabase';

interface AuthProps {
  onSuccess: () => void;
}

export default function Auth({ onSuccess }: AuthProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [identifier, setIdentifier] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setErrorMessage('');
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao conectar com Google');
      setLoading(false);
    }
  };

  const handleEmailOrUsernameAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');

    try {
      if (isSignUp) {
        // --- CADASTRO ---
        const cleanUsername = username.trim().toLowerCase();
        const cleanEmail = email.trim().toLowerCase();

        if (cleanUsername.length < 3) {
          throw new Error('O nome de usuário deve ter pelo menos 3 letras.');
        }

        const { data: existingUser } = await supabase
          .from('profiles')
          .select('username')
          .eq('username', cleanUsername)
          .maybeSingle();

        if (existingUser) {
          throw new Error('Este @username já está em uso.');
        }

        const { data: authData, error: signUpError } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
        });

        if (signUpError) throw signUpError;

        if (authData.user) {
          const { error: profileError } = await supabase.from('profiles').upsert([
            {
              id: authData.user.id,
              username: cleanUsername,
              full_name: cleanUsername,
              email: cleanEmail,
              theme_preference: 'day',
            },
          ]);

          if (profileError) throw profileError;
        }

        onSuccess();
      } else {
        // --- LOGIN ---
        const cleanInput = identifier.trim().toLowerCase();
        let targetEmail = cleanInput;

        // Se digitou username (sem arroba), busca o email no perfil
        if (!cleanInput.includes('@')) {
          const { data: profileData, error: profileErr } = await supabase
            .from('profiles')
            .select('email')
            .eq('username', cleanInput)
            .maybeSingle();

          if (profileErr || !profileData || !profileData.email) {
            throw new Error('Nome de usuário não encontrado.');
          }

          targetEmail = profileData.email;
        }

        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: targetEmail,
          password,
        });

        if (signInError) throw signInError;
        
        // Dispara o callback só depois que o signIn foi confirmado com sucesso
        onSuccess();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro na autenticação');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md p-8 rounded-2xl bg-slate-800/90 border border-slate-700 shadow-2xl text-white">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-black text-sky-400 tracking-tight">Horizon Finances</h2>
        <p className="text-xs text-slate-400 mt-1">
          {isSignUp ? 'Crie sua conta para começar' : 'Acesse seu painel financeiro'}
        </p>
      </div>

      {errorMessage && (
        <div className="p-3 mb-4 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs text-center font-medium">
          {errorMessage}
        </div>
      )}

      <button
        type="button"
        onClick={handleGoogleLogin}
        disabled={loading}
        className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl bg-white text-slate-800 font-bold text-xs hover:bg-slate-100 transition-all shadow-md active:scale-[0.98] disabled:opacity-50 mb-5"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
          />
        </svg>
        Continuar com o Google
      </button>

      <div className="flex items-center gap-3 my-4">
        <div className="h-px bg-slate-700 flex-1"></div>
        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">ou credenciais</span>
        <div className="h-px bg-slate-700 flex-1"></div>
      </div>

      <form onSubmit={handleEmailOrUsernameAuth} className="space-y-3">
        {isSignUp ? (
          <>
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">Nome de Usuário (@)</label>
              <input
                type="text"
                required
                placeholder="ex: guilherme"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">E-mail</label>
              <input
                type="email"
                required
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-sky-500"
              />
            </div>
          </>
        ) : (
          <div>
            <label className="block text-[11px] font-bold text-slate-300 mb-1">E-mail ou Usuário</label>
            <input
              type="text"
              required
              placeholder="seu@email.com ou seu_usuario"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-sky-500"
            />
          </div>
        )}

        <div>
          <label className="block text-[11px] font-bold text-slate-300 mb-1">Senha</label>
          <input
            type="password"
            required
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-sky-500"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs transition-all shadow-md active:scale-[0.98] disabled:opacity-50 mt-2"
        >
          {loading ? 'Processando...' : isSignUp ? 'Criar Conta' : 'Entrar'}
        </button>
      </form>

      <div className="text-center mt-5">
        <button
          type="button"
          onClick={() => {
            setIsSignUp(!isSignUp);
            setErrorMessage('');
          }}
          className="text-xs text-slate-400 hover:text-white transition-colors"
        >
          {isSignUp ? 'Já tem uma conta? Entre aqui' : 'Não tem conta? Cadastre-se'}
        </button>
      </div>
    </div>
  );
}