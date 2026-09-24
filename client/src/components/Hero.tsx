import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Img } from './Img';

interface Props {
  kind: string;
  title: string;
  image: string;
  banner?: string;
  subtitle?: ReactNode;
  description?: string;
  stats?: ReactNode;
  round?: boolean;
  actions?: ReactNode;
}

/** Page header for albums, playlists and artists with a softly blurred, desaturated artwork backdrop. */
export function Hero({ kind, title, image, banner, subtitle, description, stats, round = false, actions }: Props) {
  return (
    <>
      <div className={`hero-bg ${banner ? 'banner' : ''}`} aria-hidden>
        {(banner || image) && <img src={banner || image} alt="" />}
      </div>
      <motion.header
        className="hero"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className={`hero-art ${round ? 'round' : ''}`}>
          <Img src={image} alt={title} loading="eager" />
        </div>
        <div className="hero-meta">
          <div className="hero-kind">{kind}</div>
          <h1 title={title}>{title}</h1>
          {subtitle && <div className="hero-sub">{subtitle}</div>}
          {description && <p className="hero-desc">{description}</p>}
          {stats && <div className="hero-stats">{stats}</div>}
          {actions && <div className="hero-actions">{actions}</div>}
        </div>
      </motion.header>
    </>
  );
}
