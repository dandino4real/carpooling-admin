'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import {
  MessageSquare,
  Star,
  Search,
  RefreshCw,
  Tag,
  Lightbulb,
  Quote,
  TrendingUp,
  BarChart3,
  Filter,
} from 'lucide-react';

const STAR_COLORS: Record<number, string> = {
  5: 'text-[var(--color-neon)]',
  4: 'text-[var(--color-neon)]',
  3: 'text-amber-400',
  2: 'text-orange-400',
  1: 'text-red-400',
};

const BAR_COLORS: Record<number, string> = {
  5: 'bg-[var(--color-neon)] shadow-[0_0_8px_var(--color-neon)]',
  4: 'bg-[var(--color-neon)]',
  3: 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]',
  2: 'bg-orange-400',
  1: 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]',
};

const RATING_LABEL: Record<number, string> = {
  5: 'Excellent', 4: 'Good', 3: 'Average', 2: 'Poor', 1: 'Terrible',
};

function StarDisplay({ score, size = 'sm' }: { score: number; size?: 'sm' | 'lg' }) {
  const cls = size === 'lg' ? 'text-xl' : 'text-sm';
  return (
    <div className="flex items-center gap-0.5">
      {Array(5).fill(0).map((_, i) => (
        <Star
          key={i}
          className={`${size === 'lg' ? 'w-5 h-5' : 'w-3.5 h-3.5'} ${
            i < score
              ? `fill-current ${STAR_COLORS[score] || 'text-amber-400'}`
              : 'text-slate-900 dark:text-white/10 fill-current'
          }`}
        />
      ))}
    </div>
  );
}

