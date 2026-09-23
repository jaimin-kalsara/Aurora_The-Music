import { create } from 'zustand';
import type { RepeatMode, Song } from '../types';

export interface PlayContext {
  type: 'album' | 'playlist' | 'artist' | 'mood' | 'search' | 'library' | 'home' | 'radio';
  id?: string;
  title: string;
}

interface PlayerState {
  queue: Song[];
  originalQueue: Song[] | null; // set while shuffle is on so we can restore order
  index: number;
  context: PlayContext | null;
  playing: boolean;
  buffering: boolean;
  currentTime: number;
  duration: number;
  seekTo: number | null; // one-shot command consumed by the audio engine
  shuffle: boolean;
  repeat: RepeatMode;
  nowPlayingOpen: boolean;
  queueOpen: boolean;
  lyricsOpen: boolean;
  error: string | null;
  autoplayPending: boolean;

  play: (songs: Song[], index?: number, context?: PlayContext) => void;
  playSong: (song: Song, context?: PlayContext) => void;
  toggle: () => void;
  setPlaying: (v: boolean) => void;
  next: () => void;
  prev: () => void;
  jumpTo: (index: number) => void;
  seek: (time: number) => void;
  consumeSeek: () => void;
  setProgress: (currentTime: number, duration: number) => void;
  setBuffering: (v: boolean) => void;
  setError: (msg: string | null) => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  enqueue: (songs: Song | Song[]) => void;
  playNext: (song: Song) => void;
  removeAt: (index: number) => void;
  moveInQueue: (from: number, to: number) => void;
  clearUpcoming: () => void;
  appendRadio: (songs: Song[]) => void;
  setNowPlayingOpen: (v: boolean) => void;
  setQueueOpen: (v: boolean) => void;
  setLyricsOpen: (v: boolean) => void;
  setAutoplayPending: (v: boolean) => void;
}

const playable = (songs: Song[]) => songs.filter((s) => s && s.streams);

function shuffleUpcoming(queue: Song[], index: number): Song[] {
  const before = queue.slice(0, index + 1);
  const after = queue.slice(index + 1);
  for (let i = after.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [after[i], after[j]] = [after[j], after[i]];
  }
  return before.concat(after);
}

