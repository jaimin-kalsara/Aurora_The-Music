// Lightweight recommendation engine: implicit feedback (plays, skips, likes) per session,
// scored against candidate pools drawn from the YouTube Music catalog.
import { getHome, getTrending, getLanguage, getMood, getRadio, getSongs, uniqBy } from './catalog.js';
import { findMood, MOODS } from './moods.js';

const userProfiles = new Map();
const MAX_HISTORY = 500;
const MAX_RECENT = 100;
const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

export function getUserProfile(sessionId) {
  if (!userProfiles.has(sessionId)) {
    userProfiles.set(sessionId, {
      plays: new Map(), // trackId -> { count, lastPlayed, completionRate }
      skips: new Map(),
      likes: new Set(),
      recentTracks: [],
      preferences: { languages: new Map(), artists: new Map(), moods: new Map() },
      discoverWeekly: { tracks: [], generatedAt: 0 },
      dailyMixes: new Map(),
    });
    if (userProfiles.size > 5000) userProfiles.delete(userProfiles.keys().next().value);
  }
  return userProfiles.get(sessionId);
}

const bump = (map, key, w = 1) => key && map.set(key, (map.get(key) || 0) + w);

export function recordPlay(sessionId, trackId, metadata = {}) {
  const profile = getUserProfile(sessionId);
  const now = Date.now();
  const play = profile.plays.get(trackId) || { count: 0, lastPlayed: 0, completionRate: 1 };
  play.count += 1;
  play.lastPlayed = now;
  profile.plays.set(trackId, play);
  profile.recentTracks.unshift({ trackId, timestamp: now, context: metadata.context });
  if (profile.recentTracks.length > MAX_RECENT) profile.recentTracks.pop();
  bump(profile.preferences.languages, metadata.language);
  for (const a of metadata.artistIds || []) bump(profile.preferences.artists, a, 0.5);
  bump(profile.preferences.moods, metadata.mood);
  if (profile.plays.size > MAX_HISTORY) {
    const oldest = [...profile.plays.entries()].sort((a, b) => a[1].lastPlayed - b[1].lastPlayed);
    for (let i = 0; i < oldest.length - MAX_HISTORY; i++) profile.plays.delete(oldest[i][0]);
  }
}

export function recordSkip(sessionId, trackId) {
  const profile = getUserProfile(sessionId);
  profile.skips.set(trackId, (profile.skips.get(trackId) || 0) + 1);
}

export function recordLike(sessionId, trackId) {
  const profile = getUserProfile(sessionId);
  profile.likes.add(trackId);
  const play = profile.plays.get(trackId);
  if (play) play.completionRate = Math.min(1, play.completionRate + 0.1);
}

export function recordUnlike(sessionId, trackId) {
  getUserProfile(sessionId).likes.delete(trackId);
}

function score(profile, track, meta = {}) {
  let s = 0;
  const play = profile.plays.get(track.id);
  if (play) {
    const recency = Math.max(0, 1 - (Date.now() - play.lastPlayed) / (30 * DAY_MS));
    s += Math.log1p(play.count) * 2 * recency * play.completionRate;
  }
  s -= (profile.skips.get(track.id) || 0) * 3;
  if (profile.likes.has(track.id)) s += 10;
  if (meta.language) s += (profile.preferences.languages.get(meta.language) || 0) * 0.5;
  for (const a of meta.artistIds || []) s += (profile.preferences.artists.get(a) || 0) * 0.3;
  if (meta.mood) s += (profile.preferences.moods.get(meta.mood) || 0) * 0.4;
  if (track.playCount) s += Math.log10(track.playCount + 1) * 0.1;
  if (track.year && track.year >= new Date().getFullYear() - 1) s += 1;
  return Math.max(0, s);
}

const withMeta = (track, extra = {}) => ({
  track,
  meta: { language: extra.language || track.language, artistIds: track.artists.map((a) => a.id).filter(Boolean), mood: extra.mood },
});

function diversify(scored, limit, perArtist = 2) {
  const counts = new Map();
  const out = [];
  for (const item of scored) {
    const key = item.track.artists[0]?.id || item.track.artists[0]?.name || 'unknown';
    const n = counts.get(key) || 0;
    if (n < perArtist) {
      out.push(item.track);
      counts.set(key, n + 1);
      if (out.length >= limit) break;
    }
  }
  return out;
}

/** Candidate pool: language picks, home feed songs, trending, and optionally a mood. */
async function candidates(languages, { exclude = new Set(), mood } = {}) {
  const langs = String(languages).split(',').filter(Boolean).slice(0, 3);
  const jobs = [
    ...langs.map((l) => getLanguage(l).then((d) => d.songs.map((t) => withMeta(t, { language: l })))),
    getHome(languages).then((h) => h.sections.flatMap((s) => s.items.filter((i) => i.type === 'song').map((t) => withMeta(t)))),
    getTrending().then((list) => list.map((t) => withMeta(t))),
  ];
  const m = mood && findMood(mood);
  if (m) jobs.push(getMood(m).then((d) => d.songs.map((t) => withMeta(t, { mood: m.key }))));
  const settled = await Promise.allSettled(jobs);
  const pool = settled.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));
  const seen = new Set(exclude);
  return pool.filter(({ track }) => {
    if (!track.streams || seen.has(track.id)) return false;
    seen.add(track.id);
    return true;
  });
}

