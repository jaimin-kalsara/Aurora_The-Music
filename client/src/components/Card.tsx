import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Entity } from '../types';
import { Img } from './Img';
import { Play, Pause } from './Icons';
import { usePlayEntity } from '../hooks/usePlayEntity';
import { usePlayer } from '../store/player';

interface Props {
  item: Entity;
  size?: 'md' | 'sm';
}

export function entityPath(item: Entity): string | null {
  switch (item.type) {
    case 'album':
      return `/album/${item.id}`;
    case 'playlist':
      return `/playlist/${item.id}`;
    case 'artist':
      return `/artist/${item.id}`;
    default:
      return item.album?.id ? `/album/${item.album.id}` : null;
  }
}

function subtitleOf(item: Entity): string {
  if (item.type === 'song') return item.artistNames || item.subtitle;
  if (item.type === 'artist') return item.subtitle && item.subtitle !== 'Artist' ? item.subtitle : 'Artist';
  if (item.type === 'album') return [item.kind === 'single' ? 'Single' : null, item.year || null, item.subtitle].filter(Boolean).join(' · ');
  if (item.type === 'playlist') return item.songCount ? `${item.songCount} songs` : item.subtitle;
  return '';
}

/** Artwork card. Songs play on tap; albums, playlists and artists open their page. */
export const Card = memo(function Card({ item, size = 'md' }: Props) {
  const navigate = useNavigate();
  const { playEntity, busyId } = usePlayEntity();
  const isCurrent = usePlayer((s) =>
    item.type === 'song' ? s.queue[s.index]?.id === item.id : Boolean(s.context && s.context.type === item.type && s.context.id === item.id),
  );
  const playing = usePlayer((s) => s.playing);
  const toggle = usePlayer((s) => s.toggle);

  const path = item.type === 'song' ? null : entityPath(item);

  const onOpen = () => {
    if (item.type === 'song') {
      if (isCurrent) toggle();
      else void playEntity(item);
    } else if (path) navigate(path);
  };
  const onPlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isCurrent) toggle();
    else void playEntity(item);
  };

  return (
    <div
      className={`card ${item.type === 'artist' ? 'card--round' : ''} ${size === 'sm' ? 'sm' : ''} ${isCurrent ? 'current' : ''}`}
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onOpen();
      }}
    >
      <div className="card-art">
        <Img src={item.image} alt={item.title} />
        <button
          className={`card-play ${isCurrent && playing ? 'visible' : ''}`}
          onClick={onPlay}
          aria-label={isCurrent && playing ? `Pause ${item.title}` : `Play ${item.title}`}
          disabled={busyId === item.id}
        >
          {busyId === item.id ? <span className="spinner light" aria-hidden /> : isCurrent && playing ? <Pause size={20} /> : <Play size={20} />}
        </button>
      </div>
      <div className="card-body">
        <div className="card-title truncate" title={item.title}>
          {item.title}
        </div>
        <div className="card-sub truncate">{subtitleOf(item)}</div>
      </div>
    </div>
  );
});
