import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { parseCSV } from '@/lib/csvParser';
import { SpotifySongData } from '@/types/data';

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'public', 'data', 'spotify_songs.csv');
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const songs = parseCSV<SpotifySongData>(fileContent);

    // Extract unique artists
    const artistsSet = new Set<string>();
    songs.forEach(song => {
      if (song && song.track_artist && typeof song.track_artist === 'string' && song.track_artist.trim()) {
        artistsSet.add(song.track_artist.trim());
      }
    });

    const artists = Array.from(artistsSet).sort();

    return NextResponse.json({ artists, count: artists.length });
  } catch (error) {
    console.error('Error loading artists:', error);
    return NextResponse.json(
      { error: 'Failed to load artists data' },
      { status: 500 }
    );
  }
}
