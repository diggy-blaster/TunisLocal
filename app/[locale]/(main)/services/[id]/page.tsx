// app/[locale]/(main)/services/[id]/page.tsx
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { pool } from '@/lib/db';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { MapPin, Clock, Star, Phone, Calendar, ChevronLeft } from 'lucide-react';

// Dynamic import for Leaflet (avoid SSR issues)
const MapView = dynamic(() => import('@/components/maps/MapView'), { 
  ssr: false,
  loading: () => <div className="h-64 bg-gray-100 rounded-xl animate-pulse" /> 
});

// Fetch service + reviews data on the server
async function getServiceData(id: string) {
  // Fetch service details
  const { rows: serviceRows } = await pool.query(
    `SELECT 
       s.id, s.title, s.description, s.price, s.category_id,
       s.latitude, s.longitude, s.provider_id,
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

  if (serviceRows.length === 0) return null;
  const service = serviceRows[0];

  // Fetch recent reviews
  const { rows: reviews } = await pool.query(
    `SELECT 
       r.id, r.rating, r.comment, r.created_at,
       u.name AS reviewer_name, u.avatar AS reviewer_avatar
     FROM reviews r
     JOIN auth_users u ON u.id = r.reviewer_id
     WHERE r.service_id = $1
     ORDER BY r.created_at DESC
     LIMIT 5`,
    [id]
  );

  return { service, reviews };
}

export default async function ServiceDetailPage({ 
  params 
}: { 
  params: Promise<{ locale: string; id: string }> 
}) {
  // ✅ Next.js 15: await params
  const { locale, id } = await params;
  const t = await getTranslations('service');
  
  const data = await getServiceData(id);
  if (!data) notFound();
  
  const { service, reviews } = data;

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-[var(--muted)] mb-6">
        <Link href={`/${locale}/services`} className="hover:text-[var(--accent)] flex items-center gap-1">
          <ChevronLeft size={16} /> {t('backToList')}
        </Link>
        <span>/</span>
        <span className="text-[var(--text-primary)]">{service.category_name}</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold mb-2">{service.title}</h1>
          <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--muted)]">
            <span className="flex items-center gap-1">
              <Star size={16} className="text-yellow-400 fill-yellow-400" />
              {service.avg_rating} ({service.review_count})
            </span>
            <span className="flex items-center gap-1">
              <MapPin size={16} /> {service.provider_name}
            </span>
            <span className="flex items-center gap-1">
              <Clock size={16} /> {t('availableNow')}
            </span>
          </div>
        </div>
        <div className="text-2xl font-bold text-[var(--accent)]">{service.price} TND</div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Info + Reviews */}
        <div className="lg:col-span-2 space-y-6">
          {/* Map */}
          <div className="card overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="font-semibold">{t('location')}</h2>
              <a 
                href={`https://www.openstreetmap.org/?mlat=${service.latitude}&mlon=${service.longitude}#map=16/${service.latitude}/${service.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-[var(--accent)] hover:underline"
              >
                {t('openInMaps')}
              </a>
            </div>
            <div className="h-64">
              <MapView 
                center={[service.latitude, service.longitude]} 
                markers={[{ position: [service.latitude, service.longitude], popup: service.title }]} 
                zoom={15} 
              />
            </div>
          </div>

          {/* Description */}
          <div className="card p-6">
            <h2 className="font-semibold mb-3">{t('about')}</h2>
            <p className="text-[var(--muted)] leading-relaxed">{service.description}</p>
          </div>

          {/* Reviews */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">{t('reviews.title')}</h2>
              <span className="text-sm text-[var(--muted)]">{service.review_count} {t('reviews.total')}</span>
            </div>
            
            {reviews.length === 0 ? (
              <p className="text-[var(--muted)] text-center py-8">{t('reviews.noReviews')}</p>
            ) : (
              <div className="space-y-4">
                {reviews.map((review) => (
                  <div key={review.id} className="border-b border-[var(--border)] pb-4 last:border-0 last:pb-0">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium">
                        {review.reviewer_avatar ? (
                          <img src={review.reviewer_avatar} alt={review.reviewer_name} className="w-full h-full rounded-full object-cover" />
                        ) : review.reviewer_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-medium">{review.reviewer_name}</p>
                          <div className="flex items-center gap-1">
                            {[...Array(5)].map((_, i) => (
                              <Star 
                                key={i} 
                                size={14} 
                                className={i < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'} 
                              />
                            ))}
                          </div>
                        </div>
                        <p className="text-sm text-[var(--muted)] mb-2">
                          {new Date(review.created_at).toLocaleDateString(locale, { 
                            year: 'numeric', month: 'short', day: 'numeric' 
                          })}
                        </p>
                        {review.comment && <p className="text-sm text-[var(--text-primary)]">{review.comment}</p>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* Write Review CTA */}
            <div className="mt-6 pt-4 border-t border-[var(--border)]">
              <p className="text-sm text-[var(--muted)] mb-3">{t('reviews.prompt')}</p>
              <Link 
                href={`/${locale}/reviews/new?service_id=${id}`}
                className="btn-primary px-4 py-2 text-sm"
              >
                {t('reviews.write')}
              </Link>
            </div>
          </div>
        </div>

        {/* Right: Booking Card (Sticky) */}
        <div className="lg:col-span-1">
          <div className="card p-6 sticky top-20 space-y-4">
            {/* Provider Info */}
            <div className="flex items-center gap-3 pb-4 border-b border-[var(--border)]">
              <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-lg font-medium">
                {service.provider_avatar ? (
                  <img src={service.provider_avatar} alt={service.provider_name} className="w-full h-full rounded-full object-cover" />
                ) : service.provider_name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-medium">{service.provider_name}</p>
                <p className="text-sm text-[var(--muted)]">{service.category_name}</p>
              </div>
            </div>

            {/* Contact */}
            {service.phone && (
              <a href={`tel:${service.phone}`} className="flex items-center gap-2 text-[var(--accent)] hover:underline">
                <Phone size={18} /> {service.phone}
              </a>
            )}

            {/* Booking CTA */}
            <Link 
              href={`/${locale}/services/${id}/book`}
              className="btn-primary w-full py-3 text-center font-medium flex items-center justify-center gap-2"
            >
              <Calendar size={18} /> {t('bookNow')}
            </Link>

            {/* Info List */}
            <div className="space-y-2 text-sm text-[var(--muted)]">
              <div className="flex items-center gap-2">
                <Clock size={16} /> {t('responseTime')}
              </div>
              <div className="flex items-center gap-2">
                <Star size={16} className="text-yellow-400" /> {t('verifiedProvider')}
              </div>
              <div className="flex items-center gap-2">
                <MapPin size={16} /> {t('servesArea')}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}