// lib/geo.js
// PostGIS-powered proximity search with bounding-box pre-filter
// Falls back to pure Haversine if PostGIS unavailable

const { pool } = require('./db');

/**
 * Convert km radius to approximate degree delta for bounding-box pre-filter.
 * 1° lat ≈ 111 km everywhere; 1° lng ≈ 111 * cos(lat) km.
 */
function boundingBox(lat, lng, radiusKm) {
  const deltaLat = radiusKm / 111.0;
  const deltaLng = radiusKm / (111.0 * Math.cos((lat * Math.PI) / 180));
  return {
    minLat: lat - deltaLat,
    maxLat: lat + deltaLat,
    minLng: lng - deltaLng,
    maxLng: lng + deltaLng,
  };
}

/**
 * Find services within radiusKm of (lat, lng).
 *
 * Strategy:
 *  1. Bounding-box WHERE clause hits the btree indexes on latitude/longitude
 *     (fast elimination of distant rows — O(log n))
 *  2. ST_DWithin on location_point GIST index for exact radius (metres)
 *     (correct spherical distance, eliminates bounding-box corners)
 *  3. ST_Distance for ORDER BY distance
 *
 * If PostGIS columns aren't populated yet, falls back to Haversine in SQL.
 */
async function findServicesNearby({
  lat,
  lng,
  radiusKm = 50,
  categoryId = null,
  limit = 50,
  offset = 0,
}) {
  const radiusMetres = radiusKm * 1000;
  const { minLat, maxLat, minLng, maxLng } = boundingBox(lat, lng, radiusKm);

  const params = [lat, lng, radiusMetres, minLat, maxLat, minLng, maxLng, limit, offset];
  let categoryClause = '';

  if (categoryId) {
    params.push(categoryId);
    categoryClause = `AND s.category_id = $${params.length}`;
  }

  const sql = `
    WITH nearby AS (
      SELECT
        s.*,
        c.name                                          AS category_name,
        COALESCE(sr.avg_rating, 0)                      AS avg_rating,
        COALESCE(sr.review_count, 0)                    AS review_count,
        ST_Distance(
          s.location_point::geography,
          ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography
        ) / 1000.0                                      AS distance_km
      FROM services s
      JOIN categories c ON c.id = s.category_id
      LEFT JOIN service_ratings sr ON sr.service_id = s.id
      WHERE
        -- Bounding-box pre-filter (uses btree indexes)
        s.latitude  BETWEEN $4 AND $5
        AND s.longitude BETWEEN $6 AND $7
        -- Exact spherical radius (uses GIST index on location_point)
        AND ST_DWithin(
          s.location_point::geography,
          ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography,
          $3
        )
        ${categoryClause}
    )
    SELECT *
    FROM nearby
    ORDER BY distance_km ASC
    LIMIT $8 OFFSET $9
  `;

  const { rows } = await pool.query(sql, params);
  return rows;
}

/**
 * Pure SQL Haversine fallback (no PostGIS required).
 * Used only when location_point column is not populated.
 */
async function findServicesNearbyHaversine({
  lat,
  lng,
  radiusKm = 50,
  categoryId = null,
  limit = 50,
  offset = 0,
}) {
  const { minLat, maxLat, minLng, maxLng } = boundingBox(lat, lng, radiusKm);

  const params = [lat, lng, radiusKm, minLat, maxLat, minLng, maxLng, limit, offset];
  let categoryClause = '';

  if (categoryId) {
    params.push(categoryId);
    categoryClause = `AND s.category_id = $${params.length}`;
  }

  const sql = `
    WITH bboxed AS (
      SELECT s.*, c.name AS category_name,
        COALESCE(sr.avg_rating, 0)    AS avg_rating,
        COALESCE(sr.review_count, 0)  AS review_count
      FROM services s
      JOIN categories c ON c.id = s.category_id
      LEFT JOIN service_ratings sr ON sr.service_id = s.id
      WHERE
        s.latitude  BETWEEN $4 AND $5
        AND s.longitude BETWEEN $6 AND $7
        ${categoryClause}
    ),
    with_distance AS (
      SELECT *,
        6371 * 2 * ASIN(SQRT(
          POWER(SIN(RADIANS(latitude  - $1) / 2), 2) +
          COS(RADIANS($1)) * COS(RADIANS(latitude)) *
          POWER(SIN(RADIANS(longitude - $2) / 2), 2)
        )) AS distance_km
      FROM bboxed
    )
    SELECT * FROM with_distance
    WHERE distance_km <= $3
    ORDER BY distance_km ASC
    LIMIT $8 OFFSET $9
  `;

  const { rows } = await pool.query(sql, params);
  return rows;
}

module.exports = { findServicesNearby, findServicesNearbyHaversine, boundingBox };
