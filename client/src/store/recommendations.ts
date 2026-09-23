// Client-side recommendation store
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '../api';
import type { Song, DailyMix } from '../types';

interface RecommendationState {
  sessionId: string;
  forYou: Song[];
  discoverWeekly: { tracks: Song[]; updatedAt: number } | null;
  dailyMixes: DailyMix[];
  loading: {
    forYou: boolean;
    discoverWeekly: boolean;
    dailyMixes: boolean;
  };
  error: string | null;
  
  // Actions
  initializeSession: () => void;
  fetchForYou: () => Promise<void>;
  fetchDiscoverWeekly: () => Promise<void>;
  fetchDailyMixes: () => Promise<void>;
  recordPlay: (trackId: string, metadata?: Record<string, unknown>) => Promise<void>;
  recordSkip: (trackId: string) => Promise<void>;
  recordLike: (trackId: string) => Promise<void>;
  recordUnlike: (trackId: string) => Promise<void>;
}

function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

export const useRecommendations = create<RecommendationState>()(
  persist(
    (set, get) => ({
      sessionId: '',
      forYou: [],
      discoverWeekly: null,
      dailyMixes: [],
      loading: { forYou: false, discoverWeekly: false, dailyMixes: false },
      error: null,
      
      initializeSession: () => {
        const state = get();
        if (!state.sessionId) {
          set({ sessionId: generateSessionId() });
        }
      },
      
      fetchForYou: async () => {
        set({ loading: { ...get().loading, forYou: true }, error: null });
        try {
          const { tracks } = await api.forYou(30);
          set({ forYou: tracks, loading: { ...get().loading, forYou: false } });
        } catch (err) {
          set({ error: err instanceof Error ? err.message : 'Failed to load recommendations', loading: { ...get().loading, forYou: false } });
        }
      },
      
      fetchDiscoverWeekly: async () => {
        set({ loading: { ...get().loading, discoverWeekly: true }, error: null });
        try {
          const data = await api.discoverWeekly(30);
          set({ discoverWeekly: data, loading: { ...get().loading, discoverWeekly: false } });
        } catch (err) {
          set({ error: err instanceof Error ? err.message : 'Failed to load Discover Weekly', loading: { ...get().loading, discoverWeekly: false } });
        }
      },
      
      fetchDailyMixes: async () => {
        set({ loading: { ...get().loading, dailyMixes: true }, error: null });
        try {
          const { mixes } = await api.dailyMixes(6);
          set({ dailyMixes: mixes, loading: { ...get().loading, dailyMixes: false } });
        } catch (err) {
          set({ error: err instanceof Error ? err.message : 'Failed to load Daily Mixes', loading: { ...get().loading, dailyMixes: false } });
        }
      },
      
      recordPlay: async (trackId: string, metadata?: Record<string, unknown>) => {
        try {
          await api.recordPlay(trackId, metadata);
        } catch {
          // Silently fail - feedback is non-critical
        }
      },
      
      recordSkip: async (trackId: string) => {
        try {
          await api.recordSkip(trackId);
        } catch {
          // Silently fail
        }
      },
      
      recordLike: async (trackId: string) => {
        try {
          await api.recordLike(trackId);
        } catch {
          // Silently fail
        }
      },
      
      recordUnlike: async (trackId: string) => {
        try {
          await api.recordUnlike(trackId);
        } catch {
          // Silently fail
        }
      },
    }),
    {
      name: 'aurora.recommendations',
      version: 1,
      partialize: (state) => ({ sessionId: state.sessionId }),
    }
  )
);

// Hook to get session ID for API calls
export function getSessionId(): string {
  return useRecommendations.getState().sessionId;
}

// Initialize session on app start
if (typeof window !== 'undefined') {
  useRecommendations.getState().initializeSession();
}