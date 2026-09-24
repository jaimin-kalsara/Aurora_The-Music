import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { usePlayer } from '../store/player';
import { Img } from './Img';
import { Close, Trash } from './Icons';
import { Equalizer } from './SongList';

/** Queue drawer: a glass panel on desktop, a bottom sheet on phones. */
export function QueuePanel() {
  const open = usePlayer((s) => s.queueOpen);
  const queue = usePlayer((s) => s.queue);
  const index = usePlayer((s) => s.index);
  const playing = usePlayer((s) => s.playing);
  const context = usePlayer((s) => s.context);
  const { setQueueOpen, jumpTo, removeAt, clearUpcoming } = usePlayer.getState();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setQueueOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, setQueueOpen]);

  const current = queue[index];
  const upcoming = queue.slice(index + 1);
  const history = queue.slice(0, index);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="queue-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} onClick={() => setQueueOpen(false)} />
          <motion.aside
            className="queue-panel glass"
            initial={{ x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 40, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            aria-label="Queue"
          >
            <div className="sheet-grip show-sm" aria-hidden />
            <div className="queue-head">
              <div style={{ minWidth: 0 }}>
                <h2>Queue</h2>
                {context && <div className="dim truncate" style={{ fontSize: 13 }}>From {context.title}</div>}
              </div>
              <button className="icon-btn" onClick={() => setQueueOpen(false)} aria-label="Close queue">
                <Close />
              </button>
            </div>
            <div className="queue-body">
              {!queue.length && <div className="queue-empty">Your queue is empty. Play something to get started.</div>}
              {current && (
                <>
                  <div className="queue-section">Now playing</div>
                  <div className="queue-item active">
                    <Img src={current.image} alt="" />
                    <div style={{ minWidth: 0 }}>
                      <div className="t truncate">{current.title}</div>
                      <div className="s truncate">{current.artistNames || current.subtitle}</div>
                    </div>
                    <Equalizer paused={!playing} />
                  </div>
                </>
              )}
              {upcoming.length > 0 && (
                <>
                  <div className="queue-section">
                    Next up · {upcoming.length}
                    <button onClick={clearUpcoming}>Clear</button>
                  </div>
                  <div>
                    {upcoming.map((song, k) => {
                      const i = index + 1 + k;
                      return (
                        <motion.div
                          key={`${song.id}-${i}`}
                          className="queue-item"
                          onClick={() => jumpTo(i)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') jumpTo(i);
                          }}
                          initial={{ opacity: 0, x: 12 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.2, delay: Math.min(k * 0.015, 0.25) }}
                        >
                          <Img src={song.image} alt="" />
                          <div style={{ minWidth: 0 }}>
                            <div className="t truncate">{song.title}</div>
                            <div className="s truncate">{song.artistNames || song.subtitle}</div>
                          </div>
                          <button
                            className="icon-btn sm"
                            aria-label="Remove from queue"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeAt(i);
                            }}
                          >
                            <Trash size={16} />
                          </button>
                        </motion.div>
                      );
                    })}
                  </div>
                </>
              )}
              {history.length > 0 && (
                <>
                  <div className="queue-section">Previously</div>
                  {history.map((song, i) => (
                    <div key={`${song.id}-${i}`} className="queue-item past" onClick={() => jumpTo(i)} role="button" tabIndex={0}>
                      <Img src={song.image} alt="" />
                      <div style={{ minWidth: 0 }}>
                        <div className="t truncate">{song.title}</div>
                        <div className="s truncate">{song.artistNames || song.subtitle}</div>
                      </div>
                      <span />
                    </div>
                  ))}
                </>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
