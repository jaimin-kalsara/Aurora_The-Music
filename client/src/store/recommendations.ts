// Client-side recommendation store: personalized shelves for Home and the mix pages.
import { create } from 'zustand';
import { api, sessionId } from '../api';
import type { Song, DailyMix } from '../types';

interface RecommendationState {
  sessionId: string;
  forYou: Song[];
  discoverWeekly: { tracks: Song[]; updatedAt: number } | null;
  dailyMixes: DailyMix[];
  loading: { forYou: boolean; discoverWeekly: boolean; dailyMixes: boolean };
  fetchedAt: number;
  error: string | null;
  fetchAll: (force?: boolean) => Promise<void>;
  fetchForYou: () => Promise<void>;
  fetchDiscoverWeekly: () => Promise<void>;
  fetchDailyMixes: () => Promise<void>;
}

const STALE_MS = 10 * 60 * 1000;

export const useRecommendations = create<RecommendationState>()((set, get) => ({
  sessionId: sessionId(),
  forYou: [],
  discoverWeekly: null,
  dailyMixes: [],
  loading: { forYou: false, discoverWeekly: false, dailyMixes: false },
  fetchedAt: 0,
  error: null,

  fetchAll: async (force = false) => {
    const { fetchedAt, loading } = get();
    if (!force && Date.now() - fetchedAt < STALE_MS) return;
    if (loading.forYou || loading.discoverWeekly || loading.dailyMixes) return;
    set({ fetchedAt: Date.now() });
    await Promise.all([get().fetchForYou(), get().fetchDiscoverWeekly(), get().fetchDailyMixes()]);
  },

  fetchForYou: async () => {
    set((s) => ({ loading: { ...s.loading, forYou: true }, error: null }));
    try {
      const { tracks } = await api.forYou(30);
      set((s) => ({ forYou: tracks, loading: { ...s.loading, forYou: false } }));
    } catch (err) {
      set((s) => ({ error: err instanceof Error ? err.message : 'Failed to load recommendations', loading: { ...s.loading, forYou: false } }));
    }
  },

  fetchDiscoverWeekly: async () => {
    set((s) => ({ loading: { ...s.loading, discoverWeekly: true } }));
    try {
      const data = await api.discoverWeekly(30);
      set((s) => ({ discoverWeekly: data, loading: { ...s.loading, discoverWeekly: false } }));
    } catch {
      set((s) => ({ loading: { ...s.loading, discoverWeekly: false } }));
    }
  },

  fetchDailyMixes: async () => {
    set((s) => ({ loading: { ...s.loading, dailyMixes: true } }));
    try {
      const { mixes } = await api.dailyMixes(6);
      set((s) => ({ dailyMixes: mixes, loading: { ...s.loading, dailyMixes: false } }));
    } catch {
      set((s) => ({ loading: { ...s.loading, dailyMixes: false } }));
    }
  },
}));

export const getSessionId = () => useRecommendations.getState().sessionId;
