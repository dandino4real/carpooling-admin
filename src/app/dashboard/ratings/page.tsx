'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import {
  Star,
  Search,
  RefreshCw,
  ArrowLeft,
  ArrowRight,
  ArrowRight as ArrowRightIcon,
  BarChart3,
  MessageSquare,
  MapPin,
  Calendar,
  UserCheck,
  Car,
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
  4: 'bg-[var(--color-neon)]/70',
  3: 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.4)]',
  2: 'bg-orange-400',
  1: 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]',
};

const SCORE_LABEL: Record<number, string> = {
  5: 'Excellent', 4: 'Good', 3: 'Average', 2: 'Poor', 1: 'Terrible',
};

function StarRow({ score }: { score: number }) {
  return (
    <div className="flex gap-0.5 items-center">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`w-3.5 h-3.5 fill-current ${s <= score ? STAR_COLORS[score] || 'text-amber-400' : 'text-slate-900 dark:text-white/10'}`}
        />
      ))}
    </div>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 4
    ? 'bg-emerald-50 dark:bg-[var(--color-neon)]/10 text-emerald-600 dark:text-[var(--color-neon)] border-emerald-200 dark:border-[var(--color-neon)]/20'
    : score === 3
    ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/20'
    : 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/20';
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold border ${color}`}>
      <Star className="w-2.5 h-2.5 fill-current" />
      {score}/5 · {SCORE_LABEL[score]}
    </span>
  );
}

function UserPill({ name, role, isDriver }: { name: string; role: string; isDriver?: boolean }) {
  const initials = name.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase();
  return (
    <div className="flex items-center gap-3 min-w-0">
      <div className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-xs shrink-0 border ${
        isDriver
          ? 'bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-500/20 ring-1 ring-violet-500/10'
          : 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/20 ring-1 ring-blue-500/10'
      }`}>
        {initials}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{name}</p>
        <div className="flex items-center gap-1 mt-0.5">
          {isDriver ? <Car className="w-2.5 h-2.5 text-violet-500" /> : <UserCheck className="w-2.5 h-2.5 text-blue-500" />}
          <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wide">{role}</p>
        </div>
      </div>
    </div>
  );
}

