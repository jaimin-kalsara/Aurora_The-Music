import test from 'node:test';
import assert from 'node:assert/strict';
import {
  bigImage,
  parseCount,
  buildStreams,
  normalizeSong,
  normalizeAlbum,
  normalizePlaylist,
  normalizeArtistCard,
  normalizeAny,
  normalizeSection,
  normalizeAlbumPage,
} from '../src/normalize.js';

const text = (s) => ({ toString: () => s, text: s });

test('bigImage upgrades googleusercontent thumbnails and forces https', () => {
  assert.equal(bigImage('http://lh3.googleusercontent.com/abc=w120-h120-l90-rj'), 'https://lh3.googleusercontent.com/abc=w544-h544-l90-rj');
  assert.equal(bigImage('https://yt3.googleusercontent.com/abc=s576'), 'https://yt3.googleusercontent.com/abc=s544');
  assert.equal(bigImage('https://i.ytimg.com/vi/abc/hqdefault.jpg'), 'https://i.ytimg.com/vi/abc/hqdefault.jpg');
  assert.equal(bigImage(''), '');
});

test('parseCount handles K/M/B suffixes', () => {
  assert.equal(parseCount('1.4M views'), 1_400_000);
  assert.equal(parseCount('674M monthly audience'), 674_000_000);
  assert.equal(parseCount('2.8K'), 2_800);
  assert.equal(parseCount('nothing'), 0);
});

test('buildStreams points at the proxy for every quality', () => {
  const s = buildStreams('NJAv_7lHUIU');
  assert.equal(s.high, '/api/stream/NJAv_7lHUIU?q=high');
  assert.equal(s.low, '/api/stream/NJAv_7lHUIU?q=low');
  assert.equal(s.highBitrate, 160);
  assert.equal(buildStreams(''), null);
});

test('normalizeSong maps a MusicResponsiveListItem song', () => {
  const song = normalizeSong({
    type: 'MusicResponsiveListItem',
    item_type: 'song',
    id: 'NJAv_7lHUIU',
    title: 'Kesariya (From "Brahmastra")',
    artists: [{ name: 'Arijit Singh', channel_id: 'UCDxKh1gFWeYsqePvgVzmPoQ' }],
    album: { id: 'MPREb_o3adW3fGQYh', name: 'Kesariya', year: '2022' },
    duration: { text: '4:29', seconds: 269 },
    thumbnail: { contents: [{ url: 'https://yt3.googleusercontent.com/x=w120-h120-l90-rj', width: 120 }, { url: 'https://yt3.googleusercontent.com/x=w60-h60-l90-rj', width: 60 }] },
    badges: [{ icon_type: 'MUSIC_EXPLICIT_BADGE' }],
  });
  assert.equal(song.id, 'NJAv_7lHUIU');
  assert.equal(song.type, 'song');
  assert.equal(song.title, 'Kesariya (From "Brahmastra")');
  assert.equal(song.artistNames, 'Arijit Singh');
  assert.equal(song.artists[0].id, 'UCDxKh1gFWeYsqePvgVzmPoQ');
  assert.equal(song.album.id, 'MPREb_o3adW3fGQYh');
  assert.equal(song.duration, 269);
  assert.equal(song.year, 2022);
  assert.equal(song.explicit, true);
  assert.equal(song.image, 'https://yt3.googleusercontent.com/x=w544-h544-l90-rj');
  assert.equal(song.streams.high, '/api/stream/NJAv_7lHUIU?q=high');
});

test('normalizeSong maps a PlaylistPanelVideo and MusicTwoRowItem video', () => {
  const panel = normalizeSong({
    type: 'PlaylistPanelVideo',
    video_id: 'YALvuUpY_b0',
    title: text('Apna Bana Le'),
    author: 'Arijit Singh & Sachin-Jigar',
    artists: [{ name: 'Arijit Singh', channel_id: 'UC1' }, { name: 'Sachin-Jigar', channel_id: 'UC2' }],
    duration: { seconds: 200 },
    thumbnail: [{ url: 'https://i.ytimg.com/vi/YALvuUpY_b0/hqdefault.jpg', width: 480 }],
  });
  assert.equal(panel.id, 'YALvuUpY_b0');
  assert.equal(panel.artistNames, 'Arijit Singh, Sachin-Jigar');

  const video = normalizeSong({
    type: 'MusicTwoRowItem',
    item_type: 'video',
    id: 'vrOCv5SOTrU',
    title: text('Jaadugari (AMAN)'),
    subtitle: text('YRF • 1.4M views'),
    thumbnail: [{ url: 'https://i.ytimg.com/vi/vrOCv5SOTrU/hq720.jpg', width: 720 }],
  });
  assert.equal(video.artistNames, 'YRF');
  assert.equal(video.playCount, 1_400_000);
  assert.equal(video.isVideo, true);
});

