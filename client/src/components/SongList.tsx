import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { Song } from '../types';
import { usePlayer, type PlayContext } from '../store/player';
import { useLibrary } from '../store/library';
import { formatTime } from '../utils/format';
import { Img } from './Img';
import { ActionSheet } from './ActionSheet';
import { ChevronRight, Heart, Library, More, Play, Plus, Queue as QueueIcon } from './Icons';
import { toast } from '../store/toast';

interface Props {
  songs: Song[];
  context: PlayContext;
  showAlbum?: boolean;
  showArt?: boolean;
  showHeader?: boolean;
  numbered?: boolean;
}

export function Equalizer({ paused = false }: { paused?: boolean }) {
  return (
    <span className={`eq ${paused ? 'paused' : ''}`} aria-hidden>
      <i />
      <i />
      <i />
      <i />
    </span>
  );
}

export function SongList({ songs, context, showAlbum = true, showArt = true, showHeader = true, numbered = true }: Props) {
  const navigate = useNavigate();
  const play = usePlayer((s) => s.play);
  const toggle = usePlayer((s) => s.toggle);
  const playing = usePlayer((s) => s.playing);
  const currentId = usePlayer((s) => s.queue[s.index]?.id);
  const enqueue = usePlayer((s) => s.enqueue);
  const playNext = usePlayer((s) => s.playNext);
  const liked = useLibrary((s) => s.liked);
  const toggleLike = useLibrary((s) => s.toggleLike);
  const [menuFor, setMenuFor] = useState<Song | null>(null);

  const onRow = (song: Song, i: number) => {
    if (!song.streams) {
      toast('This track is not available for streaming', 'error');
      return;
    }
    if (song.id === currentId) toggle();
    else play(songs, i, context);
  };

  const like = (song: Song) => {
    const was = Boolean(liked[song.id]);
    toggleLike(song);
    toast(was ? 'Removed from Liked Songs' : 'Added to Liked Songs');
  };

  return (
    <div className={`song-list ${showAlbum ? '' : 'compact'} ${showArt ? '' : 'no-art'}`}>
      {showHeader && (
        <div className="song-head">
          <span style={{ textAlign: 'center' }}>#</span>
          <span>Title</span>
          {showAlbum && <span className="song-album">Album</span>}
          <span style={{ textAlign: 'right' }}>Time</span>
          <span />
        </div>
      )}
      {songs.map((song, i) => {
        const active = song.id === currentId;
        const isLiked = Boolean(liked[song.id]);
        return (
          <div
            key={`${song.id}-${i}`}
            className={`song-row ${active ? 'active' : ''}`}
            onClick={() => onRow(song, i)}
            onDoubleClick={() => play(songs, i, context)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onRow(song, i);
              }
            }}
          >
            <div className="song-idx">
              {showArt ? <Img src={song.image} alt="" /> : <span className="num">{numbered ? i + 1 : ''}</span>}
              <span className="hover-play">{active && playing ? <Equalizer /> : <Play size={18} />}</span>
            </div>
            <div className="song-main">
              <div className="song-title">
                <span className="truncate">{song.title}</span>
                {song.explicit && <span className="badge-e">E</span>}
                {song.isVideo && <span className="badge-e">VIDEO</span>}
              </div>
              <div className="song-artists truncate">
                {song.artists.length
                  ? song.artists.slice(0, 3).map((a, k) => (
                      <span key={`${a.id}-${k}`}>
                        {k > 0 && ', '}
                        {a.id ? (
                          <Link to={`/artist/${a.id}`} onClick={(e) => e.stopPropagation()}>
                            {a.name}
                          </Link>
                        ) : (
                          a.name
                        )}
                      </span>
                    ))
                  : song.subtitle}
              </div>
            </div>
            {showAlbum && (
              <div className="song-album truncate">
                {song.album.id ? (
                  <Link to={`/album/${song.album.id}`} onClick={(e) => e.stopPropagation()}>
                    {song.album.name}
                  </Link>
                ) : (
                  song.album.name
                )}
              </div>
            )}
            <div className="song-dur">{song.duration ? formatTime(song.duration) : ''}</div>
            <div className={`song-actions ${isLiked ? 'always' : ''}`}>
              <button
                className={`icon-btn sm hide-sm ${isLiked ? 'on' : ''}`}
                aria-label={isLiked ? 'Remove from liked songs' : 'Add to liked songs'}
                aria-pressed={isLiked}
                onClick={(e) => {
                  e.stopPropagation();
                  like(song);
                }}
              >
                <Heart size={17} filled={isLiked} />
              </button>
              <button
                className="icon-btn sm hide-sm"
                aria-label="Play next"
                title="Play next"
                onClick={(e) => {
                  e.stopPropagation();
                  playNext(song);
                  toast('Playing next');
                }}
              >
                <Plus size={17} />
              </button>
              <button
                className="icon-btn sm hide-sm"
                aria-label="Add to queue"
                title="Add to queue"
                onClick={(e) => {
                  e.stopPropagation();
                  enqueue(song);
                  toast('Added to queue');
                }}
              >
                <QueueIcon size={17} />
              </button>
              <button
                className="icon-btn sm show-sm"
                aria-label="More"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuFor(song);
                }}
              >
                <More size={18} />
              </button>
            </div>
            {active && <span className="sr-only">{playing ? 'Now playing' : 'Paused'}</span>}
          </div>
        );
      })}

      <ActionSheet
        open={Boolean(menuFor)}
        onClose={() => setMenuFor(null)}
        title={menuFor?.title}
        subtitle={menuFor?.artistNames || menuFor?.subtitle}
        image={menuFor?.image}
        actions={
          menuFor
            ? [
                { label: 'Play now', icon: <Play size={18} />, onSelect: () => play(songs, songs.indexOf(menuFor), context) },
                { label: 'Play next', icon: <Plus size={18} />, onSelect: () => (playNext(menuFor), toast('Playing next')) },
                { label: 'Add to queue', icon: <QueueIcon size={18} />, onSelect: () => (enqueue(menuFor), toast('Added to queue')) },
                {
                  label: liked[menuFor.id] ? 'Remove from Liked Songs' : 'Add to Liked Songs',
                  icon: <Heart size={18} filled={Boolean(liked[menuFor.id])} />,
                  onSelect: () => like(menuFor),
                },
                ...(menuFor.artists[0]?.id ? [{ label: `Go to ${menuFor.artists[0].name}`, icon: <ChevronRight size={18} />, onSelect: () => navigate(`/artist/${menuFor.artists[0].id}`) }] : []),
                ...(menuFor.album.id ? [{ label: 'Go to album', icon: <Library size={18} />, onSelect: () => navigate(`/album/${menuFor.album.id}`) }] : []),
              ]
            : []
        }
      />
    </div>
  );
}
