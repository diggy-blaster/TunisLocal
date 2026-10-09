'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { MapPin, Search, SlidersHorizontal, Loader2, Star, ArrowRight } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

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
  const [radius, setRadius] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');

  const mockServices: Service[] = [
    { id: '1', title: 'Expert Plumbing Service', category_name: 'Plumbing', avg_rating: 4.8, review_count: 124, distance_km: 1.2, latitude: 36.8065, longitude: 10.1815, price: '50' },
    { id: '2', title: 'Tunis Clean Pro', category_name: 'Cleaning', avg_rating: 4.9, review_count: 85, distance_km: 2.5, latitude: 36.8100, longitude: 10.1850, price: '35' },
    { id: '3', title: 'Bright Electrician', category_name: 'Electric', avg_rating: 4.5, review_count: 40, distance_km: 5.0, latitude: 36.8200, longitude: 10.1900, price: '60' },
  ];

  const fetchNearby = async (lat: number, lng: number) => {
    setLoading(true);
    setTimeout(() => {
      setServices(mockServices);
      setLoading(false);
    }, 1000);
  };

  const handleLocate = () => {
    setLocating(true);
    if (!navigator.geolocation) {
      alert('Geolocation not supported');
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
      () => {
        setLocating(false);
        setUserPos([36.8065, 10.1815]);
        setServices(mockServices);
      }
    );
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-6 flex flex-col md:flex-row gap-3 items-center">
        <div className="relative flex-1 w-full md:w-auto">
          <Search className="absolute top-3 left-3 text-gray-400" size={18} />
          <input
            type="text"
            placeholder={t('services.searchPlaceholder') || 'Search services...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
          />
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
            <SlidersHorizontal size={16} className="text-gray-500" />
            <input
              type="range"
              min="1"
              max="50"
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
              className="w-24 accent-blue-600"
            />
            <span className="text-sm font-medium text-gray-600 min-w-[3rem]">{radius} km</span>
          </div>
          
          <button
            onClick={handleLocate}
            disabled={locating}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2.5 rounded-lg transition flex items-center gap-2 whitespace-nowrap shadow-sm active:scale-95"
          >
            {locating ? <Loader2 className="animate-spin" size={18} /> : <MapPin size={18} />}
            {t('map.locateMe') || 'Locate Me'}
          </button>
        </div>
      </div>

      {/* Map + List Split */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-gray-100 border border-gray-200 rounded-xl overflow-hidden h-[500px] lg:h-[calc(100vh-220px)] sticky top-24 relative">
            {userPos ? (
              <div className="w-full h-full flex items-center justify-center bg-blue-50 relative">
                 <div className="text-center">
                   <MapPin size={48} className="text-blue-500 mx-auto mb-2 animate-bounce" />
                   <p className="font-medium text-blue-900">Map Loaded</p>
                   <p className="text-sm text-blue-700">Showing {services.length} services nearby</p>
                 </div>
              </div>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 text-gray-500 gap-4">
                <MapPin size={64} className="text-gray-300" />
                <div className="text-center">
                  <p className="font-medium text-lg">Find services near you</p>
                  <p className="text-sm mt-1">Click "Locate Me" to see the map</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-1 flex flex-col h-full">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Nearby Services</h2>
            <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-md">{services.length} found</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="bg-white border border-gray-200 rounded-xl p-4 animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              ))
            ) : services.length === 0 ? (
              <div className="text-center py-10 text-gray-500 bg-white rounded-xl border border-gray-200">
                <p>No services found in this area.</p>
              </div>
            ) : (
              services.map((s) => (
                <Link key={s.id} href={`/${t('locale') || 'en'}/services/${s.id}`}>
                  <div className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md hover:border-blue-300 transition group cursor-pointer relative">
                    <div className="absolute top-4 right-4 bg-blue-50 text-blue-700 px-2 py-1 rounded-md text-xs font-bold">
                      {s.price} TND
                    </div>

                    <div className="pr-20">
                      <h3 className="font-bold text-gray-900 group-hover:text-blue-600 transition mb-1">{s.title}</h3>
                      <p className="text-sm text-gray-500 mb-3">{s.category_name}</p>
                      
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-1 text-yellow-500">
                          <Star size={14} fill="currentColor" />
                          <span className="font-medium text-gray-700">{s.avg_rating}</span>
                          <span className="text-gray-400">({s.review_count})</span>
                        </div>
                        <div className="flex items-center gap-1 text-gray-500">
                          <MapPin size={14} />
                          <span>{s.distance_km} km</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition transform translate-x-2 group-hover:translate-x-0">
                      <ArrowRight size={20} className="text-blue-500" />
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}