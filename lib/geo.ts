import { pool } from './db';

function boundingBox(lat: number, lng: number, radiusKm: number) {
  const deltaLat = radiusKm / 111.0;
  const deltaLng = radiusKm / (111.0 * Math.cos((lat * Math.PI) / 180));
  return {
    minLat: lat - deltaLat, maxLat: lat + deltaLat,
    minLng: lng - deltaLng, maxLng: lng + deltaLng,
  };
}

export async function findServicesNearby({
  lat, lng, radiusKm = 50, categoryId = null, limit = 50, offset = 0,
}: {
  lat: number; lng: number; radiusKm?: number;
  categoryId?: string | null; limit?: number; offset?: number;
}) {
  const radiusMetres = radiusKm * 1000;
  const { minLat, maxLat, minLng, maxLng } = boundingBox(lat, lng, radiusKm);
  const params: (string | number | null)[] = [lat, lng, radiusMetres, minLat, maxLat, minLng, maxLng, limit, offset];
  let categoryClause = '';
  if (categoryId) {
    params.push(categoryId);
    categoryClause = `AND s.category_id = $${params.length}`;
  }
  const sql = `
    SELECT s.*, c.name AS category_name,
      COALESCE(sr.avg_rating, 0) AS avg_rating,
      COALESCE(sr.review_count, 0) AS review_count,
      ST_Distance(s.location_point::geography,
        ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography) / 1000.0 AS distance_km
    FROM services s
    JOIN categories c ON c.id = s.category_id
    LEFT JOIN service_ratings sr ON sr.service_id = s.id
    WHERE s.latitude BETWEEN $4 AND $5
      AND s.longitude BETWEEN $6 AND $7
      AND ST_DWithin(s.location_point::geography,
        ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography, $3)
      ${categoryClause}
    ORDER BY distance_km ASC
    LIMIT $8 OFFSET $9
  `;
  const { rows } = await pool.query(sql, params);
  return rows;
}