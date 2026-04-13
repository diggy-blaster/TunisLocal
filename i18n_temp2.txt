import { getRequestConfig } from 'next-intl/server';

const locales = ['en', 'fr', 'ar'];

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = locales.includes(requested ?? '') ? requested! : 'en';
  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default,
  };
});