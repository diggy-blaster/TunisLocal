import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import '@/app/globals.css';

const locales = ['en', 'fr', 'ar'];

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  if (!locales.includes(params.locale)) notFound();

  const messages = await getMessages();
  const t = await getTranslations('layout');
  const dir = params.locale === 'ar' ? 'rtl' : 'ltr';

  return (
    <html lang={params.locale} dir={dir}>
      <body className="min-h-screen bg-gray-50 text-gray-900">
        <NextIntlClientProvider messages={messages}>
          <header className="border-b bg-white px-6 py-4 flex justify-between items-center">
            <h1 className="text-xl font-bold">{t('title')}</h1>
            <nav className="flex gap-4">
              {['home', 'services', 'bookings', 'reviews'].map((key) => (
                <a key={key} href={`/${params.locale}/${key}`}>
                  {t(`nav.${key}`)}
                </a>
              ))}
            </nav>
          </header>
          <main className="container mx-auto px-4 py-6">{children}</main>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
