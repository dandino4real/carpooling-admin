import { create } from 'zustand';

const THEME_KEY = 'ridepal_admin_theme';

type Theme = 'dark' | 'light';

function getSavedTheme(): Theme {
  if (typeof window === 'undefined') return 'dark';
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === 'light' || saved === 'dark') return saved;
  // Respect OS preference on first visit if no saved choice
  if (window.matchMedia('(prefers-color-scheme: light)').matches) return 'light';
  return 'dark';
}

function applyTheme(theme: Theme) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
    root.classList.remove('light');
  } else {
    root.classList.remove('dark');
    root.classList.add('light');
  }
  localStorage.setItem(THEME_KEY, theme);
}

interface UIState {
  sidebarOpen: boolean;
  theme: Theme;
  activeModals: Record<string, boolean>;
  tablePreferences: Record<string, any>;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setTheme: (theme: Theme) => void;
  setModalOpen: (modalId: string, open: boolean) => void;
  setTablePreference: (tableId: string, pref: any) => void;
}

const initialTheme = getSavedTheme();
// Apply immediately to avoid flash of wrong theme on first render
if (typeof document !== 'undefined') {
  applyTheme(initialTheme);
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  theme: initialTheme,
  activeModals: {},
  tablePreferences: {},
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setTheme: (theme) => {
    applyTheme(theme); // persist + apply to DOM
    set({ theme });
  },
  setModalOpen: (modalId, open) =>
    set((state) => ({
      activeModals: { ...state.activeModals, [modalId]: open },
    })),
  setTablePreference: (tableId, pref) =>
    set((state) => ({
      tablePreferences: { ...state.tablePreferences, [tableId]: pref },
    })),
}));