export default function RatingsPage() {
  const [ratings, setRatings] = useState<any[]>([]);
  const [distribution, setDistribution] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [minScore, setMinScore] = useState('');
  const limit = 15;

  const fetchRatings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.listRatings({
        page, limit,
        minScore: minScore ? Number(minScore) : undefined,
        search: search || undefined,
      });
      setRatings(res.data ?? []);
      setDistribution(res.distribution ?? []);
      setTotal(res.total ?? 0);
    } catch {
      toast.error('Failed to load ratings');
    } finally {
      setLoading(false);
    }
  }, [page, minScore, search]);

  useEffect(() => { fetchRatings(); }, [fetchRatings]);

  const totalPages = Math.ceil(total / limit);

  // Compute average from distribution
  const avgRating = distribution.length > 0
    ? (distribution.reduce((sum, d) => sum + (d.score * (d._count?.score ?? 0)), 0) / (total || 1)).toFixed(1)
    : '—';

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">

      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter flex items-center gap-3">
            <div className="w-9 h-9 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-center">
              <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
            </div>
            Ratings & Reviews
          </h1>
          <p className="text-slate-500 text-sm mt-2 font-medium">
            Peer-to-peer driver and passenger feedback across all completed trips.
          </p>
        </div>
        <button
          onClick={fetchRatings}
          className="self-start sm:self-auto flex items-center gap-2 bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 text-xs font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer shadow-sm hover:shadow-md dark:shadow-none"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {/* ── Analytics Hero Row ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Average Score */}
        <div className="lg:col-span-2 bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/5 rounded-[2rem] p-8 flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute -top-20 -right-20 w-56 h-56 bg-amber-400/8 blur-[70px] rounded-full pointer-events-none group-hover:opacity-100 opacity-60 transition-opacity duration-500" />
          <div>
            <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2 mb-6">
              <BarChart3 className="w-3.5 h-3.5" />
              Platform Average Rating
            </p>
            <div className="flex items-end gap-3">
              <span className="text-8xl font-black tracking-tighter text-slate-900 dark:text-white leading-none">{avgRating}</span>
              <span className="text-2xl font-bold text-slate-600 pb-2">/ 5</span>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <div className="flex gap-0.5">
                {[1,2,3,4,5].map(s => (
                  <Star key={s} className={`w-5 h-5 fill-current ${s <= Math.round(Number(avgRating)) ? 'text-amber-400' : 'text-slate-900 dark:text-white/10'}`} />
                ))}
              </div>
              <span className="text-xs text-slate-500">{total} total reviews</span>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-3 gap-3">
            {[5, 4, 3].map(s => {
              const found = distribution.find(d => d.score === s);
              const count = found?._count?.score ?? 0;
              return (
                <div key={s} className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-xl px-3 py-2.5 text-center shadow-inner dark:shadow-none">
                  <p className={`text-2xl font-black ${s === 3 ? 'text-amber-500' : 'text-emerald-500 dark:text-[var(--color-neon)]'}`}>{count}</p>
                  <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mt-0.5">{s}★</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Distribution Bars */}
        <div className="lg:col-span-3 bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/5 rounded-[2rem] p-8">
          <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2 mb-7">
            <BarChart3 className="w-3.5 h-3.5" />
            Score Distribution
          </p>
          <div className="space-y-4">
            {[5, 4, 3, 2, 1].map(score => {
              const found = distribution.find(d => d.score === score);
              const count = found?._count?.score ?? 0;
              const pct = total > 0 ? Math.round((count / total) * 100) : 0;
              return (
                <div key={score} className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5 w-14 shrink-0">
                    <span className="text-sm font-black text-slate-700 dark:text-slate-300">{score}</span>
                    <Star className={`w-3.5 h-3.5 fill-current ${STAR_COLORS[score]}`} />
                  </div>
                  <div className="flex-1 h-2.5 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ease-out ${BAR_COLORS[score]}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="flex items-center gap-2 w-20 shrink-0 justify-end">
                    <span className="text-sm font-bold text-slate-900 dark:text-white">{count}</span>
                    <span className="text-[10px] font-mono text-slate-600 w-8 text-right">{pct}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Filters ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        {/* Search */}
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 pointer-events-none" />
          <input
            className="w-full bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/5 focus:border-[var(--color-neon)]/50 rounded-xl py-3 pl-11 pr-4 text-sm text-slate-900 dark:text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-[var(--color-neon)]/30 transition-all"
            placeholder="Search by user or comment..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>

        {/* Score filter pills */}
        <div className="flex items-center gap-2 flex-wrap shrink-0 bg-slate-50 dark:bg-transparent p-1.5 rounded-xl border border-slate-200 dark:border-transparent shadow-inner dark:shadow-none">
          {[{ label: 'All Stars', value: '' }, { label: '5★+', value: '5' }, { label: '4★+', value: '4' }, { label: '3★+', value: '3' }, { label: '2★+', value: '2' }, { label: '1★', value: '1' }].map(opt => (
            <button
              key={opt.value}
              onClick={() => { setMinScore(opt.value); setPage(1); }}
              className={`text-xs font-bold px-4 py-1.5 rounded-lg transition-all cursor-pointer ${
                minScore === opt.value
                  ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm dark:shadow-none'
                  : 'bg-transparent hover:bg-slate-100 dark:hover:bg-white/5 text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Review Cards ────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/5 rounded-[2rem] overflow-hidden">
        {/* List header */}
        <div className="px-8 py-5 border-b border-slate-200 dark:border-white/5 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-sm">
            <MessageSquare className="w-4 h-4 text-amber-400" />
            Review Feed
          </h3>
          {!loading && (
            <span className="text-[10px] font-mono text-slate-500 bg-slate-100 dark:bg-white/5 px-3 py-1 rounded-lg">
              {total} review{total !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {loading ? (
          <div className="divide-y divide-slate-100 dark:divide-white/5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="px-8 py-6 flex items-center gap-6 animate-pulse">
                <div className="w-9 h-9 bg-slate-100 dark:bg-white/5 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-100 dark:bg-white/5 rounded w-1/3" />
                  <div className="h-3 bg-slate-100 dark:bg-white/5 rounded w-1/2" />
                </div>
                <div className="w-24 h-4 bg-slate-100 dark:bg-white/5 rounded shrink-0" />
              </div>
            ))}
          </div>
        ) : ratings.length === 0 ? (
          <div className="py-24 flex flex-col items-center gap-5">
            <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 flex items-center justify-center">
              <Star className="w-9 h-9 text-slate-600" />
            </div>
            <div className="text-center">
              <p className="text-base font-bold text-slate-700 dark:text-slate-300 mb-1">No ratings found</p>
              <p className="text-sm text-slate-600">Try adjusting your search or filter.</p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-white/5">
            {ratings.map((r) => (
              <div key={r.id} className="px-8 py-6 flex flex-col lg:flex-row lg:items-center gap-6 hover:bg-slate-50 dark:bg-white/[0.02] transition-all duration-200 group">

                {/* Reviewer → Receiver */}
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <UserPill
                    name={`${r.giver?.firstName || ''} ${r.giver?.lastName || ''}`.trim()}
                    role={r.giver?.role || 'PASSENGER'}
                    isDriver={r.giver?.role === 'DRIVER'}
                  />
                  <div className="shrink-0 text-slate-700">
                    <ArrowRightIcon className="w-4 h-4" />
                  </div>
                  <UserPill
                    name={`${r.receiver?.firstName || ''} ${r.receiver?.lastName || ''}`.trim()}
                    role={r.receiver?.role || 'DRIVER'}
                    isDriver={r.receiver?.role === 'DRIVER'}
                  />
                </div>

                {/* Score */}
                <div className="shrink-0 space-y-1">
                  <StarRow score={r.score} />
                  <ScoreBadge score={r.score} />
                </div>

                {/* Comment */}
                <div className="flex-1 min-w-0 max-w-sm">
                  {r.comment ? (
                    <p className="text-xs text-slate-400 italic leading-relaxed line-clamp-2">
                      "{r.comment}"
                    </p>
                  ) : (
                    <span className="text-[11px] text-slate-600 italic">No comment left</span>
                  )}
                </div>

                {/* Trip + Date */}
                <div className="shrink-0 flex flex-col items-end gap-2">
                  {r.booking?.trip?.originState && (
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 px-3 py-1 rounded-lg">
                      <MapPin className="w-3 h-3 text-slate-600" />
                      {r.booking.trip.originState}
                      <span className="text-slate-700 mx-0.5">→</span>
                      {r.booking.trip.destinationState}
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-600 font-mono">
                    <Calendar className="w-3 h-3" />
                    {new Date(r.createdAt).toLocaleDateString('en-NG', { dateStyle: 'medium' })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="border-t border-slate-200 dark:border-white/5 px-8 py-5 flex items-center justify-between">
            <span className="text-xs text-slate-600 font-mono">{total} total · Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 hover:border-slate-200 dark:border-white/10 disabled:opacity-30 text-xs font-bold rounded-xl text-slate-400 hover:text-slate-900 dark:text-white transition-all cursor-pointer disabled:cursor-not-allowed"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Prev
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 hover:border-slate-200 dark:border-white/10 disabled:opacity-30 text-xs font-bold rounded-xl text-slate-400 hover:text-slate-900 dark:text-white transition-all cursor-pointer disabled:cursor-not-allowed"
              >
                Next <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
