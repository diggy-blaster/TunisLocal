import { useTranslations } from 'next-intl';
import Link from 'next/link';

export default function HomePage() {
  const t = useTranslations('layout');
  return (
    <div className="space-y-8 text-center py-12">
      <h2 className="text-4xl font-extrabold">{t('title')}</h2>
      <p className="text-lg text-gray-600 max-w-2xl mx-auto">
        Find trusted local services, book instantly, and pay securely. Available in your language.
      </p>
      <div className="flex justify-center gap-4">
        <Link href="/services" className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
          {t('nav.services')}
        </Link>
        <Link href="/bookings" className="px-6 py-3 border rounded-lg hover:bg-gray-100 transition">
          {t('nav.bookings')}
        </Link>
      </div>
    </div>
  );
}
