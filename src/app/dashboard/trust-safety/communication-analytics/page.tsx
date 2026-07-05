'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  Activity, PhoneCall, PhoneForwarded, PhoneMissed, Clock,
  MessageSquare, MessagesSquare, Zap, BarChart3, AlertTriangle
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

type Period = 'today' | '7d' | '30d' | '90d';
const PERIODS: { key: Period; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: '7d',    label: '7 Days' },
  { key: '30d',   label: '30 Days' },
  { key: '90d',   label: '90 Days' },
];
const DAYS_7 = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// ─── Helpers ────────────────────────────────────────────────────────────────

function sparklinePath(data: number[], w = 320, h = 80): string {
  if (data.every(v => v === 0)) return `M 0,${h} L ${w},${h}`;
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 8) - 4;
    return `${x},${y}`;
  });
  return 'M ' + pts.join(' L ');
}

function KpiCard({ label, value, sub, icon, accentColor }: {
  label: string; value: string | number; sub?: string; icon: React.ReactNode; accentColor: string;
}) {
  return (
    <div className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/5 rounded-[2rem] p-6 shadow-sm flex flex-col gap-4 transition-all hover:-translate-y-1 hover:shadow-md hover:border-slate-300 dark:hover:border-white/10 duration-300">
      <div className="flex items-start justify-between">
        <span className="text-[10px] font-bold uppercase tracking-widest font-mono text-slate-500 dark:text-slate-400">{label}</span>
        <div className={`w-14 h-14 rounded-[1rem] flex items-center justify-center shrink-0 shadow-inner ${accentColor}`}>
          {icon}
        </div>
      </div>
      <div>
        <span className="text-3xl font-black text-slate-800 dark:text-white tracking-tight leading-none">{typeof value === 'number' ? value.toLocaleString() : value}</span>
        {sub && <span className="ml-2 text-[11px] font-bold text-slate-400 dark:text-slate-500">{sub}</span>}
      </div>
    </div>
  );
}

