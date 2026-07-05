import { create } from 'zustand';

interface FilterState {
  dateRange: {
    start: string;
    end: string;
  };
  region: string;
  setDateRange: (start: string, end: string) => void;
  setRegion: (region: string) => void;
}

export const useFilterStore = create<FilterState>((set) => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  return {
    dateRange: {
      start: thirtyDaysAgo.toISOString().split('T')[0],
      end: new Date().toISOString().split('T')[0],
    },
    region: 'All',
    setDateRange: (start, end) => set({ dateRange: { start, end } }),
    setRegion: (region) => set({ region }),
  };
});
