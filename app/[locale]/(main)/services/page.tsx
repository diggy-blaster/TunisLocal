'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet icons in Next.js
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

const MapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(m => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(m => m.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(m => m.Popup), { ssr: false });

interface Service {
  id: string;
  title: string;
  category_name: string;
  avg_rating: number;
  review_count: number;
  distance_km: number;
  latitude: number;
  longitude: number;
}

export default function ServicesPage() {
  const t = useTranslations();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [userPos, setUserPos] = useState<[number, number] | null>(null);
  const [radius, setRadius] = useState(20);

  const fetchNearby = async (lat: number, lng: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/services/nearby?lat=${lat}&lng=${lng}&radius=${radius}`);
      const data = await res.json();
      setServices(data.rows || []);
    } catch {
      setServices([]);
    } finally {
      setLoading(false);
    }
  };

  const handleLocate = () => {
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setUserPos([latitude, longitude]);
        fetchNearby(latitude, longitude);
        setLocating(false);
      },
      () => {
        setLocating(false);
        alert(t('map.noLocation'));
      }
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-10rem)]">
      {/* Map */}
      <div className="lg:col-span-2 h-full rounded-xl overflow-hidden border bg-white relative">
        {userPos ? (
          <MapContainer center={userPos} zoom={13} scrollWheelZoom className="h-full w-full">
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <Marker position={userPos}><Popup>{t('map.viewOnMap')}</Popup></Marker>
            {services.map((s) => (
              <Marker key={s.id} position={[s.latitude, s.longitude]}>
                <Popup><strong>{s.title}</strong><br />{s.category_name} • ⭐{s.avg_rating}</Popup>
              </Marker>
            ))}
          </MapContainer>
        ) : (
          <div className="flex flex-col items-center justify-center h-full bg-gray-100 text-gray-500 gap-2">
            <p>{locating ? t('map.loadingMap') : t('map.noLocation')}</p>
            <button onClick={handleLocate} disabled={locating} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
              {t('map.locateMe')}
            </button>
          </div>
        )}
      </div>

      {/* Controls & List */}
      <div className="flex flex-col gap-4 h-full">
        <div className="bg-white p-4 rounded-xl border space-y-3">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">{t('map.searchRadius')}</label>
            <input type="range" min="5" max="50" value={radius} onChange={(e) => setRadius(Number(e.target.value))} className="flex-1" />
            <span className="text-sm w-12 text-center">{radius} km</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {loading && <p className="text-gray-500 animate-pulse">{t('services.loading')}</p>}
          {!loading && services.length === 0 && userPos && <p className="text-gray-500">{t('services.noResults')}</p>}
          {services.map((s) => (
            <div key={s.id} className="bg-white p-4 rounded-xl border hover:shadow-md transition">
              <h3 className="font-semibold text-lg">{s.title}</h3>
              <p className="text-sm text-gray-500">{s.category_name}</p>
              <div className="flex justify-between items-center mt-2 text-sm">
                <span>{t('serviceCard.rating', { rating: s.avg_rating, count: s.review_count })}</span>
                <span className="text-blue-600 font-medium">{t('serviceCard.distance', { dist: s.distance_km.toFixed(1) })}</span>
              </div>
              <button className="mt-3 w-full py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition">
                {t('services.bookNow')}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
