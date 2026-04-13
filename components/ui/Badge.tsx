import type { HTMLAttributes } from 'react';

export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={`inline-flex items-center rounded-full bg-[var(--accent)] px-2.5 py-1 text-xs font-semibold text-white ${className ?? ''}`}
      {...props}
    />
  );
}
