import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';

export interface SheetAction {
  label: string;
  icon?: ReactNode;
  onSelect: () => void;
  destructive?: boolean;
}

interface Props {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  subtitle?: ReactNode;
  image?: string;
  actions: SheetAction[];
}

/** Bottom sheet (mobile) / floating menu (desktop) with a glass surface. */
export function ActionSheet({ open, onClose, title, subtitle, image, actions }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div className="sheet-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} onClick={onClose}>
          <motion.div
            className="sheet glass"
            role="menu"
            initial={{ y: 40, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 30, opacity: 0, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 380, damping: 34 }}
            onClick={(e) => e.stopPropagation()}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 80 || info.velocity.y > 600) onClose();
            }}
          >
            <div className="sheet-grip" aria-hidden />
            {(title || image) && (
              <div className="sheet-head">
                {image && <img src={image} alt="" />}
                <div style={{ minWidth: 0 }}>
                  {title && <div className="sheet-title truncate">{title}</div>}
                  {subtitle && <div className="sheet-sub truncate">{subtitle}</div>}
                </div>
              </div>
            )}
            <div className="sheet-actions">
              {actions.map((a) => (
                <button
                  key={a.label}
                  type="button"
                  role="menuitem"
                  className={`sheet-action ${a.destructive ? 'destructive' : ''}`}
                  onClick={() => {
                    onClose();
                    a.onSelect();
                  }}
                >
                  {a.icon && <span className="sheet-icon">{a.icon}</span>}
                  {a.label}
                </button>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
