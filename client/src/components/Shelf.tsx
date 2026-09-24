import { useRef, useState, useEffect, useCallback, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { Entity } from '../types';
import { Card } from './Card';
import { ChevronLeft, ChevronRight } from './Icons';

interface Props {
  title: string;
  subtitle?: string;
  items?: Entity[];
  seeAllTo?: string;
  size?: 'md' | 'sm';
  children?: ReactNode;
}

/** Horizontal, snap-scrolling row of cards with arrow controls (arrows hidden on touch). */
export function Shelf({ title, subtitle, items, seeAllTo, size = 'md', children }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(true);
  const frame = useRef(0);

  const update = useCallback(() => {
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const el = ref.current;
      if (!el) return;
      setCanLeft(el.scrollLeft > 4);
      setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
    });
  }, []);

  useEffect(() => {
    update();
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      ro.disconnect();
      cancelAnimationFrame(frame.current);
    };
  }, [items?.length, update]);

  const scrollBy = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.max(240, el.clientWidth * 0.8), behavior: 'smooth' });
  };

  if (!children && (!items || items.length === 0)) return null;

  return (
    <section className="shelf">
      <div className="shelf-head">
        <div style={{ minWidth: 0 }}>
          <h2 className="truncate">{seeAllTo ? <Link to={seeAllTo}>{title}</Link> : title}</h2>
          {subtitle && <div className="sub">{subtitle}</div>}
        </div>
        <div className="shelf-controls">
          {seeAllTo && (
            <Link to={seeAllTo} className="chip">
              See all
            </Link>
          )}
          <button className="icon-btn glass-btn hide-touch" onClick={() => scrollBy(-1)} disabled={!canLeft} aria-label="Scroll left">
            <ChevronLeft />
          </button>
          <button className="icon-btn glass-btn hide-touch" onClick={() => scrollBy(1)} disabled={!canRight} aria-label="Scroll right">
            <ChevronRight />
          </button>
        </div>
      </div>
      <div className="scroller" ref={ref} onScroll={update}>
        {children ?? items!.map((item) => <Card key={`${item.type}-${item.id}`} item={item} size={size} />)}
      </div>
    </section>
  );
}