export const usePlayer = create<PlayerState>()((set, get) => ({
  queue: [],
  originalQueue: null,
  index: -1,
  context: null,
  playing: false,
  buffering: false,
  currentTime: 0,
  duration: 0,
  seekTo: null,
  shuffle: false,
  repeat: 'off',
  nowPlayingOpen: false,
  queueOpen: false,
  lyricsOpen: false,
  error: null,
  autoplayPending: false,

  play: (songs, index = 0, context) => {
    const list = playable(songs);
    if (!list.length) {
      set({ error: 'This track is not available for streaming.' });
      return;
    }
    const target = songs[index];
    let start = list.findIndex((s) => target && s.id === target.id);
    if (start < 0) start = 0;
    const { shuffle } = get();
    let queue = list;
    let originalQueue: Song[] | null = null;
    if (shuffle) {
      originalQueue = list;
      const picked = list[start];
      const rest = list.filter((_, i) => i !== start);
      queue = shuffleUpcoming([picked, ...rest], 0);
      start = 0;
    }
    set({ queue, originalQueue, index: start, context: context ?? null, playing: true, currentTime: 0, duration: 0, error: null, autoplayPending: false });
  },

  playSong: (song, context) => get().play([song], 0, context ?? { type: 'search', title: song.title }),

  toggle: () => {
    const { queue, playing } = get();
    if (!queue.length) return;
    set({ playing: !playing });
  },
  setPlaying: (v) => set({ playing: v }),

  next: () => {
    const { queue, index, repeat } = get();
    if (!queue.length) return;
    if (index + 1 < queue.length) {
      set({ index: index + 1, playing: true, currentTime: 0, error: null });
    } else if (repeat === 'all') {
      set({ index: 0, playing: true, currentTime: 0, error: null });
    } else {
      // Reached the end: the audio engine will try to extend the queue with related songs.
      set({ autoplayPending: true });
    }
  },

  prev: () => {
    const { index, currentTime } = get();
    if (currentTime > 3 || index <= 0) {
      set({ seekTo: 0, currentTime: 0, playing: true });
      return;
    }
    set({ index: index - 1, playing: true, currentTime: 0, error: null });
  },

  jumpTo: (i) => {
    const { queue } = get();
    if (i < 0 || i >= queue.length) return;
    set({ index: i, playing: true, currentTime: 0, error: null });
  },

  seek: (time) => set({ seekTo: time, currentTime: time }),
  consumeSeek: () => set({ seekTo: null }),
  setProgress: (currentTime, duration) => set({ currentTime, duration }),
  setBuffering: (v) => set({ buffering: v }),
  setError: (msg) => set({ error: msg }),

  toggleShuffle: () => {
    const { shuffle, queue, index, originalQueue } = get();
    if (!shuffle) {
      set({ shuffle: true, originalQueue: queue, queue: shuffleUpcoming(queue, index) });
    } else {
      const current = queue[index];
      const restored = originalQueue ?? queue;
      const newIndex = current ? Math.max(0, restored.findIndex((s) => s.id === current.id)) : 0;
      set({ shuffle: false, originalQueue: null, queue: restored, index: newIndex });
    }
  },

  cycleRepeat: () => {
    const order: RepeatMode[] = ['off', 'all', 'one'];
    const { repeat } = get();
    set({ repeat: order[(order.indexOf(repeat) + 1) % order.length] });
  },

  enqueue: (songs) => {
    const list = playable(Array.isArray(songs) ? songs : [songs]);
    if (!list.length) return;
    const { queue, index } = get();
    if (!queue.length) {
      set({ queue: list, index: 0, playing: true, context: { type: 'library', title: 'Queue' } });
      return;
    }
    set({ queue: queue.concat(list), originalQueue: get().originalQueue ? get().originalQueue!.concat(list) : null, autoplayPending: false });
    void index;
  },

  playNext: (song) => {
    if (!song.streams) return;
    const { queue, index } = get();
    if (!queue.length) {
      set({ queue: [song], index: 0, playing: true, context: { type: 'library', title: 'Queue' } });
      return;
    }
    const q = queue.slice();
    q.splice(index + 1, 0, song);
    set({ queue: q, autoplayPending: false });
  },

  removeAt: (i) => {
    const { queue, index } = get();
    if (i === index) return;
    const q = queue.filter((_, k) => k !== i);
    set({ queue: q, index: i < index ? index - 1 : index });
  },

  moveInQueue: (from, to) => {
    const { queue, index } = get();
    if (from === to || from < 0 || to < 0 || from >= queue.length || to >= queue.length) return;
    const q = queue.slice();
    const [item] = q.splice(from, 1);
    q.splice(to, 0, item);
    let newIndex = index;
    if (from === index) newIndex = to;
    else if (from < index && to >= index) newIndex = index - 1;
    else if (from > index && to <= index) newIndex = index + 1;
    set({ queue: q, index: newIndex });
  },

  clearUpcoming: () => {
    const { queue, index } = get();
    set({ queue: queue.slice(0, index + 1) });
  },

  appendRadio: (songs) => {
    const { queue } = get();
    const seen = new Set(queue.map((s) => s.id));
    const fresh = playable(songs).filter((s) => !seen.has(s.id));
    if (!fresh.length) {
      set({ autoplayPending: false, playing: false });
      return;
    }
    set({ queue: queue.concat(fresh), index: queue.length, playing: true, currentTime: 0, autoplayPending: false, context: { type: 'radio', title: 'Autoplay' } });
  },

  setNowPlayingOpen: (v) => set({ nowPlayingOpen: v, lyricsOpen: v ? get().lyricsOpen : false }),
  setQueueOpen: (v) => set({ queueOpen: v }),
  setLyricsOpen: (v) => set({ lyricsOpen: v }),
  setAutoplayPending: (v) => set({ autoplayPending: v }),
}));

export const useCurrentSong = () => usePlayer((s) => s.queue[s.index] ?? null);
