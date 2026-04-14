// app/[locale]/(main)/services/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { MapPin, Search, Loader2, Star } from 'lucide-react';

interface Service {
  id: string;
  title: string;
  category_name: string;
  avg_rating: number;
  review_count: number;
  distance_km: number;
  latitude: number;
  longitude: number;
  price: string;
}

export default function ServicesPage() {
  const t = useTranslations();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [userPos, setUserPos] = useState<[number, number] | null>(null);
  const [radius, setRadius] = useState(20);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchNearby = async (lat: number, lng: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        lat: lat.toString(),
        lng: lng.toString(),
        radius: radius.toString(),
      });
      if (searchQuery) params.append('search', searchQuery);

      const res = await fetch(`/api/services/nearby?${params}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setServices(data.rows || []);
    } catch (err) {
      console.error('Fetch error:', err);
      setServices([]);
    } finally {
      setLoading(false);
    }
  };

  const handleLocate = () => {
    setLocating(true);
    if (!navigator.geolocation) {
      alert(t('map.noLocation'));
      setLocating(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setUserPos([latitude, longitude]);
        fetchNearby(latitude, longitude);
        setLocating(false);
      },
      (err) => {
        console.error('Geolocation error:', err);
        setLocating(false);
        alert(t('map.noLocation'));
      }
    );
  };

  // Re-fetch when filters change
  useEffect(() => {
    if (userPos) {
      fetchNearby(userPos[0], userPos[1]);
    }
  }, [radius, searchQuery]);

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="bg-white p-4 rounded-xl border flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute top-3 left-3 text-gray-400" size={18} />
          <input
            type="text"
            placeholder={t('services.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min="5"
            max="50"
            value={radius}
            onChange={(e) => setRadius(Number(e.target.value))}
            className="w-32"
          />
          <span className="text-sm w-14 text-right">{radius} km</span>
        </div>
        <button
          onClick={handleLocate}
          disabled={locating}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition flex items-center gap-2"
        >
          {locating ? <Loader2 className="animate-spin" size={18} /> : <MapPin size={18} />}
          {t('map.locateMe')}
        </button>
      </div>

      {/* Map Placeholder + Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Map Placeholder */}
        <div className="lg:col-span-2 h-64 lg:h-[600px] rounded-xl border bg-gray-100 flex items-center justify-center text-gray-500">
          {userPos ? (
            <div className="text-center">
              <MapPin size={48} className="mx-auto mb-2 text-gray-400" />
              <p>📍 {userPos[0].toFixed(4)}, {userPos[1].toFixed(4)}</p>
              <p className="text-sm mt-1">{t('map.viewOnMap')}</p>
              <a 
                href={`https://www.openstreetmap.org/?mlat=${userPos[0]}&mlon=${userPos[1]}#map=13/${userPos[0]}/${userPos[1]}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 text-sm hover:underline mt-2 inline-block"
              >
                Open in OpenStreetMap →
              </a>
            </div>
          ) : (
            <div className="text-center">
              <MapPin size={48} className="mx-auto mb-2 text-gray-400" />
              <p>{t('map.noLocation')}</p>
              <button onClick={handleLocate} className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                {t('map.locateMe')}
              </button>
            </div>
          )}
        </div>

        {/* Services Grid */}
        <div className="lg:col-span-1">
          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
            {loading && (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="border rounded-xl p-4 animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            )}
            
            {!loading && services.length === 0 && userPos && (
              <p className="text-center text-gray-500 py-8">{t('services.noResults')}</p>
            )}
            
            {services.map((s) => (
              <Link key={s.id} href={`/${t('locale')}/services/${s.id}`} className="block">
                <div className="border rounded-xl p-4 hover:shadow-md transition cursor-pointer bg-white">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-lg">{s.title}</h3>
                      <p className="text-sm text-gray-500">{s.category_name}</p>
                    </div>
                    <span className="text-blue-600 font-bold">{s.price}</span>
                  </div>
                  <div className="flex justify-between items-center mt-3 text-sm">
                    <span className="flex items-center gap-1">
                      <Star size={14} className="text-yellow-400 fill-yellow-400" />
                      {s.avg_rating} ({s.review_count})
                    </span>
                    <span className="text-gray-500">
                      {t('serviceCard.distance', { dist: s.distance_km?.toFixed(1) || '0' })}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}