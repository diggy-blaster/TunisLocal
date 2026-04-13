import type { ReactNode } from 'react';

export function MapView({ children }: { children?: ReactNode }) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--bg-secondary)] shadow-sm">
      {children}
    </div>
  );
}
