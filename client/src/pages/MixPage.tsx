import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { usePlayer } from '../store/player';
import { useRecommendations } from '../store/recommendations';
import { Hero } from '../components/Hero';
import { SongList } from '../components/SongList';
import { HeroSkeleton, ListSkeleton } from '../components/Skeleton';
import { Pause, Play, Shuffle } from '../components/Icons';
import { formatDurationLong } from '../utils/format';

/** Personalized lists: For you, Discover weekly and each daily mix. */
export function MixPage() {
  const { key = '' } = useParams();
  const forYou = useRecommendations((s) => s.forYou);
  const discover = useRecommendations((s) => s.discoverWeekly);
  const mixes = useRecommendations((s) => s.dailyMixes);
  const loading = useRecommendations((s) => s.loading);
  const fetchAll = useRecommendations((s) => s.fetchAll);
  const play = usePlayer((s) => s.play);
  const toggle = usePlayer((s) => s.toggle);
  const playing = usePlayer((s) => s.playing);
  const shuffleOn = usePlayer((s) => s.shuffle);
  const toggleShuffle = usePlayer((s) => s.toggleShuffle);
  const contextId = `mix:${key}`;
  const isCurrent = usePlayer((s) => s.context?.id === contextId);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  const meta =
    key === 'for-you'
      ? { title: 'For you', description: 'Songs picked from what you play, like and skip.', tracks: forYou }
      : key === 'discover-weekly'
        ? { title: 'Discover weekly', description: 'Artists you have not heard much of yet, refreshed every week.', tracks: discover?.tracks ?? [] }
        : (() => {
            const mix = mixes.find((m) => m.key === key);
            return mix ? { title: mix.title, description: 'A daily mix that keeps learning from your listening.', tracks: mix.tracks } : null;
          })();

  const busy = loading.forYou || loading.discoverWeekly || loading.dailyMixes;
  if (!meta || (!meta.tracks.length && busy)) {
    return (
      <div className="page">
        {busy ? (
          <>
            <HeroSkeleton />
            <ListSkeleton />
          </>
        ) : (
          <div className="empty">
            <h3>This mix isn’t ready yet</h3>
            <p>Play a few songs and it will fill up.</p>
          </div>
        )}
      </div>
    );
  }

  const songs = meta.tracks;
  const total = songs.reduce((a, s) => a + (s.duration || 0), 0);
  const context = { type: 'radio' as const, id: contextId, title: meta.title };
  const start = (shuffle: boolean) => {
    if (shuffle !== shuffleOn) toggleShuffle();
    play(songs, 0, context);
  };

  return (
    <div className="page">
      <Hero
        kind="Made for you"
        title={meta.title}
        image={songs[0]?.image ?? ''}
        description={meta.description}
        stats={[`${songs.length} songs`, formatDurationLong(total) || null].filter(Boolean).join(' · ')}
        actions={
          <>
            <button className="btn btn-primary" onClick={() => (isCurrent ? toggle() : start(false))} disabled={!songs.length}>
              {isCurrent && playing ? <Pause size={18} /> : <Play size={18} />}
              {isCurrent && playing ? 'Pause' : 'Play'}
            </button>
            <button className="btn btn-ghost" onClick={() => start(true)} disabled={!songs.length}>
              <Shuffle size={18} /> Shuffle
            </button>
          </>
        }
      />
      <SongList songs={songs} context={context} />
    </div>
  );
}