test('normalizeSong rejects non-track nodes', () => {
  assert.equal(normalizeSong({ item_type: 'album', id: 'MPREb_x' }), null);
  assert.equal(normalizeSong({ item_type: 'song', id: 'short', title: 'x' }), null);
  assert.equal(normalizeSong(null), null);
});

test('normalizeAlbum reads MusicTwoRowItem albums', () => {
  const album = normalizeAlbum({
    type: 'MusicTwoRowItem',
    item_type: 'album',
    id: 'MPREb_VMAptX4LMgN',
    title: text('Shor Barpa Hai Jahan Mein'),
    subtitle: text('Album • Owais Raza Qadri'),
    year: '2026',
    thumbnail: [{ url: 'https://yt3.googleusercontent.com/a=w226-h226-l90-rj', width: 226 }],
  });
  assert.equal(album.type, 'album');
  assert.equal(album.artists[0].name, 'Owais Raza Qadri');
  assert.equal(album.year, 2026);
  assert.equal(album.image, 'https://yt3.googleusercontent.com/a=w544-h544-l90-rj');
  assert.equal(normalizeAlbum({ id: 'notanalbum', title: 'x' }), null);
});

test('normalizeAlbumPage attaches album artists and art to songs', () => {
  const album = normalizeAlbumPage(
    {
      header: {
        title: text('Kesariya'),
        subtitle: text('Single • 2022'),
        second_subtitle: text('1 song • 4 minutes'),
        strapline_text_one: text('Arijit Singh'),
        thumbnail: { contents: [{ url: 'https://yt3.googleusercontent.com/k=w544-h544-l90-rj', width: 544 }] },
      },
      contents: [{ item_type: 'song', id: 'BddP6PYo2gs', title: 'Kesariya', duration: { seconds: 269 } }],
    },
    'MPREb_o3adW3fGQYh',
  );
  assert.equal(album.kind, 'single');
  assert.equal(album.year, 2022);
  assert.equal(album.songs.length, 1);
  assert.equal(album.songs[0].artistNames, 'Arijit Singh');
  assert.equal(album.songs[0].album.id, 'MPREb_o3adW3fGQYh');
  assert.equal(album.songs[0].image, album.image);
});

test('normalizePlaylist strips the VL prefix and keeps the author', () => {
  const pl = normalizePlaylist({
    type: 'MusicTwoRowItem',
    item_type: 'playlist',
    id: 'VLRDCLAK5uy_lSaqe',
    title: text('Spotlight: Arijit Singh'),
    subtitle: text('Playlist • YouTube Music'),
    thumbnail: [{ url: 'https://yt3.googleusercontent.com/p=w544-h544-l90-rj', width: 544 }],
  });
  assert.equal(pl.id, 'RDCLAK5uy_lSaqe');
  assert.equal(pl.subtitle, 'YouTube Music');
  assert.equal(pl.url, 'https://music.youtube.com/playlist?list=RDCLAK5uy_lSaqe');
});

test('normalizeArtistCard reads search and carousel artists', () => {
  const a = normalizeArtistCard({ item_type: 'artist', id: 'UCDxKh1gFWeYsqePvgVzmPoQ', name: 'Arijit Singh', subtitle: text('Artist • 674M monthly audience') });
  assert.equal(a.type, 'artist');
  assert.equal(a.title, 'Arijit Singh');
  assert.equal(a.subtitle, '674M monthly audience');
  assert.equal(normalizeArtistCard({ id: 'MPREb', name: 'x' }), null);
});

test('normalizeAny infers the entity type from ids when item_type is missing', () => {
  assert.equal(normalizeAny({ id: 'MPREb_x1', title: text('A') }).type, 'album');
  assert.equal(normalizeAny({ id: 'UCabc', title: text('A') }).type, 'artist');
  assert.equal(normalizeAny({ id: 'VLPLabc', title: text('A') }).type, 'playlist');
  assert.equal(normalizeAny({ id: 'NJAv_7lHUIU', title: text('A') }).type, 'song');
  assert.equal(normalizeAny({ item_type: 'podcast_show', id: 'MPSPabc', title: 'x' }), null);
});

test('normalizeSection builds a home section with a stable id and kind', () => {
  const section = normalizeSection(
    {
      header: { title: text('Quick picks') },
      contents: [
        { item_type: 'song', id: 'NJAv_7lHUIU', title: 'A', duration: { seconds: 1 } },
        { item_type: 'song', id: 'YALvuUpY_b0', title: 'B', duration: { seconds: 1 } },
      ],
    },
    'feed-',
  );
  assert.equal(section.id, 'feed-quick-picks');
  assert.equal(section.kind, 'song');
  assert.equal(section.items.length, 2);
  assert.equal(normalizeSection({ header: { title: text('Empty') }, contents: [] }), null);
});
