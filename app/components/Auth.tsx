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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Garante a classe theme-interestelar ativa no documento da Landing Page
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.body.classList.remove('theme-day', 'theme-vintage_cute');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      if (mode === 'signup') {
        const cleanUsername = username.trim().toLowerCase();
        if (cleanUsername.length < 3) {
          throw new Error('O nome de usuário deve ter no mínimo 3 caracteres.');
        }

        const { data: existingUser } = await supabase
          .from('profiles')
          .select('username')
          .eq('username', cleanUsername)
          .maybeSingle();

        if (existingUser) {
          throw new Error('Este @username já está em uso.');
        }

        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
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

        if (signUpData?.user) {
          await supabase.from('profiles').upsert([
            {
              id: signUpData.user.id,
              username: cleanUsername,
              full_name: fullName.trim() || cleanUsername,
              email: email.trim().toLowerCase(),
              theme_preference: 'day', // O usuário pode iniciar em qualquer tema após logar
            },
          ]);
        }

        setSuccessMessage('Conta criada com sucesso! Conectando...');
        setTimeout(() => onSuccess(), 900);
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });

        if (error) throw error;
        onSuccess();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Ocorreu um erro na autenticação.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col relative overflow-x-hidden text-slate-100">
      {/* ========================================================
          CABEÇALHO FLUTUANTE INTERESTELAR (DARK GLASS)
      ======================================================== */}
      <header className="sticky top-0 z-40 w-full px-4 sm:px-8 py-3.5 bg-[#080f24]/80 backdrop-blur-2xl border-b border-sky-500/20 shadow-[0_4px_30px_rgba(0,0,0,0.5)] flex items-center justify-between gap-4 select-none">
        <div className="flex items-center gap-3">
          <Logo size={36} />
        </div>

        {/* Pílula de navegação central galáctica */}
        <nav
          translate="no"
          className="notranslate hidden md:flex items-center p-1 rounded-full bg-slate-900/60 border border-sky-500/20 shadow-inner text-xs font-bold text-sky-200/70"
        >
          <a
            href="#recursos"
            className="px-4 py-1.5 rounded-full hover:text-white hover:bg-sky-500/20 transition-all"
          >
            Recursos
          </a>
          <a
            href="#temas"
            className="px-4 py-1.5 rounded-full hover:text-white hover:bg-sky-500/20 transition-all"
          >
            Temas
          </a>
          <a
            href="#caixinhas"
            className="px-4 py-1.5 rounded-full hover:text-white hover:bg-sky-500/20 transition-all"
          >
            Caixinhas
          </a>
        </nav>

        {/* Ações de Entrada */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => openAuth('signin')}
            className="px-4 py-2 rounded-full text-xs font-bold text-sky-200 bg-slate-900/70 border border-sky-500/30 hover:bg-sky-500/20 hover:text-white transition-all shadow-sm active:scale-95"
          >
            Entrar
          </button>
          <button
            onClick={() => openAuth('signup')}
            className="px-4 py-2 rounded-full text-xs font-bold text-slate-950 bg-gradient-to-r from-sky-400 to-cyan-300 hover:brightness-110 transition-all shadow-[0_0_15px_rgba(56,189,248,0.4)] active:scale-95 flex items-center gap-1.5"
          >
            <span>Criar Conta</span>
          </button>
        </div>
      </header>

      {/* ========================================================
          HERO SECTION (BANNER CÓSMICO PRINCIPAL)
      ======================================================== */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 sm:px-6 pt-16 pb-20 max-w-5xl mx-auto space-y-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900/80 border border-sky-500/30 shadow-[0_0_20px_rgba(56,189,248,0.15)] animate-fade-in">
          <AppleEmoji emoji="🚀" size={16} />
          <span className="text-xs font-bold text-sky-400 tracking-widest uppercase">
            A nova dimensão das suas finanças
          </span>
        </div>

        <div className="space-y-4 max-w-3xl">
          <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-tight">
            Navegue no controle do seu dinheiro sob um novo{' '}
            <span className="bg-gradient-to-r from-sky-400 via-cyan-300 to-teal-300 bg-clip-text text-transparent">
              horizonte
            </span>
            .
          </h1>
          <p className="text-sm sm:text-base text-slate-300/85 font-medium max-w-2xl mx-auto leading-relaxed">
            Esqueça planilhas confusas. O horizon traz clareza imediata sobre sua órbita financeira: caixinhas inteligentes com saldo real protegido, extrato dinâmico e o requinte visual do liquid glass galáctico.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            onClick={() => openAuth('signup')}
            className="px-8 py-3.5 rounded-full text-sm font-bold text-slate-950 bg-gradient-to-r from-sky-400 to-cyan-300 hover:brightness-110 transition-all shadow-[0_0_25px_rgba(56,189,248,0.4)] active:scale-95 flex items-center gap-2"
          >
            <span>Iniciar Jornada Gratuita</span>
            <AppleEmoji emoji="🪐" size={16} />
          </button>
          <button
            onClick={() => openAuth('signin')}
            className="px-8 py-3.5 rounded-full text-sm font-bold text-sky-200 bg-slate-900/80 border border-sky-500/30 hover:bg-sky-500/20 hover:text-white transition-all shadow-sm active:scale-95"
          >
            Já tenho uma conta
          </button>
        </div>

        {/* ========================================================
            SEÇÃO 1: RECURSOS
        ======================================================== */}
        <section id="recursos" className="w-full pt-20 text-left space-y-6">
          <div className="space-y-2 text-center sm:text-left">
            <span className="px-3.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-sky-500/10 text-sky-400 border border-sky-500/30">
              Módulos do Sistema
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white">
              Tudo em um cockpit financeiro de alta precisão
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl">
              Elimine a sobrecarga mental de anotar gastos com uma interface rápida, responsiva e sem distrações desnecessárias.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2">
            <div className="p-6 rounded-3xl bg-slate-900/60 border border-sky-500/20 shadow-xl space-y-3 backdrop-blur-xl hover:border-sky-400/50 hover:shadow-[0_0_20px_rgba(56,189,248,0.15)] transition-all">
              <div className="w-12 h-12 rounded-2xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center">
                <AppleEmoji emoji="⚡" size={24} />
              </div>
              <h3 className="text-base font-bold text-white">Lançamentos em Órbita</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Cadastre receitas e despesas com descrição, categoria e data instantaneamente. Seu saldo se ajusta em tempo real.
              </p>
              <div className="pt-2 text-[11px] font-bold text-sky-400 flex items-center gap-1">
                <AppleEmoji emoji="✨" size={13} />
                <span>Zero atrito no dia a dia</span>
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-slate-900/60 border border-sky-500/20 shadow-xl space-y-3 backdrop-blur-xl hover:border-sky-400/50 hover:shadow-[0_0_20px_rgba(56,189,248,0.15)] transition-all">
              <div className="w-12 h-12 rounded-2xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center">
                <AppleEmoji emoji="📊" size={24} />
              </div>
              <h3 className="text-base font-bold text-white">Distribuição & Métricas</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Descubra para onde seu capital está fluindo. Gráficos percentuais dinâmicos organizam despesas por categorias essenciais.
              </p>
              <div className="pt-2 text-[11px] font-bold text-sky-400 flex items-center gap-1">
                <AppleEmoji emoji="🔍" size={13} />
                <span>Visão analítica completa</span>
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-slate-900/60 border border-sky-500/20 shadow-xl space-y-3 backdrop-blur-xl hover:border-sky-400/50 hover:shadow-[0_0_20px_rgba(56,189,248,0.15)] transition-all">
              <div className="w-12 h-12 rounded-2xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center">
                <AppleEmoji emoji="📥" size={24} />
              </div>
              <h3 className="text-base font-bold text-white">Exportação Sem Trava</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Filtre períodos ou categorias e exporte seus relatórios completos em formato `.csv` universal para Excel ou Sheets.
              </p>
              <div className="pt-2 text-[11px] font-bold text-sky-400 flex items-center gap-1">
                <AppleEmoji emoji="💼" size={13} />
                <span>Controle total dos seus dados</span>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================
            SEÇÃO 2: TEMAS
        ======================================================== */}
        <section id="temas" className="w-full pt-16 text-left space-y-6">
          <div className="space-y-2 text-center sm:text-left">
            <span className="px-3.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-sky-500/10 text-sky-400 border border-sky-500/30">
              Personalização Visual
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white">
              Três atmosferas para o seu estilo de vida
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl">
              Alterne livremente no painel entre as três identidades visuais lapidadas com efeitos de vidro translúcido.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2">
            <div className="p-6 rounded-3xl bg-slate-900/70 border-2 border-sky-400/50 shadow-[0_0_25px_rgba(56,189,248,0.2)] space-y-3 backdrop-blur-xl hover:translate-y-[-2px] transition-transform">
              <div className="w-12 h-12 rounded-2xl bg-sky-500/20 border border-sky-400/40 flex items-center justify-center">
                <AppleEmoji emoji="🚀" size={24} />
              </div>
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white">Interestelar</h3>
                <span className="text-[10px] uppercase font-bold text-sky-300 bg-sky-500/20 px-2.5 py-0.5 rounded-full border border-sky-400/30">
                  Ativo Agora
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Galáxia profunda, vidro escuro espelhado e brilhos ciano. Perfeito para foco imersivo e conforto visual.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-slate-900/50 border border-sky-500/20 shadow-md space-y-3 backdrop-blur-xl hover:border-sky-400/40 hover:translate-y-[-2px] transition-all">
              <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center">
                <AppleEmoji emoji="☀️" size={24} />
              </div>
              <h3 className="text-base font-bold text-white">Day</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                O frescor do céu azul diurno com nuvens orgânicas e liquid glass branco translúcido que reflete a claridade do dia.
              </p>
              <div className="text-[10px] font-bold tracking-wider uppercase text-sky-400">
                Clareza & Produtividade
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-slate-900/50 border border-sky-500/20 shadow-md space-y-3 backdrop-blur-xl hover:border-pink-400/40 hover:translate-y-[-2px] transition-all">
              <div className="w-12 h-12 rounded-2xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center">
                <AppleEmoji emoji="🌸" size={24} />
              </div>
              <h3 className="text-base font-bold text-white">Vintage Cute</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Estética doce e acolhedora em tons morango e pontilhado retrô, cantos ultrarredondados e carinho em cada detalhe.
              </p>
              <div className="text-[10px] font-bold tracking-wider uppercase text-pink-400">
                Conforto & Delicadeza
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================
            SEÇÃO 3: CAIXINHAS & METAS
        ======================================================== */}
        <section id="caixinhas" className="w-full pt-16 text-left space-y-6">
          <div className="p-8 sm:p-10 rounded-3xl bg-slate-900/70 border border-sky-500/30 shadow-[0_0_35px_rgba(0,0,0,0.6)] space-y-6 backdrop-blur-2xl">
            <div className="space-y-2">
              <span className="px-3.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-sky-500/15 text-sky-300 border border-sky-500/30">
                Metodologia Exclusiva
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-white">
                Caixinhas: O Poder do Saldo Real Protegido
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 max-w-3xl leading-relaxed">
                No horizon, metas não são números fictícios. Ao reservar dinheiro para um objetivo, o saldo disponível é reduzido imediatamente para preservar sua economia real.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="p-5 rounded-2xl bg-slate-950/60 border border-sky-500/20 space-y-2">
                <AppleEmoji emoji="🔒" size={22} />
                <h4 className="text-xs font-bold text-white">1. Proteção Imediata</h4>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  O valor alocado sai da conta corrente visível, evitando gastos impulsivos no cotidiano.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-950/60 border border-sky-500/20 space-y-2">
                <AppleEmoji emoji="📈" size={22} />
                <h4 className="text-xs font-bold text-white">2. Meta com Prazo</h4>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Defina o valor alvo e data limite para acompanhar o cálculo de progresso em barra percentual.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-950/60 border border-sky-500/20 space-y-2">
                <AppleEmoji emoji="🔓" size={22} />
                <h4 className="text-xs font-bold text-white">3. Resgate Instantâneo</h4>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Atingiu a meta ou teve uma emergência? Resgate o dinheiro na hora de volta ao saldo.
                </p>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-sky-950/40 border border-sky-400/30 flex items-center justify-between flex-wrap gap-4">
              <div className="space-y-1">
                <p className="text-xs font-bold text-white flex items-center gap-1.5">
                  <AppleEmoji emoji="👥" size={16} />
                  <span>Em Breve: Caixinhas Compartilhadas</span>
                </p>
                <p className="text-[11px] text-slate-300">
                  Guarde dinheiro em conjunto com seu parceiro(a) ou equipe para viagens e projetos mútuos.
                </p>
              </div>
              <button
                onClick={() => openAuth('signup')}
                className="px-5 py-2 rounded-full text-xs font-bold text-slate-950 bg-gradient-to-r from-sky-400 to-cyan-300 hover:brightness-110 transition-all shadow-md active:scale-95"
              >
                Garantir Acesso
              </button>
            </div>
          </div>
        </section>

        {/* Rodapé Galáctico */}
        <footer className="w-full pt-12 pb-6 border-t border-sky-500/20 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-2 font-bold text-white">
            <Logo size={24} />
            <span>horizon</span>
          </div>
          <p>© 2026 horizon Finances. Todos os direitos reservados.</p>
        </footer>
      </main>

      {/* ========================================================
          MODAL DE AUTENTICAÇÃO INTERESTELAR (ENTRAR / CADASTRAR)
      ======================================================== */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md animate-fade-in transition-colors duration-300"
          style={{ backgroundColor: 'var(--modal-overlay)' }}
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="w-full max-w-sm p-6 sm:p-8 rounded-3xl bg-slate-900/90 border border-sky-500/30 shadow-[0_0_50px_rgba(0,0,0,0.8)] space-y-5 backdrop-blur-2xl relative select-none"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-sky-500/20 transition-colors text-xs font-bold"
            >
              ✕
            </button>

            <div className="text-center space-y-1">
              <div className="flex justify-center pb-1">
                <Logo size={42} />
              </div>
              <h2 className="text-xl font-black text-white">
                {mode === 'signin' ? 'Acesse sua conta' : 'Crie sua conta'}
              </h2>
              <p className="text-xs text-slate-400">
                {mode === 'signin'
                  ? 'Bem-vindo de volta ao horizon!'
                  : 'Comece a organizar suas finanças hoje mesmo.'}
              </p>
            </div>

            {/* Alternador Entrar / Cadastrar Galáctico */}
            <div className="flex items-center p-1 rounded-full bg-slate-950 border border-sky-500/20">
              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  setErrorMessage('');
                }}
                className={`flex-1 py-1.5 rounded-full text-xs font-bold transition-all ${
                  mode === 'signin'
                    ? 'bg-sky-500 text-slate-950 font-black shadow-md shadow-sky-500/25'
                    : 'text-slate-400 hover:text-white'
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
                className={`flex-1 py-1.5 rounded-full text-xs font-bold transition-all ${
                  mode === 'signup'
                    ? 'bg-sky-500 text-slate-950 font-black shadow-md shadow-sky-500/25'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Cadastrar
              </button>
            </div>

            {/* Botão Google */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={googleLoading}
              className="w-full py-2.5 px-4 rounded-full border border-sky-500/30 bg-slate-950/80 hover:bg-sky-500/10 text-xs font-bold text-white transition-all flex items-center justify-center gap-2 shadow-sm active:scale-95 disabled:opacity-50"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.15z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.24v3.15C3.26 21.36 7.33 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.24C.45 8.15 0 9.92 0 12s.45 3.85 1.24 5.42l4.04-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.24 6.58l4.04 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
              <span>{googleLoading ? 'Conectando...' : 'Entrar com Google'}</span>
            </button>

            <div className="flex items-center gap-2">
              <div className="flex-1 h-px bg-sky-500/20" />
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                ou com e-mail
              </span>
              <div className="flex-1 h-px bg-sky-500/20" />
            </div>

            {errorMessage && (
              <p className="p-2.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium text-center">
                {errorMessage}
              </p>
            )}

            {successMessage && (
              <p className="p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium text-center">
                {successMessage}
              </p>
            )}

            {/* Formulário Interestelar */}
            <form onSubmit={handleSubmit} className="space-y-3">
              {mode === 'signup' && (
                <>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      Nome Completo
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Guilherme Silva"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full px-4 py-2 rounded-full bg-slate-950 border border-sky-500/30 text-xs text-white focus:outline-none focus:border-sky-400 select-text placeholder-slate-600"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      Nome de Usuário (@)
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="ex: guilherme"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full px-4 py-2 rounded-full bg-slate-950 border border-sky-500/30 text-xs text-white focus:outline-none focus:border-sky-400 select-text placeholder-slate-600"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  E-mail
                </label>
                <input
                  type="email"
                  required
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2 rounded-full bg-slate-950 border border-sky-500/30 text-xs text-white focus:outline-none focus:border-sky-400 select-text placeholder-slate-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  Senha
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2 rounded-full bg-slate-950 border border-sky-500/30 text-xs text-white focus:outline-none focus:border-sky-400 select-text placeholder-slate-600"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-full bg-gradient-to-r from-sky-400 to-cyan-300 hover:brightness-110 text-slate-950 font-black text-xs transition-all shadow-[0_0_20px_rgba(56,189,248,0.3)] active:scale-95 disabled:opacity-50 mt-2"
              >
                {loading ? 'Conectando à rede...' : mode === 'signin' ? 'Acessar Painel' : 'Iniciar Minha Jornada'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}