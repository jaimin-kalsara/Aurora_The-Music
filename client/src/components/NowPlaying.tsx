import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { usePlayer, useCurrentSong } from '../store/player';
import { useLibrary } from '../store/library';
import { useQuery } from '../hooks/useQuery';
import { api } from '../api';
import { formatTime } from '../utils/format';
import { Slider } from './Slider';
import { Img } from './Img';
import { ChevronDown, Heart, Lyrics as LyricsIcon, Mute, Next, Pause, Play, Prev, Queue as QueueIcon, Repeat, RepeatOne, Shuffle, Volume } from './Icons';
import { toast } from '../store/toast';

function LyricsPanel({ id, hasLyrics }: { id: string; hasLyrics: boolean }) {
  const { data, loading, error } = useQuery(hasLyrics ? `lyrics:${id}` : null, () => api.lyrics(id));
  if (!hasLyrics) return <div className="lyrics-empty">Lyrics aren’t available for this track yet.</div>;
  if (loading) return <div className="lyrics-empty">Loading lyrics…</div>;
  if (error || !data) return <div className="lyrics-empty">Lyrics aren’t available for this track yet.</div>;
  return (
    <motion.div className="lyrics" key={id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
      {data.lines.map((line, i) => (line ? <p key={i}>{line}</p> : <p key={i}>&nbsp;</p>))}
      {data.copyright && <p className="copyright">{data.copyright}</p>}
    </motion.div>
  );
}

export function NowPlaying() {
  const open = usePlayer((s) => s.nowPlayingOpen);
  const lyricsOpen = usePlayer((s) => s.lyricsOpen);
  const song = useCurrentSong();
  const playing = usePlayer((s) => s.playing);
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

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setNowPlayingOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, setNowPlayingOpen]);

  useEffect(() => {
    if (!song) setNowPlayingOpen(false);
  }, [song, setNowPlayingOpen]);

  const total = duration || song?.duration || 0;
  const bitrate = song?.streams ? (quality === 'high' ? song.streams.highBitrate : quality === 'medium' ? 160 : 96) : 0;

  return (
    <AnimatePresence>
      {open && song && (
        <motion.section
          className="np"
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', stiffness: 260, damping: 32, mass: 0.9 }}
          aria-label="Now playing"
        >
          <div className="np-bg" style={{ backgroundImage: `url(${song.image})` }} />
          <div className="np-head">
            <button className="icon-btn" onClick={() => setNowPlayingOpen(false)} aria-label="Minimize" style={{ color: '#fff' }}>
              <ChevronDown size={26} />
            </button>
            <div className="ctx">
              Playing from {context?.type ?? 'queue'}
              <strong>{context?.title ?? 'Queue'}</strong>
            </div>
            <div className="row" style={{ gap: 2 }}>
              <button className={`icon-btn ${lyricsOpen ? 'on' : ''}`} onClick={() => setLyricsOpen(!lyricsOpen)} aria-label="Lyrics" style={{ color: '#fff' }}>
                <LyricsIcon size={20} />
              </button>
              <button className="icon-btn" onClick={() => { setNowPlayingOpen(false); setQueueOpen(true); }} aria-label="Queue" style={{ color: '#fff' }}>
                <QueueIcon size={20} />
              </button>
            </div>
          </div>

          <div className={`np-body ${lyricsOpen ? 'split' : ''}`}>
            <motion.div
              className="np-art"
              key={song.id}
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: playing ? 1 : 0.94 }}
              transition={{ type: 'spring', stiffness: 220, damping: 26 }}
              layout
            >
              <Img src={song.image} alt={song.title} loading="eager" />
            </motion.div>

            {lyricsOpen ? (
              <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                <LyricsPanel id={song.id} hasLyrics={song.hasLyrics} />
              </div>
            ) : null}

            <div className="np-panel" style={lyricsOpen ? { gridColumn: '1 / -1' } : undefined}>
              <div className="np-title">
                <div style={{ minWidth: 0 }}>
                  <h2 className="truncate" title={song.title}>{song.title}</h2>
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
                  className="icon-btn"
                  style={{ color: '#fff', width: 46, height: 46 }}
                  onClick={() => {
                    toggleLike(song);
                    toast(liked ? 'Removed from Liked Songs' : 'Added to Liked Songs');
                  }}
                  aria-label={liked ? 'Unlike' : 'Like'}
                >
                  <Heart size={24} filled={liked} />
                </button>
              </div>

              <div>
                <Slider value={currentTime} max={total} onCommit={(v) => seek(v)} ariaLabel="Seek" />
                <div className="row" style={{ justifyContent: 'space-between', fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 2 }}>
                  <span>{formatTime(currentTime)}</span>
                  <span className="quality-pill">{bitrate ? `${bitrate} kbps` : 'AAC'}{bitrate === 320 ? ' · Ultra' : ''}</span>
                  <span>-{formatTime(Math.max(0, total - currentTime))}</span>
                </div>
              </div>

              <div className="np-controls">
                <button className={`icon-btn ${shuffle ? 'on' : ''}`} onClick={toggleShuffle} aria-label="Shuffle">
                  <Shuffle size={20} />
                </button>
                <button className="icon-btn" onClick={prev} aria-label="Previous">
                  <Prev size={32} />
                </button>
                <button className="play-btn lg" onClick={toggle} aria-label={playing ? 'Pause' : 'Play'}>
                  {playing ? <Pause size={30} /> : <Play size={30} />}
                </button>
                <button className="icon-btn" onClick={next} aria-label="Next">
                  <Next size={32} />
                </button>
                <button className={`icon-btn ${repeat !== 'off' ? 'on' : ''}`} onClick={cycleRepeat} aria-label="Repeat">
                  {repeat === 'one' ? <RepeatOne size={20} /> : <Repeat size={20} />}
                </button>
              </div>

              <div className="np-footer">
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>
                  {song.album.name && song.album.id ? (
                    <Link to={`/album/${song.album.id}`} onClick={() => setNowPlayingOpen(false)}>
                      {song.album.name}
                    </Link>
                  ) : (
                    song.album.name
                  )}
                  {song.year ? ` · ${song.year}` : ''}
                </span>
                <div className="volume">
                  <button className="icon-btn" style={{ color: '#fff' }} onClick={() => updateSettings({ volume: volume > 0 ? 0 : 0.8 })} aria-label="Mute">
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
