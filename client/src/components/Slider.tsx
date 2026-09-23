import { useCallback, useEffect, useRef, useState } from 'react';
import { clamp } from '../utils/format';

interface Props {
  value: number;
  max: number;
  buffered?: number;
  onChange?: (v: number) => void;
  onCommit?: (v: number) => void;
  ariaLabel: string;
  className?: string;
}

/** Pointer-driven slider used for the timeline and the volume control. */
export function Slider({ value, max, buffered = 0, onChange, onCommit, ariaLabel, className = '' }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [dragValue, setDragValue] = useState(value);
  const safeMax = max > 0 ? max : 1;
  const shown = dragging ? dragValue : value;
  const pct = clamp((shown / safeMax) * 100, 0, 100);
  const bufPct = clamp((buffered / safeMax) * 100, 0, 100);

  const valueFromEvent = useCallback(
    (clientX: number) => {
      const el = ref.current;
      if (!el) return 0;
      const rect = el.getBoundingClientRect();
      const ratio = clamp((clientX - rect.left) / rect.width, 0, 1);
      return ratio * safeMax;
    },
    [safeMax],
  );

  useEffect(() => {
    if (!dragging) return;
    const move = (e: PointerEvent) => {
      const v = valueFromEvent(e.clientX);
      setDragValue(v);
      onChange?.(v);
    };
    const up = (e: PointerEvent) => {
      const v = valueFromEvent(e.clientX);
      setDragging(false);
      onCommit?.(v);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up, { once: true });
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
  }, [dragging, valueFromEvent, onChange, onCommit]);

  return (
    <div
      ref={ref}
      className={`slider ${dragging ? 'dragging' : ''} ${className}`}
      role="slider"
      tabIndex={0}
      aria-label={ariaLabel}
      aria-valuemin={0}
      aria-valuemax={Math.round(safeMax)}
      aria-valuenow={Math.round(shown)}
      onPointerDown={(e) => {
        e.preventDefault();
        const v = valueFromEvent(e.clientX);
        setDragValue(v);
        setDragging(true);
        onChange?.(v);
      }}
      onKeyDown={(e) => {
        const step = safeMax / 20;
        if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
          e.preventDefault();
          onCommit?.(clamp(value + step, 0, safeMax));
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
          e.preventDefault();
          onCommit?.(clamp(value - step, 0, safeMax));
        }
      }}
    >
      <div className="slider-track">
        <div className="slider-buffer" style={{ width: `${bufPct}%` }} />
        <div className="slider-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="slider-thumb" style={{ left: `${pct}%` }} />
    </div>
  );
}
