'use client';

import { supabase } from '../lib/supabase';

interface ThemeSelectorProps {
  currentTheme: string;
  userId: string;
  onThemeChange: (theme: string) => void;
}

const themes = [
  { id: 'day', label: 'Day', icon: '☀️', desc: 'Claro & Celeste' },
  { id: 'interestelar', label: 'Interestelar', icon: '🌌', desc: 'Galáxia & Vidro' },
  { id: 'vintage_cute', label: 'Vintage Cute', icon: '🧸', desc: 'Pastel & Suave' },
];

export default function ThemeSelector({ currentTheme, userId, onThemeChange }: ThemeSelectorProps) {
  const handleSelectTheme = async (themeId: string) => {
    onThemeChange(themeId);

    // Salva a preferência no perfil no Supabase
    if (userId) {
      await supabase
        .from('profiles')
        .update({ theme_preference: themeId })
        .eq('id', userId);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-sm">
      {themes.map((t) => {
        const isActive = currentTheme === t.id;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => handleSelectTheme(t.id)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              isActive
                ? 'bg-[var(--accent)] text-white shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--accent-light)]'
            }`}
          >
            <span>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}