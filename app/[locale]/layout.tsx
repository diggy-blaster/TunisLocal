import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import '@/app/globals.css';

export function generateStaticParams() {
  return [{ locale: 'en' }, { locale: 'fr' }, { locale: 'ar' }];
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const messages = await getMessages();
  const t = await getTranslations('layout');
  const dir = locale === 'ar' ? 'rtl' : 'ltr';

  return (
    <html lang={locale} dir={dir}>
      <body className="min-h-screen bg-gray-50 text-gray-900 font-sans">
        <NextIntlClientProvider messages={messages}>
          <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b px-6 py-4 flex justify-between items-center">
            <h1 className="text-xl font-bold tracking-tight">{t('title')}</h1>
            <nav className="flex gap-4 text-sm font-medium">
              {['home', 'services', 'bookings', 'reviews'].map((key) => (
                <a key={key} href={`/${locale}/${key}`} className="hover:text-blue-600 transition">
                  {t(`nav.${key}` as any)}
                </a>
              ))}
            </nav>
          </header>
          <main className="container mx-auto px-4 py-6 max-w-7xl">{children}</main>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}