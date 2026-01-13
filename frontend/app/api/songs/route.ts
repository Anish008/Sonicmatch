import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { parseCSV } from '@/lib/csvParser';
import { SpotifySongData } from '@/types/data';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const artist = searchParams.get('artist');
    const artists = searchParams.get('artists')?.split(',');
    const search = searchParams.get('search');
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : undefined;

    const filePath = path.join(process.cwd(), 'public', 'data', 'spotify_songs.csv');
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const allSongs = parseCSV<SpotifySongData>(fileContent);

    // Filter out invalid rows
    let songs = allSongs.filter(s =>
      s &&
      s.track_artist &&
      typeof s.track_artist === 'string' &&
      s.track_name &&
      typeof s.track_name === 'string'
    );

    // Filter by artist if provided
    if (artist) {
      songs = songs.filter(s =>
        s.track_artist && s.track_artist.toLowerCase().includes(artist.toLowerCase())
      );
    }

    // Filter by multiple artists if provided
    if (artists && artists.length > 0) {
      songs = songs.filter(s =>
        s.track_artist && artists.some(a => s.track_artist.toLowerCase().includes(a.toLowerCase()))
      );
    }

    // Search by song name if provided
    if (search) {
      const searchLower = search.toLowerCase();
      songs = songs.filter(s =>
        (s.track_name && s.track_name.toLowerCase().includes(searchLower)) ||
        (s.track_artist && s.track_artist.toLowerCase().includes(searchLower))
      );
    }

    // Apply limit if provided
    if (limit && limit > 0) {
      songs = songs.slice(0, limit);
    }

    return NextResponse.json({ songs, count: songs.length });
  } catch (error) {
    console.error('Error loading songs:', error);
    return NextResponse.json(
      { error: 'Failed to load songs data' },
      { status: 500 }
    );
  }
}
