// Recommendation Engine for Aurora Music
// Implements collaborative filtering, content-based filtering, and hybrid recommendations
import { call, DEFAULT_LANGUAGES } from './saavn.js';
import { cached, TTL } from './cache.js';
import { normalizeSong, normalizePlaylist } from './normalize.js';
import { MOODS, findMood } from './moods.js';

// In-memory user profile store (in production, use Redis/database)
const userProfiles = new Map(); // sessionId -> { plays, skips, likes, recentTracks, preferences }
const MAX_HISTORY = 500;
const MAX_RECENT = 100;

/**
 * Get or create user profile
 */
export function getUserProfile(sessionId) {
  if (!userProfiles.has(sessionId)) {
    userProfiles.set(sessionId, {
      plays: new Map(), // trackId -> { count, lastPlayed, completionRate }
      skips: new Map(), // trackId -> count
      likes: new Set(), // trackIds
      recentTracks: [], // [{ trackId, timestamp, context }]
      preferences: {
        languages: new Map(), // language -> weight
        genres: new Map(), // genre -> weight
        artists: new Map(), // artistId -> weight
        moods: new Map(), // moodKey -> weight
      },
      discoverWeekly: { tracks: [], generatedAt: 0 },
      dailyMixes: new Map(), // genre/mood -> { tracks, generatedAt }
    });
  }
  return userProfiles.get(sessionId);
}

/**
 * Record a play event for learning
 */
export function recordPlay(sessionId, trackId, metadata = {}) {
  const profile = getUserProfile(sessionId);
  const now = Date.now();
  
  // Update play count
  const playData = profile.plays.get(trackId) || { count: 0, lastPlayed: 0, completionRate: 1 };
  playData.count += 1;
  playData.lastPlayed = now;
  profile.plays.set(trackId, playData);
  
  // Update recent tracks
  profile.recentTracks.unshift({ trackId, timestamp: now, context: metadata.context });
  if (profile.recentTracks.length > MAX_RECENT) profile.recentTracks.pop();
  
  // Update preferences from metadata
  if (metadata.language) {
    const w = profile.preferences.languages.get(metadata.language) || 0;
    profile.preferences.languages.set(metadata.language, w + 1);
  }
  if (metadata.artistIds) {
    for (const artistId of metadata.artistIds) {
      const w = profile.preferences.artists.get(artistId) || 0;
      profile.preferences.artists.set(artistId, w + 0.5);
    }
  }
  if (metadata.mood) {
    const w = profile.preferences.moods.get(metadata.mood) || 0;
    profile.preferences.moods.set(metadata.mood, w + 1);
  }
  
  // Cleanup old data
  if (profile.plays.size > MAX_HISTORY) {
    const entries = Array.from(profile.plays.entries())
      .sort((a, b) => a[1].lastPlayed - b[1].lastPlayed);
    for (let i = 0; i < entries.length - MAX_HISTORY; i++) {
      profile.plays.delete(entries[i][0]);
    }
  }
}

/**
 * Record a skip event (negative signal)
 */
export function recordSkip(sessionId, trackId) {
  const profile = getUserProfile(sessionId);
  const count = (profile.skips.get(trackId) || 0) + 1;
  profile.skips.set(trackId, count);
  
  // Reduce preference weights for this track's attributes
  // (In a real system, we'd look up the track's metadata)
}

/**
 * Record a like event (strong positive signal)
 */
export function recordLike(sessionId, trackId) {
  const profile = getUserProfile(sessionId);
  profile.likes.add(trackId);
  
  // Boost preferences for this track
  const playData = profile.plays.get(trackId);
  if (playData) playData.completionRate = Math.min(1, playData.completionRate + 0.1);
}

/**
 * Record an unlike event
 */
export function recordUnlike(sessionId, trackId) {
  const profile = getUserProfile(sessionId);
  profile.likes.delete(trackId);
}

/**
 * Calculate track score for a user based on collaborative + content signals
 */
