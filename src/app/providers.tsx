'use client';

import React, { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { useUIStore } from '@/store/uiStore';

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 5, // 5 minutes cache stale time
            gcTime: 1000 * 60 * 30, // 30 minutes garbage collection time
            refetchOnWindowFocus: false, // prevent refetches on window focus
            retry: 1, // retry once on failure
          },
        },
      })
  );

  const theme = useUIStore((state) => state.theme);

  // Apply the theme class to <html> whenever the Zustand store value changes.
  // Doing this at the Providers level means it works on every page, not just
  // inside the dashboard layout.
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
    }
  }, [theme]);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster position="top-right" theme={theme} closeButton richColors />
    </QueryClientProvider>
  );
}
