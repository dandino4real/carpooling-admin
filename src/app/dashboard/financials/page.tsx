'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Financial Analytics has been merged into the Platform Analytics page
 * under the "Financial Flows" tab. This page redirects there automatically.
 */
export default function FinancialsRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/analytics?tab=financials');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center space-y-3 animate-pulse">
        <div className="w-8 h-8 border-2 border-[var(--color-neon)] border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-slate-500 text-sm font-mono uppercase tracking-widest">Redirecting to Financial Flows&hellip;</p>
      </div>
    </div>
  );
}
