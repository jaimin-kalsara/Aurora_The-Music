import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useDragControls } from 'framer-motion';
import { usePlayer, useCurrentSong } from '../store/player';
import { useLibrary } from '../store/library';
import { formatTime } from '../utils/format';
import { Slider } from './Slider';
import { Img } from './Img';
import { Lyrics } from './Lyrics';
import { qualityLabel } from './AudioEngine';
import { ChevronDown, Heart, Lyrics as LyricsIcon, Mute, Next, Pause, Play, Prev, Queue as QueueIcon, Repeat, RepeatOne, Shuffle, Volume } from './Icons';
import { toast } from '../store/toast';

export function NowPlaying() {
  const open = usePlayer((s) => s.nowPlayingOpen);
  const lyricsOpen = usePlayer((s) => s.lyricsOpen);
  const song = useCurrentSong();
  const playing = usePlayer((s) => s.playing);
  const buffering = usePlayer((s) => s.buffering);
  const currentTime = usePlayer((s) => s.currentTime);
  const duration = usePlayer((s) => s.duration);
  const shuffle = usePlayer((s) => s.shuffle);
  const repeat = usePlayer((s) => s.repeat);
  const context = usePlayer((s) => s.context);
  const { toggle, next, prev, seek, toggleShuffle, cycleRepeat, setNowPlayingOpen, setLyricsOpen, setQueueOpen } = usePlayer.getState();
  const volume = useLibrary((s) => s.settings.volume);
  const quality = useLibrary((s) => s.settings.quality);
  const updateSettings = useLibrary((s) => s.updateSettings);
  const liked = useLibrary((s) => Boolean(song && s.liked[song.id]));
  const toggleLike = useLibrary((s) => s.toggleLike);
  const dragControls = useDragControls();
  const startDrag = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse') return;
    dragControls.start(e);
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setNowPlayingOpen(false);
    };
    window.addEventListener('keydown', onKey);
    document.documentElement.classList.add('np-open');
    return () => {
      window.removeEventListener('keydown', onKey);
      document.documentElement.classList.remove('np-open');
    };
  }, [open, setNowPlayingOpen]);

  useEffect(() => {
    if (!song) setNowPlayingOpen(false);
  }, [song, setNowPlayingOpen]);

  const total = duration || song?.duration || 0;

  return (
    <AnimatePresence>
      {open && song && (
        <motion.section
          className={`np ${lyricsOpen ? 'lyrics-on' : ''}`}
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', stiffness: 300, damping: 34, mass: 0.9 }}
          aria-label="Now playing"
          drag="y"
          dragControls={dragControls}
          dragListener={false}
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={{ top: 0, bottom: 0.5 }}
          dragDirectionLock
          onDragEnd={(_, info) => {
            if (info.offset.y > 120 || info.velocity.y > 700) setNowPlayingOpen(false);
          }}
        >
          <div className="np-bg" aria-hidden>
            <AnimatePresence mode="sync">
              <motion.div key={song.image} className="np-bg-img" style={{ backgroundImage: `url(${song.image})` }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 1 }} />
            </AnimatePresence>
          </div>

          <div className="np-head" onPointerDown={startDrag}>
            <button className="icon-btn np-btn" onClick={() => setNowPlayingOpen(false)} aria-label="Minimize">
              <ChevronDown size={26} />
            </button>
            <div className="ctx">
              Playing from {context?.type === 'radio' ? (context.id?.startsWith('mix:') ? 'your mix' : 'autoplay') : context?.type ?? 'queue'}
              <strong className="truncate">{context?.title ?? 'Queue'}</strong>
            </div>
            <div className="row" style={{ gap: 2 }}>
              <button className={`icon-btn np-btn ${lyricsOpen ? 'on' : ''}`} onClick={() => setLyricsOpen(!lyricsOpen)} aria-label="Lyrics" aria-pressed={lyricsOpen}>
                <LyricsIcon size={20} />
              </button>
              <button
                className="icon-btn np-btn"
                onClick={() => {
                  setNowPlayingOpen(false);
                  setQueueOpen(true);
                }}
                aria-label="Queue"
              >
                <QueueIcon size={20} />
              </button>
            </div>
          </div>

          <div className="np-body">
            <div className="np-stage">
              <AnimatePresence mode="wait" initial={false}>
                {lyricsOpen ? (
                  <motion.div key="lyrics" className="np-lyrics" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.28 }}>
                    <Lyrics song={song} currentTime={currentTime} duration={total} playing={playing} onSeek={(t) => seek(t)} />
                  </motion.div>
                ) : (
                  <motion.div
                    key={`art-${song.id}`}
                    className="np-art"
                    onPointerDown={startDrag}
                    initial={{ opacity: 0, scale: 0.94 }}
                    animate={{ opacity: 1, scale: playing ? 1 : 0.92 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ type: 'spring', stiffness: 220, damping: 26 }}
                  >
                    <Img src={song.image} alt={song.title} loading="eager" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="np-panel glass">
              <div className="np-title">
                <div style={{ minWidth: 0 }}>
                  <h2 className="truncate" title={song.title}>
                    {song.title}
                  </h2>
                  <div className="sub truncate">
                    {song.artists.length
                      ? song.artists.slice(0, 3).map((a, i) => (
                          <span key={`${a.id}-${i}`}>
                            {i > 0 && ', '}
                            {a.id ? (
                              <Link to={`/artist/${a.id}`} onClick={() => setNowPlayingOpen(false)}>
                                {a.name}
                              </Link>
                            ) : (
                              a.name
                            )}
                          </span>
                        ))
                      : song.subtitle}
                  </div>
                </div>
                <button
                  className={`icon-btn np-btn ${liked ? 'on' : ''}`}
                  style={{ width: 46, height: 46 }}
                  onClick={() => {
                    toggleLike(song);
                    toast(liked ? 'Removed from Liked Songs' : 'Added to Liked Songs');
                  }}
                  aria-label={liked ? 'Unlike' : 'Like'}
                  aria-pressed={liked}
                >
                  <Heart size={24} filled={liked} />
                </button>
              </div>

              <div>
                <Slider value={currentTime} max={total} onCommit={(v) => seek(v)} ariaLabel="Seek" className="np-seek" />
                <div className="np-times">
                  <span>{formatTime(currentTime)}</span>
                  <span className="quality-pill">{buffering && playing ? 'Buffering…' : qualityLabel(quality)}</span>
                  <span>-{formatTime(Math.max(0, total - currentTime))}</span>
                </div>
              </div>

              <div className="np-controls">
                <button className={`icon-btn np-btn ${shuffle ? 'on' : ''}`} onClick={toggleShuffle} aria-label="Shuffle" aria-pressed={shuffle}>
                  <Shuffle size={20} />
                </button>
                <button className="icon-btn np-btn" onClick={prev} aria-label="Previous">
                  <Prev size={32} />
                </button>
                <button className="play-btn lg" onClick={toggle} aria-label={playing ? 'Pause' : 'Play'}>
                  {playing ? <Pause size={30} /> : <Play size={30} />}
                </button>
                <button className="icon-btn np-btn" onClick={next} aria-label="Next">
                  <Next size={32} />
                </button>
                <button className={`icon-btn np-btn ${repeat !== 'off' ? 'on' : ''}`} onClick={cycleRepeat} aria-label={`Repeat: ${repeat}`}>
                  {repeat === 'one' ? <RepeatOne size={20} /> : <Repeat size={20} />}
                </button>
              </div>

              <div className="np-footer">
                <span className="np-album truncate">
                  {song.album.name && song.album.id ? (
                    <Link to={`/album/${song.album.id}`} onClick={() => setNowPlayingOpen(false)}>
                      {song.album.name}
                    </Link>
                  ) : (
                    song.album.name || (song.isVideo ? 'Music video' : 'Single')
                  )}
                  {song.year ? ` · ${song.year}` : ''}
                </span>
                <div className="volume">
                  <button className="icon-btn np-btn" onClick={() => updateSettings({ volume: volume > 0 ? 0 : 0.8 })} aria-label={volume > 0 ? 'Mute' : 'Unmute'}>
                    {volume > 0 ? <Volume size={18} level={volume} /> : <Mute size={18} />}
                  </button>
                  <Slider value={volume} max={1} onChange={(v) => updateSettings({ volume: v })} ariaLabel="Volume" />
                </div>
              </div>
            </div>
          </div>
        </motion.section>
      )}
    </AnimatePresence>
  );
}
