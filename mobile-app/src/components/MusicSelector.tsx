import React, { useState, useEffect, useRef } from 'react';
import { Search, Music, Play, Pause, Check, X, Volume2, Trash2, Plus } from 'lucide-react';
import { motion } from 'motion/react';

export interface SongInfo {
  id: string;
  title: string;
  artist: string;
  artwork: string;
  previewUrl: string;
}

interface MusicSelectorProps {
  selectedSong: SongInfo | null;
  onSelectSong: (song: SongInfo | null) => void;
  onClose: () => void;
}

// Global single audio ref to avoid multiple previews playing at once
let globalAudio: HTMLAudioElement | null = null;

export function MusicSelector({ selectedSong, onSelectSong, onClose }: MusicSelectorProps) {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [songs, setSongs] = useState<SongInfo[]>([]);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Stop preview on unmount
  useEffect(() => {
    return () => {
      if (globalAudio) {
        globalAudio.pause();
        globalAudio = null;
      }
    };
  }, []);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    setIsLoading(true);
    setSearchError(null);
    try {
      const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&limit=20`);
      if (!res.ok) throw new Error('Search request failed');
      const data = await res.json();
      
      const parsedSongs: SongInfo[] = (data.results || []).map((item: any) => ({
        id: String(item.trackId || item.collectionId || Math.random().toString()),
        title: item.trackName || 'Unknown Track',
        artist: item.artistName || 'Unknown Artist',
        artwork: item.artworkUrl100 || '',
        previewUrl: item.previewUrl || '',
      }));

      setSongs(parsedSongs);
      if (parsedSongs.length === 0) {
        setSearchError('No tracks found matching your search.');
      }
    } catch (err) {
      console.error(err);
      setSearchError('Could not sync with search server. Pulling draft modes...');
    } finally {
      setIsLoading(false);
    }
  };

  // Run initial search when opened if query is empty just to show some trending options (e.g. general "popular" search)
  useEffect(() => {
    const fetchTrending = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`https://itunes.apple.com/search?term=racing+garage+phonk&media=music&limit=10`);
        if (res.ok) {
          const data = await res.json();
          const parsedSongs: SongInfo[] = (data.results || []).map((item: any) => ({
            id: String(item.trackId || Math.random().toString()),
            title: item.trackName || 'Unknown Track',
            artist: item.artistName || 'Unknown Artist',
            artwork: item.artworkUrl100 || '',
            previewUrl: item.previewUrl || '',
          }));
          setSongs(parsedSongs);
        }
      } catch (err) {
        console.error("Trending fetch failed", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchTrending();
  }, []);

  const togglePreview = (song: SongInfo, e: React.MouseEvent) => {
    e.stopPropagation();

    if (playingId === song.id) {
      // Pause
      if (globalAudio) {
        globalAudio.pause();
      }
      setPlayingId(null);
    } else {
      // Play new or different track
      if (globalAudio) {
        globalAudio.pause();
      }

      if (song.previewUrl) {
        globalAudio = new Audio(song.previewUrl);
        globalAudio.volume = 0.5;
        globalAudio.play().catch(err => console.error("Playback error", err));
        
        globalAudio.onended = () => {
          setPlayingId(null);
        };
        
        setPlayingId(song.id);
      }
    }
  };

  const selectSong = (song: SongInfo) => {
    // Stop any previews
    if (globalAudio) {
      globalAudio.pause();
      globalAudio = null;
    }
    setPlayingId(null);
    onSelectSong(song);
    onClose();
  };

  const removeSelectedSong = () => {
    onSelectSong(null);
  };

  return (
    <div className="flex flex-col h-[75vh] bg-zinc-950 rounded-t-[32px] border-t border-zinc-900 overflow-hidden text-white">
      {/* Visual Pull Bar */}
      <div className="w-12 h-1 bg-zinc-800 rounded-full mx-auto my-3 flex-shrink-0" />

      {/* Header */}
      <div className="px-6 pb-4 flex items-center justify-between border-b border-zinc-900/60 flex-shrink-0">
        <div>
          <h2 className="text-lg font-black italic uppercase tracking-wider flex items-center gap-1.5 font-sans">
            <Music size={18} className="text-red-500" />
            Add Background Music
          </h2>
          <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">Select a tune to rev up your build media</p>
        </div>
        <button onClick={onClose} className="p-1.5 bg-zinc-900 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-all">
          <X size={18} />
        </button>
      </div>

      {/* Selected Song Banner */}
      {selectedSong && (
        <div className="mx-6 mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg overflow-hidden border border-red-500/30 flex-shrink-0 bg-zinc-900">
              {selectedSong.artwork ? (
                <img src={selectedSong.artwork} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-zinc-950">
                  <Music size={16} className="text-zinc-500" />
                </div>
              )}
            </div>
            <div>
              <p className="text-xs font-black text-white">{selectedSong.title}</p>
              <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wide">{selectedSong.artist}</p>
            </div>
          </div>
          <button 
            onClick={removeSelectedSong}
            className="p-1.5 bg-zinc-800/80 hover:bg-red-955 rounded-xl text-zinc-400 hover:text-red-500 transition-colors flex items-center gap-1 text-[10px] uppercase font-black tracking-widest font-sans"
          >
            <Trash2 size={12} />
            Remove
          </button>
        </div>
      )}

      {/* Search Input Form */}
      <form onSubmit={handleSearch} className="px-6 mt-4 flex gap-2 flex-shrink-0">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search songs, artists, soundtracks..."
            className="w-full bg-zinc-900 border border-zinc-800 rounded-full pl-11 pr-4 py-3 text-xs outline-none focus:border-red-500 transition-colors"
          />
        </div>
        <button
          type="submit"
          className="px-6 bg-white hover:bg-zinc-200 text-black rounded-full text-xs font-black uppercase italic tracking-widest transition-all"
        >
          Search
        </button>
      </form>

      {/* Song list container */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-10 space-y-2">
            <div className="w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-[10px] uppercase font-mono font-black text-zinc-500 tracking-wider">Syncing engine catalogue...</span>
          </div>
        ) : searchError ? (
          <div className="text-center py-10 text-zinc-500 space-y-1">
            <p className="text-xs font-bold uppercase tracking-widest">{searchError}</p>
            <p className="text-[10px] text-zinc-650">Try checking terms or searching different parameters.</p>
          </div>
        ) : songs.length === 0 ? (
          <div className="text-center py-12 text-zinc-500">
            <Music size={32} className="mx-auto mb-2 text-zinc-800" />
            <p className="text-[10px] font-black uppercase tracking-widest">Search iTunes to load premium background tracks</p>
          </div>
        ) : (
          songs.map((song) => {
            const isSelected = selectedSong?.id === song.id;
            const isCurrentlyPlaying = playingId === song.id;

            return (
              <div 
                key={song.id}
                onClick={() => selectSong(song)}
                className={`p-3 rounded-2xl flex items-center justify-between transition-all border group cursor-pointer ${
                  isSelected 
                    ? 'bg-red-500/10 border-red-500/40 hover:bg-red-500/15'
                    : 'bg-zinc-900/40 border-zinc-900 hover:bg-zinc-900/80 hover:border-zinc-800'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* Artwork / Preview Trigger */}
                  <div className="relative w-11 h-11 rounded-lg overflow-hidden bg-zinc-800 flex-shrink-0 group-hover:scale-102 transition-transform shadow-md">
                    {song.artwork && (
                      <img src={song.artwork} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                    )}
                    {/* Play Button Overlay */}
                    <button 
                      onClick={(e) => togglePreview(song, e)}
                      className={`absolute inset-0 flex items-center justify-center transition-opacity ${
                        isCurrentlyPlaying ? 'bg-black/40 opacity-100' : 'bg-black/30 opacity-0 group-hover:opacity-100'
                      }`}
                    >
                      {isCurrentlyPlaying ? (
                        <Pause size={14} className="text-red-500 fill-current animate-pulse" />
                      ) : (
                        <Play size={14} className="text-white fill-current" />
                      )}
                    </button>
                  </div>

                  {/* Text properties */}
                  <div className="min-w-0">
                    <p className={`text-xs font-black truncate max-w-[180px] ${isSelected ? 'text-red-400' : 'text-white'}`}>
                      {song.title}
                    </p>
                    <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider truncate max-w-[180px]">
                      {song.artist}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* Play audio indicator if playing */}
                  {isCurrentlyPlaying && (
                    <div className="flex gap-0.5 items-end h-3 pr-2">
                      <div className="w-0.5 h-3 bg-red-500 rounded-full animate-[bounce_0.8s_infinite_100ms]" />
                      <div className="w-0.5 h-1.5 bg-red-500 rounded-full animate-[bounce_0.8s_infinite_300ms]" />
                      <div className="w-0.5 h-2 bg-red-500 rounded-full animate-[bounce_0.8s_infinite_200ms]" />
                    </div>
                  )}

                  {isSelected ? (
                    <div className="w-7 h-7 rounded-full bg-red-500 flex items-center justify-center text-white">
                      <Check size={14} strokeWidth={3} />
                    </div>
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-zinc-800/80 group-hover:bg-white group-hover:text-black flex items-center justify-center text-zinc-400 transition-colors">
                      <Plus size={14} />
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
