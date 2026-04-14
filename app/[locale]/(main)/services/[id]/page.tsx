// app/[locale]/(main)/services/[id]/page.tsx
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { pool } from '@/lib/db';
import Link from 'next/link';
import { MapPin, Clock, Star, Phone, Calendar, ChevronLeft } from 'lucide-react';

// Fetch service data on the server
async function getServiceData(id: string) {
  try {
    const { rows } = await pool.query(
      `SELECT 
         s.id, s.title, s.description, s.price,
         s.latitude, s.longitude,
         c.name AS category_name,
         p.name AS provider_name, p.avatar AS provider_avatar, p.phone,
         COALESCE(sr.avg_rating, 0) AS avg_rating,
         COALESCE(sr.review_count, 0) AS review_count
       FROM services s
       JOIN categories c ON c.id = s.category_id
       JOIN auth_users p ON p.id = s.provider_id
       LEFT JOIN service_ratings sr ON sr.service_id = s.id
       WHERE s.id = $1`,
      [id]
    );
    return rows[0] || null;
  } catch (error) {
    console.error('Error fetching service:', error);
    return null;
  }
}

export default async function ServiceDetailPage({ 
  params 
}: { 
  params: Promise<{ locale: string; id: string }> 
}) {
  const { locale, id } = await params;
  const t = await getTranslations('service');
  
  const service = await getServiceData(id);
  if (!service) notFound();

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link href={`/${locale}/services`} className="hover:text-blue-600 flex items-center gap-1">
          <ChevronLeft size={16} /> {t('backToList')}
        </Link>
        <span>/</span>
        <span className="text-gray-900">{service.category_name}</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold mb-2">{service.title}</h1>
          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <Star size={16} className="text-yellow-400 fill-yellow-400" />
              {service.avg_rating} ({service.review_count})
            </span>
            <span className="flex items-center gap-1">
              <MapPin size={16} /> {service.provider_name}
            </span>
          </div>
        </div>
        <div className="text-2xl font-bold text-blue-600">{service.price} TND</div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Map Placeholder */}
          <div className="border rounded-xl overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="font-semibold">{t('location')}</h2>
              {service.latitude && service.longitude && (
                <a 
                  href={`https://www.openstreetmap.org/?mlat=${service.latitude}&mlon=${service.longitude}#map=16/${service.latitude}/${service.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline"
                >
                  {t('openInMaps')}
                </a>
              )}
            </div>
            <div className="h-64 bg-gray-100 flex items-center justify-center text-gray-500">
              {service.latitude && service.longitude 
                ? `📍 ${service.latitude.toFixed(4)}, ${service.longitude.toFixed(4)}`
                : t('location')}
            </div>
          </div>

          {/* Description */}
          <div className="border rounded-xl p-6">
            <h2 className="font-semibold mb-3">{t('about')}</h2>
            <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{service.description}</p>
          </div>
        </div>

        {/* Right: Booking Card */}
        <div className="lg:col-span-1">
          <div className="border rounded-xl p-6 sticky top-20 space-y-4 bg-white">
            {/* Provider Info */}
            <div className="flex items-center gap-3 pb-4 border-b">
              <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-lg font-medium">
                {service.provider_avatar ? (
                  <img src={service.provider_avatar} alt={service.provider_name} className="w-full h-full rounded-full object-cover" />
                ) : service.provider_name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-medium">{service.provider_name}</p>
                <p className="text-sm text-gray-500">{service.category_name}</p>
              </div>
            </div>

            {/* Contact */}
            {service.phone && (
              <a href={`tel:${service.phone}`} className="flex items-center gap-2 text-blue-600 hover:underline">
                <Phone size={18} /> {service.phone}
              </a>
            )}

            {/* Booking CTA */}
            <Link 
              href={`/${locale}/services/${id}/book`}
              className="block w-full py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition text-center flex items-center justify-center gap-2"
            >
              <Calendar size={18} /> {t('bookNow')}
            </Link>

            {/* Info List */}
            <div className="space-y-2 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <Clock size={16} /> {t('responseTime')}
              </div>
              <div className="flex items-center gap-2">
                <Star size={16} className="text-yellow-400" /> {t('verifiedProvider')}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}