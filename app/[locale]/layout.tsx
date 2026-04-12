import { NextIntlClientProvider, useMessages } from 'next-intl';
import { getTranslations, unstable_setRequestLocale } from 'next-intl/server';
import '@/app/globals.css';

export function generateStaticParams() {
  return [{ locale: 'en' }, { locale: 'fr' }, { locale: 'ar' }];
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  unstable_setRequestLocale(params.locale);
  const messages = useMessages();
  const t = await getTranslations('layout');
  const dir = params.locale === 'ar' ? 'rtl' : 'ltr';

  return (
    <html lang={params.locale} dir={dir}>
      <body className="min-h-screen bg-gray-50 text-gray-900 font-sans">
        <NextIntlClientProvider messages={messages}>
          <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b px-6 py-4 flex justify-between items-center">
            <h1 className="text-xl font-bold tracking-tight">{t('title')}</h1>
            <nav className="flex gap-4 text-sm font-medium">
              {['home', 'services', 'bookings', 'reviews'].map((key) => (
                <a key={key} href={`/${params.locale}/${key}`} className="hover:text-blue-600 transition">
                  {t(`nav.${key}`)}
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
