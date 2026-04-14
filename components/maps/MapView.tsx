// components/maps/MapView.tsx
'use client';

import { useEffect } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default icon paths in Next.js
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

interface Marker {
  position: [number, number];
  popup?: string;
}

export default function MapView({ 
  center, 
  markers = [], 
  zoom = 13 
}: { 
  center: [number, number]; 
  markers?: Marker[]; 
  zoom?: number; 
}) {
  useEffect(() => {
    const map = L.map('map-container').setView(center, zoom);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    markers.forEach(marker => {
      const m = L.marker(marker.position).addTo(map);
      if (marker.popup) m.bindPopup(marker.popup);
    });

    return () => { map.remove(); };
  }, [center, markers, zoom]);

  return <div id="map-container" className="w-full h-full" />;
}