import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { api } from '../api';
import { useQuery } from '../hooks/useQuery';
import { Shelf } from '../components/Shelf';
import { ShelfSkeleton } from '../components/Skeleton';
import { useLibrary } from '../store/library';
import { usePlayer } from '../store/player';
import { useRecommendations } from '../store/recommendations';
import type { Mood } from '../types';
import { Play } from '../components/Icons';

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return 'Late night listening';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  if (h < 21) return 'Good evening';
  return 'Good night';
}

function MoodStrip({ moods }: { moods: Mood[] }) {
  return (
    <div className="chips" style={{ paddingTop: 10 }}>
      {moods.slice(0, 8).map((m) => (
        <Link key={m.key} to={`/moods/${m.key}`} className="chip" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span aria-hidden>{m.emoji}</span>
          {m.title}
        </Link>
      ))}
      <Link to="/moods" className="chip">
        All moods →
      </Link>
    </div>
  );
}

export function Home() {
  const languages = useLibrary((s) => s.settings.languages);
  const home = useQuery(`home:${languages}`, (signal) => api.home(signal));
  const moods = useQuery('moods', () => api.moods());
  const recent = useLibrary((s) => s.recent);
  const play = usePlayer((s) => s.play);
  
  // Recommendations
  const forYou = useRecommendations((s) => s.forYou);
  const discoverWeekly = useRecommendations((s) => s.discoverWeekly);
  const dailyMixes = useRecommendations((s) => s.dailyMixes);
  const fetchForYou = useRecommendations((s) => s.fetchForYou);
  const fetchDiscoverWeekly = useRecommendations((s) => s.fetchDiscoverWeekly);
  const fetchDailyMixes = useRecommendations((s) => s.fetchDailyMixes);
  const loading = useRecommendations((s) => s.loading);
  const sessionId = useRecommendations((s) => s.sessionId);
  
  const [hasFetched, setHasFetched] = useState(false);
  
  // Fetch recommendations on mount
  useEffect(() => {
    if (!hasFetched && sessionId) {
      setHasFetched(true);
      fetchForYou();
      fetchDiscoverWeekly();
      fetchDailyMixes();
    }
  }, [hasFetched, sessionId, fetchForYou, fetchDiscoverWeekly, fetchDailyMixes]);

  return (
    <div className="page">
      <motion.div className="page-title" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}>
        <h1>{greeting()}</h1>
        <p className="muted" style={{ fontSize: 17 }}>
          Fresh releases, charts, and mixes tuned to how you feel.
        </p>
        {moods.data && <MoodStrip moods={moods.data.moods} />}
      </motion.div>

      {/* Personalized Recommendations - For You */}
      {(forYou.length > 0 || loading.forYou) && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}>
          <Shelf
            title="For You"
            subtitle={forYou.length ? 'Based on your listening history' : 'Getting to know your taste...'}
            items={forYou.slice(0, 10)}
            seeAllTo="/recommendations/for-you"
          />
        </motion.div>
      )}

      {/* Discover Weekly */}
      {(() => {
        const dw = discoverWeekly;
        if (!dw?.tracks?.length && !loading.discoverWeekly) return null;
        return (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}>
            <Shelf
              title="Discover Weekly"
              subtitle={dw?.updatedAt 
                ? `Updated ${new Date(dw.updatedAt).toLocaleDateString()} · Your personalized new music mix`
                : 'Fresh discoveries every Monday'}
              items={dw?.tracks?.slice(0, 10) || []}
              seeAllTo="/recommendations/discover-weekly"
            />
          </motion.div>
        );
      })()}

      {/* Daily Mixes */}
      {(dailyMixes.length > 0 || loading.dailyMixes) && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}>
          <section className="shelf">
            <div className="shelf-head">
              <div>
                <h2>Daily Mixes</h2>
                <div className="sub">Personalized mixes based on your moods and genres</div>
              </div>
            </div>
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
              {dailyMixes.slice(0, 4).map((mix, i) => (
                <motion.div key={mix.key} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: i * 0.05 }}>
                  <Link to={`/mix/${mix.key}`} className="daily-mix-card" style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}>
                    <div className="daily-mix-art">
                      {mix.tracks[0] ? (
                        <img src={mix.tracks[0].image} alt="" loading="lazy" />
                      ) : (
                        <div className="skeleton" style={{ width: '100%', height: '100%', borderRadius: 'var(--r-md)' }} />
                      )}
                    </div>
                    <div className="daily-mix-meta">
                      <div className="daily-mix-title">{mix.title}</div>
                      <div className="daily-mix-sub">{mix.tracks.length} songs</div>
                    </div>
                    <div className="daily-mix-play">
                      <Play size={20} />
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </section>
        </motion.div>
      )}

      {recent.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}>
          <Shelf title="Continue listening" subtitle="Pick up where you left off">
            {recent.slice(0, 12).map((song, i) => (
              <div key={song.id} className="card sm" role="button" tabIndex={0} onClick={() => play(recent, i, { type: 'library', title: 'Recently played' })}>
                <div className="card-art">
                  <img src={song.image} alt="" className="loaded" loading="lazy" />
                  <button className="card-play" aria-label={`Play ${song.title}`} onClick={(e) => { e.stopPropagation(); play(recent, i, { type: 'library', title: 'Recently played' }); }}>
                    <Play size={20} />
                  </button>
                </div>
                <div className="card-body">
                  <div className="card-title truncate">{song.title}</div>
                  <div className="card-sub truncate">{song.artistNames || song.subtitle}</div>
                </div>
              </div>
            ))}
          </Shelf>
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
        <motion.div key={section.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: Math.min(i * 0.05 + 0.4, 0.6), ease: [0.22, 1, 0.36, 1] }}>
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
