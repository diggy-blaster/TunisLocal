import Link from 'next/link';

const locales = [
  { code: 'en', label: 'EN' },
  { code: 'fr', label: 'FR' },
  { code: 'ar', label: 'AR' },
];

export function LanguageSwitcher({ currentLocale }: { currentLocale: string }) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2 text-sm text-[var(--text-primary)]">
      {locales.map((locale) => (
        <Link
          key={locale.code}
          href={`/${locale.code}`}
          className={`rounded-full px-2 py-1 transition ${currentLocale === locale.code ? 'bg-[var(--accent)] text-white' : 'hover:bg-slate-100'}`}
        >
          {locale.label}
        </Link>
      ))}
    </div>
  );
}
