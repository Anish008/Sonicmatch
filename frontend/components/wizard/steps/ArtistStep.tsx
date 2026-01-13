'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWizardStore } from '@/stores';
import { SpotifySongData } from '@/types/data';

const MAX_SONGS = 10; // Maximum songs users can select

interface SearchResult {
  type: 'artist' | 'song';
  name: string;
  artist?: string; // For songs
}

export function ArtistStep() {
  const { preferences, addArtist, removeArtist, addTrack, removeTrack, updatePreferences } = useWizardStore();
  const { favoriteArtists, favoriteTracks } = preferences;

  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SearchResult[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  const [isLoadingArtists, setIsLoadingArtists] = useState(false);
  const [allArtists, setAllArtists] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Song selection state
  const [selectedArtistForSongs, setSelectedArtistForSongs] = useState<string | null>(null);
  const [artistSongs, setArtistSongs] = useState<SpotifySongData[]>([]);
  const [isLoadingSongs, setIsLoadingSongs] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  // Load all artists from dataset on mount
  useEffect(() => {
    const loadArtists = async () => {
      setIsLoadingArtists(true);
      setError(null);
      try {
        const response = await fetch('/api/artists');
        if (!response.ok) {
          throw new Error(`Failed to load artists: ${response.status}`);
        }
        const data = await response.json();
        console.log('Loaded artists:', data.count);
        setAllArtists(data.artists || []);
      } catch (error) {
        console.error('Error loading artists:', error);
        setError('Unable to load artists. You can still continue without selecting artists.');
        setAllArtists([]);
      } finally {
        setIsLoadingArtists(false);
      }
    };
    loadArtists();
  }, []);

  // Search for both artists and songs
  useEffect(() => {
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }

    const searchBoth = async () => {
      setIsSearching(true);
      try {
        const results: SearchResult[] = [];

        // Search artists
        const matchingArtists = allArtists
          .filter(artist =>
            artist.toLowerCase().includes(query.toLowerCase()) &&
            !favoriteArtists.includes(artist)
          )
          .slice(0, 5)
          .map(artist => ({ type: 'artist' as const, name: artist }));

        results.push(...matchingArtists);

        // Search songs
        try {
          const response = await fetch(`/api/songs?limit=5&search=${encodeURIComponent(query)}`);
          if (response.ok) {
            const data = await response.json();
            const songs = (data.songs || []).slice(0, 3);

            const songResults = songs.map((song: SpotifySongData) => ({
              type: 'song' as const,
              name: song.track_name,
              artist: song.track_artist,
            }));

            results.push(...songResults);
          }
        } catch (err) {
          console.error('Error searching songs:', err);
          // Continue without song results
        }

        setSuggestions(results);
      } finally {
        setIsSearching(false);
      }
    };

    const debounce = setTimeout(searchBoth, 300);
    return () => clearTimeout(debounce);
  }, [query, favoriteArtists, allArtists]);

  // Load songs for an artist when they click to add songs
  const handleLoadSongsForArtist = async (artist: string) => {
    setSelectedArtistForSongs(artist);
    setIsLoadingSongs(true);
    try {
      const response = await fetch(`/api/songs?artist=${encodeURIComponent(artist)}`);
      if (!response.ok) {
        throw new Error(`Failed to load songs: ${response.status}`);
      }
      const data = await response.json();
      // Limit to first 50 songs for performance
      setArtistSongs((data.songs || []).slice(0, 50));
    } catch (error) {
      console.error('Error loading songs:', error);
      setArtistSongs([]);
    } finally {
      setIsLoadingSongs(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim() && !favoriteArtists.includes(query.trim())) {
      addArtist(query.trim());
      setQuery('');
    }
  };

  const handleSelectSuggestion = (result: SearchResult) => {
    if (result.type === 'artist') {
      addArtist(result.name);
      setQuery('');
      inputRef.current?.focus();
    } else if (result.type === 'song' && result.artist) {
      // For songs, add both the artist and the song
      if (!favoriteArtists.includes(result.artist)) {
        addArtist(result.artist);
      }
      if (favoriteTracks.length < MAX_SONGS) {
        addTrack({ name: result.name, artist: result.artist });
      }
      setQuery('');
      inputRef.current?.focus();
    }
  };

  const handleSelectSong = (song: SpotifySongData) => {
    if (favoriteTracks.length >= MAX_SONGS) return;
    addTrack({ name: song.track_name, artist: song.track_artist });
  };

  const isSongSelected = (songName: string) => {
    return favoriteTracks.some(t => t.name === songName);
  };

  const handleClearArtists = () => {
    favoriteArtists.forEach(artist => removeArtist(artist));
  };

  const handleClearSongs = () => {
    updatePreferences({ favoriteTracks: [] });
  };

  return (
    <div className="space-y-8">
      {/* Error message */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-xl mx-auto p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-200 text-sm text-center"
        >
          {error}
        </motion.div>
      )}

      {/* Search input */}
      <div className="relative max-w-xl mx-auto">
        <form onSubmit={handleSubmit}>
          <div className={`
            relative flex items-center gap-3 px-5 py-4 rounded-2xl
            bg-white/5 border transition-all duration-300
            ${isFocused ? 'border-sonic-pink/50 bg-white/8' : 'border-white/10'}
          `}>
            <svg
              className={`w-5 h-5 text-white/40 ${isSearching ? 'animate-pulse' : ''}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setTimeout(() => setIsFocused(false), 200)}
              placeholder={isLoadingArtists ? "Loading..." : "Search for artists or songs..."}
              disabled={isLoadingArtists}
              className="flex-1 bg-transparent text-white placeholder:text-white/30 outline-none disabled:opacity-50"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="p-1 rounded-full hover:bg-white/10"
              >
                <svg className="w-4 h-4 text-white/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </form>

        {/* Suggestions dropdown */}
        <AnimatePresence>
          {suggestions.length > 0 && isFocused && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute z-50 left-0 right-0 mt-2 py-2 rounded-xl
                         bg-sonic-dark/95 backdrop-blur-xl border border-white/10
                         shadow-xl max-h-80 overflow-y-auto"
            >
              {suggestions.map((result, index) => (
                <button
                  key={`${result.type}-${result.name}-${index}`}
                  onClick={() => handleSelectSuggestion(result)}
                  className="w-full px-5 py-3 text-left hover:bg-white/5
                             flex items-center gap-3 transition-colors"
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-medium
                    ${result.type === 'artist'
                      ? 'bg-gradient-to-br from-sonic-pink/30 to-sonic-coral/30'
                      : 'bg-gradient-to-br from-blue-500/30 to-purple-500/30'
                    }`}
                  >
                    {result.type === 'artist' ? (
                      result.name.charAt(0)
                    ) : (
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/>
                      </svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-white block truncate">{result.name}</span>
                    {result.type === 'song' && result.artist && (
                      <span className="text-white/40 text-xs block truncate">by {result.artist}</span>
                    )}
                  </div>
                  {result.type === 'song' && (
                    <span className="text-xs text-sonic-pink/60 px-2 py-1 rounded-full bg-sonic-pink/10">
                      Song
                    </span>
                  )}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Selected artists */}
      <div className="min-h-[150px]">
        {favoriteArtists.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <div className="text-4xl mb-4">🎵</div>
            <p className="text-white/40">
              Search for artists or songs from our database
            </p>
            <p className="text-sm text-white/25 mt-2">
              {allArtists.length > 0 ? `${allArtists.length.toLocaleString()} artists available • ` : ''}
              Search for songs to add them directly!
            </p>
          </motion.div>
        ) : (
          <motion.div
            layout
            className="space-y-4"
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-white/60 text-sm font-medium">
                Selected Artists ({favoriteArtists.length})
              </h3>
              <button
                onClick={handleClearArtists}
                className="text-xs text-sonic-pink/60 hover:text-sonic-pink transition-colors px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10"
              >
                Clear All Artists
              </button>
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              <AnimatePresence mode="popLayout">
                {favoriteArtists.map((artist) => (
                  <motion.div
                    key={artist}
                    layout
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="group flex items-center gap-2 px-4 py-2 rounded-full
                               bg-white/10 border border-white/20"
                  >
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-sonic-pink to-sonic-coral
                                    flex items-center justify-center text-xs font-bold text-white">
                      {artist.charAt(0)}
                    </div>
                    <span className="text-white font-medium">{artist}</span>
                    <button
                      onClick={() => handleLoadSongsForArtist(artist)}
                      className="p-1 rounded-full opacity-70 hover:opacity-100
                                 hover:bg-sonic-pink/20 transition-all text-sonic-pink"
                      title="Select songs"
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M9 18V5l12-2v13M9 18c0 1.657-1.343 3-3 3s-3-1.343-3-3 1.343-3 3-3 3 1.343 3 3zm12-2c0 1.657-1.343 3-3 3s-3-1.343-3-3 1.343-3 3-3 3 1.343 3 3z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => removeArtist(artist)}
                      className="p-1 rounded-full opacity-50 hover:opacity-100
                                 hover:bg-white/10 transition-all"
                    >
                      <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Song selection hint */}
            {favoriteArtists.length > 0 && favoriteTracks.length === 0 && (
              <p className="text-center text-sm text-sonic-pink/60 animate-pulse mt-4">
                💡 Click the music note icon to select specific songs, or search for songs directly!
              </p>
            )}
          </motion.div>
        )}
      </div>

      {/* Selected songs */}
      {favoriteTracks.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-white/60 text-sm font-medium">
              Selected Songs ({favoriteTracks.length}/{MAX_SONGS})
            </h3>
            <div className="flex items-center gap-2">
              {favoriteTracks.length >= MAX_SONGS && (
                <span className="text-xs text-sonic-pink/60">Maximum reached</span>
              )}
              <button
                onClick={handleClearSongs}
                className="text-xs text-sonic-pink/60 hover:text-sonic-pink transition-colors px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10"
              >
                Clear All Songs
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {favoriteTracks.map((track) => (
              <motion.div
                key={`${track.name}-${track.artist}`}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex items-center gap-2 px-3 py-2 rounded-lg
                           bg-sonic-pink/10 border border-sonic-pink/20 text-sm"
              >
                <svg className="w-4 h-4 text-sonic-pink flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/>
                </svg>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">{track.name}</p>
                  <p className="text-white/40 text-xs truncate">{track.artist}</p>
                </div>
                <button
                  onClick={() => removeTrack(track.name)}
                  className="p-1 rounded-full opacity-50 hover:opacity-100
                             hover:bg-white/10 transition-all flex-shrink-0"
                >
                  <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Song selection modal */}
      <AnimatePresence>
        {selectedArtistForSongs && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => setSelectedArtistForSongs(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-sonic-dark border border-white/10 rounded-2xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white">
                  Select Songs by {selectedArtistForSongs}
                </h3>
                <button
                  onClick={() => setSelectedArtistForSongs(null)}
                  className="p-2 rounded-full hover:bg-white/10 transition-colors"
                >
                  <svg className="w-5 h-5 text-white/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <p className="text-white/50 text-sm mb-4">
                Select up to {MAX_SONGS} songs total • {favoriteTracks.length} selected
              </p>

              {isLoadingSongs ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sonic-pink mx-auto mb-4"></div>
                  <p className="text-white/40">Loading songs...</p>
                </div>
              ) : artistSongs.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-white/40">No songs found for this artist</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {artistSongs.map((song) => {
                    const selected = isSongSelected(song.track_name);
                    const disabled = !selected && favoriteTracks.length >= MAX_SONGS;

                    return (
                      <button
                        key={song.track_id}
                        onClick={() => !disabled && handleSelectSong(song)}
                        disabled={disabled}
                        className={`w-full text-left px-4 py-3 rounded-lg transition-all
                          ${selected
                            ? 'bg-sonic-pink/20 border border-sonic-pink/40'
                            : disabled
                            ? 'bg-white/5 border border-white/5 opacity-50 cursor-not-allowed'
                            : 'bg-white/5 border border-white/10 hover:bg-white/10 hover:border-sonic-pink/30'
                          }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0
                            ${selected ? 'bg-sonic-pink border-sonic-pink' : 'border-white/30'}`}
                          >
                            {selected && (
                              <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4">
                                <path d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-medium truncate">{song.track_name}</p>
                            <p className="text-white/40 text-xs">
                              {song.track_album_name} • {song.playlist_genre}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