function SparklineCard({ title, data, labels, color, format }: {
  title: string; data: number[]; labels: string[]; color: string; format?: (n: number) => string;
}) {
  const W = 320, H = 80;
  const path = sparklinePath(data, W, H);
  const max = Math.max(...data, 1);
  const min = Math.min(...data);
  const fmt = format ?? ((n: number) => n.toLocaleString());
  return (
    <div className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/5 rounded-[2rem] p-6 lg:p-8 shadow-sm transition-colors hover:border-slate-300 dark:hover:border-white/10">
      <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 mb-6">{title}</h3>
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-24 overflow-visible" preserveAspectRatio="none">
          <defs>
            <linearGradient id={`g-${title.replace(/\s/g, '')}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.25" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
            <filter id={`glow-${title.replace(/\s/g, '')}`} x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>
          <path d={path + ` L ${W},${H} L 0,${H} Z`} fill={`url(#g-${title.replace(/\s/g, '')})`} />
          <path d={path} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" filter={`url(#glow-${title.replace(/\s/g, '')})`} />
          {data.map((v, i) => {
            const x = (i / (data.length - 1)) * W;
            const range = max - min || 1;
            const y = H - ((v - min) / range) * (H - 8) - 4;
            return <circle key={i} cx={x} cy={y} r="4" fill="white" stroke={color} strokeWidth="2.5" className="dark:fill-slate-900" />;
          })}
        </svg>
      </div>
      <div className="flex justify-between mt-3">
        {labels.map((l, i) => <span key={i} className="text-[10px] font-bold text-slate-400 font-mono tracking-wider">{l}</span>)}
      </div>
      <div className="flex items-center justify-between mt-5 pt-4 border-t border-slate-100 dark:border-slate-800/60">
        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">Low: <span className="font-bold text-slate-700 dark:text-slate-200">{fmt(min)}</span></div>
        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">High: <span className="font-bold text-slate-700 dark:text-slate-200">{fmt(max)}</span></div>
        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">Latest: <span className="font-bold text-indigo-600 dark:text-indigo-400">{fmt(data[data.length - 1] ?? 0)}</span></div>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return <div className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/5 rounded-[2rem] p-6 h-40 animate-pulse shadow-sm" />;
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function CommunicationAnalyticsPage() {
  const [period, setPeriod]   = useState<Period>('today');
  const [data, setData]       = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const load = useCallback(async (p: Period) => {
    setLoading(true); setError(null);
    try {
      const res = await api.getCommunicationAnalytics(p);
      setData(res);
    } catch {
      setError('Failed to load analytics. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(period); }, [period, load]);

  const kpi            = data?.kpi ?? {};
  const trend7d        = data?.trend7d ?? { calls: Array(7).fill(0), messages: Array(7).fill(0), durSec: Array(7).fill(0) };
  const connectedTrend = data?.connectedTrend ?? Array(7).fill(0);
  const missedTrend    = data?.missedTrend    ?? Array(7).fill(0);
  const maxBar         = Math.max(...connectedTrend, ...missedTrend, 1);

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-2.5">
            <Activity className="w-7 h-7 text-indigo-500" />
            Communication Analytics
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Analyze platform-wide phone and messaging usage statistics.
          </p>
        </div>

        {/* Period selector */}
        <div className="flex bg-slate-50 dark:bg-slate-900/50 p-1.5 rounded-[1.5rem] border border-slate-200 dark:border-slate-800 shrink-0 shadow-inner">
          {PERIODS.map(p => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`text-[11px] font-black uppercase tracking-wider px-6 py-3 rounded-xl transition-all cursor-pointer ${
                period === p.key
                  ? 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-400 shadow-sm border border-slate-200 dark:border-slate-700'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 border border-transparent'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Privacy notice */}
      <div className="bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 rounded-2xl px-6 py-4 flex items-start gap-3 shadow-sm animate-in fade-in slide-in-from-bottom-2">
        <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-bold text-amber-800 dark:text-amber-400">Aggregate Metrics Only</p>
          <p className="text-xs text-amber-700/80 dark:text-amber-500/80 mt-1 font-medium">Anonymised platform-wide statistics. Raw conversations require a documented access justification on the Investigations page.</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-xl px-5 py-4 text-sm text-red-600 dark:text-red-400 font-bold">{error}</div>
      )}

      {/* ── Phone KPIs ─────────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 font-mono">📞 Phone Activity</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {loading ? Array(4).fill(0).map((_, i) => <SkeletonCard key={i} />) : (<>
            <KpiCard
              label="Total Calls" value={kpi.totalCalls ?? 0}
              icon={<PhoneCall className="w-5 h-5 text-indigo-700 dark:text-indigo-400" />}
              accentColor="bg-indigo-100 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/30"
            />
            <KpiCard
              label="Connected" value={kpi.connectedCalls ?? 0}
              sub={kpi.totalCalls > 0 ? `${Math.round((kpi.connectedCalls / kpi.totalCalls) * 100)}%` : ''}
              icon={<PhoneForwarded className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />}
              accentColor="bg-emerald-100 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/30"
            />
            <KpiCard
              label="Missed" value={kpi.missedCalls ?? 0}
              sub={kpi.totalCalls > 0 ? `${Math.round((kpi.missedCalls / kpi.totalCalls) * 100)}%` : ''}
              icon={<PhoneMissed className="w-5 h-5 text-red-700 dark:text-red-400" />}
              accentColor="bg-red-100 dark:bg-red-950/40 border border-red-200 dark:border-red-900/30"
            />
            <KpiCard
              label="Avg. Duration" value={kpi.avgDuration ?? '0m 0s'}
              icon={<Clock className="w-5 h-5 text-blue-700 dark:text-blue-400" />}
              accentColor="bg-blue-100 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/30"
            />
          </>)}
        </div>
      </section>

      {/* ── Messaging KPIs ─────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 font-mono mt-6">💬 Messaging Activity</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {loading ? Array(4).fill(0).map((_, i) => <SkeletonCard key={i} />) : (<>
            <KpiCard
              label="Messages" value={kpi.totalMessages ?? 0}
              icon={<MessageSquare className="w-5 h-5 text-violet-700 dark:text-violet-400" />}
              accentColor="bg-violet-100 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-900/30"
            />
            <KpiCard
              label="Active Convos" value={kpi.activeConvos ?? 0}
              icon={<MessagesSquare className="w-5 h-5 text-cyan-700 dark:text-cyan-400" />}
              accentColor="bg-cyan-100 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-900/30"
            />
            <KpiCard
              label="Avg. Response" value={kpi.avgResponseTime ?? '0m 0s'}
              icon={<Zap className="w-5 h-5 text-amber-700 dark:text-amber-400" />}
              accentColor="bg-amber-100 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/30"
            />
            {/* Custom Comm. Rate Card */}
            <div className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/5 rounded-[2rem] p-6 flex flex-col justify-between shadow-sm transition-all hover:-translate-y-1 hover:shadow-md hover:border-slate-300 dark:hover:border-white/10 duration-300">
              <div>
                <div className="flex items-start justify-between mb-4">
                  <span className="text-[10px] font-bold uppercase tracking-widest font-mono text-slate-500 dark:text-slate-400">Comm. Rate/Trip</span>
                  <div className="w-14 h-14 rounded-[1rem] flex items-center justify-center bg-rose-100 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/30 shadow-inner">
                    <BarChart3 className="w-5 h-5 text-rose-700 dark:text-rose-400" />
                  </div>
                </div>
                <div className="flex items-baseline gap-2 mb-4">
                  <span className="text-3xl font-black text-slate-800 dark:text-white tracking-tight leading-none">{kpi.commRatePercent ?? 0}%</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800/80 rounded-full h-3 mb-3 overflow-hidden shadow-inner border border-slate-200 dark:border-transparent">
                  <div className="bg-rose-500 h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_8px_rgba(244,63,94,0.6)]" style={{ width: `${kpi.commRatePercent ?? 0}%` }} />
                </div>
              </div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider mt-auto">Trips w/ comms ÷ Total trips</p>
            </div>
          </>)}
        </div>
      </section>

      {/* ── Charts ─────────────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 font-mono mt-6">📈 Trend Charts (Last 7 Days)</h2>
        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {Array(3).fill(0).map((_, i) => <div key={i} className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/5 rounded-[2rem] h-64 animate-pulse shadow-sm" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <SparklineCard title="Calls Per Day"          data={trend7d.calls}    labels={DAYS_7} color="#6366f1" />
            <SparklineCard title="Messages Per Day"       data={trend7d.messages} labels={DAYS_7} color="#8b5cf6" />
            <SparklineCard title="Avg. Duration (sec)"    data={trend7d.durSec}   labels={DAYS_7} color="#0ea5e9"
              format={n => `${Math.floor(n / 60)}m ${n % 60}s`} />
          </div>
        )}
      </section>

      {/* ── Connected vs Missed bar chart ─────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 font-mono mt-6">📊 Connectivity</h2>
        <div className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/5 rounded-[2rem] p-6 lg:p-8 shadow-sm transition-colors hover:border-slate-300 dark:hover:border-white/10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
            <h3 className="text-sm font-black text-slate-800 dark:text-slate-100">Connected vs Missed Calls</h3>
            <div className="flex items-center gap-5 text-[11px] font-bold uppercase tracking-widest">
              <span className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                <span className="w-3.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]" /> Connected
              </span>
              <span className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <span className="w-3.5 h-1.5 rounded-full bg-red-400 shadow-[0_0_6px_rgba(248,113,113,0.5)]" /> Missed
              </span>
            </div>
          </div>
          {loading ? <div className="h-48 bg-slate-100 dark:bg-slate-800/50 rounded-2xl animate-pulse" /> : (
            <div className="flex items-end gap-3 h-48">
              {DAYS_7.map((day, i) => (
                <div key={day} className="flex-1 flex flex-col items-center gap-3 group">
                  <div className="w-full max-w-[56px] flex gap-1 items-end h-40 relative">
                    <div
                      className="flex-1 bg-emerald-500 rounded-t-lg transition-all duration-500 group-hover:brightness-110 shadow-[0_0_10px_rgba(16,185,129,0.2)]"
                      style={{ height: `${(connectedTrend[i] / maxBar) * 100}%` }}
                      title={`Connected: ${connectedTrend[i]}`}
                    />
                    <div
                      className="flex-1 bg-red-400 rounded-t-lg transition-all duration-500 group-hover:brightness-110 shadow-[0_0_10px_rgba(248,113,113,0.2)]"
                      style={{ height: `${(missedTrend[i] / maxBar) * 100}%` }}
                      title={`Missed: ${missedTrend[i]}`}
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold tracking-widest font-mono">{day}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
