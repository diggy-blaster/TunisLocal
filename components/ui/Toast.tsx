import type { HTMLAttributes, ReactNode } from 'react';

interface ToastProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
  icon?: ReactNode;
}

export function Toast({ title, description, icon, className, ...props }: ToastProps) {
  return (
    <div
      className={`rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] p-4 shadow-sm ${className ?? ''}`}
      {...props}
    >
      <div className="flex items-start gap-3">
        {icon && <div>{icon}</div>}
        <div>
          {title && <p className="font-semibold text-[var(--text-primary)]">{title}</p>}
          {description && <p className="text-sm text-[var(--text-secondary)]">{description}</p>}
        </div>
      </div>
    </div>
  );
}
