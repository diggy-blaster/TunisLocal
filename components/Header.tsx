'use client';

import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import { useState } from 'react';
import { Menu, X, Globe } from 'lucide-react';

export default function Header() {
  const t = useTranslations('layout');
  const locale = useLocale();
  const [open, setOpen] = useState(false);

  const navItems = [
    { key: 'home', href: '/' },
    { key: 'services', href: '/services' },
    { key: 'bookings', href: '/bookings' },
    { key: 'profile', href: '/profile' },
  ];

  return (
    <header className="sticky top-0 z-50 bg-[var(--bg-primary)]/90 backdrop-blur-md border-b border-[var(--border)]">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href={`/${locale}`} className="text-xl font-bold text-[var(--accent)]">
          TunisLocal
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          {navItems.map((item) => (
            <Link
              key={item.key}
              href={`/${locale}${item.href}`}
              className="text-sm font-medium hover:text-[var(--accent)] transition"
            >
              {t(`nav.${item.key}`)}
            </Link>
          ))}
          <Link
            href={`/${locale === 'en' ? 'fr' : 'en'}`}
            className="flex items-center gap-1 text-sm hover:text-[var(--accent)]"
          >
            <Globe size={16} /> {locale.toUpperCase()}
          </Link>
        </nav>

        <button
          onClick={() => setOpen(!open)}
          className="md:hidden p-2 rounded-lg hover:bg-[var(--bg-secondary)]"
          aria-label={open ? 'Close menu' : 'Open menu'}
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-[var(--border)] bg-[var(--bg-primary)] p-4 space-y-3">
          {navItems.map((item) => (
            <Link
              key={item.key}
              href={`/${locale}${item.href}`}
              className="block py-2 text-sm hover:text-[var(--accent)]"
              onClick={() => setOpen(false)}
            >
              {t(`nav.${item.key}`)}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}
