import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decode, bigImage, normalizeSong, normalizePlaylist, normalizeAny } from '../src/normalize.js';
import { decryptMediaUrl, buildStreams } from '../src/saavn.js';
import { findMood, MOODS } from '../src/moods.js';

// Real encrypted url captured from the catalog; decrypts to a 96kbps CDN path.
const ENCRYPTED = 'ID2ieOjCrwfgWvL5sXl4B1ImC5QfbsDySan+n+AW12BvOaQj7cuGfg8Ed085rYUtqDj8DQY3nIMQdr42ScGdtRw7tS9a8Gtq';

test('decode unescapes html entities', () => {
  assert.equal(decode('Gehra Hua (From &quot;Dhurandhar&quot;) &amp; more'), 'Gehra Hua (From "Dhurandhar") & more');
  assert.equal(decode(undefined), '');
});

test('bigImage upgrades thumbnails to 500x500 and forces https', () => {
  assert.equal(bigImage('http://c.saavncdn.com/x/y-150x150.jpg'), 'https://c.saavncdn.com/x/y-500x500.jpg');
  assert.equal(bigImage('https://c.saavncdn.com/editorial/Chill.jpg'), 'https://c.saavncdn.com/editorial/Chill.jpg');
});

test('decryptMediaUrl produces a CDN url', () => {
  const url = decryptMediaUrl(ENCRYPTED);
  assert.equal(url, 'https://aac.saavncdn.com/450/f467e05e2825cec2203546333e0d0550_96.mp4');
  assert.equal(decryptMediaUrl(''), null);
  assert.equal(decryptMediaUrl('not-base64!!'), null);
});

test('buildStreams exposes the quality ladder and respects the 320 flag', () => {
  const s = buildStreams('https://aac.saavncdn.com/450/abc_96.mp4', true);
  assert.equal(s.low, 'https://aac.saavncdn.com/450/abc_96.mp4');
  assert.equal(s.medium, 'https://aac.saavncdn.com/450/abc_160.mp4');
  assert.equal(s.high, 'https://aac.saavncdn.com/450/abc_320.mp4');
  assert.equal(s.highBitrate, 320);
  const capped = buildStreams('https://aac.saavncdn.com/450/abc_96.mp4', false);
  assert.equal(capped.high, 'https://aac.saavncdn.com/450/abc_160.mp4');
  assert.equal(capped.highBitrate, 160);
});

test('normalizeSong flattens the upstream shape', () => {
  const song = normalizeSong({
    id: 'YiVML4Zo',
    title: 'Gehra Hua (From &quot;Dhurandhar&quot;)',
    subtitle: 'Shashwat Sachdev, Arijit Singh - Gehra Hua',
    type: 'song',
    image: 'https://c.saavncdn.com/450/x-150x150.jpg',
    year: '2025',
    play_count: '57472615',
    explicit_content: '0',
    more_info: {
      album_id: '70160165',
      album: 'Gehra Hua (From &quot;Dhurandhar&quot;)',
      duration: '362',
      has_lyrics: 'true',
      '320kbps': 'true',
      encrypted_media_url: ENCRYPTED,
      artistMap: { primary_artists: [{ id: '459320', name: 'Arijit Singh', image: '', role: 'primary_artists' }] },
    },
  });
  assert.equal(song.title, 'Gehra Hua (From "Dhurandhar")');
  assert.equal(song.duration, 362);
  assert.equal(song.year, 2025);
  assert.equal(song.hasLyrics, true);
  assert.equal(song.artists[0].name, 'Arijit Singh');
  assert.equal(song.artistNames, 'Arijit Singh');
  assert.equal(song.image, 'https://c.saavncdn.com/450/x-500x500.jpg');
  assert.equal(song.streams.highBitrate, 320);
});

test('normalizeSong falls back to subtitle artists and null streams for mini objects', () => {
  const song = normalizeSong({ id: 'a', title: 'Tum Ho', subtitle: 'A.R. Rahman, Mohit Chauhan - Rockstar', type: 'song', image: '' });
  assert.deepEqual(song.artists.map((a) => a.name), ['A.R. Rahman', 'Mohit Chauhan']);
  assert.equal(song.streams, null);
});

test('normalizePlaylist and normalizeAny handle mixed entities', () => {
  const pl = normalizePlaylist({ id: '1', title: 'Taaza Tunes', list_count: '50', more_info: { follower_count: '675338', firstname: 'JioSaavn' }, list: '' });
  assert.equal(pl.songCount, 50);
  assert.equal(pl.followers, 675338);
  assert.equal(pl.subtitle, 'JioSaavn');
  assert.equal(normalizeAny({ type: 'show', id: 'x' }), null);
  const artist = normalizeAny({ type: 'radio_station', id: '459320', title: 'Arijit Singh', image: '', more_info: { featured_station_type: 'artist' } });
  assert.equal(artist.type, 'artist');
  assert.equal(artist.id, '459320');
});

test('moods resolve by key and all carry a fallback query', () => {
  assert.equal(findMood('HAPPY').title, 'Happy');
  assert.equal(findMood('nope'), null);
  for (const m of MOODS) assert.ok(m.queries.length > 0, `${m.key} has queries`);
});
