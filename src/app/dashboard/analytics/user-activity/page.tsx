'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import {
  Users, Car, UserCheck, Wifi, TrendingUp, Smartphone,
  Monitor, Globe, MapPin, RotateCcw, UserPlus, Repeat,
} from 'lucide-react';
import { api } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AnalyticsData {
  summary: { dau: number; wau: number; mau: number; newUsers: number; returningUsers: number; totalUsers: number };
  activityTrend: { date: string; activeUsers: number }[];
  driverActivity: { activeToday: number; activeWeek: number; activeMonth: number };
  passengerActivity: { activeToday: number; activeWeek: number; activeMonth: number };
  deviceBreakdown: { android: number; ios: number; web: number; total: number };
  topStates: { state: string; count: number }[];
}

const DEVICE_COLORS = ['#6366f1', '#22c55e', '#f59e0b'];
const DEVICE_LABELS = ['Android', 'iOS', 'Web'];

const fmt = (n: number) => n.toLocaleString();

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  label, value, icon, color, sub,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  sub?: string;
}) {
  return (
    <div className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/5 rounded-[2rem] p-6 shadow-sm hover:border-slate-300 dark:hover:border-white/10 transition-colors flex flex-col justify-between min-h-[160px] group">
      <div className="flex justify-between items-start mb-4">
        <span className="block text-[10px] uppercase font-mono font-bold text-slate-400 dark:text-slate-500 tracking-widest max-w-[70%] leading-relaxed">{label}</span>
        <div className={`w-11 h-11 rounded-[14px] flex items-center justify-center shrink-0 ${color}`}>
          {icon}
        </div>
      </div>
      <div>
        <span className="block text-4xl font-black text-slate-800 dark:text-white tracking-tighter drop-shadow-sm">{typeof value === 'number' ? fmt(value) : value}</span>
        {sub && <span className="block text-[9px] text-slate-400 dark:text-slate-500 mt-2 font-mono uppercase tracking-widest">{sub}</span>}
      </div>
    </div>
  );
}

// ─── Segment Group ────────────────────────────────────────────────────────────

