import type { HTMLAttributes } from 'react';

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`card rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] shadow-sm transition hover:shadow-md ${className ?? ''}`}
      {...props}
    />
  );
}