function calculateTrackScore(profile, track, trackMetadata = {}) {
  let score = 0;
  const trackId = track.id;
  
  // 1. Play history signal (collaborative)
  const playData = profile.plays.get(trackId);
  if (playData) {
    const recency = Math.max(0, 1 - (Date.now() - playData.lastPlayed) / (30 * 24 * 60 * 60 * 1000)); // 30 days
    score += Math.log1p(playData.count) * 2 * recency * playData.completionRate;
  }
  
  // 2. Skip penalty
  const skipCount = profile.skips.get(trackId) || 0;
  score -= skipCount * 3;
  
  // 3. Like boost (strong signal)
  if (profile.likes.has(trackId)) {
    score += 10;
  }
  
  // 4. Language preference (content-based)
  if (trackMetadata.language && profile.preferences.languages.has(trackMetadata.language)) {
    score += profile.preferences.languages.get(trackMetadata.language) * 0.5;
  }
  
  // 5. Artist preference
  if (trackMetadata.artistIds) {
    for (const artistId of trackMetadata.artistIds) {
      if (profile.preferences.artists.has(artistId)) {
        score += profile.preferences.artists.get(artistId) * 0.3;
      }
    }
  }
  
  // 6. Mood preference
  if (trackMetadata.mood && profile.preferences.moods.has(trackMetadata.mood)) {
    score += profile.preferences.moods.get(trackMetadata.mood) * 0.4;
  }
  
  // 7. Popularity boost (play count from catalog)
  if (track.playCount) {
    score += Math.log10(track.playCount + 1) * 0.1;
  }
  
  // 8. Recency boost (new releases)
  if (track.year && track.year >= new Date().getFullYear() - 1) {
    score += 1;
  }
  
  // 9. Diversity penalty - reduce score if similar tracks already in results
  // (handled by the caller)
  
  return Math.max(0, score);
}

/**
 * Get candidate tracks for recommendations
 */
async function getCandidateTracks(languages, options = {}) {
  const { limit = 200, exclude = new Set(), mood, genre } = options;
  const candidates = [];
  const seen = new Set(exclude);
  
  // Source 1: User's liked tracks' artists' top songs
  // Source 2: Trending songs in user's languages
  // Source 3: Mood/genre based searches
  // Source 4: New releases
  // Source 5: Chart toppers
  
  const searches = [];
  
  if (mood) {
    const moodObj = findMood(mood);
    if (moodObj) {
      for (const query of moodObj.queries.slice(0, 2)) {
        searches.push(call('search.getResults', { q: query, p: 1, n: 30 }, { languages }));
      }
    }
  }
  
  if (genre) {
    searches.push(call('search.getResults', { q: genre, p: 1, n: 30 }, { languages }));
  }
  
  // Trending
  searches.push(call('content.getTrending', { entity_type: 'song', entity_language: languages.split(',')[0] }, { languages }));
  
  // New releases
  searches.push(call('content.getAlbums', { p: 1, n: 20 }, { languages }));
  
  // Charts
  searches.push(call('content.getCharts', {}, { languages }));
  
  const results = await Promise.allSettled(searches);
  
  for (const result of results) {
    if (result.status === 'fulfilled' && result.value) {
      const data = result.value;
      let songs = [];
      
      if (data.songs) songs = data.songs;
      else if (data.results) songs = data.results;
      else if (Array.isArray(data)) songs = data;
      else if (data.data) songs = data.data;
      else if (data.top_songs) songs = data.top_songs;
      else if (data.list) songs = data.list;
      
      for (const raw of songs) {
        const normalized = normalizeSong(raw);
        if (normalized && normalized.streams && !seen.has(normalized.id)) {
          seen.add(normalized.id);
          candidates.push({
            track: normalized,
            metadata: {
              language: normalized.language,
              artistIds: normalized.artists.map(a => a.id).filter(Boolean),
              mood,
              genre,
            }
          });
          if (candidates.length >= limit) break;
        }
      }
      if (candidates.length >= limit) break;
    }
  }
  
  return candidates;
}

/**
 * Generate personalized "For You" recommendations
 */
export async function getForYouRecommendations(sessionId, languages, limit = 30) {
  const profile = getUserProfile(sessionId);
  const exclude = new Set([...profile.plays.keys(), ...profile.likes]);
  
  // Get candidate tracks
  const candidates = await getCandidateTracks(languages, { limit: 300, exclude });
  
  // Score each candidate
  const scored = candidates.map(({ track, metadata }) => ({
    track,
    score: calculateTrackScore(profile, track, metadata),
    metadata
  }));
  
  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);
  
  // Apply diversity: limit tracks per artist
  const artistCounts = new Map();
  const diverse = [];
  for (const item of scored) {
    const artistId = item.track.artists[0]?.id || 'unknown';
    const count = artistCounts.get(artistId) || 0;
    if (count < 2) { // max 2 tracks per artist
      diverse.push(item.track);
      artistCounts.set(artistId, count + 1);
      if (diverse.length >= limit) break;
    }
  }
  
  return diverse;
}

/**
 * Generate Discover Weekly playlist
 */
