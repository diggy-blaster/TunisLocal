import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';

export default function HomePage() {
  const t = useTranslations('home');
  const locale = useLocale();

  return (
    <div className="space-y-16 py-12">
      <section className="text-center max-w-3xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-extrabold mb-4">{t('hero.title')}</h1>
        <p className="text-lg text-[var(--muted)] mb-8">{t('hero.subtitle')}</p>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Link href={`/${locale}/services`} className="btn-primary px-8 py-3 text-base">
            {t('hero.cta')}
          </Link>
          <Link
            href={`/${locale}/how-it-works`}
            className="px-8 py-3 border border-[var(--border)] rounded-lg hover:bg-[var(--bg-secondary)] transition"
          >
            {t('hero.secondary')}
          </Link>
        </div>
      </section>

      <section className="container mx-auto px-4">
        <h2 className="text-2xl font-bold mb-6 text-center">{t('categories.title')}</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {['cleaning', 'plumbing', 'electric', 'moving'].map((cat) => (
            <div key={cat} className="card p-6 text-center hover:border-[var(--accent)] cursor-pointer">
              <div className="text-3xl mb-2">🛠️</div>
              <p className="font-medium">{t(`categories.${cat}`)}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
