'use client';

interface LogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
}

export default function Logo({ className = '', size = 32, showText = true }: LogoProps) {
  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="flex-shrink-0 transition-transform duration-300 hover:scale-105"
      >
        <rect width="48" height="48" rx="14" fill="var(--bg-card, #0f172a)" />
        <path
          d="M9 29C9 18 18 9 29 9V14.5C21 14.5 14.5 21 14.5 29H9Z"
          fill="var(--accent, #0284c7)"
        />
        <path
          d="M17.5 29C17.5 22.6 22.6 17.5 29 17.5C35.4 17.5 40.5 22.6 40.5 29H35C35 25.7 32.3 23 29 23C25.7 23 23 25.7 23 29H17.5Z"
          fill="var(--text-main, #ffffff)"
        />
        <path
          d="M23 29C23 25.7 25.7 23 29 23C32.3 23 35 25.7 35 29C35 32.3 32.3 35 29 35V40.5C35.4 40.5 40.5 35.4 40.5 29H35C35 32.3 32.3 35 29 35C25.7 35 23 32.3 23 29Z"
          fill="var(--accent-hover, #38bdf8)"
        />
        <circle cx="29" cy="29" r="3" fill="var(--accent, #0284c7)" />
      </svg>

      {showText && (
        <div className="flex items-baseline tracking-tight">
          <span className="text-xl font-black lowercase tracking-tighter text-[var(--text-main)] font-sans">
            horizon
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] ml-1 mb-0.5 animate-pulse" />
        </div>
      )}
    </div>
  );
}