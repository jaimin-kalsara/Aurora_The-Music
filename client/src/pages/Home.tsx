import { Link, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { api } from '../api';
import { useQuery } from '../hooks/useQuery';
import { Shelf } from '../components/Shelf';
import { ShelfSkeleton } from '../components/Skeleton';
import { Img } from '../components/Img';
import { useLibrary } from '../store/library';
import { usePlayer } from '../store/player';
import { useRecommendations } from '../store/recommendations';
import type { DailyMix, Mood, Song } from '../types';
import { Pause, Play } from '../components/Icons';

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return 'Late night listening';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  if (h < 21) return 'Good evening';
  return 'Good night';
}

const rise = (i = 0) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.45, delay: Math.min(i * 0.05, 0.35), ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
});

function MoodStrip({ moods }: { moods: Mood[] }) {
  return (
    <div className="chips chips-scroll">
      {moods.map((m) => (
        <Link key={m.key} to={`/moods/${m.key}`} className="chip">
          <span aria-hidden>{m.emoji}</span>
          {m.title}
        </Link>
      ))}
    </div>
  );
}

/** Mosaic tile that plays a personalized mix. */
function MixTile({ mix, onOpen }: { mix: DailyMix; onOpen: () => void }) {
  const play = usePlayer((s) => s.play);
  const toggle = usePlayer((s) => s.toggle);
  const isCurrent = usePlayer((s) => s.context?.type === 'radio' && s.context.id === `mix:${mix.key}`);
  const playing = usePlayer((s) => s.playing);
  const art = mix.tracks.slice(0, 4);
  return (
    <div className="mix-tile" role="button" tabIndex={0} onClick={onOpen} onKeyDown={(e) => e.key === 'Enter' && onOpen()}>
      <div className={`mix-art n${art.length}`}>
        {art.map((t) => (
          <Img key={t.id} src={t.image} alt="" />
        ))}
      </div>
      <div className="mix-meta">
        <div className="mix-title truncate">{mix.title}</div>
        <div className="mix-sub truncate">{mix.tracks.slice(0, 3).map((t) => t.artists[0]?.name || t.subtitle).join(', ')}</div>
      </div>
      <button
        className="mix-play"
        aria-label={isCurrent && playing ? `Pause ${mix.title}` : `Play ${mix.title}`}
        onClick={(e) => {
          e.stopPropagation();
          if (isCurrent) toggle();
          else play(mix.tracks, 0, { type: 'radio', id: `mix:${mix.key}`, title: mix.title });
        }}
      >
        {isCurrent && playing ? <Pause size={18} /> : <Play size={18} />}
      </button>
    </div>
  );
}

/** Compact "quick picks" grid of recently played songs (Apple-style). */
function QuickPicks({ songs }: { songs: Song[] }) {
  const play = usePlayer((s) => s.play);
  const currentId = usePlayer((s) => s.queue[s.index]?.id);
  return (
    <div className="quick-grid">
      {songs.slice(0, 8).map((song, i) => (
        <button
          key={song.id}
          className={`quick-item ${currentId === song.id ? 'active' : ''}`}
          onClick={() => play(songs, i, { type: 'library', title: 'Recently played' })}
        >
          <Img src={song.image} alt="" />
          <span className="truncate">{song.title}</span>
        </button>
      ))}
    </div>
  );
}

export function Home() {
  const navigate = useNavigate();
  const languages = useLibrary((s) => s.settings.languages);
  const home = useQuery(`home:${languages}`, (signal) => api.home(signal));
  const moods = useQuery('moods', () => api.moods());
  const recent = useLibrary((s) => s.recent);

  const forYou = useRecommendations((s) => s.forYou);
  const discoverWeekly = useRecommendations((s) => s.discoverWeekly);
  const dailyMixes = useRecommendations((s) => s.dailyMixes);
  const loading = useRecommendations((s) => s.loading);
  const fetchAll = useRecommendations((s) => s.fetchAll);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll, languages]);

  return (
    <div className="page">
      <motion.div className="page-title" {...rise()}>
        <h1>{greeting()}</h1>
        <p className="lead">Fresh releases, charts, and mixes tuned to how you feel.</p>
        {moods.data && <MoodStrip moods={moods.data.moods} />}
      </motion.div>

      {recent.length >= 4 && (
        <motion.section className="shelf" {...rise(1)}>
          <div className="shelf-head">
            <h2>Jump back in</h2>
          </div>
          <QuickPicks songs={recent} />
        </motion.section>
      )}

      {(dailyMixes.length > 0 || loading.dailyMixes) && (
        <motion.section className="shelf" {...rise(2)}>
          <div className="shelf-head">
            <div>
              <h2>Made for you</h2>
              <div className="sub">Daily mixes that learn from what you play</div>
            </div>
          </div>
          {dailyMixes.length ? (
            <div className="mix-grid">
              {dailyMixes.slice(0, 6).map((mix) => (
                <MixTile key={mix.key} mix={mix} onOpen={() => navigate(`/mix/${encodeURIComponent(mix.key)}`)} />
              ))}
            </div>
          ) : (
            <div className="mix-grid">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="skeleton" style={{ height: 96, borderRadius: 18 }} />
              ))}
            </div>
          )}
        </motion.section>
      )}

      {forYou.length > 0 && (
        <motion.div {...rise(3)}>
          <Shelf title="For you" subtitle="Based on your listening" items={forYou.slice(0, 20)} seeAllTo="/mix/for-you" />
        </motion.div>
      )}

      {discoverWeekly && discoverWeekly.tracks.length > 0 && (
        <motion.div {...rise(4)}>
          <Shelf title="Discover weekly" subtitle="New artists picked for you, refreshed every week" items={discoverWeekly.tracks.slice(0, 20)} seeAllTo="/mix/discover-weekly" />
        </motion.div>
      )}

      {home.loading && !home.data && (
        <>
          <ShelfSkeleton />
          <ShelfSkeleton />
          <ShelfSkeleton />
        </>
      )}
      {home.error && (
        <div className="error-box">
          <span>Couldn't load the home feed: {home.error}</span>
          <button className="btn btn-ghost btn-sm" onClick={home.refetch}>
            Retry
          </button>
        </div>
      )}
      {home.data?.sections.map((section, i) => (
        <motion.div key={section.id} {...rise(i + 4)}>
          <Shelf
            title={section.title}
            items={section.items}
            size={section.kind === 'artist' ? 'sm' : 'md'}
            seeAllTo={section.id === 'new-releases' ? '/explore#new' : section.id === 'charts' ? '/explore#charts' : undefined}
          />
        </motion.div>
      ))}
    </div>
  );
}
