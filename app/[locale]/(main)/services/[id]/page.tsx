'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import ReviewForm from '@/components/forms/ReviewForm';
import { Star, MapPin, Clock, Phone } from 'lucide-react';

export default async function ServiceDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = useTranslations('service');
  const [activeTab, setActiveTab] = useState<'info' | 'reviews'>('info');

  const service = {
    title: 'Expert Plumbing Services',
    rating: 4.8,
    reviews: 124,
    location: 'Ariana, Tunis',
    hours: '08:00 - 18:00',
    price: '50 TND',
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-4">{service.title}</h1>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="flex flex-wrap items-center gap-4 text-[var(--muted)]">
            <span className="flex items-center gap-1">
              <Star size={16} className="text-yellow-400" /> {service.rating} ({service.reviews})
            </span>
            <span className="flex items-center gap-1">
              <MapPin size={16} /> {service.location}
            </span>
            <span className="flex items-center gap-1">
              <Clock size={16} /> {service.hours}
            </span>
          </div>

          <div className="border-b border-[var(--border)] flex gap-4">
            {(['info', 'reviews'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`pb-2 text-sm font-medium border-b-2 transition ${
                  activeTab === tab
                    ? 'border-[var(--accent)] text-[var(--accent)]'
                    : 'border-transparent text-[var(--muted)]'
                }`}
              >
                {t(`tabs.${tab}`)}
              </button>
            ))}
          </div>

          {activeTab === 'info' && (
            <div className="prose max-w-none text-[var(--text-primary)]">
              <p>{t('description')}</p>
            </div>
          )}

          {activeTab === 'reviews' && <ReviewForm bookingId="mock-booking-id" />}
        </div>

        <div className="card p-6 h-fit sticky top-20">
          <p className="text-2xl font-bold text-[var(--accent)] mb-4">{service.price}</p>
          <button className="btn-primary w-full mb-3">{t('bookNow')}</button>
          <button className="w-full py-2 border border-[var(--border)] rounded-lg hover:bg-[var(--bg-secondary)] transition flex items-center justify-center gap-2">
            <Phone size={16} /> {t('contact')}
          </button>
        </div>
      </div>
    </div>
  );
}