function SegmentCard({
  label, icon, bg, items,
}: {
  label: string;
  icon: React.ReactNode;
  bg: string;
  items: { label: string; value: number }[];
}) {
  return (
    <div className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/5 rounded-[2rem] overflow-hidden shadow-sm group hover:border-slate-300 dark:hover:border-white/10 transition-colors">
      <div className={`flex items-center gap-3 px-6 py-5 border-b border-slate-100 dark:border-white/5 ${bg}`}>
        <div className="bg-white/50 dark:bg-black/20 p-2.5 rounded-[14px] shadow-sm border border-black/5 dark:border-white/5">
          {icon}
        </div>
        <span className="font-black text-slate-800 dark:text-white text-lg tracking-tight">{label}</span>
      </div>
      <div className="p-6 grid grid-cols-3 gap-6 divide-x divide-slate-100 dark:divide-white/5 bg-slate-50/50 dark:bg-transparent">
        {items.map(({ label: l, value: v }) => (
          <div key={l} className="text-center px-2">
            <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-mono font-bold mb-3 flex items-end justify-center leading-tight min-h-[2.5rem]">{l}</p>
            <p className="text-3xl font-black text-slate-800 dark:text-white tracking-tighter">{fmt(v)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/5 rounded-2xl p-4 shadow-xl text-xs min-w-[120px]">
      <p className="font-mono font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} className="font-black text-sm flex items-center justify-between gap-4" style={{ color: p.color }}>
          <span>{p.name}</span>
          <span>{fmt(p.value)}</span>
        </p>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function UserActivityPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.getUserActivityAnalytics();
      setData(res);
    } catch (e: any) {
      setError(e.message || 'Failed to load analytics.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6 animate-pulse">
        <div className="h-8 w-64 bg-slate-200 dark:bg-slate-800 rounded-xl" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-24 bg-slate-100 dark:bg-slate-800/50 rounded-2xl" />
          ))}
        </div>
        <div className="h-72 bg-slate-100 dark:bg-slate-800/50 rounded-2xl" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-md mx-auto mt-16 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-2xl p-8 text-center space-y-3">
        <p className="text-sm font-semibold text-red-600 dark:text-red-400">{error || 'No data available.'}</p>
        <button onClick={load} className="text-xs font-bold text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/30 px-4 py-2 rounded-xl cursor-pointer hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors">
          Retry
        </button>
      </div>
    );
  }

  const { summary, activityTrend, driverActivity, passengerActivity, deviceBreakdown, topStates } = data;
  const maxState = topStates[0]?.count || 1;

  const deviceData = [
    { name: 'Android', value: deviceBreakdown.android },
    { name: 'iOS',     value: deviceBreakdown.ios },
    { name: 'Web',     value: deviceBreakdown.web },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-2.5">
            <TrendingUp className="w-7 h-7 text-indigo-500" />
            User Activity
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Platform engagement metrics — daily, weekly, and monthly active users.
          </p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-300 dark:hover:border-indigo-900 px-4 py-2.5 rounded-xl transition-all cursor-pointer shadow-sm"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* ── User Activity Summary ──────────────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-xs font-bold uppercase font-mono text-slate-400 dark:text-slate-500 tracking-widest pl-2">User Activity Summary</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6">
          <StatCard label="Daily Active" value={summary.dau} icon={<Wifi className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />} color="bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/30" />
          <StatCard label="Weekly Active" value={summary.wau} icon={<TrendingUp className="w-5 h-5 text-violet-600 dark:text-violet-400" />} color="bg-violet-50 dark:bg-violet-950/30 border border-violet-100 dark:border-violet-900/30" />
          <StatCard label="Monthly Active" value={summary.mau} icon={<Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />} color="bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/30" />
          <StatCard label="New Users (7d)" value={summary.newUsers} icon={<UserPlus className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />} color="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/30" />
          <StatCard label="Returning Users" value={summary.returningUsers} icon={<Repeat className="w-5 h-5 text-amber-600 dark:text-amber-400" />} color="bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/30" />
        </div>
      </section>

      {/* ── Activity Trend Chart ───────────────────────────────────────────────── */}
      <section className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/5 rounded-[2rem] p-8 shadow-sm space-y-6">
        <div>
          <h2 className="text-lg font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-indigo-500" />
            Daily Activity Trend
          </h2>
          <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mt-1">Unique active users over the last 14 days</p>
        </div>
        <div className="w-full bg-slate-50 dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/5 rounded-[1.5rem] p-6 shadow-inner">
          <ResponsiveContainer width="100%" height={288} minWidth={1} minHeight={1}>
            <AreaChart data={activityTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="actGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.2} />
              <XAxis dataKey="date" stroke="#475569" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(d) => d.slice(5)} />
              <YAxis stroke="#475569" fontSize={11} tickLine={false} axisLine={false} width={40} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="activeUsers" name="Active Users" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#actGrad)" dot={false} activeDot={{ r: 6, fill: '#6366f1', strokeWidth: 0 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* ── User Segmentation ─────────────────────────────────────────────────── */}
      <section className="space-y-4 pt-4">
        <h2 className="text-xs font-bold uppercase font-mono text-slate-400 dark:text-slate-500 tracking-widest pl-2">User Segmentation</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <SegmentCard
            label="Drivers"
            icon={<Car className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />}
            bg="bg-indigo-50 dark:bg-indigo-900/10"
            items={[
              { label: 'Active Today', value: driverActivity.activeToday },
              { label: 'Active This Week', value: driverActivity.activeWeek },
              { label: 'Active This Month', value: driverActivity.activeMonth },
            ]}
          />
          <SegmentCard
            label="Passengers"
            icon={<UserCheck className="w-5 h-5 text-violet-600 dark:text-violet-400" />}
            bg="bg-violet-50 dark:bg-violet-900/10"
            items={[
              { label: 'Active Today', value: passengerActivity.activeToday },
              { label: 'Active This Week', value: passengerActivity.activeWeek },
              { label: 'Active This Month', value: passengerActivity.activeMonth },
            ]}
          />
        </div>
      </section>

      {/* ── Device Analytics + Geographic Activity ────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4">

        {/* Device breakdown */}
        <section className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/5 rounded-[2rem] p-8 shadow-sm space-y-6 flex flex-col">
          <div>
            <h2 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2 tracking-tight">
              <Smartphone className="w-5 h-5 text-indigo-500" /> Device Analytics
            </h2>
            <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mt-1">Platform usage by device type (last 30 days)</p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-8 flex-1 bg-slate-50 dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/5 rounded-[1.5rem] p-6 shadow-inner">
            <PieChart width={180} height={180}>
              <Pie data={deviceData} dataKey="value" cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={4} strokeWidth={0}>
                {deviceData.map((_, i) => (
                  <Cell key={i} fill={DEVICE_COLORS[i]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
            <div className="flex-1 space-y-4 w-full">
              {deviceData.map((d, i) => {
                const pct = deviceBreakdown.total > 0 ? Math.round((d.value / deviceBreakdown.total) * 100) : 0;
                const icons = [
                  <Smartphone key="a" className="w-5 h-5" />,
                  <Globe key="b" className="w-5 h-5" />,
                  <Monitor key="c" className="w-5 h-5" />,
                ];
                return (
                  <div key={d.name} className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center border" style={{ backgroundColor: `${DEVICE_COLORS[i]}15`, color: DEVICE_COLORS[i], borderColor: `${DEVICE_COLORS[i]}30` }}>
                      {icons[i]}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{d.name}</span>
                        <span className="text-[10px] font-mono font-bold text-slate-400">{fmt(d.value)} ({pct}%)</span>
                      </div>
                      <div className="h-2 bg-slate-200/50 dark:bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: DEVICE_COLORS[i] }} />
                      </div>
                    </div>
                  </div>
                );
              })}
              <div className="pt-2 border-t border-slate-200 dark:border-white/5 mt-2">
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono font-bold uppercase tracking-widest text-center">
                  Total sessions: {fmt(deviceBreakdown.total)}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Geographic activity */}
        <section className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/5 rounded-[2rem] p-8 shadow-sm space-y-6 flex flex-col">
          <div>
            <h2 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2 tracking-tight">
              <MapPin className="w-5 h-5 text-emerald-500" /> Geographic Activity
            </h2>
            <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mt-1">Most active states by registered users</p>
          </div>

          {topStates.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-slate-400 dark:text-slate-600 text-xs font-mono font-bold tracking-widest bg-slate-50 dark:bg-[#0a0a0a] rounded-[1.5rem] border border-slate-200 dark:border-white/5">
              No geographic data available.
            </div>
          ) : (
            <div className="space-y-4 flex-1 bg-slate-50 dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/5 rounded-[1.5rem] p-6 shadow-inner overflow-y-auto max-h-[340px]">
              {topStates.map((s, i) => {
                const pct = Math.round((s.count / maxState) * 100);
                return (
                  <div key={s.state} className="flex items-center gap-4 group">
                    <div className="w-6 text-right">
                      <span className="text-[10px] font-mono font-black text-slate-300 dark:text-slate-600 group-hover:text-emerald-500 transition-colors">{i + 1}</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">{s.state}</span>
                        <span className="text-[10px] font-mono font-bold text-slate-400">{fmt(s.count)} users</span>
                      </div>
                      <div className="h-2 bg-slate-200/50 dark:bg-white/5 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all group-hover:bg-emerald-400"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
