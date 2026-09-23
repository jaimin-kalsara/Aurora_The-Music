import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
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
  if (item.type === 'artist') return 'Artist';
  if (item.type === 'album') return [item.year || null, item.subtitle].filter(Boolean).join(' · ');
  if (item.type === 'playlist') return item.songCount ? `${item.songCount} songs` : item.subtitle;
  return '';
}

export function Card({ item, size = 'md' }: Props) {
  const navigate = useNavigate();
  const { playEntity, busyId } = usePlayEntity();
  const context = usePlayer((s) => s.context);
  const playing = usePlayer((s) => s.playing);
  const currentId = usePlayer((s) => s.queue[s.index]?.id);
  const toggle = usePlayer((s) => s.toggle);

  const isCurrent =
    item.type === 'song' ? currentId === item.id : Boolean(context && context.type === item.type && context.id === item.id);
  const path = entityPath(item);

  const onOpen = () => {
    if (path) navigate(path);
    else void playEntity(item);
  };
  const onPlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isCurrent) toggle();
    else void playEntity(item);
  };

  return (
    <motion.div
      className={`card ${item.type === 'artist' ? 'card--round' : ''} ${size === 'sm' ? 'sm' : ''}`}
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onOpen();
      }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
    >
      <div className="card-art">
        <Img src={item.image} alt={item.title} />
        <button
          className={`card-play ${isCurrent && playing ? 'visible' : ''}`}
          onClick={onPlay}
          aria-label={isCurrent && playing ? `Pause ${item.title}` : `Play ${item.title}`}
          disabled={busyId === item.id}
        >
          {isCurrent && playing ? <Pause size={20} /> : <Play size={20} />}
        </button>
      </div>
      <div className="card-body">
        <div className="card-title truncate" title={item.title}>
          {item.title}
        </div>
        <div className="card-sub truncate">{subtitleOf(item)}</div>
      </div>
    </motion.div>
  );
}
