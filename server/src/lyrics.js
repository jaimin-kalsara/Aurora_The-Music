// Lyrics resolution: time-synced lyrics from LRCLIB first, then plain lyrics from LRCLIB or YouTube Music.
import { lyrics as ytLyrics } from './ytmusic.js';

const LRCLIB = 'https://lrclib.net/api';
const LRCLIB_UA = 'AuroraMusic/2.0 (self-hosted music player)';

/** Parse LRC text into sorted [{ time, text }] lines. Returns [] when nothing is timed. */
export function parseLrc(lrc) {
  if (!lrc) return [];
  const out = [];
  for (const raw of String(lrc).split(/\r?\n/)) {
    const stamps = [...raw.matchAll(/\[(\d{1,3}):(\d{1,2})(?:[.:](\d{1,3}))?\]/g)];
    if (!stamps.length) continue;
    const text = raw.replace(/\[[^\]]*\]/g, '').trim();
    for (const m of stamps) {
      const frac = m[3] ? parseInt(m[3].padEnd(3, '0').slice(0, 3), 10) / 1000 : 0;
      const time = parseInt(m[1], 10) * 60 + parseInt(m[2], 10) + frac;
      if (Number.isFinite(time)) out.push({ time: Math.round(time * 1000) / 1000, text });
    }
  }
  out.sort((a, b) => a.time - b.time);
  // Collapse duplicate timestamps (multi-language lines) into one line.
  const merged = [];
  for (const line of out) {
    const last = merged[merged.length - 1];
    if (last && Math.abs(last.time - line.time) < 0.01) {
      if (line.text && !last.text.includes(line.text)) last.text = last.text ? `${last.text} / ${line.text}` : line.text;
    } else merged.push(line);
  }
  return merged;
}

/** Strip YouTube-isms from a title so lyric providers can match it. */
export function cleanTitle(title) {
  return String(title || '')
    .replace(/\((?:from|feat\.?|ft\.?|official|lyric|audio|video|full|remaster|version|movie)[^)]*\)/gi, ' ')
    .replace(/\[(?:from|feat\.?|ft\.?|official|lyric|audio|video|full|remaster|version|movie)[^\]]*\]/gi, ' ')
    .replace(/\b(official\s*(music\s*)?video|lyric(al)?\s*video|full\s*(audio|song|video)|audio|4k|hd|hq|remastered|visualizer)\b/gi, ' ')
    .replace(/\s*\|.*$/, ' ')
    .replace(/["“”]/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

const norm = (s) =>
  String(s || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9ऀ-ॿঀ-৿਀-੿஀-௿ఀ-౿]+/g, ' ')
    .trim();

async function lrclib(path, params, timeoutMs = 8000) {
  const url = new URL(LRCLIB + path);
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { headers: { 'User-Agent': LRCLIB_UA, Accept: 'application/json' }, signal: controller.signal });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`LRCLIB ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

function scoreCandidate(c, { title, artist, duration }) {
  let score = 0;
  const t = norm(title);
  const ct = norm(c.trackName || c.name);
  if (ct === t) score += 6;
  else if (ct && t && (ct.includes(t) || t.includes(ct))) score += 3;
  const a = norm(artist).split(' ')[0];
  if (a && norm(c.artistName).includes(a)) score += 3;
  if (duration && c.duration) {
    const diff = Math.abs(c.duration - duration);
    if (diff <= 3) score += 4;
    else if (diff <= 10) score += 2;
    else if (diff > 40) score -= 3;
  }
  if (c.syncedLyrics) score += 2;
  if (c.instrumental) score -= 5;
  return score;
}

function fromRecord(rec, id) {
  const synced = parseLrc(rec.syncedLyrics);
  const plain = String(rec.plainLyrics || '')
    .split(/\r?\n/)
    .map((l) => l.trim());
  const lines = synced.length ? synced.map((l) => l.text) : plain;
  if (!lines.some(Boolean)) return null;
  return { id, source: 'lrclib', synced: synced.length ? synced : null, lines, copyright: '' };
}

/**
 * Best-effort lyrics for a track. Never throws for "not found" — returns null instead.
 * @param {{ id: string, title?: string, artist?: string, album?: string, duration?: number }} track
 */
export async function getLyrics(track) {
  const title = cleanTitle(track.title);
  const artist = String(track.artist || '').split(',')[0].trim();
  const duration = Number(track.duration) || undefined;

  // 1. Exact match (fast path, returns synced lyrics when LRCLIB has them).
  if (title && artist) {
    try {
      const exact = await lrclib('/get', { track_name: title, artist_name: artist, album_name: track.album || undefined, duration });
      if (exact) {
        const r = fromRecord(exact, track.id);
        if (r) return r;
      }
    } catch {
      /* fall through */
    }
  }

  // 2. Fuzzy search, scored by title/artist/duration, preferring synced.
  if (title) {
    try {
      const attempts = [
        { track_name: title, artist_name: artist || undefined },
        { q: `${title} ${artist}`.trim() },
      ];
      for (const params of attempts) {
        const list = await lrclib('/search', params);
        if (!Array.isArray(list) || !list.length) continue;
        const ranked = list
          .map((c) => ({ c, s: scoreCandidate(c, { title, artist, duration }) }))
          .sort((a, b) => b.s - a.s);
        const best = ranked[0];
        if (best && best.s >= 5) {
          const r = fromRecord(best.c, track.id);
          if (r) return r;
        }
      }
    } catch {
      /* fall through */
    }
  }

  // 3. YouTube Music's own (unsynced) lyrics.
  try {
    const yt = await ytLyrics(track.id);
    if (yt && yt.text.trim()) {
      return { id: track.id, source: 'ytmusic', synced: null, lines: yt.text.split(/\r?\n/).map((l) => l.trim()), copyright: yt.footer };
    }
  } catch {
    /* ignore */
  }
  return null;
}
