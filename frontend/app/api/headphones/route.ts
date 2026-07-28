import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { parseCSV } from '@/lib/csvParser';
import { HeadphoneData } from '@/types/data';

// Cache the parsed headphones data to avoid re-reading CSV on every request
let cachedHeadphones: HeadphoneData[] | null = null;
let cacheTimestamp: number | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

async function loadHeadphones(): Promise<HeadphoneData[]> {
  // Return cached data if still valid
  if (cachedHeadphones && cacheTimestamp && Date.now() - cacheTimestamp < CACHE_DURATION) {
    return cachedHeadphones;
  }

  // Load and parse CSV
  const filePath = path.join(process.cwd(), 'public', 'data', 'headphones_with_image_urls.csv');
  const fileContent = await fs.readFile(filePath, 'utf-8');
  const allHeadphones = parseCSV<HeadphoneData>(fileContent);

  // Filter out invalid rows
  const headphones = allHeadphones.filter(h =>
    h &&
    h.headphone_id &&
    h.brand &&
    typeof h.brand === 'string' &&
    h.model &&
    typeof h.model === 'string'
  );

  // Update cache
  cachedHeadphones = headphones;
  cacheTimestamp = Date.now();

  return headphones;
}

export async function GET() {
  try {
    const headphones = await loadHeadphones();

    return NextResponse.json(
      { headphones, count: headphones.length },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      }
    );
  } catch (error) {
    console.error('Error loading headphones:', error);
    return NextResponse.json(
      { error: 'Failed to load headphones data' },
      { status: 500 }
    );
  }
}

// Force cache revalidation on next request (useful for development)
export const revalidate = 300; // 5 minutes
