import type { ReactNode } from 'react';

export function Header({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <header className="flex flex-col gap-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-primary)] p-5 shadow-sm md:flex-row md:items-center md:justify-between">
      <div>
        <p className="text-sm font-medium text-[var(--accent)]">{title}</p>
      </div>
      <div className="flex items-center gap-3">{children}</div>
    </header>
  );
}
