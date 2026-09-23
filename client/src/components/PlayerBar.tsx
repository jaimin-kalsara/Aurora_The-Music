import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { usePlayer, useCurrentSong } from '../store/player';
import { useLibrary } from '../store/library';
import { formatTime } from '../utils/format';
import { Slider } from './Slider';
import { Img } from './Img';
import { Expand, Heart, Lyrics, Mute, Next, Pause, Play, Prev, Queue as QueueIcon, Repeat, RepeatOne, Shuffle, Volume } from './Icons';
import { toast } from '../store/toast';

export function PlayerBar() {
  const song = useCurrentSong();
  const playing = usePlayer((s) => s.playing);
  const buffering = usePlayer((s) => s.buffering);
  const currentTime = usePlayer((s) => s.currentTime);
  const duration = usePlayer((s) => s.duration);
  const shuffle = usePlayer((s) => s.shuffle);
  const repeat = usePlayer((s) => s.repeat);
  const queueOpen = usePlayer((s) => s.queueOpen);
  const { toggle, next, prev, seek, toggleShuffle, cycleRepeat, setNowPlayingOpen, setQueueOpen, setLyricsOpen } = usePlayer.getState();
  const volume = useLibrary((s) => s.settings.volume);
  const updateSettings = useLibrary((s) => s.updateSettings);
  const liked = useLibrary((s) => Boolean(song && s.liked[song.id]));
  const toggleLike = useLibrary((s) => s.toggleLike);

  const total = duration || song?.duration || 0;

  return (
    <footer className="player" aria-label="Player">
      <div className="player-track">
        <AnimatePresence mode="popLayout">
          {song ? (
            <motion.div
              key={song.id}
              className="row"
              style={{ minWidth: 0, gap: 14 }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            >
              <button className="player-art" onClick={() => setNowPlayingOpen(true)} aria-label="Open Now Playing">
                <Img src={song.image} alt="" loading="eager" />
              </button>
              <div className="player-meta">
                <div className="player-title truncate" onClick={() => setNowPlayingOpen(true)} title={song.title}>
                  {song.title}
                </div>
                <div className="player-sub truncate">
                  {song.artists.length ? (
                    song.artists.slice(0, 2).map((a, i) => (
                      <span key={`${a.id}-${i}`}>
                        {i > 0 && ', '}
                        {a.id ? <Link to={`/artist/${a.id}`}>{a.name}</Link> : a.name}
                      </span>
                    ))
                  ) : (
                    song.subtitle
                  )}
                </div>
              </div>
              <button
                className={`icon-btn hide-sm ${liked ? 'on' : ''}`}
                onClick={() => {
                  toggleLike(song);
                  toast(liked ? 'Removed from Liked Songs' : 'Added to Liked Songs');
                }}
                aria-label={liked ? 'Unlike' : 'Like'}
                style={liked ? { color: '#fff' } : undefined}
              >
                <Heart size={19} filled={liked} />
              </button>
            </motion.div>
          ) : (
            <motion.div key="empty" className="muted" style={{ fontSize: 14 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              Pick a song, a mood, or search to start listening.
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="player-center">
        <div className="controls">
          <button className={`icon-btn ${shuffle ? 'on' : ''}`} onClick={toggleShuffle} aria-label="Shuffle" aria-pressed={shuffle}>
            <Shuffle size={18} />
          </button>
          <button className="icon-btn" onClick={prev} aria-label="Previous" disabled={!song}>
            <Prev size={24} />
          </button>
          <button className="play-btn" onClick={toggle} aria-label={playing ? 'Pause' : 'Play'} disabled={!song}>
            {buffering && playing ? (
              <motion.span
                style={{ width: 18, height: 18, border: '2px solid rgba(0,0,0,0.25)', borderTopColor: '#000', borderRadius: '50%', display: 'block' }}
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
              />
            ) : playing ? (
              <Pause size={22} />
            ) : (
              <Play size={22} />
            )}
          </button>
          <button className="icon-btn" onClick={next} aria-label="Next" disabled={!song}>
            <Next size={24} />
          </button>
          <button className={`icon-btn ${repeat !== 'off' ? 'on' : ''}`} onClick={cycleRepeat} aria-label={`Repeat: ${repeat}`}>
            {repeat === 'one' ? <RepeatOne size={18} /> : <Repeat size={18} />}
          </button>
        </div>
        <div className="timeline">
          <span>{formatTime(currentTime)}</span>
          <Slider value={currentTime} max={total} onCommit={(v) => seek(v)} ariaLabel="Seek" />
          <span>{formatTime(total)}</span>
        </div>
      </div>

      <div className="player-right">
        <button className="icon-btn hide-sm" onClick={() => { setNowPlayingOpen(true); setLyricsOpen(true); }} aria-label="Lyrics" disabled={!song}>
          <Lyrics size={18} />
        </button>
        <button className={`icon-btn ${queueOpen ? 'on' : ''}`} onClick={() => setQueueOpen(!queueOpen)} aria-label="Queue" aria-pressed={queueOpen}>
          <QueueIcon size={19} />
        </button>
        <div className="volume">
          <button
            className="icon-btn"
            onClick={() => updateSettings({ volume: volume > 0 ? 0 : 0.8 })}
            aria-label={volume > 0 ? 'Mute' : 'Unmute'}
          >
            {volume > 0 ? <Volume size={18} level={volume} /> : <Mute size={18} />}
          </button>
          <Slider value={volume} max={1} onChange={(v) => updateSettings({ volume: v })} onCommit={(v) => updateSettings({ volume: v })} ariaLabel="Volume" />
        </div>
        <button className="icon-btn hide-sm" onClick={() => setNowPlayingOpen(true)} aria-label="Full screen" disabled={!song}>
          <Expand size={17} />
        </button>
      </div>
    </footer>
  );
}
