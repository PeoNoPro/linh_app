import { create } from 'zustand';

const useStore = create((set, get) => ({
  // ── Current User ────────────────────────────────────────
  currentUser: null,
  setCurrentUser: (user) => set({ currentUser: user }),
  logout: () => set({ currentUser: null }),

  // ── Active Page ──────────────────────────────────────────
  activePage: 'dashboard',
  setActivePage: (page) => set({ activePage: page }),

  // ── Reminder Badge ───────────────────────────────────────
  reminderCount: 0,
  setReminderCount: (count) => set({ reminderCount: count }),
}));

export default useStore;
