import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { findServicesNearby } from '@/lib/geo'; // keep your geo.js but convert to .ts/ESM

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lat = parseFloat(searchParams.get('lat') || '0');
  const lng = parseFloat(searchParams.get('lng') || '0');
  const radiusKm = parseFloat(searchParams.get('radius') || '50');
  const categoryId = searchParams.get('categoryId') || null;

  const rows = await findServicesNearby({ lat, lng, radiusKm, categoryId });
  return NextResponse.json(rows);
}
