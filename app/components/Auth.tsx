'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import Logo from './Logo';
import AppleEmoji from './AppleEmoji';

interface AuthProps {
  onSuccess: () => void;
  initialMode?: 'signin' | 'signup';
}

export default function Auth({ onSuccess, initialMode = 'signin' }: AuthProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);
  const [showTutorial, setShowTutorial] = useState(false);

  // Campos de entrada
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.body.classList.remove('theme-day', 'theme-vintage_cute', 'theme-editorial');
      document.body.classList.add('theme-interestelar');
    }
  }, []);

  const openAuth = (selectedMode: 'signin' | 'signup') => {
    setMode(selectedMode);
    setErrorMessage('');
    setUsername('');
    setPassword('');
    setConfirmPassword('');
    setFullName('');
    setIsModalOpen(true);
  };

  const handleGoogleLogin = async () => {
    try {
      setGoogleLoading(true);
      setErrorMessage('');
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/` : undefined,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao conectar com Google');
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');

    const cleanUsername = username.trim().toLowerCase().replace(/^@/, '');

    if (cleanUsername.length < 3) {
      setErrorMessage('O nome de usuário deve ter no mínimo 3 caracteres.');
      setLoading(false);
      return;
    }

    // Domínio virtual para autenticação interna do Supabase sem envio de e-mails
    const internalEmail = `${cleanUsername}@horizon.local`;

    try {
      if (mode === 'signup') {
        if (!fullName.trim()) {
          throw new Error('Informe seu nome completo.');
        }

        if (password.length < 6) {
          throw new Error('A senha precisa ter no mínimo 6 caracteres.');
        }

        if (password !== confirmPassword) {
          throw new Error('As senhas digitadas não coincidem.');
        }

        // Verifica se o @username já existe na tabela de perfis
        const { data: existingUser } = await supabase
          .from('profiles')
          .select('username')
          .eq('username', cleanUsername)
          .maybeSingle();

        if (existingUser) {
          throw new Error('Este @username já está em uso.');
        }

        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: internalEmail,
          password,
          options: {
            data: {
              full_name: fullName.trim(),
              username: cleanUsername,
            },
          },
        });

        if (signUpError) throw signUpError;

        if (signUpData?.user) {
          await supabase.from('profiles').upsert([
            {
              id: signUpData.user.id,
              username: cleanUsername,
              full_name: fullName.trim(),
              email: internalEmail,
              theme_preference: 'day',
            },
          ]);

          await supabase.from('accounts').insert([
            { user_id: signUpData.user.id, name: 'Nubank', icon: '🟣', color: '#8a05be' },
            { user_id: signUpData.user.id, name: 'Inter', icon: '🟠', color: '#ff7a00' },
            { user_id: signUpData.user.id, name: 'Dinheiro em Espécie', icon: '💵', color: '#10b981' },
          ]);
        }

        onSuccess();
      } else {
        // Modo Login por Usuário e Senha
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: internalEmail,
          password,
        });

        if (signInError) {
          if (signInError.message.includes('Invalid login credentials')) {
            throw new Error('Usuário ou senha incorretos.');
          }
          throw signInError;
        }

        onSuccess();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao processar autenticação.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col relative overflow-x-hidden text-slate-100 bg-[#080f24]">
      {/* Topbar Minimalista */}
      <header className="fixed top-0 left-0 right-0 z-40 w-full px-5 sm:px-8 py-4 flex items-center justify-between gap-4 bg-[#080f24]/80 backdrop-blur-xl border-b border-sky-500/10">
        <Logo size={28} />

        {!showTutorial && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => openAuth('signin')}
              className="text-xs font-bold text-sky-300 hover:text-white transition-colors"
            >
              Entrar
            </button>
            <button
              onClick={() => openAuth('signup')}
              className="px-4 py-2 rounded-full text-xs font-bold text-slate-950 bg-sky-400 hover:bg-sky-300 transition-all active:scale-95"
            >
              Criar Conta
            </button>
          </div>
        )}
      </header>

      {/* Conteúdo Principal */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 sm:px-6 w-full max-w-5xl mx-auto pt-20 pb-12">
        {!showTutorial ? (
          <div className="space-y-8 animate-fade-in max-w-3xl">
            <div className="space-y-4">
              <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-tight">
                Domine sua órbita financeira.
              </h1>
              <p className="text-sm sm:text-base text-slate-400 font-medium max-w-xl mx-auto leading-relaxed">
                Gestão prática com separação por bancos, caixinhas blindadas e modo de privacidade. Sem burocracias.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 pt-4">
              <button
                onClick={() => openAuth('signup')}
                className="w-full sm:w-auto px-8 py-3.5 rounded-full text-sm font-bold text-slate-950 bg-sky-400 hover:bg-sky-300 transition-all active:scale-95"
              >
                Começar Agora
              </button>
              <button
                onClick={() => setShowTutorial(true)}
                className="w-full sm:w-auto px-8 py-3.5 rounded-full text-sm font-bold text-slate-300 bg-slate-900 border border-slate-700 hover:border-sky-500/50 hover:text-white transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <AppleEmoji emoji="📖" size={14} />
                <span>Como usar o horizon?</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="w-full text-left animate-fade-in space-y-6 pt-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-2xl font-black text-white">Aula Rápida: Como usar o app</h2>
                <p className="text-xs text-slate-400">Guia de 4 passos para configurar e gerenciar seu dinheiro.</p>
              </div>
              <button
                onClick={() => setShowTutorial(false)}
                className="px-4 py-2 rounded-full text-xs font-bold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition-all"
              >
                ✕ Fechar
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                <span className="text-[10px] font-black uppercase text-sky-400">Passo 1</span>
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <AppleEmoji emoji="🏦" size={14} />
                  <span>Cadastre seus Bancos</span>
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  No painel, acesse <strong>"Gerenciar Carteiras"</strong> e informe onde o seu dinheiro fica fisicamente (Nubank, Inter ou Dinheiro em Espécie).
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                <span className="text-[10px] font-black uppercase text-emerald-400">Passo 2</span>
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <AppleEmoji emoji="⚡" size={14} />
                  <span>Lançamentos Diários</span>
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Clique em <strong>"Novo Lançamento"</strong>, informe o valor, categoria e aponte em qual carteira a quantia foi movimentada.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                <span className="text-[10px] font-black uppercase text-rose-400">Passo 3</span>
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <AppleEmoji emoji="🔒" size={14} />
                  <span>Crie Caixinhas de Metas</span>
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Na seção de Caixinhas, guarde valores com objetivos definidos. Esse valor sai do saldo visível para blindar suas reservas.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                <span className="text-[10px] font-black uppercase text-amber-400">Passo 4</span>
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <AppleEmoji emoji="👁️" size={14} />
                  <span>Privacidade e Exportação</span>
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Em locais públicos, use o botão de <strong>olho</strong> para mascarar todos os valores (`••••••`) e exporte relatórios limpos em CSV a qualquer hora.
                </p>
              </div>
            </div>

            <div className="pt-4 text-center">
              <button
                onClick={() => openAuth('signup')}
                className="px-8 py-3 rounded-full text-sm font-bold text-slate-950 bg-sky-400 hover:bg-sky-300 transition-all active:scale-95"
              >
                Criar Minha Conta
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Modal de Autenticação */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md animate-fade-in"
          style={{ backgroundColor: 'var(--modal-overlay)' }}
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="w-full max-w-sm p-6 sm:p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl space-y-5 relative select-none"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors text-xs font-bold"
            >
              ✕
            </button>

            <div className="text-center space-y-2">
              <div className="flex justify-center pb-1">
                <Logo size={32} />
              </div>
              <h2 className="text-lg font-black text-white pt-1">
                {mode === 'signin' ? 'Acesse sua conta' : 'Crie sua conta'}
              </h2>
              <p className="text-[11px] text-slate-400">
                {mode === 'signin' ? 'Entre com seu nome de usuário e senha' : 'Sem e-mails. Apenas usuário e senha.'}
              </p>
            </div>

            <div className="flex items-center p-1 rounded-xl bg-slate-950 border border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  setErrorMessage('');
                }}
                className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                  mode === 'signin' ? 'bg-sky-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
                }`}
              >
                Entrar
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  setErrorMessage('');
                }}
                className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                  mode === 'signup' ? 'bg-sky-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
                }`}
              >
                Cadastrar
              </button>
            </div>

            {errorMessage && (
              <p className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium text-center">
                {errorMessage}
              </p>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              {mode === 'signup' && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1">Nome Completo</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Guilherme Silva"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">Nome de Usuário (@)</label>
                <input
                  type="text"
                  required
                  placeholder="ex: guilherme"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">Senha</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              {mode === 'signup' && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1">Confirmar Senha</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-sky-400 text-slate-950 font-black text-xs hover:bg-sky-300 transition-colors mt-2 disabled:opacity-50"
              >
                {loading ? 'Processando...' : mode === 'signin' ? 'Acessar Painel' : 'Criar Minha Conta'}
              </button>

              <div className="pt-2 border-t border-slate-800 mt-3">
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={googleLoading}
                  className="w-full py-2 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white flex items-center justify-center gap-2.5 transition-colors disabled:opacity-50"
                >
                  {/* Logo oficial da Google */}
                  <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
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
                  <span>Entrar com Google</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}