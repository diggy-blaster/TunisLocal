import type { HTMLAttributes } from 'react';

export function ServiceMarker({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-full border-2 border-white bg-[var(--accent)] p-2 text-white shadow-lg ${className ?? ''}`}
      {...props}
    />
  );
}
