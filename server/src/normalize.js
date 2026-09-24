// Turn youtubei.js nodes (YouTube Music) into the small, predictable models the client relies on.

const ENTITIES = { '&quot;': '"', '&amp;': '&', '&#039;': "'", '&apos;': "'", '&lt;': '<', '&gt;': '>', '&nbsp;': ' ' };
export function decode(text) {
  if (text === undefined || text === null) return '';
  return String(text).replace(/&(quot|amp|#039|apos|lt|gt|nbsp);/g, (m) => ENTITIES[m] ?? m);
}

// youtubei.js Text nodes stringify to "N/A" when empty; treat that as no value.
const str = (v) => {
  if (v === undefined || v === null) return '';
  const s = typeof v === 'string' ? v : typeof v.toString === 'function' ? v.toString() : String(v);
  return s === 'N/A' ? '' : s;
};
const toInt = (v) => {
  const n = parseInt(String(v ?? '').replace(/[^\d]/g, ''), 10);
  return Number.isFinite(n) ? n : 0;
};

/** Parse "1.2M views" / "674M monthly audience" style counts into a number. */
export function parseCount(text) {
  const m = String(text || '').match(/([\d.,]+)\s*([KMB])?/i);
  if (!m) return 0;
  const n = parseFloat(m[1].replace(/,/g, ''));
  if (!Number.isFinite(n)) return 0;
  const mult = { K: 1e3, M: 1e6, B: 1e9 }[(m[2] || '').toUpperCase()] || 1;
  return Math.round(n * mult);
}

/** Upgrade a YouTube thumbnail to a large square where the CDN supports it. */
export function bigImage(url, size = 544) {
  if (!url) return '';
  let u = String(url).replace(/^http:\/\//, 'https://');
  if (/googleusercontent\.com|ggpht\.com/.test(u)) {
    if (/=w\d+-h\d+/.test(u)) u = u.replace(/=w\d+-h\d+/, `=w${size}-h${size}`);
    else if (/=s\d+/.test(u)) u = u.replace(/=s\d+/, `=s${size}`);
  }
  return u;
}

function thumbOf(node) {
  if (!node) return '';
  const list = Array.isArray(node.thumbnail)
    ? node.thumbnail
    : Array.isArray(node.thumbnail?.contents)
      ? node.thumbnail.contents
      : Array.isArray(node.thumbnails)
        ? node.thumbnails
        : [];
  if (!list.length) return '';
  const best = list.reduce((a, b) => ((b.width || 0) > (a.width || 0) ? b : a), list[0]);
  return bigImage(best.url);
}

const isExplicit = (node) => Boolean((node?.badges || []).some?.((b) => b?.icon_type === 'MUSIC_EXPLICIT_BADGE'));

function artistsOf(node) {
  const list = [];
  const seen = new Set();
  const push = (a) => {
    const name = str(a?.name).trim();
    if (!name || seen.has(a.channel_id || name)) return;
    seen.add(a.channel_id || name);
    list.push({ id: a.channel_id || '', name, image: '' });
  };
  (node?.artists || []).forEach(push);
  if (!list.length && node?.author) push(typeof node.author === 'string' ? { name: node.author } : node.author);
  (node?.authors || []).forEach(push);
  return list;
}

function artistsFromText(text) {
  return str(text)
    .split(' • ')[0]
    .split(/,|&/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 4)
    .map((name) => ({ id: '', name, image: '' }));
}

/** YouTube's 4:3 default thumbnails are letterboxed; prefer the 16:9 HD frame for videos. */
function videoThumb(id, url) {
  if (!url || /i\.ytimg\.com\/vi\/[^/]+\/(hq|mq|sd)default/.test(url)) return `https://i.ytimg.com/vi/${id}/hq720.jpg`;
  return url;
}

export function buildStreams(id) {
  if (!id) return null;
  const base = `/api/stream/${encodeURIComponent(id)}`;
  return { low: `${base}?q=low`, medium: `${base}?q=medium`, high: `${base}?q=high`, highBitrate: 160 };
}

/* ---------------------------------------------------------------- songs */

/** Songs and music videos from any list/panel node. Returns null for things that are not tracks. */
export function normalizeSong(node) {
  if (!node) return null;
  const id = node.video_id || node.id || node.endpoint?.payload?.videoId;
  if (!id || typeof id !== 'string' || id.length !== 11) return null;
  if (node.item_type && !['song', 'video', 'non_music_track', undefined].includes(node.item_type)) return null;
  const title = decode(str(node.title)).trim();
  if (!title) return null;
  let artists = artistsOf(node);
  const subtitle = str(node.subtitle);
  if (!artists.length && subtitle) artists = artistsFromText(subtitle);
  const artistNames = artists.map((a) => a.name).join(', ');
  const album = node.album && str(node.album.name) ? { id: node.album.id || '', name: str(node.album.name) } : { id: '', name: '' };
  const views = parseCount(node.views || (subtitle.includes('views') ? subtitle.split(' • ').pop() : ''));
  return {
    id,
    type: 'song',
    title,
    subtitle: artistNames || subtitle.split(' • ')[0] || '',
    artists,
    artistNames,
    album,
    image: videoThumb(id, thumbOf(node)),
    duration: toInt(node.duration?.seconds),
    year: toInt(node.album?.year || node.year),
    language: '',
    playCount: views,
    explicit: isExplicit(node),
    hasLyrics: true,
    label: '',
    isVideo: node.item_type === 'video',
    url: `https://music.youtube.com/watch?v=${id}`,
    streams: buildStreams(id),
  };
}

/** Song from the player's basic info (used when we only have an id). */
export function normalizeTrackInfo(info, panelItem) {
  const b = info?.basic_info;
  if (!b?.id) return null;
  const fromPanel = panelItem ? normalizeSong(panelItem) : null;
  const artists = fromPanel?.artists?.length ? fromPanel.artists : artistsFromText(b.author || '');
  const artistNames = artists.map((a) => a.name).join(', ');
  return {
    id: b.id,
    type: 'song',
    title: decode(b.title || fromPanel?.title || ''),
    subtitle: artistNames,
    artists,
    artistNames,
    album: fromPanel?.album || { id: '', name: '' },
    image: fromPanel?.image || videoThumb(b.id, bigImage(b.thumbnail?.[0]?.url)),
    duration: toInt(b.duration || fromPanel?.duration),
    year: fromPanel?.year || 0,
    language: '',
    playCount: toInt(b.view_count),
    explicit: fromPanel?.explicit || false,
    hasLyrics: true,
    label: '',
    isVideo: false,
    url: `https://music.youtube.com/watch?v=${b.id}`,
    streams: buildStreams(b.id),
  };
}

/* --------------------------------------------------------------- albums */

export function normalizeAlbum(node) {
  if (!node) return null;
  const id = node.id || node.endpoint?.payload?.browseId;
  if (!id || !String(id).startsWith('MPRE')) return null;
  const title = decode(str(node.title)).trim();
  if (!title) return null;
  let artists = artistsOf(node);
  const subtitle = str(node.subtitle);
  if (!artists.length && subtitle) {
    const parts = subtitle.split(' • ').filter((p) => !/^(album|single|ep)$/i.test(p.trim()) && !/^\d{4}$/.test(p.trim()));
    artists = artistsFromText(parts.join(', '));
  }
  const year = toInt(node.year) || toInt((subtitle.match(/\b(19|20)\d{2}\b/) || [])[0]);
  return {
    id,
    type: 'album',
    title,
    subtitle: artists.map((a) => a.name).join(', ') || subtitle,
    artists,
    image: thumbOf(node),
    year,
    language: '',
    songCount: toInt(node.item_count || node.song_count),
    url: `https://music.youtube.com/browse/${id}`,
    songs: [],
  };
}

/** Full album page → album with songs. */
export function normalizeAlbumPage(page, id) {
  const h = page?.header;
  if (!h) return null;
  const title = decode(str(h.title));
  const strap = str(h.strapline_text_one);
  const subtitle = str(h.subtitle);
  const second = str(h.second_subtitle);
  const image = thumbOf(h) || bigImage(h.thumbnail?.contents?.[0]?.url);
  const artists = strap ? artistsFromText(strap) : artistsFromText(subtitle.split(' • ').slice(1).join(', '));
  const songs = (page.contents || [])
    .map((n) => normalizeSong(n))
    .filter(Boolean)
    .map((s) => ({
      ...s,
      image: image || s.image,
      isVideo: false,
      album: { id, name: title },
      artists: s.artists.length ? s.artists : artists,
      artistNames: s.artists.length ? s.artistNames : artists.map((a) => a.name).join(', '),
      subtitle: s.subtitle || artists.map((a) => a.name).join(', '),
    }));
  return {
    id,
    type: 'album',
    title,
    subtitle: artists.map((a) => a.name).join(', ') || subtitle,
    artists,
    image,
    year: toInt((subtitle.match(/\b(19|20)\d{2}\b/) || [])[0]),
    language: '',
    songCount: toInt((second.match(/(\d+)\s+song/) || [])[1]) || songs.length,
    kind: /single/i.test(subtitle) ? 'single' : /\bEP\b/i.test(subtitle) ? 'ep' : 'album',
    url: page.url || `https://music.youtube.com/browse/${id}`,
    songs,
  };
}

/* ------------------------------------------------------------ playlists */

const playlistId = (raw) => String(raw || '').replace(/^VL/, '');

export function normalizePlaylist(node) {
  if (!node) return null;
  const rawId = node.id || node.endpoint?.payload?.browseId;
  if (!rawId) return null;
  const id = playlistId(rawId);
  if (!/^(PL|RD|OL|UU|LL|FL|VL)/.test(rawId) && !/^(PL|RD|OL)/.test(id)) return null;
  const title = decode(str(node.title)).trim();
  if (!title) return null;
  const subtitle = str(node.subtitle);
  const author = node.author?.name || subtitle.split(' • ').find((p) => !/playlist|chart|views|songs?$/i.test(p)) || '';
  return {
    id,
    type: 'playlist',
    title,
    subtitle: str(author) || subtitle,
    image: thumbOf(node),
    songCount: toInt(node.item_count || node.song_count),
    followers: parseCount(node.views || (subtitle.includes('views') ? subtitle : '')),
    description: '',
    url: `https://music.youtube.com/playlist?list=${id}`,
    songs: [],
  };
}

export function normalizePlaylistPage(page, items, id) {
  const h = page?.header;
  if (!h) return null;
  const title = decode(str(h.title));
  const subtitle = str(h.subtitle);
  const second = str(h.second_subtitle);
  const description = str(h.description?.description ?? h.description);
  const image = thumbOf(h) || bigImage(h.thumbnail?.contents?.[0]?.url);
  const songs = (items || []).map((n) => normalizeSong(n)).filter(Boolean);
  const owner = str(h.strapline_text_one) || (h.author && h.author.name) || subtitle.split(' • ').slice(1).join(' • ');
  return {
    id: playlistId(id),
    type: 'playlist',
    title,
    subtitle: owner || subtitle,
    image: image || songs[0]?.image || '',
    songCount: toInt((second.match(/(\d+)\s+(songs?|tracks?|videos?)/) || [])[1]) || songs.length,
    followers: parseCount((second.match(/[\d.,]+[KMB]?\s+views/) || [])[0]),
    description,
    url: `https://music.youtube.com/playlist?list=${playlistId(id)}`,
    songs,
  };
}

/* -------------------------------------------------------------- artists */

export function normalizeArtistCard(node) {
  if (!node) return null;
  const id = node.id || node.endpoint?.payload?.browseId;
  if (!id || !String(id).startsWith('UC')) return null;
  const title = decode(str(node.name || node.title)).trim();
  if (!title) return null;
  const subtitle = str(node.subscribers || node.subtitle);
  return {
    id,
    type: 'artist',
    title,
    subtitle: subtitle && !/^artist$/i.test(subtitle) ? subtitle.replace(/^Artist\s*•\s*/i, '') : 'Artist',
    image: thumbOf(node),
    url: `https://music.youtube.com/channel/${id}`,
  };
}

function sectionTitle(section) {
  return str(section?.header?.title || section?.title).toLowerCase();
}

export function normalizeArtistPage(page, id) {
  const h = page?.header;
  if (!h) return null;
  const title = decode(str(h.title));
  const thumbs = Array.isArray(h.thumbnail) ? h.thumbnail : h.thumbnail?.contents || [];
  const fg = Array.isArray(h.foreground_thumbnail) ? h.foreground_thumbnail : [];
  const image = bigImage((fg[0] || thumbs[thumbs.length - 1] || thumbs[0])?.url || '');
  const banner = bigImage(thumbs[0]?.url || '');
  const subs = str(h.subscription_button?.subscriber_count || h.subscription_button?.subscribed_text || '');
  const out = {
    id,
    type: 'artist',
    title,
    subtitle: 'Artist',
    image,
    banner,
    followers: parseCount(subs),
    fans: 0,
    verified: true,
    language: '',
    bio: str(h.description).trim(),
    url: `https://music.youtube.com/channel/${id}`,
    topSongs: [],
    topAlbums: [],
    singles: [],
    videos: [],
    latestRelease: [],
    similarArtists: [],
    playlists: [],
  };
  for (const section of page.sections || []) {
    const t = sectionTitle(section);
    const items = section.contents || [];
    if (t.includes('top songs') || t === 'songs') out.topSongs.push(...items.map(normalizeSong).filter(Boolean));
    else if (t.includes('album')) out.topAlbums.push(...items.map(normalizeAlbum).filter(Boolean));
    else if (t.includes('single') || t.includes('ep')) out.singles.push(...items.map(normalizeAlbum).filter(Boolean));
    else if (t.includes('video') || t.includes('live')) out.videos.push(...items.map(normalizeSong).filter(Boolean));
    else if (t.includes('playlist') || t.includes('featured')) out.playlists.push(...items.map(normalizePlaylist).filter(Boolean));
    else if (t.includes('fans') || t.includes('similar') || t.includes('like')) out.similarArtists.push(...items.map(normalizeArtistCard).filter(Boolean));
  }
  out.topSongs = out.topSongs.map((s) => ({
    ...s,
    artists: s.artists.length ? s.artists : [{ id, name: title, image }],
    artistNames: s.artistNames || title,
    subtitle: s.subtitle || title,
  }));
  const latest = [...out.topAlbums, ...out.singles].filter((a) => a.year).sort((a, b) => b.year - a.year)[0];
  if (latest) out.latestRelease = [latest];
  return out;
}

/* ---------------------------------------------------------------- mixed */

/** Normalize any node into a song, album, playlist or artist card (or null). */
export function normalizeAny(node) {
  if (!node) return null;
  const type = node.item_type;
  if (type === 'song' || type === 'video' || type === 'non_music_track' || node.type === 'PlaylistPanelVideo') return normalizeSong(node);
  if (type === 'album') return normalizeAlbum(node);
  if (type === 'playlist') return normalizePlaylist(node);
  if (type === 'artist' || type === 'library_artist') return normalizeArtistCard(node);
  // Some carousel items only carry an endpoint; infer from the browse id.
  const id = node.id || node.endpoint?.payload?.browseId || node.endpoint?.payload?.videoId;
  if (typeof id === 'string') {
    if (id.startsWith('MPRE')) return normalizeAlbum(node);
    if (id.startsWith('UC')) return normalizeArtistCard(node);
    if (/^(VL|PL|RD|OL)/.test(id)) return normalizePlaylist(node);
    if (id.length === 11) return normalizeSong(node);
  }
  return null;
}

const kindOf = (items) => {
  const types = new Set(items.map((i) => i.type));
  return types.size === 1 ? [...types][0] : 'mixed';
};

/** A carousel/shelf → home section. Returns null when it has nothing playable. */
export function normalizeSection(section, idPrefix = '') {
  const title = decode(str(section?.header?.title || section?.title)).trim();
  const items = (section?.contents || []).map(normalizeAny).filter(Boolean);
  if (!items.length || !title) return null;
  const id = (idPrefix + title).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  return { id, title, kind: kindOf(items), items };
}