export async function getDiscoverWeekly(sessionId, languages, limit = 30) {
  const profile = getUserProfile(sessionId);
  const now = Date.now();
  const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
  
  // Return cached if fresh
  if (profile.discoverWeekly.tracks.length && (now - profile.discoverWeekly.generatedAt) < WEEK_MS) {
    return profile.discoverWeekly.tracks.slice(0, limit);
  }
  
  // Generate new discovery playlist
  // Focus on: new artists, genres user hasn't explored much, but related to their tastes
  const exclude = new Set([...profile.plays.keys(), ...profile.likes]);
  const candidates = await getCandidateTracks(languages, { limit: 500, exclude });
  
  // Score with exploration bias - prefer tracks from artists user hasn't heard much
  const scored = candidates.map(({ track, metadata }) => {
    let score = calculateTrackScore(profile, track, metadata);
    
    // Exploration bonus: artists with low play count
    for (const artistId of metadata.artistIds || []) {
      const artistPlays = profile.preferences.artists.get(artistId) || 0;
      if (artistPlays < 5) score += 2; // Discovery bonus
    }
    
    // Language exploration
    if (metadata.language && !profile.preferences.languages.has(metadata.language)) {
      score += 1.5;
    }
    
    return { track, score, metadata };
  });
  
  scored.sort((a, b) => b.score - a.score);
  
  // Diversity
  const artistCounts = new Map();
  const diverse = [];
  for (const item of scored) {
    const artistId = item.track.artists[0]?.id || 'unknown';
    const count = artistCounts.get(artistId) || 0;
    if (count < 1) { // Strict diversity for discovery
      diverse.push(item.track);
      artistCounts.set(artistId, count + 1);
      if (diverse.length >= limit) break;
    }
  }
  
  // Cache
  profile.discoverWeekly = { tracks: diverse, generatedAt: now };
  
  return diverse;
}

/**
 * Generate Daily Mixes (genre/mood based personalized playlists)
 */
export async function getDailyMixes(sessionId, languages, limit = 6) {
  const profile = getUserProfile(sessionId);
  const now = Date.now();
  const DAY_MS = 24 * 60 * 60 * 1000;
  
  // Determine user's top genres/moods from history
  const topMoods = Array.from(profile.preferences.moods.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([mood]) => mood);
  
  const topLanguages = Array.from(profile.preferences.languages.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([lang]) => lang);
  
  const mixes = [];
  
  // Create mixes for top moods
  for (const mood of topMoods) {
    const cacheKey = `dailymix:${mood}`;
    const cached = profile.dailyMixes.get(cacheKey);
    
    if (cached && (now - cached.generatedAt) < DAY_MS) {
      mixes.push({ key: mood, title: `${capitalize(mood)} Mix`, tracks: cached.tracks });
      continue;
    }
    
    const candidates = await getCandidateTracks(languages, { 
      limit: 200, 
      exclude: new Set([...profile.plays.keys()]),
      mood 
    });
    
    const scored = candidates.map(({ track, metadata }) => ({
      track,
      score: calculateTrackScore(profile, track, metadata) + 2, // Mood bonus
      metadata
    }));
    
    scored.sort((a, b) => b.score - a.score);
    
    const artistCounts = new Map();
    const diverse = [];
    for (const item of scored) {
      const artistId = item.track.artists[0]?.id || 'unknown';
      const count = artistCounts.get(artistId) || 0;
      if (count < 2) {
        diverse.push(item.track);
        artistCounts.set(artistId, count + 1);
        if (diverse.length >= 50) break;
      }
    }
    
    profile.dailyMixes.set(cacheKey, { tracks: diverse, generatedAt: now });
    mixes.push({ key: mood, title: `${capitalize(mood)} Mix`, tracks: diverse.slice(0, 50) });
  }
  
  // Add language-based mixes
  for (const lang of topLanguages.slice(0, 2)) {
    const cacheKey = `dailymix:lang:${lang}`;
    const cached = profile.dailyMixes.get(cacheKey);
    
    if (cached && (now - cached.generatedAt) < DAY_MS) {
      mixes.push({ key: `lang:${lang}`, title: `${capitalize(lang)} Mix`, tracks: cached.tracks });
      continue;
    }
    
    const candidates = await getCandidateTracks(languages, { 
      limit: 200, 
      exclude: new Set([...profile.plays.keys()]),
      genre: lang 
    });
    
    const scored = candidates.map(({ track, metadata }) => ({
      track,
      score: calculateTrackScore(profile, track, metadata) + 1,
      metadata
    }));
    
    scored.sort((a, b) => b.score - a.score);
    
    const artistCounts = new Map();
    const diverse = [];
    for (const item of scored) {
      const artistId = item.track.artists[0]?.id || 'unknown';
      const count = artistCounts.get(artistId) || 0;
      if (count < 2) {
        diverse.push(item.track);
        artistCounts.set(artistId, count + 1);
        if (diverse.length >= 50) break;
      }
    }
    
    profile.dailyMixes.set(cacheKey, { tracks: diverse, generatedAt: now });
    mixes.push({ key: `lang:${lang}`, title: `${capitalize(lang)} Mix`, tracks: diverse.slice(0, 50) });
  }
  
  return mixes.slice(0, limit);
}

