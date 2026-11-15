import { create } from "zustand";

export interface Toast {
  id: number;
  message: string;
}

interface ToastState {
  toasts: Toast[];
  /** Show a short confirmation; it dismisses itself after `TOAST_MS`. */
  showToast: (message: string) => void;
  dismissToast: (id: number) => void;
}

export const TOAST_MS = 3200;
/** Older toasts drop off once this many are stacked. */
const MAX_TOASTS = 3;
let nextId = 1;

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],

  showToast: (message) => {
    const id = nextId++;
    set((state) => ({ toasts: [...state.toasts, { id, message }].slice(-MAX_TOASTS) }));
    setTimeout(() => get().dismissToast(id), TOAST_MS);
  },

  dismissToast: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));
