import test from 'node:test';
import assert from 'node:assert/strict';
import { parseLrc, cleanTitle } from '../src/lyrics.js';

test('parseLrc parses timestamps, sorts, and merges duplicates', () => {
  const lines = parseLrc('[00:12.50] First line\n[00:05.00] Intro\n[00:12.50] First line (romanized)\n[01:02.123]Later\nno timestamp');
  assert.deepEqual(
    lines.map((l) => [l.time, l.text]),
    [
      [5, 'Intro'],
      [12.5, 'First line / First line (romanized)'],
      [62.123, 'Later'],
    ],
  );
});

test('parseLrc supports multiple stamps per line and empty text', () => {
  const lines = parseLrc('[00:01.00][00:10.00] Chorus\n[00:20.00]');
  assert.equal(lines.length, 3);
  assert.equal(lines[1].text, 'Chorus');
  assert.equal(lines[2].text, '');
  assert.deepEqual(parseLrc(''), []);
  assert.deepEqual(parseLrc(null), []);
});

test('cleanTitle strips YouTube decorations', () => {
  assert.equal(cleanTitle('Kesariya (From "Brahmastra")'), 'Kesariya');
  assert.equal(cleanTitle('Apna Bana Le (Official Video) | Bhediya | Arijit Singh'), 'Apna Bana Le');
  assert.equal(cleanTitle('Tum Hi Ho [Full Audio]'), 'Tum Hi Ho');
  assert.equal(cleanTitle('Gehra Hua'), 'Gehra Hua');
});