export async function getForYouRecommendations(sessionId, languages, limit = 30) {
  const profile = getUserProfile(sessionId);
  const exclude = new Set([...profile.plays.keys(), ...profile.likes]);
  const pool = await candidates(languages, { exclude });
  const scored = pool.map((c) => ({ ...c, score: score(profile, c.track, c.meta) })).sort((a, b) => b.score - a.score);
  return diversify(scored, limit, 2);
}

export async function getDiscoverWeekly(sessionId, languages, limit = 30) {
  const profile = getUserProfile(sessionId);
  const now = Date.now();
  if (profile.discoverWeekly.tracks.length && now - profile.discoverWeekly.generatedAt < WEEK_MS) {
    return profile.discoverWeekly.tracks.slice(0, limit);
  }
  const exclude = new Set([...profile.plays.keys(), ...profile.likes]);
  const pool = await candidates(languages, { exclude });
  const scored = pool
    .map((c) => {
      let s = score(profile, c.track, c.meta);
      for (const a of c.meta.artistIds) if ((profile.preferences.artists.get(a) || 0) < 5) s += 2; // exploration bonus
      if (c.meta.language && !profile.preferences.languages.has(c.meta.language)) s += 1.5;
      return { ...c, score: s };
    })
    .sort((a, b) => b.score - a.score);
  const tracks = diversify(scored, limit, 1);
  profile.discoverWeekly = { tracks, generatedAt: now };
  return tracks;
}

export async function getDailyMixes(sessionId, languages, limit = 6) {
  const profile = getUserProfile(sessionId);
  const now = Date.now();
  const topMoods = [...profile.preferences.moods.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => k);
  // Cold start: rotate through a few default moods so the home page is never empty.
  const dayIndex = Math.floor(now / DAY_MS);
  const defaults = [MOODS[dayIndex % MOODS.length].key, MOODS[(dayIndex + 3) % MOODS.length].key, MOODS[(dayIndex + 6) % MOODS.length].key];
  const moods = uniqBy([...topMoods, ...defaults].map((k) => ({ id: k })))
    .map((m) => m.id)
    .filter((k) => findMood(k))
    .slice(0, Math.max(3, Math.min(limit, 4)));
  const langs = String(languages).split(',').filter(Boolean).slice(0, 2);

  const build = async (key, title, opts) => {
    const hit = profile.dailyMixes.get(key);
    if (hit && now - hit.generatedAt < DAY_MS) return { key, title, tracks: hit.tracks };
    const pool = await candidates(languages, { exclude: new Set(profile.plays.keys()), mood: opts.mood });
    const filtered = opts.mood ? pool.filter((c) => c.meta.mood === opts.mood || Math.random() < 0.15) : pool.filter((c) => c.meta.language === opts.language);
    const scored = (filtered.length >= 10 ? filtered : pool)
      .map((c) => ({ ...c, score: score(profile, c.track, c.meta) + Math.random() * 0.5 }))
      .sort((a, b) => b.score - a.score);
    const tracks = diversify(scored, 50, 2);
    profile.dailyMixes.set(key, { tracks, generatedAt: now });
    return { key, title, tracks };
  };

  const mixes = await Promise.all([
    ...moods.map((m) => build(m, `${findMood(m).title} Mix`, { mood: m })),
    ...langs.map((l) => build(`lang:${l}`, `${l.charAt(0).toUpperCase() + l.slice(1)} Mix`, { language: l })),
  ]);
  return mixes.filter((m) => m.tracks.length >= 5).slice(0, limit);
}

export async function getSmartRadio(seedId, languages, sessionId, limit = 30) {
  const profile = getUserProfile(sessionId);
  const [seed] = await getSongs([seedId]).catch(() => []);
  const related = await getRadio(seedId, 60).catch(() => []);
  const seen = new Set([seedId, ...profile.plays.keys()]);
  const scored = related
    .filter((t) => t.streams && !seen.has(t.id) && seen.add(t.id))
    .map((track, i) => {
      const ids = track.artists.map((a) => a.id).filter(Boolean);
      let s = score(profile, track, { language: track.language, artistIds: ids });
      if (seed) s += ids.filter((id) => seed.artists.some((a) => a.id === id)).length * 3;
      s += Math.max(0, 3 - i * 0.05); // keep YouTube's ordering as a prior
      return { track, score: s };
    })
    .sort((a, b) => b.score - a.score);
  return diversify(scored, limit, 3);
}

export async function getTrendingRecommendations(languages, limit = 30) {
  const pool = await candidates(languages);
  return diversify(
    pool.map((c) => ({ ...c, score: (c.track.playCount || 0) + Math.random() })).sort((a, b) => b.score - a.score),
    limit,
    2,
  );
}
