import { useMemo } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Quality, Song } from '../types';

export interface Settings {
  languages: string;
  quality: Quality;
  autoplay: boolean;
  volume: number;
}

interface LibraryState {
  liked: Record<string, Song>;
  likedOrder: string[];
  recent: Song[];
  recentSearches: string[];
  settings: Settings;
  toggleLike: (song: Song) => void;
  isLiked: (id: string) => boolean;
  addRecent: (song: Song) => void;
  clearRecent: () => void;
  addRecentSearch: (q: string) => void;
  clearRecentSearches: () => void;
  updateSettings: (patch: Partial<Settings>) => void;
}

export const LANGUAGE_OPTIONS = [
  'hindi',
  'english',
  'punjabi',
  'tamil',
  'telugu',
  'marathi',
  'gujarati',
  'bengali',
  'kannada',
  'bhojpuri',
  'malayalam',
  'urdu',
  'haryanvi',
  'rajasthani',
  'odia',
  'assamese',
];

export const useLibrary = create<LibraryState>()(
  persist(
    (set, get) => ({
      liked: {},
      likedOrder: [],
      recent: [],
      recentSearches: [],
      settings: { languages: 'hindi,english', quality: 'high', autoplay: true, volume: 0.8 },
      toggleLike: (song) =>
        set((s) => {
          const liked = { ...s.liked };
          let likedOrder = s.likedOrder.slice();
          if (liked[song.id]) {
            delete liked[song.id];
            likedOrder = likedOrder.filter((id) => id !== song.id);
          } else {
            liked[song.id] = song;
            likedOrder = [song.id, ...likedOrder];
          }
          return { liked, likedOrder };
        }),
      isLiked: (id) => Boolean(get().liked[id]),
      addRecent: (song) =>
        set((s) => ({ recent: [song, ...s.recent.filter((r) => r.id !== song.id)].slice(0, 60) })),
      clearRecent: () => set({ recent: [] }),
      addRecentSearch: (q) =>
        set((s) => ({ recentSearches: [q, ...s.recentSearches.filter((r) => r.toLowerCase() !== q.toLowerCase())].slice(0, 10) })),
      clearRecentSearches: () => set({ recentSearches: [] }),
      updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
    }),
    { name: 'aurora.library', version: 1 },
  ),
);

/** Stable liked-songs list: derived with useMemo so the store selector returns cached references. */
export function useLikedSongs(): Song[] {
  const liked = useLibrary((s) => s.liked);
  const likedOrder = useLibrary((s) => s.likedOrder);
  return useMemo(() => likedOrder.map((id) => liked[id]).filter(Boolean), [liked, likedOrder]);
}
