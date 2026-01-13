import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { parseCSV } from '@/lib/csvParser';
import { HeadphoneData } from '@/types/data';

export async function GET() {
  try {
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

    return NextResponse.json({ headphones, count: headphones.length });
  } catch (error) {
    console.error('Error loading headphones:', error);
    return NextResponse.json(
      { error: 'Failed to load headphones data' },
      { status: 500 }
    );
  }
}
