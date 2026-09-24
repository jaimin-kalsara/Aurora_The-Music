import { useEffect, useRef, useState } from 'react';
import { useQuery } from '../hooks/useQuery';
import { api } from '../api';
import type { LyricLine, Song } from '../types';

interface Props {
  song: Song;
  currentTime: number;
  duration: number;
  playing: boolean;
  onSeek: (time: number) => void;
  compact?: boolean;
}

const LOOKAHEAD = 0.28; // highlight a hair early so it feels in sync with the vocal

function activeIndex(lines: LyricLine[], t: number): number {
  const target = t + LOOKAHEAD;
  let lo = 0;
  let hi = lines.length - 1;
  let ans = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (lines[mid].time <= target) {
      ans = mid;
      lo = mid + 1;
    } else hi = mid - 1;
  }
  return ans;
}

/**
 * Apple-style lyrics: time-synced lines light up and auto-center as the song plays,
 * tapping a line seeks to it. Falls back to plain lyrics when no timing is available.
 */
export function Lyrics({ song, currentTime, duration, playing, onSeek, compact = false }: Props) {
  const { data, loading, error } = useQuery(`lyrics:${song.id}`, (signal) => api.lyrics(song, duration || song.duration, signal));
  const scrollRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const userScrollUntil = useRef(0);
  const programmatic = useRef(false);
  const synced = data?.synced ?? null;
  const [active, setActive] = useState(-1);

  // Interpolate between (throttled) progress updates on the animation frame, but only re-render
  // when the highlighted line actually changes.
  useEffect(() => {
    if (!synced) {
      setActive(-1);
      return;
    }
    const base = currentTime;
    const started = performance.now();
    let raf = 0;
    const tick = () => {
      const t = playing ? base + (performance.now() - started) / 1000 : base;
      const idx = activeIndex(synced, t);
      setActive((prev) => (prev === idx ? prev : idx));
      if (playing) raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [synced, currentTime, playing]);

  // Keep the active line centered unless the listener is browsing the lyrics themselves.
  useEffect(() => {
    if (active < 0) return;
    const container = scrollRef.current;
    const el = lineRefs.current[active];
    if (!container || !el) return;
    if (performance.now() < userScrollUntil.current) return;
    const top = el.offsetTop - container.clientHeight * 0.4 + el.clientHeight / 2;
    programmatic.current = true;
    container.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
    const t = setTimeout(() => (programmatic.current = false), 600);
    return () => clearTimeout(t);
  }, [active]);

  // Reset scroll position for a new track.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
    userScrollUntil.current = 0;
  }, [song.id]);

  const onUserScroll = () => {
    if (programmatic.current) return;
    userScrollUntil.current = performance.now() + 3500;
  };

  if (loading) {
    return (
      <div className={`lyrics-empty ${compact ? 'compact' : ''}`}>
        <span className="lyrics-dots" aria-hidden>
          <i />
          <i />
          <i />
        </span>
        Finding lyrics…
      </div>
    );
  }
  if (error || !data || !data.lines.some(Boolean)) {
    return (
      <div className={`lyrics-empty ${compact ? 'compact' : ''}`}>
        <strong>No lyrics for this one yet</strong>
        <span>We checked the synced-lyrics catalog and YouTube Music.</span>
      </div>
    );
  }

  const lines: LyricLine[] = synced ?? data.lines.map((text, i) => ({ time: -1 - i, text }));

  return (
    <div className={`lyrics-wrap ${compact ? 'compact' : ''}`}>
      <div className="lyrics-meta">
        <span className={`lyrics-badge ${synced ? 'synced' : ''}`}>{synced ? 'Synced' : 'Lyrics'}</span>
        <span className="dim">{data.source === 'lrclib' ? 'LRCLIB' : 'YouTube Music'}</span>
      </div>
      <div className={`lyrics ${synced ? 'synced' : 'plain'}`} ref={scrollRef} onScroll={onUserScroll} onWheel={onUserScroll} onTouchMove={onUserScroll}>
        <div className="lyrics-pad" aria-hidden />
        {lines.map((line, i) => {
          const state = !synced ? '' : i === active ? 'active' : i < active ? 'past' : Math.abs(i - active) <= 2 ? 'near' : 'far';
          return line.text ? (
            <button
              key={`${line.time}-${i}`}
              ref={(el) => {
                lineRefs.current[i] = el;
              }}
              type="button"
              className={`lyric-line ${state}`}
              onClick={() => synced && onSeek(Math.max(0, line.time))}
              disabled={!synced}
              tabIndex={synced ? 0 : -1}
            >
              {line.text}
            </button>
          ) : (
            <span
              key={`${line.time}-${i}`}
              ref={(el) => {
                lineRefs.current[i] = el as unknown as HTMLButtonElement;
              }}
              className={`lyric-gap ${state}`}
              aria-hidden
            >
              <i />
              <i />
              <i />
            </span>
          );
        })}
        {data.copyright && <p className="lyrics-copyright">{data.copyright}</p>}
        <div className="lyrics-pad" aria-hidden />
      </div>
    </div>
  );
}
