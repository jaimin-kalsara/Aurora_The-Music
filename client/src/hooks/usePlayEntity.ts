import { useCallback, useState } from 'react';
import { api } from '../api';
import { usePlayer } from '../store/player';
import type { Entity, Song } from '../types';
import { toast } from '../store/toast';

async function hydrate(song: Song): Promise<Song> {
  if (song.streams) return song;
  const { songs } = await api.songs([song.id]);
  return songs[0] ?? song;
}

/** Resolve any entity into a playable queue and start it. Used by cards, hero buttons and search. */
export function usePlayEntity() {
  const play = usePlayer((s) => s.play);
  const [busyId, setBusyId] = useState<string | null>(null);

  const playEntity = useCallback(
    async (item: Entity, options: { shuffle?: boolean } = {}) => {
      try {
        setBusyId(item.id);
        if (item.type === 'song') {
          const song = await hydrate(item);
          play([song], 0, { type: 'search', title: song.album.name || song.title });
          return;
        }
        let songs: Song[] = [];
        let title = item.title;
        if (item.type === 'album') songs = (await api.album(item.id)).songs;
        else if (item.type === 'playlist') songs = (await api.playlist(item.id)).songs;
        else if (item.type === 'artist') {
          const artist = await api.artist(item.id);
          songs = artist.topSongs;
          title = artist.title;
        }
        songs = songs.filter((s) => s.streams);
        if (!songs.length) {
          toast('Nothing playable in there yet', 'error');
          return;
        }
        if (options.shuffle) {
          const { shuffle, toggleShuffle } = usePlayer.getState();
          if (!shuffle) toggleShuffle();
        }
        play(songs, 0, { type: item.type, id: item.id, title });
      } catch (err) {
        toast(err instanceof Error ? err.message : 'Could not start playback', 'error');
      } finally {
        setBusyId(null);
      }
    },
    [play],
  );

  return { playEntity, busyId };
}
