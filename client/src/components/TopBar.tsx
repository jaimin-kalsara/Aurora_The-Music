import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { api } from '../api';
import type { Entity, Suggestions } from '../types';
import { Img } from './Img';
import { ChevronLeft, ChevronRight, Close, Search as SearchIcon } from './Icons';
import { entityPath } from './Card';
import { usePlayEntity } from '../hooks/usePlayEntity';
import { useLibrary } from '../store/library';

type Row = { item: Entity; group: string };

function flatten(s: Suggestions): Row[] {
  const rows: Row[] = [];
  if (s.top) rows.push({ item: s.top, group: 'Top result' });
  s.songs.forEach((i) => rows.push({ item: i, group: 'Songs' }));
  s.artists.forEach((i) => rows.push({ item: i, group: 'Artists' }));
  s.albums.forEach((i) => rows.push({ item: i, group: 'Albums' }));
  s.playlists.forEach((i) => rows.push({ item: i, group: 'Playlists' }));
  const seen = new Set<string>();
  return rows.filter((r) => {
    const k = `${r.item.type}:${r.item.id}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export function TopBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const [value, setValue] = useState(params.get('q') ?? '');
  const [rows, setRows] = useState<Row[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const { playEntity } = usePlayEntity();
  const addRecentSearch = useLibrary((s) => s.addRecentSearch);

  useEffect(() => {
    if (location.pathname !== '/search') return;
    setValue(params.get('q') ?? '');
  }, [location.pathname, params]);

  useEffect(() => {
    const q = value.trim();
    if (q.length < 2) {
      setRows([]);
      return;
    }
    const controller = new AbortController();
    const t = setTimeout(() => {
      api
        .suggest(q, controller.signal)
        .then((s) => {
          setRows(flatten(s));
          setActive(-1);
        })
        .catch(() => undefined);
    }, 180);
    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [value]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const submit = (q = value) => {
    const query = q.trim();
    if (!query) return;
    addRecentSearch(query);
    setOpen(false);
    navigate(`/search?q=${encodeURIComponent(query)}`);
  };

  const choose = (row: Row) => {
    setOpen(false);
    addRecentSearch(row.item.title);
    const path = entityPath(row.item);
    if (row.item.type === 'song') {
      void playEntity(row.item);
      return;
    }
    if (path) navigate(path);
  };

  let lastGroup = '';

  return (
    <header className="topbar">
      <div className="topbar-nav">
        <button className="icon-btn" onClick={() => navigate(-1)} aria-label="Back">
          <ChevronLeft />
        </button>
        <button className="icon-btn" onClick={() => navigate(1)} aria-label="Forward">
          <ChevronRight />
        </button>
      </div>
      <div className="search" ref={wrapRef}>
        <form
          className="search-box"
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            if (active >= 0 && rows[active]) choose(rows[active]);
            else submit();
          }}
        >
          <SearchIcon size={18} />
          <input
            ref={inputRef}
            value={value}
            placeholder="Search songs, artists, albums, playlists"
            aria-label="Search"
            autoComplete="off"
            onChange={(e) => {
              setValue(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActive((a) => Math.min(rows.length - 1, a + 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActive((a) => Math.max(-1, a - 1));
              } else if (e.key === 'Enter') {
                e.preventDefault();
                if (active >= 0 && rows[active]) choose(rows[active]);
                else submit();
              } else if (e.key === 'Escape') {
                setOpen(false);
                inputRef.current?.blur();
              }
            }}
          />
          {value && (
            <button
              type="button"
              className="icon-btn sm"
              aria-label="Clear search"
              onClick={() => {
                setValue('');
                setRows([]);
                inputRef.current?.focus();
              }}
            >
              <Close size={16} />
            </button>
          )}
          <span className="dim" style={{ fontSize: 11, border: '1px solid var(--border-strong)', padding: '1px 6px', borderRadius: 5 }}>
            ⌘K
          </span>
        </form>
        <AnimatePresence>
          {open && rows.length > 0 && value.trim().length >= 2 && (
            <motion.div
              className="suggest"
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              role="listbox"
            >
              {rows.slice(0, 10).map((row, i) => {
                const header = row.group !== lastGroup ? row.group : null;
                lastGroup = row.group;
                const kind = row.item.type === 'song' ? (row.item.artistNames || row.item.subtitle) : row.item.type === 'artist' ? 'Artist' : row.item.type === 'album' ? `Album · ${row.item.subtitle}` : 'Playlist';
                return (
                  <div key={`${row.item.type}-${row.item.id}`}>
                    {header && <div className="suggest-group">{header}</div>}
                    <button
                      type="button"
                      className={`suggest-item ${i === active ? 'active' : ''}`}
                      onMouseEnter={() => setActive(i)}
                      onClick={() => choose(row)}
                      role="option"
                      aria-selected={i === active}
                    >
                      <Img src={row.item.image} alt="" className={row.item.type === 'artist' ? 'round' : ''} />
                      <div style={{ minWidth: 0 }}>
                        <div className="truncate" style={{ fontWeight: 500 }}>
                          {row.item.title}
                        </div>
                        <div className="kind truncate">{kind}</div>
                      </div>
                      <span className="dim" style={{ fontSize: 12, textTransform: 'capitalize' }}>
                        {row.item.type}
                      </span>
                    </button>
                  </div>
                );
              })}
              <button type="button" className="suggest-item" onClick={() => submit()} style={{ gridTemplateColumns: '40px 1fr' }}>
                <span style={{ display: 'grid', placeItems: 'center', color: 'var(--text-3)' }}>
                  <SearchIcon size={18} />
                </span>
                <span className="truncate">
                  See all results for “{value.trim()}”
                </span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div style={{ width: 84 }} className="topbar-nav" />
    </header>
  );
}