export default function AppFeedbackPage() {
  const [ratingFilter, setRatingFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [data, setData] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>({
    distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    averageRating: 0,
    totalCount: 0,
  });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.listAppFeedback({
        rating: ratingFilter ? Number(ratingFilter) : undefined,
        search: searchQuery || undefined,
        limit: 50,
      });
      setData(res.data ?? []);
      if (res.analytics) setAnalytics(res.analytics);
    } catch {
      toast.error('Failed to load feedback');
    } finally {
      setLoading(false);
    }
  }, [ratingFilter, searchQuery]);

  useEffect(() => { load(); }, [load]);

  const getPercentage = (count: number) => {
    const totalCount = analytics.totalCount || 1;
    return Math.round((count / totalCount) * 100);
  };

  const avg = Number(analytics.averageRating).toFixed(1);
  const avgNum = Math.round(analytics.averageRating);

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16">

      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter flex items-center gap-3">
            <div className="w-9 h-9 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-amber-400" />
            </div>
            App Feedback
          </h1>
          <p className="text-slate-500 text-sm mt-2 font-medium">
            Monitor ratings, tags, comments & feature suggestions from your mobile users.
          </p>
        </div>
        <button
          onClick={load}
          className="self-start sm:self-auto flex items-center gap-2 bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 text-xs font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer shadow-sm hover:shadow-md dark:shadow-none"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {/* ── Analytics Hero Row ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Big Score Card */}
        <div className="lg:col-span-2 bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/5 rounded-[2rem] p-8 flex flex-col justify-between relative overflow-hidden group">
          {/* Glow orb */}
          <div className="absolute -top-16 -right-16 w-48 h-48 bg-amber-400/10 blur-[60px] rounded-full pointer-events-none group-hover:opacity-100 opacity-60 transition-opacity duration-500" />

          <div>
            <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2 mb-6">
              <TrendingUp className="w-3.5 h-3.5" />
              Average App Rating
            </p>
            <div className="flex items-end gap-3">
              <span className="text-8xl font-black tracking-tighter text-slate-900 dark:text-white leading-none">{avg}</span>
              <div className="pb-2">
                <span className="text-2xl font-bold text-slate-600 leading-none">/ 5</span>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <StarDisplay score={avgNum} size="lg" />
              <span className="text-xs text-slate-500 font-medium">
                from {analytics.totalCount} ratings
              </span>
            </div>
          </div>

          <div className={`mt-8 border border-slate-200 dark:border-white/5 rounded-2xl px-4 py-3 text-xs font-medium leading-relaxed ${
            avgNum >= 4 ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/20' :
            avgNum >= 3 ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-500/20' :
            'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border-red-100 dark:border-red-500/20'
          }`}>
            {avgNum >= 4
              ? '🟢 Strong UX signal. Keep up the quality and monitor 1–3 star comments for edge cases.'
              : avgNum >= 3
              ? '🟡 Room to grow. Focus on recurring 3-star themes to boost satisfaction.'
              : '🔴 Critical attention needed. Prioritize top issues raised in low-star reviews.'}
          </div>
        </div>

        {/* Distribution Chart */}
        <div className="lg:col-span-3 bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/5 rounded-[2rem] p-8">
          <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2 mb-7">
            <BarChart3 className="w-3.5 h-3.5" />
            Ratings Distribution
          </p>
          <div className="space-y-4">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = analytics.distribution[star] || 0;
              const pct = getPercentage(count);
              return (
                <div key={star} className="flex items-center gap-4 group/bar">
                  <div className="flex items-center gap-1.5 w-16 shrink-0">
                    <span className="text-xs font-black text-slate-700 dark:text-slate-300">{star}</span>
                    <Star className={`w-3.5 h-3.5 fill-current ${STAR_COLORS[star]}`} />
                  </div>
                  <div className="flex-1 h-2.5 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ease-out ${BAR_COLORS[star]}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="w-24 shrink-0 flex items-center justify-end gap-2">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">{count}</span>
                    <span className="text-[10px] font-mono text-slate-600 w-9 text-right">{pct}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Filters ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Pill tabs */}
        <div className="flex items-center gap-2 flex-wrap bg-slate-50 dark:bg-transparent p-1.5 rounded-xl border border-slate-200 dark:border-transparent shadow-inner dark:shadow-none">
          <span className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-widest text-slate-600 mr-1 ml-1">
            <Filter className="w-3 h-3" /> Filter
          </span>
          {['', '5', '4', '3', '2', '1'].map((star) => {
            const isActive = ratingFilter === star;
            const starNum = Number(star);
            return (
              <button
                key={star}
                onClick={() => setRatingFilter(star)}
                className={`flex items-center gap-1.5 text-xs font-bold px-4 py-1.5 rounded-lg transition-all cursor-pointer ${
                  isActive
                    ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm dark:shadow-none'
                    : 'bg-transparent hover:bg-slate-100 dark:hover:bg-white/5 text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'
                }`}
              >
                {star === '' ? (
                  'All Ratings'
                ) : (
                  <>
                    <Star className={`w-3 h-3 fill-current ${STAR_COLORS[starNum]}`} />
                    {star} Star
                  </>
                )}
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 pointer-events-none" />
          <input
            type="text"
            placeholder="Search comments or suggestions..."
            className="w-full bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/5 focus:border-[var(--color-neon)]/50 rounded-xl py-2.5 pl-11 pr-4 text-sm text-slate-900 dark:text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-[var(--color-neon)]/30 transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* ── Feedback Cards ───────────────────────────────────────────────────── */}
      {loading && data.length === 0 ? (
        <div className="space-y-4">
          {Array(4).fill(0).map((_, i) => (
            <div key={i} className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/5 rounded-[2rem] p-7 h-48 animate-pulse" />
          ))}
        </div>
      ) : data.length === 0 ? (
        <div className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/5 rounded-[2rem] py-24 flex flex-col items-center gap-5">
          <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center">
            <MessageSquare className="w-9 h-9 text-slate-600" />
          </div>
          <div className="text-center">
            <p className="text-base font-bold text-slate-700 dark:text-slate-300 mb-1">No feedback found</p>
            <p className="text-sm text-slate-600">Try adjusting your filters or search query.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {data.map((feedback: any) => {
            const score = feedback.rating as number;
            return (
              <div
                key={feedback.id}
                className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/5 rounded-[2rem] p-7 space-y-5 hover:border-slate-200 dark:border-white/10 transition-all duration-300 group"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-4">
                    {/* Avatar */}
                    <div className={`w-12 h-12 rounded-full border border-slate-200 dark:border-white/10 flex items-center justify-center font-black text-sm uppercase ring-2 ring-offset-2 ring-offset-white dark:ring-offset-[#111111] ${
                      score >= 4 ? 'bg-emerald-50 dark:bg-white/5 text-emerald-600 dark:text-[var(--color-neon)] ring-emerald-100 dark:ring-[var(--color-neon)]/20' :
                      score === 3 ? 'bg-amber-50 dark:bg-white/5 text-amber-600 dark:text-amber-400 ring-amber-100 dark:ring-amber-400/20' :
                      'bg-red-50 dark:bg-white/5 text-red-600 dark:text-red-400 ring-red-100 dark:ring-red-400/20'
                    }`}>
                      {feedback.user.firstName[0]}{feedback.user.lastName[0]}
                    </div>
                    <div>
                      <h3 className="font-extrabold text-slate-900 dark:text-white">
                        {feedback.user.firstName} {feedback.user.lastName}
                      </h3>
                      <p className="text-[11px] text-slate-600 font-mono mt-0.5">
                        {feedback.user.email} · ID {feedback.user.id.substring(0, 8)}…
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-3">
                      <StarDisplay score={score} />
                      <span className={`text-xs font-extrabold font-mono ${STAR_COLORS[score] || 'text-amber-400'}`}>
                        {RATING_LABEL[score]}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-600 font-mono">
                      {new Date(feedback.createdAt).toLocaleDateString('en-NG', { dateStyle: 'medium' })}
                    </span>
                  </div>
                </div>

                {/* Tags */}
                {feedback.tags && feedback.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {feedback.tags.map((tag: string) => (
                      <span
                        key={tag}
                        className="flex items-center gap-1.5 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 text-slate-600 dark:text-slate-400 text-[10px] font-bold px-3 py-1 rounded-xl"
                      >
                        <Tag className="w-2.5 h-2.5" />
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Comment */}
                {feedback.feedback && (
                  <div className="bg-slate-50 dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/5 rounded-2xl p-5 relative">
                    <div className="flex items-center gap-2 mb-3">
                      <Quote className="w-3.5 h-3.5 text-slate-600" />
                      <p className="text-[9px] font-mono font-bold uppercase tracking-widest text-slate-600">Feedback Comment</p>
                    </div>
                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium italic">
                      "{feedback.feedback}"
                    </p>
                  </div>
                )}

                {/* Suggestions */}
                {feedback.suggestions && (
                  <div className="bg-[var(--color-neon)]/5 border border-[var(--color-neon)]/15 rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Lightbulb className="w-3.5 h-3.5 text-[var(--color-neon)]" />
                      <p className="text-[9px] font-mono font-bold uppercase tracking-widest text-[var(--color-neon)]/70">User Suggestion</p>
                    </div>
                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                      "{feedback.suggestions}"
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
