import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Img } from './Img';

interface Props {
  kind: string;
  title: string;
  image: string;
  subtitle?: ReactNode;
  description?: string;
  stats?: ReactNode;
  round?: boolean;
  actions?: ReactNode;
}

/** Page header for albums, playlists and artists with a blurred artwork backdrop. */
export function Hero({ kind, title, image, subtitle, description, stats, round = false, actions }: Props) {
  return (
    <>
      <div className="hero-bg" aria-hidden>
        {image && <img src={image} alt="" />}
      </div>
      <motion.header
        className="hero"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        style={{ position: 'relative' }}
      >
        <div className={`hero-art ${round ? 'round' : ''}`}>
          <Img src={image} alt={title} loading="eager" />
        </div>
        <div className="hero-meta">
          <div className="hero-kind">{kind}</div>
          <h1 className="truncate" title={title} style={{ whiteSpace: 'normal' }}>
            {title}
          </h1>
          {subtitle && <div className="muted" style={{ fontSize: 16 }}>{subtitle}</div>}
          {description && <p className="hero-desc">{description}</p>}
          {stats && <div className="hero-stats">{stats}</div>}
          {actions && <div className="hero-actions">{actions}</div>}
        </div>
      </motion.header>
    </>
  );
}
