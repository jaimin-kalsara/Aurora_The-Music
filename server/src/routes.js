import { Router } from 'express';
import { call, DEFAULT_LANGUAGES } from './saavn.js';
import { cached, TTL } from './cache.js';
import {
  normalizeSong,
  normalizeAlbum,
  normalizePlaylist,
  normalizeArtist,
  normalizeArtistCard,
  normalizeAny,
  decode,
} from './normalize.js';
import { MOODS, findMood } from './moods.js';
import {
  getForYouRecommendations,
  getDiscoverWeekly,
  getDailyMixes,
  getSmartRadio,
  getTrendingRecommendations,
  recordPlay,
  recordSkip,
  recordLike,
  recordUnlike,
  getUserProfile,
} from './recommendations.js';

const router = Router();

const LANG_RE = /^[a-z]+(,[a-z]+)*$/i;
function languagesOf(req) {
  const lang = String(req.query.lang || '').toLowerCase();
  return LANG_RE.test(lang) ? lang : DEFAULT_LANGUAGES;
}
const clamp = (v, min, max, fallback) => {
  const n = parseInt(v, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
};

const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

/** Songs coming from mini payloads (autocomplete, playlist stubs) lack stream data. Fill them in. */
async function hydrateSongs(songs, languages) {
  const missing = songs.filter((s) => s && !s.streams).map((s) => s.id);
  if (missing.length === 0) return songs;
  const byId = new Map();
  for (let i = 0; i < missing.length; i += 20) {
    const ids = missing.slice(i, i + 20);
    const data = await cached(`songs:${ids.join(',')}`, TTL.long, () => call('song.getDetails', { pids: ids.join(',') }, { languages }));
    for (const raw of data.songs || []) {
      const s = normalizeSong(raw);
      if (s) byId.set(s.id, s);
    }
  }
  return songs.map((s) => (s && !s.streams && byId.has(s.id) ? byId.get(s.id) : s));
}

async function getSongs(ids, languages) {
  const data = await cached(`songs:${ids.join(',')}`, TTL.long, () => call('song.getDetails', { pids: ids.join(',') }, { languages }));
  return (data.songs || []).map(normalizeSong).filter(Boolean);
}

async function getPlaylist(id, languages, page = 1, limit = 100) {
  const raw = await cached(`playlist:${id}:${page}:${limit}`, TTL.medium, () =>
    call('playlist.getDetails', { listid: id, p: page, n: limit }, { languages }),
  );
  if (!raw || !raw.id) throw Object.assign(new Error('Playlist not found'), { status: 404 });
  const playlist = normalizePlaylist(raw);
  playlist.songs = await hydrateSongs(playlist.songs, languages);
  return playlist;
}

async function searchSongs(query, languages, page = 1, limit = 20) {
  const data = await cached(`s:songs:${query}:${page}:${limit}`, TTL.short, () =>
    call('search.getResults', { q: query, p: page, n: limit }, { languages }),
  );
  return { total: parseInt(data.total, 10) || 0, results: (data.results || []).map(normalizeSong).filter(Boolean) };
}
async function searchAlbums(query, languages, page = 1, limit = 20) {
  const data = await cached(`s:albums:${query}:${page}:${limit}`, TTL.short, () =>
    call('search.getAlbumResults', { q: query, p: page, n: limit }, { languages }),
  );
  return { total: parseInt(data.total, 10) || 0, results: (data.results || []).map(normalizeAlbum).filter(Boolean) };
}
async function searchArtists(query, languages, page = 1, limit = 20) {
  const data = await cached(`s:artists:${query}:${page}:${limit}`, TTL.short, () =>
    call('search.getArtistResults', { q: query, p: page, n: limit }, { languages }),
  );
  return { total: parseInt(data.total, 10) || 0, results: (data.results || []).map(normalizeArtistCard).filter(Boolean) };
}
async function searchPlaylists(query, languages, page = 1, limit = 20) {
  const data = await cached(`s:playlists:${query}:${page}:${limit}`, TTL.short, () =>
    call('search.getPlaylistResults', { q: query, p: page, n: limit }, { languages }),
  );
  return { total: parseInt(data.total, 10) || 0, results: (data.results || []).map(normalizePlaylist).filter(Boolean) };
}

router.get('/health', (_req, res) => res.json({ ok: true, time: new Date().toISOString() }));

/* ------------------------------------------------------------------ home */
router.get(
  '/home',
  wrap(async (req, res) => {
    const languages = languagesOf(req);
    const data = await cached(`home:${languages}`, TTL.medium, () => call('webapi.getLaunchData', {}, { languages }));
    const modules = data.modules || {};
    const titleOf = (key, fallback) => decode((modules[key] && modules[key].title) || fallback);
    const list = (key) => (Array.isArray(data[key]) ? data[key].map(normalizeAny).filter(Boolean) : []);

    const sections = [];
    const push = (id, title, items, kind) => {
      if (items.length) sections.push({ id, title, kind, items });
    };
    push('trending', titleOf('new_trending', 'Trending now'), list('new_trending'), 'mixed');
    push('new-releases', titleOf('new_albums', 'New releases'), list('new_albums'), 'mixed');
    push('charts', titleOf('charts', 'Top charts'), list('charts'), 'playlist');
    push('top-playlists', titleOf('top_playlists', 'Editorial picks'), list('top_playlists'), 'playlist');
    push('city', titleOf('city_mod', 'Popular around you'), list('city_mod'), 'song');
    push('artists', titleOf('artist_recos', 'Artists to explore'), list('artist_recos'), 'artist');
    for (const key of Object.keys(data)) {
      if (!key.startsWith('promo:vx:data:')) continue;
      const items = list(key).filter((i) => i.type !== 'show');
      const title = titleOf(key, '');
      if (title && items.length >= 4) push(key.replace(/[^a-z0-9]+/gi, '-'), title, items, 'mixed');
    }
    res.json({ languages, sections });
  }),
);

router.get(
  '/trending',
  wrap(async (req, res) => {
    const languages = languagesOf(req);
    const type = ['song', 'album', 'playlist'].includes(req.query.type) ? req.query.type : 'song';
    const primary = languages.split(',')[0];
    const data = await cached(`trending:${type}:${primary}`, TTL.medium, () =>
      call('content.getTrending', { entity_type: type, entity_language: primary }, { languages }),
    );
    res.json({ items: (Array.isArray(data) ? data : []).map(normalizeAny).filter(Boolean) });
  }),
);

router.get(
  '/charts',
  wrap(async (req, res) => {
    const languages = languagesOf(req);
    const data = await cached(`charts:${languages}`, TTL.medium, () => call('content.getCharts', {}, { languages }));
    res.json({ items: (Array.isArray(data) ? data : []).map(normalizePlaylist).filter(Boolean) });
  }),
);

router.get(
  '/new-releases',
  wrap(async (req, res) => {
    const languages = languagesOf(req);
    const page = clamp(req.query.page, 1, 50, 1);
    const limit = clamp(req.query.limit, 1, 50, 30);
    const data = await cached(`new:${languages}:${page}:${limit}`, TTL.medium, () =>
      call('content.getAlbums', { p: page, n: limit }, { languages }),
    );
    res.json({
      page,
      lastPage: Boolean(data.last_page),
      items: (data.data || []).map(normalizeAny).filter(Boolean),
    });
  }),
);

/* ---------------------------------------------------------------- search */
router.get(
  '/search/suggest',
  wrap(async (req, res) => {
    const q = String(req.query.q || '').trim();
    if (q.length < 1) return res.json({ songs: [], albums: [], artists: [], playlists: [], top: null });
    const languages = languagesOf(req);
    const data = await cached(`suggest:${q}:${languages}`, TTL.short, () => call('autocomplete.get', { query: q }, { languages }));
    const pick = (k, fn) => (((data[k] || {}).data) || []).map(fn).filter(Boolean);
    const top = pick('topquery', normalizeAny)[0] || null;
    res.json({
      top,
      songs: pick('songs', normalizeSong),
      albums: pick('albums', normalizeAlbum),
      artists: pick('artists', normalizeArtistCard),
      playlists: pick('playlists', normalizePlaylist),
    });
  }),
);

router.get(
  '/search',
  wrap(async (req, res) => {
    const q = String(req.query.q || '').trim();
    const languages = languagesOf(req);
    const type = String(req.query.type || 'all');
    const page = clamp(req.query.page, 1, 100, 1);
    const limit = clamp(req.query.limit, 1, 50, 20);
    if (!q) return res.json({ query: q, songs: { total: 0, results: [] }, albums: { total: 0, results: [] }, artists: { total: 0, results: [] }, playlists: { total: 0, results: [] } });

    if (type === 'songs') return res.json({ query: q, page, songs: await searchSongs(q, languages, page, limit) });
    if (type === 'albums') return res.json({ query: q, page, albums: await searchAlbums(q, languages, page, limit) });
    if (type === 'artists') return res.json({ query: q, page, artists: await searchArtists(q, languages, page, limit) });
    if (type === 'playlists') return res.json({ query: q, page, playlists: await searchPlaylists(q, languages, page, limit) });

    const [songs, albums, artists, playlists] = await Promise.all([
      searchSongs(q, languages, 1, 12),
      searchAlbums(q, languages, 1, 10),
      searchArtists(q, languages, 1, 8),
      searchPlaylists(q, languages, 1, 10),
    ]);
    res.json({ query: q, songs, albums, artists, playlists });
  }),
);

/* -------------------------------------------------------------- entities */
router.get(
  '/songs/:ids',
  wrap(async (req, res) => {
    const ids = String(req.params.ids).split(',').map((s) => s.trim()).filter(Boolean).slice(0, 50);
    const songs = await getSongs(ids, languagesOf(req));
    if (!songs.length) return res.status(404).json({ error: 'Song not found' });
    res.json({ songs });
  }),
);

router.get(
  '/albums/:id',
  wrap(async (req, res) => {
    const languages = languagesOf(req);
    const raw = await cached(`album:${req.params.id}`, TTL.long, () => call('content.getAlbumDetails', { albumid: req.params.id }, { languages }));
    if (!raw || !raw.id) return res.status(404).json({ error: 'Album not found' });
    const album = normalizeAlbum(raw);
    album.songs = await hydrateSongs(album.songs, languages);
    res.json(album);
  }),
);

router.get(
  '/playlists/:id',
  wrap(async (req, res) => {
    const page = clamp(req.query.page, 1, 100, 1);
    const limit = clamp(req.query.limit, 1, 200, 100);
    res.json(await getPlaylist(req.params.id, languagesOf(req), page, limit));
  }),
);

router.get(
  '/artists/:id',
  wrap(async (req, res) => {
    const languages = languagesOf(req);
    const raw = await cached(`artist:${req.params.id}`, TTL.long, () =>
      call('artist.getArtistPageDetails', { artistId: req.params.id, n_song: 20, n_album: 20 }, { languages }),
    );
    if (!raw || !raw.artistId) return res.status(404).json({ error: 'Artist not found' });
    const artist = normalizeArtist(raw);
    artist.topSongs = await hydrateSongs(artist.topSongs, languages);
    res.json(artist);
  }),
);

router.get(
  '/artists/:id/songs',
  wrap(async (req, res) => {
    const languages = languagesOf(req);
    const page = clamp(req.query.page, 0, 100, 0);
    const data = await cached(`artist-songs:${req.params.id}:${page}`, TTL.long, () =>
      call('artist.getArtistMoreSong', { artistId: req.params.id, page, category: '', sort_order: '' }, { languages }),
    );
    const songs = await hydrateSongs(((data && data.topSongs && data.topSongs.songs) || data.songs || []).map(normalizeSong).filter(Boolean), languages);
    res.json({ page, songs, lastPage: Boolean(data && data.topSongs && data.topSongs.last_page) });
  }),
);

router.get(
  '/lyrics/:id',
  wrap(async (req, res) => {
    const data = await cached(`lyrics:${req.params.id}`, TTL.long, () => call('lyrics.getLyrics', { lyrics_id: req.params.id }));
    if (!data || !data.lyrics) return res.status(404).json({ error: 'No lyrics available' });
    const lines = decode(String(data.lyrics)).split(/<br\s*\/?>/i).map((l) => l.trim());
    res.json({ id: req.params.id, lines, copyright: decode(data.lyrics_copyright || '') });
  }),
);

/** Related songs for autoplay: reco first, then an entity radio station as fallback. */
router.get(
  '/radio/:id',
  wrap(async (req, res) => {
    const languages = languagesOf(req);
    const id = req.params.id;
    const songs = await cached(`radio:${id}`, TTL.medium, async () => {
      const list = [];
      const seen = new Set([id]);
      const add = (s) => {
        if (s && s.streams && !seen.has(s.id)) { seen.add(s.id); list.push(s); }
      };
      const reco = await call('reco.getreco', { pid: id }, { languages }).catch(() => []);
      (Array.isArray(reco) ? reco : []).map(normalizeSong).forEach(add);
      if (list.length >= 10) return list;

      const [seed] = await getSongs([id], languages).catch(() => []);
      const artist = seed && seed.artists.find((a) => a.id);
      if (artist) {
        const station = await call(
          'webradio.createArtistStation',
          { artistid: artist.id, name: artist.name, query: artist.name },
          { languages },
        ).catch(() => null);
        if (station && station.stationid) {
          const data = await call('webradio.getSong', { stationid: station.stationid, k: 20 }, { languages }).catch(() => ({}));
          Object.values(data || {}).forEach((v) => v && v.song && add(normalizeSong(v.song)));
        }
      }
      if (list.length < 10 && seed) {
        const q = seed.artistNames.split(',')[0] || seed.title;
        const extra = await searchSongs(q, languages, 1, 20).catch(() => ({ results: [] }));
        extra.results.forEach(add);
      }
      return list;
    });
    res.json({ songs: await hydrateSongs(songs.filter((s) => s.id !== id), languages) });
  }),
);

/* ----------------------------------------------------------------- moods */
router.get('/moods', (_req, res) => res.json({ moods: MOODS }));

router.get(
  '/moods/:key',
  wrap(async (req, res) => {
    const mood = findMood(req.params.key);
    if (!mood) return res.status(404).json({ error: 'Unknown mood' });
    const languages = languagesOf(req);
    const result = await cached(`mood:${mood.key}:${languages}`, TTL.medium, async () => {
      let songs = [];
      let playlists = [];
      if (mood.channelId) {
        const ch = await call('channel.getDetails', { channel_id: mood.channelId }, { languages }).catch(() => null);
        if (ch) {
          songs = (ch.top_songs || []).map(normalizeSong).filter(Boolean);
          playlists = (ch.top_playlists || []).map(normalizePlaylist).filter(Boolean);
        }
      }
      if (playlists.length < 4) {
        const found = await Promise.all(mood.queries.map((q) => searchPlaylists(q, languages, 1, 8).catch(() => ({ results: [] }))));
        const seen = new Set(playlists.map((p) => p.id));
        for (const f of found) for (const p of f.results) if (!seen.has(p.id)) { seen.add(p.id); playlists.push(p); }
      }
      // Expand the queue from the first two playlists so a mood is a long, continuous session.
      const seen = new Set(songs.map((s) => s.id));
      for (const p of playlists.slice(0, 2)) {
        const full = await getPlaylist(p.id, languages, 1, 40).catch(() => null);
        if (!full) continue;
        for (const s of full.songs) if (s.streams && !seen.has(s.id)) { seen.add(s.id); songs.push(s); }
      }
      if (songs.length < 20) {
        const extra = await searchSongs(mood.queries[0], languages, 1, 20).catch(() => ({ results: [] }));
        for (const s of extra.results) if (s.streams && !seen.has(s.id)) { seen.add(s.id); songs.push(s); }
      }
      return { songs: songs.slice(0, 80), playlists: playlists.slice(0, 12) };
    });
    res.json({ mood, songs: await hydrateSongs(result.songs, languages), playlists: result.playlists });
  }),
);

/* ----------------------------------------------------------------- recommendations */
/**
 * Get or create a session ID for the user (from header or generate)
 */
function getSessionId(req) {
  return req.headers['x-session-id'] || req.headers['x-forwarded-for'] || req.ip || 'anonymous';
}

/** Personalized "For You" recommendations */
router.get(
  '/recommendations/for-you',
  wrap(async (req, res) => {
    const sessionId = getSessionId(req);
    const languages = languagesOf(req);
    const limit = clamp(req.query.limit, 1, 50, 30);
    const tracks = await getForYouRecommendations(sessionId, languages, limit);
    res.json({ tracks });
  }),
);

/** Discover Weekly - personalized discovery playlist */
router.get(
  '/recommendations/discover-weekly',
  wrap(async (req, res) => {
    const sessionId = getSessionId(req);
    const languages = languagesOf(req);
    const limit = clamp(req.query.limit, 1, 50, 30);
    const tracks = await getDiscoverWeekly(sessionId, languages, limit);
    res.json({ tracks, updatedAt: getUserProfile(sessionId).discoverWeekly.generatedAt });
  }),
);

/** Daily Mixes - genre/mood based personalized playlists */
router.get(
  '/recommendations/daily-mixes',
  wrap(async (req, res) => {
    const sessionId = getSessionId(req);
    const languages = languagesOf(req);
    const limit = clamp(req.query.limit, 1, 10, 6);
    const mixes = await getDailyMixes(sessionId, languages, limit);
    res.json({ mixes });
  }),
);

/** Smart Radio - endless radio from a seed track */
router.get(
  '/radio/smart/:seedId',
  wrap(async (req, res) => {
    const sessionId = getSessionId(req);
    const languages = languagesOf(req);
    const limit = clamp(req.query.limit, 1, 50, 30);
    const tracks = await getSmartRadio(req.params.seedId, languages, sessionId, limit);
    res.json({ tracks });
  }),
);

/** Trending recommendations for cold-start users */
router.get(
  '/recommendations/trending',
  wrap(async (req, res) => {
    const languages = languagesOf(req);
    const limit = clamp(req.query.limit, 1, 50, 30);
    const tracks = await getTrendingRecommendations(languages, limit);
    res.json({ tracks });
  }),
);

/** Record playback events for learning */
router.post(
  '/feedback/play',
  wrap(async (req, res) => {
    const sessionId = getSessionId(req);
    const { trackId, metadata } = req.body;
    if (!trackId) return res.status(400).json({ error: 'trackId required' });
    recordPlay(sessionId, trackId, metadata || {});
    res.json({ ok: true });
  }),
);

router.post(
  '/feedback/skip',
  wrap(async (req, res) => {
    const sessionId = getSessionId(req);
    const { trackId } = req.body;
    if (!trackId) return res.status(400).json({ error: 'trackId required' });
    recordSkip(sessionId, trackId);
    res.json({ ok: true });
  }),
);

router.post(
  '/feedback/like',
  wrap(async (req, res) => {
    const sessionId = getSessionId(req);
    const { trackId } = req.body;
    if (!trackId) return res.status(400).json({ error: 'trackId required' });
    recordLike(sessionId, trackId);
    res.json({ ok: true });
  }),
);

router.post(
  '/feedback/unlike',
  wrap(async (req, res) => {
    const sessionId = getSessionId(req);
    const { trackId } = req.body;
    if (!trackId) return res.status(400).json({ error: 'trackId required' });
    recordUnlike(sessionId, trackId);
    res.json({ ok: true });
  }),
);

export default router;
