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

/**
 * Pointer-driven slider used for the timeline and the volume control. Fill and thumb move with
 * transforms (no layout), and the hit area is taller than the visible track for touch.
 */
export function Slider({ value, max, buffered = 0, onChange, onCommit, ariaLabel, className = '' }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [dragValue, setDragValue] = useState(value);
  const safeMax = max > 0 ? max : 1;
  const shown = dragging ? dragValue : value;
  const ratio = clamp(shown / safeMax, 0, 1);
  const bufRatio = clamp(buffered / safeMax, 0, 1);

  const valueFromEvent = useCallback(
    (clientX: number) => {
      const el = ref.current;
      if (!el) return 0;
      const rect = el.getBoundingClientRect();
      return clamp((clientX - rect.left) / rect.width, 0, 1) * safeMax;
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
    const cancel = () => setDragging(false);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up, { once: true });
    window.addEventListener('pointercancel', cancel, { once: true });
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', cancel);
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
        e.stopPropagation();
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
        <div className="slider-buffer" style={{ transform: `scaleX(${bufRatio})` }} />
        <div className="slider-fill" style={{ transform: `scaleX(${ratio})` }} />
      </div>
      <div className="slider-thumb" style={{ left: `${ratio * 100}%` }} />
    </div>
  );
}
