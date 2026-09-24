import { useEffect, useRef } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import { Sidebar, TabBar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { PlayerBar } from './components/PlayerBar';
import { NowPlaying } from './components/NowPlaying';
import { QueuePanel } from './components/QueuePanel';
import { AudioEngine } from './components/AudioEngine';
import { Toasts } from './components/Toasts';
import { Home } from './pages/Home';
import { Explore } from './pages/Explore';
import { MoodsPage } from './pages/MoodsPage';
import { MoodPage } from './pages/MoodPage';
import { SearchPage } from './pages/SearchPage';
import { LibraryPage } from './pages/LibraryPage';
import { AlbumPage } from './pages/AlbumPage';
import { PlaylistPage } from './pages/PlaylistPage';
import { ArtistPage } from './pages/ArtistPage';
import { SettingsPage } from './pages/SettingsPage';
import { MixPage } from './pages/MixPage';
import { usePlayer } from './store/player';

const pageMotion = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0 },
  transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
};

function NotFound() {
  return (
    <div className="page">
      <div className="empty">
        <h3>That page doesn’t exist</h3>
        <p>Use the search bar or head back home.</p>
      </div>
    </div>
  );
}

export default function App() {
  const location = useLocation();
  const contentRef = useRef<HTMLDivElement>(null);
  const hasSong = usePlayer((s) => s.index >= 0 && s.queue.length > 0);

  // Scroll the content pane to the top on navigation (but keep position for search tab changes).
  useEffect(() => {
    if (location.hash) return;
    contentRef.current?.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [location.pathname]);

  const routeKey = location.pathname + (location.pathname === '/search' ? location.search.replace(/&tab=[a-z]+/, '') : '');

  return (
    <MotionConfig reducedMotion="user">
      <div className={`app ${hasSong ? 'has-song' : ''}`}>
        <Sidebar />
        <main className="main">
          <TopBar />
          <div className="content" ref={contentRef}>
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.div key={routeKey} {...pageMotion} className="route">
                <Routes location={location}>
                  <Route path="/" element={<Home />} />
                  <Route path="/explore" element={<Explore />} />
                  <Route path="/moods" element={<MoodsPage />} />
                  <Route path="/moods/:key" element={<MoodPage />} />
                  <Route path="/search" element={<SearchPage />} />
                  <Route path="/library" element={<LibraryPage />} />
                  <Route path="/album/:id" element={<AlbumPage />} />
                  <Route path="/playlist/:id" element={<PlaylistPage />} />
                  <Route path="/artist/:id" element={<ArtistPage />} />
                  <Route path="/mix/:key" element={<MixPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
        <PlayerBar />
        <TabBar />
        <QueuePanel />
        <NowPlaying />
        <Toasts />
        <AudioEngine />
      </div>
    </MotionConfig>
  );
}
