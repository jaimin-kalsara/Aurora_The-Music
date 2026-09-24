export interface ArtistRef {
  id: string;
  name: string;
  image: string;
  role?: string;
}

export interface Streams {
  low: string;
  medium: string;
  high: string;
  highBitrate: number;
}

export interface Song {
  id: string;
  type: 'song';
  title: string;
  subtitle: string;
  artists: ArtistRef[];
  artistNames: string;
  album: { id: string; name: string };
  image: string;
  duration: number;
  year: number;
  language: string;
  playCount: number;
  explicit: boolean;
  hasLyrics: boolean;
  label: string;
  isVideo?: boolean;
  url: string;
  streams: Streams | null;
}

export interface Album {
  id: string;
  type: 'album';
  title: string;
  subtitle: string;
  artists: ArtistRef[];
  image: string;
  year: number;
  language: string;
  songCount: number;
  kind?: 'album' | 'single' | 'ep';
  url: string;
  songs: Song[];
}

export interface Playlist {
  id: string;
  type: 'playlist';
  title: string;
  subtitle: string;
  image: string;
  songCount: number;
  followers: number;
  description: string;
  url: string;
  songs: Song[];
}

export interface ArtistCard {
  id: string;
  type: 'artist';
  title: string;
  subtitle: string;
  image: string;
  url: string;
}

export interface ArtistDetail extends ArtistCard {
  banner?: string;
  followers: number;
  fans: number;
  verified: boolean;
  language: string;
  bio: string;
  topSongs: Song[];
  topAlbums: Album[];
  singles: Album[];
  videos: Song[];
  latestRelease: (Song | Album)[];
  similarArtists: ArtistCard[];
  playlists: Playlist[];
}

export type Entity = Song | Album | Playlist | ArtistCard;

export interface Section {
  id: string;
  title: string;
  kind: 'mixed' | 'song' | 'album' | 'playlist' | 'artist';
  items: Entity[];
}

export interface Mood {
  key: string;
  title: string;
  tagline: string;
  emoji: string;
  categories: string[];
  queries: string[];
  gradient: [string, string];
}

export interface SearchBucket<T> {
  total: number;
  results: T[];
  lastPage?: boolean;
}

export interface SearchResults {
  query: string;
  top: Entity | null;
  songs: SearchBucket<Song>;
  albums: SearchBucket<Album>;
  artists: SearchBucket<ArtistCard>;
  playlists: SearchBucket<Playlist>;
}

export interface Suggestions {
  top: Entity | null;
  terms: string[];
  songs: Song[];
  albums: Album[];
  artists: ArtistCard[];
  playlists: Playlist[];
}

export interface LyricLine {
  time: number;
  text: string;
}

export interface LyricsData {
  id: string;
  source: 'lrclib' | 'ytmusic';
  synced: LyricLine[] | null;
  lines: string[];
  copyright: string;
}

export type Quality = 'high' | 'medium' | 'low';
export type RepeatMode = 'off' | 'all' | 'one';

// Recommendation types
export interface DailyMix {
  key: string;
  title: string;
  tracks: Song[];
}

export interface RecommendationResponse {
  tracks: Song[];
}

export interface DiscoverWeeklyResponse {
  tracks: Song[];
  updatedAt: number;
}

export interface DailyMixesResponse {
  mixes: DailyMix[];
}

export interface FeedbackRequest {
  trackId: string;
  metadata?: Record<string, unknown>;
}

export interface FeedbackResponse {
  ok: boolean;
}
