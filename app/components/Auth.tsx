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
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot' | 'verify_otp'>(initialMode);
  
  const [showTutorial, setShowTutorial] = useState(false);

  // Estados de Autenticação
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.body.classList.remove('theme-day', 'theme-vintage_cute', 'theme-editorial');
      document.body.classList.add('theme-interestelar');
    }
  }, []);

  const openAuth = (selectedMode: 'signin' | 'signup') => {
    setMode(selectedMode);
    setErrorMessage('');
    setSuccessMessage('');
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

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');

    try {
      // 1. Valida o código numérico OTP enviado por e-mail
      const { data, error } = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: otpCode.trim(),
        type: 'signup',
      });

      if (error) throw error;

      // 2. Criação garantida do perfil logo após a confirmação do código
      if (data?.user) {
        const cleanUsername = username.trim().toLowerCase().replace(/^@/, '');
        await supabase.from('profiles').upsert([
          {
            id: data.user.id,
            username: cleanUsername,
            full_name: fullName.trim() || cleanUsername,
            email: email.trim().toLowerCase(),
            theme_preference: 'day',
          },
        ]);

        await supabase.from('accounts').insert([
          { user_id: data.user.id, name: 'Nubank', icon: '🟣', color: '#8a05be' },
          { user_id: data.user.id, name: 'Inter', icon: '🟠', color: '#ff7a00' },
          { user_id: data.user.id, name: 'Dinheiro em Espécie', icon: '💵', color: '#10b981' },
        ]);
      }

      setSuccessMessage('E-mail verificado com sucesso! Entrando...');
      setTimeout(() => onSuccess(), 800);
    } catch (err: any) {
      setErrorMessage(err.message || 'Código de confirmação incorreto ou expirado.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const cleanEmail = resetEmail.trim().toLowerCase();
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/` : undefined,
      });

      if (error) throw error;
      setSuccessMessage('Enviamos o link de recuperação para seu e-mail!');
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao solicitar redefinição.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      if (mode === 'signup') {
        const cleanUsername = username.trim().toLowerCase().replace(/^@/, '');
        if (cleanUsername.length < 3) {
          throw new Error('O nome de usuário deve ter no mínimo 3 caracteres.');
        }

        if (password.length < 6) {
          throw new Error('A senha precisa ter no mínimo 6 caracteres.');
        }

        if (password !== confirmPassword) {
          throw new Error('As senhas digitadas não coincidem.');
        }

        // Verifica se username já existe antes de enviar e-mail
        const { data: existingUser } = await supabase
          .from('profiles')
          .select('username')
          .eq('username', cleanUsername)
          .maybeSingle();

        if (existingUser) {
          throw new Error('Este @username já está em uso.');
        }

        const { error: signUpError } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: {
            data: {
              full_name: fullName.trim() || cleanUsername,
              username: cleanUsername,
            },
          },
        });

        if (signUpError) throw signUpError;

        // Força sempre a etapa de OTP para bloquear entradas diretas
        setMode('verify_otp');
        setSuccessMessage(`Código de verificação enviado para ${email.trim().toLowerCase()}. Insira-o abaixo:`);
      } else if (mode === 'signin') {
        const cleanIdentifier = loginIdentifier.trim().toLowerCase().replace(/^@/, '');
        let targetEmail = cleanIdentifier;

        if (!cleanIdentifier.includes('@') || !cleanIdentifier.includes('.')) {
          const { data: userProfile, error: profileErr } = await supabase
            .from('profiles')
            .select('email')
            .eq('username', cleanIdentifier)
            .maybeSingle();

          if (profileErr || !userProfile || !userProfile.email) {
            throw new Error('Nome de usuário não encontrado.');
          }
          targetEmail = userProfile.email;
        }

        const { error } = await supabase.auth.signInWithPassword({
          email: targetEmail,
          password,
        });

        if (error) {
          if (error.message.includes('Email not confirmed')) {
            setMode('verify_otp');
            setEmail(targetEmail);
            throw new Error('Seu e-mail ainda não foi validado. Digite o código recebido:');
          }
          if (error.message.includes('Invalid login credentials')) {
            throw new Error('Credenciais incorretas.');
          }
          throw error;
        }
        onSuccess();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro na autenticação.');
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
                Gestão prática com separação por bancos, caixinhas blindadas e modo de privacidade. Sem distrações.
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
                  No topo do painel, clique em <strong>"Gerenciar Carteiras"</strong>. Adicione onde o seu dinheiro fica fisicamente (ex: Nubank, Inter ou Espécie em mãos).
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                <span className="text-[10px] font-black uppercase text-emerald-400">Passo 2</span>
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <AppleEmoji emoji="⚡" size={14} />
                  <span>Lançamentos Diários</span>
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Clique em <strong>"Novo Lançamento"</strong>. Digite o valor, selecione se é Entrada ou Saída, informe a categoria e escolha de qual banco esse dinheiro transitou.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                <span className="text-[10px] font-black uppercase text-rose-400">Passo 3</span>
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <AppleEmoji emoji="🔒" size={14} />
                  <span>Crie Caixinhas para o Futuro</span>
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Na seção de Caixinhas, clique em <strong>"Nova Caixinha"</strong> para criar um objetivo. O dinheiro reservado nela é deduzido do seu saldo visível para blindar a reserva.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                <span className="text-[10px] font-black uppercase text-amber-400">Passo 4</span>
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <AppleEmoji emoji="👁️" size={14} />
                  <span>Privacidade e Exportação</span>
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Está em público? Clique no <strong>olhinho</strong> no topo para mascarar os valores (`••••••`). Para prestação de contas, clique em <strong>"Exportar CSV"</strong>.
                </p>
              </div>
            </div>

            <div className="pt-4 text-center">
              <button
                onClick={() => openAuth('signup')}
                className="px-8 py-3 rounded-full text-sm font-bold text-slate-950 bg-sky-400 hover:bg-sky-300 transition-all active:scale-95"
              >
                Tudo certo, criar minha conta
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
                {mode === 'signin' && 'Acesse sua conta'}
                {mode === 'signup' && 'Crie sua conta'}
                {mode === 'forgot' && 'Recuperar senha'}
                {mode === 'verify_otp' && 'Validação por Código'}
              </h2>
              <p className="text-[11px] text-slate-400">
                {mode === 'verify_otp'
                  ? 'Digite o código de 6 dígitos que enviamos ao seu e-mail.'
                  : 'Autenticação de acesso.'}
              </p>
            </div>

            {mode === 'verify_otp' ? (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                {errorMessage && (
                  <p className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium text-center">
                    {errorMessage}
                  </p>
                )}
                {successMessage && (
                  <p className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium text-center leading-relaxed">
                    {successMessage}
                  </p>
                )}
                <div>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="Ex: 123456"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    className="w-full text-center tracking-widest text-lg font-black px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-sky-400"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 rounded-xl bg-sky-400 hover:bg-sky-300 text-slate-950 font-black text-xs transition-all active:scale-95 disabled:opacity-50"
                >
                  {loading ? 'Verificando...' : 'Confirmar e Iniciar'}
                </button>
              </form>
            ) : (
              <>
                {mode !== 'forgot' && (
                  <div className="flex items-center p-1 rounded-xl bg-slate-950 border border-slate-800">
                    <button
                      type="button"
                      onClick={() => setMode('signin')}
                      className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                        mode === 'signin' ? 'bg-sky-500 text-slate-950' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Entrar
                    </button>
                    <button
                      type="button"
                      onClick={() => setMode('signup')}
                      className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                        mode === 'signup' ? 'bg-sky-500 text-slate-950' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Cadastrar
                    </button>
                  </div>
                )}

                {errorMessage && (
                  <p className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium text-center">
                    {errorMessage}
                  </p>
                )}
                {successMessage && (
                  <p className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-medium text-center">
                    {successMessage}
                  </p>
                )}

                {mode === 'forgot' ? (
                  <form onSubmit={handleForgotPassword} className="space-y-3">
                    <input
                      type="email"
                      required
                      placeholder="seu@email.com"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      className="w-full px-4 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                    />
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-2.5 rounded-xl bg-sky-400 text-slate-950 font-black text-xs"
                    >
                      {loading ? 'Enviando...' : 'Enviar Link de Redefinição'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setMode('signin')}
                      className="w-full text-center text-[10px] font-bold text-slate-400 hover:text-white mt-1"
                    >
                      ← Voltar ao login
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-3">
                    {mode === 'signup' && (
                      <>
                        <input
                          type="text"
                          required
                          placeholder="Nome Completo"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-sky-500"
                        />
                        <input
                          type="text"
                          required
                          placeholder="Nome de Usuário (@)"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-sky-500"
                        />
                        <input
                          type="email"
                          required
                          placeholder="E-mail"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-sky-500"
                        />
                      </>
                    )}

                    {mode === 'signin' && (
                      <input
                        type="text"
                        required
                        placeholder="E-mail ou @usuário"
                        value={loginIdentifier}
                        onChange={(e) => setLoginIdentifier(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-sky-500"
                      />
                    )}

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[10px] font-bold text-slate-400">
                          {mode === 'signup' ? 'Senha (mín. 6)' : 'Senha'}
                        </label>
                        {mode === 'signin' && (
                          <button
                            type="button"
                            onClick={() => setMode('forgot')}
                            className="text-[10px] text-sky-400 hover:underline"
                          >
                            Esqueceu a senha?
                          </button>
                        )}
                      </div>
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
                        <label className="block text-[10px] font-bold text-slate-400 mb-1">
                          Confirmar Senha
                        </label>
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
                      className="w-full py-2.5 rounded-xl bg-sky-400 text-slate-950 font-black text-xs hover:bg-sky-300 transition-colors mt-2"
                    >
                      {loading ? 'Processando...' : mode === 'signin' ? 'Acessar Painel' : 'Validar E-mail e Criar'}
                    </button>

                    <div className="pt-2 border-t border-slate-800 mt-3">
                      <button
                        type="button"
                        onClick={handleGoogleLogin}
                        disabled={googleLoading}
                        className="w-full py-2 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white flex items-center justify-center gap-2 transition-colors"
                      >
                        <AppleEmoji emoji="🌐" size={14} />
                        <span>Entrar com Google</span>
                      </button>
                    </div>
                  </form>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}