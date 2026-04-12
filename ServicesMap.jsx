// components/ServicesMap.jsx
// Leaflet map showing services as markers, no Google Maps API key required.
// Supports Arabic RTL popups.

'use client';

import { useEffect, useRef, useState } from 'react';

// Leaflet must be imported client-side only (no SSR)
let L;

const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

// Tunisia center
const TUNISIA_CENTER = [33.8869, 9.5375];
const DEFAULT_ZOOM   = 7;

// Color per category slug
const CATEGORY_COLORS = {
  cleaning:     '#1D9E75',
  repairs:      '#D85A30',
  tutoring:     '#7F77DD',
  freelance:    '#378ADD',
  default:      '#185FA5',
};

function getCategoryColor(categoryName = '') {
  const slug = categoryName.toLowerCase().replace(/\s+/g, '_');
  return CATEGORY_COLORS[slug] || CATEGORY_COLORS.default;
}

function createMarkerIcon(color, rating) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 44" width="36" height="44">
      <path d="M18 0C8.06 0 0 8.06 0 18c0 13.5 18 26 18 26S36 31.5 36 18C36 8.06 27.94 0 18 0z"
            fill="${color}" stroke="white" stroke-width="2"/>
      <text x="18" y="23" text-anchor="middle" fill="white"
            font-size="11" font-family="system-ui, sans-serif" font-weight="600">
        ${rating ? parseFloat(rating).toFixed(1) : '—'}
      </text>
    </svg>`;

  return L.divIcon({
    html: svg,
    iconSize:   [36, 44],
    iconAnchor: [18, 44],
    popupAnchor:[0, -44],
    className:  '',
  });
}

function buildPopupHTML(service, lang = 'en') {
  const isRTL  = lang === 'ar';
  const dir    = isRTL ? 'rtl' : 'ltr';
  const rating = service.avg_rating ? parseFloat(service.avg_rating).toFixed(1) : null;
  const reviews = service.review_count || 0;

  const labels = {
    en: { book: 'Book Now', reviews: 'reviews', distance: 'km away', price: 'TND' },
    fr: { book: 'Réserver', reviews: 'avis',    distance: 'km',       price: 'TND' },
    ar: { book: 'احجز الآن', reviews: 'تقييم',  distance: 'كم',       price: 'د.ت' },
  };
  const l = labels[lang] || labels.en;

  return `
    <div dir="${dir}" style="
      font-family: system-ui, -apple-system, sans-serif;
      min-width: 200px;
      max-width: 260px;
      line-height: 1.4;
    ">
      <div style="font-weight:600;font-size:14px;margin-bottom:4px;color:#111;">
        ${service.title}
      </div>
      <div style="font-size:12px;color:#666;margin-bottom:6px;">
        ${service.category_name || ''}${service.location ? ' · ' + service.location : ''}
      </div>
      ${rating ? `
      <div style="font-size:12px;margin-bottom:6px;color:#444;">
        ${'★'.repeat(Math.round(rating))}${'☆'.repeat(5 - Math.round(rating))}
        <span style="margin-${isRTL ? 'right' : 'left'}:4px;">${rating} (${reviews} ${l.reviews})</span>
      </div>` : ''}
      <div style="display:flex;align-items:center;justify-content:space-between;margin-top:8px;">
        <span style="font-size:13px;font-weight:600;color:#185FA5;">
          ${service.price} ${l.price}
          <span style="font-weight:400;font-size:11px;color:#888;">
            /${service.price_unit === 'hour' ? (lang === 'ar' ? 'س' : lang === 'fr' ? 'h' : 'hr') : service.price_unit}
          </span>
        </span>
        <a href="/services/${service.id}" style="
          background:#185FA5;color:white;
          padding:4px 10px;border-radius:6px;
          font-size:12px;font-weight:500;
          text-decoration:none;
        ">${l.book}</a>
      </div>
      ${service.distance_km != null ? `
      <div style="font-size:11px;color:#999;margin-top:4px;text-align:${isRTL ? 'right' : 'left'}">
        ${parseFloat(service.distance_km).toFixed(1)} ${l.distance}
      </div>` : ''}
    </div>
  `;
}

export default function ServicesMap({
  services = [],
  userLocation = null,
  lang = 'en',
  onServiceSelect,
  height = '480px',
}) {
  const mapRef       = useRef(null);
  const leafletRef   = useRef(null);
  const markersRef   = useRef([]);
  const userMarkerRef = useRef(null);
  const [leafletReady, setLeafletReady] = useState(false);

  // Dynamically import Leaflet (client-only)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    Promise.all([
      import('leaflet'),
      import('leaflet/dist/leaflet.css'),
    ]).then(([leafletModule]) => {
      L = leafletModule.default;
      setLeafletReady(true);
    });
  }, []);

  // Initialise map
  useEffect(() => {
    if (!leafletReady || !mapRef.current || leafletRef.current) return;

    const map = L.map(mapRef.current, {
      center: TUNISIA_CENTER,
      zoom:   DEFAULT_ZOOM,
      zoomControl: true,
    });

    L.tileLayer(TILE_URL, {
      attribution: TILE_ATTRIBUTION,
      maxZoom: 19,
    }).addTo(map);

    leafletRef.current = map;

    return () => {
      map.remove();
      leafletRef.current = null;
    };
  }, [leafletReady]);

  // Render service markers
  useEffect(() => {
    if (!leafletRef.current || !leafletReady) return;

    const map = leafletRef.current;

    // Clear old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    services.forEach((service) => {
      if (!service.latitude || !service.longitude) return;

      const color  = getCategoryColor(service.category_name);
      const icon   = createMarkerIcon(color, service.avg_rating);
      const marker = L.marker([service.latitude, service.longitude], { icon })
        .addTo(map)
        .bindPopup(buildPopupHTML(service, lang), {
          maxWidth: 280,
          className: 'tunislocal-popup',
        });

      marker.on('click', () => {
        onServiceSelect?.(service);
      });

      markersRef.current.push(marker);
    });

    // Fit bounds to all markers
    if (markersRef.current.length > 0) {
      const group = L.featureGroup(markersRef.current);
      map.fitBounds(group.getBounds().pad(0.15));
    }
  }, [services, leafletReady, lang]);

  // Render user location marker
  useEffect(() => {
    if (!leafletRef.current || !leafletReady || !userLocation) return;

    const map = leafletRef.current;

    if (userMarkerRef.current) userMarkerRef.current.remove();

    const userIcon = L.divIcon({
      html: `<div style="
        width:14px;height:14px;
        background:#D85A30;border:3px solid white;
        border-radius:50%;box-shadow:0 0 0 3px rgba(216,90,48,0.3);
      "></div>`,
      iconSize:   [14, 14],
      iconAnchor: [7, 7],
      className:  '',
    });

    userMarkerRef.current = L.marker([userLocation.lat, userLocation.lng], { icon: userIcon })
      .addTo(map)
      .bindPopup(lang === 'ar' ? 'موقعك' : lang === 'fr' ? 'Votre position' : 'Your location');

    map.setView([userLocation.lat, userLocation.lng], 12);
  }, [userLocation, leafletReady, lang]);

  return (
    <div style={{ position: 'relative', width: '100%', height }}>
      {/* Leaflet CSS override for RTL popups */}
      <style>{`
        .tunislocal-popup .leaflet-popup-content-wrapper {
          border-radius: 10px;
          padding: 0;
          box-shadow: 0 4px 20px rgba(0,0,0,0.12);
        }
        .tunislocal-popup .leaflet-popup-content {
          margin: 12px 14px;
        }
      `}</style>
      <div
        ref={mapRef}
        style={{ width: '100%', height: '100%', borderRadius: '12px' }}
      />
      {!leafletReady && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: '#f5f5f4', borderRadius: '12px',
          fontSize: '14px', color: '#888',
        }}>
          {lang === 'ar' ? 'جارٍ تحميل الخريطة...' : lang === 'fr' ? 'Chargement de la carte…' : 'Loading map…'}
        </div>
      )}
    </div>
  );
}