/**
 * Smart Radio - generates endless radio station from seed
 */
export async function getSmartRadio(seedId, languages, sessionId, limit = 30) {
  const profile = getUserProfile(sessionId);
  const exclude = new Set([...profile.plays.keys()]);
  
  // Get seed track for context
  const seedData = await cached(`song:${seedId}`, TTL.long, () => 
    call('song.getDetails', { pids: seedId }, { languages })
  );
  const seedTrack = seedData.songs?.[0] ? normalizeSong(seedData.songs[0]) : null;
  
  if (!seedTrack) {
    return [];
  }
  
  // Strategy 1: JioSaavn's built-in recommendations (reco.getreco)
  const recoSongs = await cached(`reco:${seedId}`, TTL.medium, () =>
    call('reco.getreco', { pid: seedId }, { languages }).catch(() => [])
  ).then(arr => (Array.isArray(arr) ? arr : []).map(normalizeSong).filter(Boolean));
  
  // Strategy 2: Artist radio
  let artistRadioSongs = [];
  const primaryArtist = seedTrack.artists.find(a => a.id);
  if (primaryArtist) {
    const station = await call('webradio.createArtistStation', 
      { artistid: primaryArtist.id, name: primaryArtist.name, query: primaryArtist.name }, 
      { languages }
    ).catch(() => null);
    
    if (station?.stationid) {
      const radioData = await call('webradio.getSong', { stationid: station.stationid, k: 30 }, { languages }).catch(() => ({}));
      artistRadioSongs = Object.values(radioData || {})
        .filter(v => v?.song)
        .map(v => normalizeSong(v.song))
        .filter(Boolean);
    }
  }
  
  // Strategy 3: Similar songs via search
  const searchQuery = seedTrack.artistNames.split(',')[0] || seedTrack.title;
  const searchResults = await call('search.getResults', { q: searchQuery, p: 1, n: 30 }, { languages })
    .then(data => (data.results || []).map(normalizeSong).filter(Boolean));
  
  // Combine and score
  const allCandidates = [...recoSongs, ...artistRadioSongs, ...searchResults];
  const seen = new Set([seedId, ...exclude]);
  
  const scored = allCandidates
    .filter(s => s.streams && !seen.has(s.id))
    .map(track => {
      const artistIds = track.artists.map(a => a.id).filter(Boolean);
      let score = calculateTrackScore(profile, track, {
        language: track.language,
        artistIds,
        // Check if shares artists with seed
        sharedArtists: artistIds.filter(id => seedTrack.artists.some(a => a.id === id)).length
      });
      
      // Boost for shared artists
      score += artistIds.filter(id => seedTrack.artists.some(a => a.id === id)).length * 3;
      
      // Boost for same language
      if (track.language === seedTrack.language) score += 1;
      
      seen.add(track.id);
      return { track, score };
    });
  
  scored.sort((a, b) => b.score - a.score);
  
  // Diversity
  const artistCounts = new Map();
  const diverse = [];
  for (const item of scored) {
    const artistId = item.track.artists[0]?.id || 'unknown';
    const count = artistCounts.get(artistId) || 0;
    if (count < 3) { // Radio allows more repetition
      diverse.push(item.track);
      artistCounts.set(artistId, count + 1);
      if (diverse.length >= limit) break;
    }
  }
  
  return diverse;
}

function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

/**
 * Get trending/popular tracks for cold-start users
 */
export async function getTrendingRecommendations(languages, limit = 30) {
  const data = await cached(`trending:song:${languages.split(',')[0]}`, TTL.medium, () =>
    call('content.getTrending', { entity_type: 'song', entity_language: languages.split(',')[0] }, { languages })
  );
  
  const songs = (Array.isArray(data) ? data : []).map(normalizeSong).filter(Boolean);
  return songs.filter(s => s.streams).slice(0, limit);
}

