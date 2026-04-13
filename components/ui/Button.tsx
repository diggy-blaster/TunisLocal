import type { ButtonHTMLAttributes } from 'react';

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost';
};

export function Button({ variant = 'primary', className = '', ...props }: ButtonProps) {
  const base = 'inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  const variants: Record<NonNullable<ButtonProps['variant']>, string> = {
    primary: 'bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] focus:ring-[var(--accent)]',
    secondary: 'bg-[var(--bg-secondary)] text-[var(--text-primary)] border border-[var(--border)] hover:bg-slate-100 focus:ring-[var(--accent)]',
    ghost: 'bg-transparent text-[var(--text-primary)] hover:bg-slate-100 focus:ring-[var(--accent)]',
  };

  return <button className={`${base} ${variants[variant]} ${className}`} {...props} />;
}
