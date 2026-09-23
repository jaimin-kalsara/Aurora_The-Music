import { Link } from 'react-router-dom';
import type { Song } from '../types';
import { usePlayer, type PlayContext } from '../store/player';
import { useLibrary } from '../store/library';
import { formatTime } from '../utils/format';
import { Img } from './Img';
import { Heart, Pause, Play, Plus, Queue as QueueIcon } from './Icons';
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
  const play = usePlayer((s) => s.play);
  const toggle = usePlayer((s) => s.toggle);
  const playing = usePlayer((s) => s.playing);
  const currentId = usePlayer((s) => s.queue[s.index]?.id);
  const enqueue = usePlayer((s) => s.enqueue);
  const playNext = usePlayer((s) => s.playNext);
  const liked = useLibrary((s) => s.liked);
  const toggleLike = useLibrary((s) => s.toggleLike);

  const onRow = (song: Song, i: number) => {
    if (!song.streams) {
      toast('This track is not available for streaming', 'error');
      return;
    }
    if (song.id === currentId) toggle();
    else play(songs, i, context);
  };

  return (
    <div className={`song-list ${showAlbum ? '' : 'compact'}`}>
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
              <span className="hover-play">
                {active && playing ? <Equalizer /> : active ? <Play size={18} /> : <Play size={18} />}
              </span>
              {!showArt && active && playing && <span className="hover-play" style={{ opacity: 1, background: 'none' }}><Equalizer /></span>}
            </div>
            <div className="song-main">
              <div className="song-title truncate">
                <span className="truncate">{song.title}</span>
                {song.explicit && <span className="badge-e">E</span>}
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
            <div className="song-dur">
              {song.streams?.highBitrate === 320 && <span className="dim" style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.04em' }}>HQ</span>}
              {formatTime(song.duration)}
            </div>
            <div className={`song-actions ${isLiked ? 'always' : ''}`}>
              <button
                className={`icon-btn sm ${isLiked ? 'on' : ''}`}
                aria-label={isLiked ? 'Remove from liked songs' : 'Add to liked songs'}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleLike(song);
                  toast(isLiked ? 'Removed from Liked Songs' : 'Added to Liked Songs');
                }}
                style={isLiked ? { color: '#fff' } : undefined}
              >
                <Heart size={17} filled={isLiked} />
              </button>
              <button
                className="icon-btn sm"
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
                className="icon-btn sm"
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
            </div>
            {active && <span className="sr-only">{playing ? 'Now playing' : 'Paused'}</span>}
            {active && !playing && <span style={{ display: 'none' }}><Pause /></span>}
          </div>
        );
      })}
    </div>
  );
}
