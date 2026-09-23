import { create } from 'zustand';

export interface Toast {
  id: number;
  message: string;
  kind: 'info' | 'error';
}

interface ToastState {
  toasts: Toast[];
  push: (message: string, kind?: Toast['kind']) => void;
  dismiss: (id: number) => void;
}

let seq = 0;

export const useToast = create<ToastState>()((set) => ({
  toasts: [],
  push: (message, kind = 'info') => {
    const id = ++seq;
    set((s) => ({ toasts: [...s.toasts.slice(-2), { id, message, kind }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 2600);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export const toast = (message: string, kind: Toast['kind'] = 'info') => useToast.getState().push(message, kind);
