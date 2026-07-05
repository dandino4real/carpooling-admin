'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { api, DriverProfile } from '@/lib/api';
import {
  Users,
  Car,
  UserCheck,
  Wifi,
  TrendingUp,
  Route,
  Clock,
  CheckCircle2,
  XCircle,
  Search,
  ShieldCheck,
  ChevronRight,
  Mail,
  Phone,
  AlertTriangle,
  RefreshCw,
  ArrowLeft,
  ArrowRight,
  FileSearch,
} from 'lucide-react';

const STATUS_TABS = [
  { label: 'Pending Review', value: 'SUBMITTED', color: 'text-amber-600 dark:text-amber-400', dot: 'bg-amber-500 dark:bg-amber-400' },
  { label: 'Under Review', value: 'UNDER_REVIEW', color: 'text-blue-600 dark:text-blue-400', dot: 'bg-blue-500 dark:bg-blue-400' },
  { label: 'Approved', value: 'APPROVED', color: 'text-green-600 dark:text-[var(--color-neon)]', dot: 'bg-green-500 dark:bg-[var(--color-neon)]' },
  { label: 'Rejected', value: 'REJECTED', color: 'text-red-600 dark:text-red-400', dot: 'bg-red-500 dark:bg-red-400' },
  { label: 'Suspended', value: 'SUSPENDED', color: 'text-orange-600 dark:text-orange-400', dot: 'bg-orange-500 dark:bg-orange-400' },
  { label: 'All Profiles', value: '', color: 'text-slate-500 dark:text-slate-300', dot: 'bg-slate-400 dark:bg-slate-400' },
];

interface OverviewStats {
  totalUsers: number;
  totalDrivers: number;
  totalPassengers: number;
  usersOnline: number;
  tripsCreatedToday: number;
  tripsBookedToday: number;
  tripsStartedToday: number;
  tripsCompletedToday: number;
  tripsCancelledToday: number;
  tripCompletionRate: number;
}

const getStatusStyle = (status: string) => {
  switch (status) {
    case 'SUBMITTED':     return 'bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/25';
    case 'UNDER_REVIEW':  return 'bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/25';
    case 'APPROVED':      return 'bg-green-100 dark:bg-[var(--color-neon)]/10 text-green-700 dark:text-[var(--color-neon)] border border-green-200 dark:border-[var(--color-neon)]/25';
    case 'REJECTED':      return 'bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-500/25';
    case 'SUSPENDED':     return 'bg-orange-100 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-500/25';
    default:              return 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/10';
  }
};

const getStatusLabel = (status: string) => {
  const map: Record<string, string> = {
    SUBMITTED: 'Submitted', UNDER_REVIEW: 'Under Review',
    APPROVED: 'Approved', REJECTED: 'Rejected', SUSPENDED: 'Suspended',
  };
  return map[status] || status;
};

function PlatformStatCard({ icon: Icon, label, value, color, pulse }: {
  icon: React.ElementType; label: string; value: string | number; color: string; pulse?: boolean;
}) {
  const colorBase = color.match(/text-([a-z]+)/)?.[1] || 'slate';
  return (
    <div className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/5 rounded-2xl p-6 flex items-center gap-5 group hover:border-slate-300 dark:hover:border-white/10 transition-all duration-300 shadow-sm hover:shadow-md dark:shadow-none">
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 bg-${colorBase}-50 dark:bg-white/5 border border-${colorBase}-100 dark:border-transparent transition-colors`}>
        <Icon className={`w-6 h-6 ${color}`} />
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-1.5 mb-1">
          {pulse && <span className={`w-1.5 h-1.5 rounded-full ${color.replace('text-', 'bg-')} animate-pulse shrink-0`} />}
          <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 truncate">{label}</p>
        </div>
        <p className={`text-3xl font-black tracking-tighter leading-none ${color}`}>{value}</p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [drivers, setDrivers] = useState<DriverProfile[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [status, setStatus] = useState('SUBMITTED');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => { fetchDrivers(); }, [page, status, search]);

  useEffect(() => {
    api.getOverviewStats()
      .then(setStats)
      .catch(() => {})
      .finally(() => setStatsLoading(false));
  }, []);

  const fetchDrivers = async () => {
    try {
      setLoading(true);
      setError('');
      const queryParams = new URLSearchParams({ page: page.toString(), limit: limit.toString() });
      if (status) queryParams.append('status', status);
      if (search.trim()) queryParams.append('search', search.trim());
      const res: any = await api.request(`/admin/drivers?${queryParams.toString()}`);
      setDrivers(res.data || []);
      setTotal(res.total || 0);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch driver queue.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const statItems = stats ? [
    { icon: Users,        label: 'Total Users',       value: stats.totalUsers,             color: 'text-indigo-600 dark:text-indigo-400' },
    { icon: Car,          label: 'Total Drivers',      value: stats.totalDrivers,            color: 'text-violet-600 dark:text-violet-400' },
    { icon: UserCheck,    label: 'Total Passengers',   value: stats.totalPassengers,         color: 'text-blue-600 dark:text-blue-400' },
    { icon: Wifi,         label: 'Online Now',         value: stats.usersOnline,             color: 'text-emerald-600 dark:text-[var(--color-neon)]', pulse: true },
    { icon: TrendingUp,   label: 'Trips Created',      value: stats.tripsCreatedToday,       color: 'text-slate-700 dark:text-slate-300', today: true },
    { icon: Route,        label: 'Trips Booked',       value: stats.tripsBookedToday,        color: 'text-slate-700 dark:text-slate-300', today: true },
    { icon: Clock,        label: 'In Progress',        value: stats.tripsStartedToday,       color: 'text-amber-600 dark:text-amber-400', today: true },
    { icon: CheckCircle2, label: 'Trips Completed',    value: stats.tripsCompletedToday,     color: 'text-green-600 dark:text-[var(--color-neon)]', today: true },
    { icon: XCircle,      label: 'Trips Cancelled',    value: stats.tripsCancelledToday,     color: 'text-red-600 dark:text-red-400', today: true },
  ] : [];

  const activeTab = STATUS_TABS.find(t => t.value === status) || STATUS_TABS[0];
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">

      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter flex items-center gap-3">
            <div className="w-9 h-9 bg-green-100 dark:bg-[var(--color-neon)]/10 border border-green-200 dark:border-[var(--color-neon)]/20 rounded-xl flex items-center justify-center shadow-sm dark:shadow-[0_0_15px_rgba(75,208,67,0.1)]">
              <ShieldCheck className="w-5 h-5 text-green-600 dark:text-[var(--color-neon)]" />
            </div>
            KYC Verifications
          </h1>
          <p className="text-slate-500 text-sm mt-2 font-medium">
            Review and manage driver identity & vehicle document submissions.
          </p>
        </div>
        <button
          onClick={fetchDrivers}
          className="self-start sm:self-auto flex items-center gap-2 bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 text-xs font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer shadow-sm dark:shadow-none"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {/* ── Platform Overview Stats ───────────────────────────────────────────── */}
      <div className="space-y-4">
        <h2 className="text-[10px] font-bold uppercase font-mono text-slate-500 tracking-widest">Platform Overview</h2>

        {/* Row 1: Platform Totals */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statsLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/5 rounded-2xl p-6 h-24 animate-pulse shadow-sm dark:shadow-none" />
              ))
            : statItems.slice(0, 4).map(({ icon, label, value, color, pulse }) => (
                <PlatformStatCard key={label} icon={icon} label={label} value={value.toLocaleString()} color={color} pulse={pulse} />
              ))
          }
        </div>

        {/* Row 2: Today's Activity Strip */}
        <div className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/5 rounded-2xl px-6 py-5 shadow-sm dark:shadow-none">
          <div className="flex items-center justify-between flex-wrap gap-6">
            <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500 dark:text-slate-600 shrink-0">Today's Activity</p>
            <div className="flex items-center flex-wrap gap-8 flex-1 justify-between">
              {statsLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="space-y-1.5 animate-pulse">
                      <div className="h-2.5 bg-slate-200 dark:bg-white/5 rounded w-20" />
                      <div className="h-6 bg-slate-200 dark:bg-white/5 rounded w-10" />
                    </div>
                  ))
                : statItems.slice(4).map(({ icon: Icon, label, value, color }) => (
                    <div key={label} className="text-center space-y-1">
                      <p className="text-[9px] font-mono font-bold uppercase tracking-widest text-slate-500 dark:text-slate-600">{label}</p>
                      <p className={`text-2xl font-black tracking-tighter leading-none ${color}`}>{value.toLocaleString()}</p>
                    </div>
                  ))
              }
              {/* Completion Rate */}
              {stats && (
                <div className="text-center space-y-2">
                  <p className="text-[9px] font-mono font-bold uppercase tracking-widest text-slate-500 dark:text-slate-600">Completion Rate</p>
                  <div className="flex items-center gap-2 justify-center">
                    <div className="w-20 h-1.5 bg-slate-200 dark:bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-1000"
                        style={{
                          width: `${stats.tripCompletionRate}%`,
                          backgroundColor: stats.tripCompletionRate >= 70 ? '#4bd043' : stats.tripCompletionRate >= 40 ? '#f59e0b' : '#ef4444',
                          boxShadow: `0 0 8px ${stats.tripCompletionRate >= 70 ? '#4bd043' : stats.tripCompletionRate >= 40 ? '#f59e0b' : '#ef4444'}`,
                        }}
                      />
                    </div>
                    <span className={`text-sm font-black font-mono ${stats.tripCompletionRate >= 70 ? 'text-green-600 dark:text-[var(--color-neon)]' : stats.tripCompletionRate >= 40 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>
                      {stats.tripCompletionRate}%
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Filter Row ───────────────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Pill Tabs */}
        <div className="flex flex-wrap gap-2">
          {STATUS_TABS.map((tab) => {
            const isActive = status === tab.value;
            return (
              <button
                key={tab.label}
                onClick={() => { setStatus(tab.value); setPage(1); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white shadow-sm dark:shadow-lg'
                    : 'bg-transparent border border-transparent hover:bg-slate-100 dark:hover:bg-white/5 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                {isActive && <span className={`w-1.5 h-1.5 rounded-full ${tab.dot}`} />}
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative w-full lg:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by name, email, or phone..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/5 focus:border-indigo-500 dark:focus:border-[var(--color-neon)]/50 rounded-xl py-2.5 pl-11 pr-4 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 dark:focus:ring-[var(--color-neon)]/30 transition-all shadow-sm dark:shadow-none"
          />
        </div>
      </div>

      {/* ── Error Banner ────────────────────────────────────────────────────── */}
      {error && (
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400 p-4 rounded-2xl flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span className="text-sm font-semibold">{error}</span>
          <button onClick={fetchDrivers} className="ml-auto text-xs font-bold text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 border border-red-200 dark:border-red-900/40 px-3 py-1.5 rounded-lg transition-all cursor-pointer">Retry</button>
        </div>
      )}

      {/* ── Driver List ──────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/5 rounded-[2rem] overflow-hidden shadow-sm dark:shadow-none">
        {/* List Header */}
        <div className="px-7 py-5 border-b border-slate-200 dark:border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className={`w-2 h-2 rounded-full ${activeTab.dot}`} />
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">{activeTab.label}</h3>
          </div>
          {!loading && (
            <span className="text-[10px] font-mono text-slate-500 bg-slate-100 dark:bg-white/5 px-3 py-1 rounded-lg">
              {total} result{total !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {loading ? (
          /* Skeleton */
          <div className="divide-y divide-slate-100 dark:divide-white/5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="px-7 py-6 flex items-center gap-5 animate-pulse">
                <div className="w-12 h-12 bg-slate-200 dark:bg-white/5 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-200 dark:bg-white/5 rounded w-1/4" />
                  <div className="h-3 bg-slate-200 dark:bg-white/5 rounded w-2/5" />
                  <div className="h-3 bg-slate-200 dark:bg-white/5 rounded w-1/3" />
                </div>
                <div className="h-9 w-36 bg-slate-200 dark:bg-white/5 rounded-xl shrink-0" />
              </div>
            ))}
          </div>
        ) : drivers.length === 0 ? (
          /* Empty State */
          <div className="py-24 flex flex-col items-center justify-center gap-5">
            <div className="w-20 h-20 rounded-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 flex items-center justify-center">
              <FileSearch className="w-9 h-9 text-slate-400 dark:text-slate-600" />
            </div>
            <div className="text-center">
              <p className="text-base font-bold text-slate-800 dark:text-slate-300 mb-1">No profiles found</p>
              <p className="text-sm text-slate-500 dark:text-slate-600">Try adjusting your search or switching tabs</p>
            </div>
          </div>
        ) : (
          /* Driver Rows */
          <div className="divide-y divide-slate-100 dark:divide-white/5">
            {drivers.map((driver) => {
              const initials = `${driver.user?.firstName?.[0] || 'D'}${driver.user?.lastName?.[0] || 'P'}`;
              return (
                <div
                  key={driver.id}
                  className="px-7 py-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-all duration-200 group"
                >
                  {/* Left: Avatar + Info */}
                  <div className="flex items-start gap-5">
                    {/* Avatar */}
                    <div className="relative shrink-0">
                      <div className="w-12 h-12 rounded-full bg-slate-50 dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/10 flex items-center justify-center font-black text-sm text-slate-700 dark:text-[var(--color-neon)] uppercase ring-1 ring-slate-900/5 dark:ring-[var(--color-neon)]/20 ring-offset-2 ring-offset-white dark:ring-offset-[#111111]">
                        {initials}
                      </div>
                      {/* Status dot */}
                      <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-[#111111] ${
                        driver.status === 'APPROVED' ? 'bg-green-500 dark:bg-[var(--color-neon)]' :
                        driver.status === 'SUBMITTED' ? 'bg-amber-500 dark:bg-amber-400' :
                        driver.status === 'UNDER_REVIEW' ? 'bg-blue-500 dark:bg-blue-400' :
                        driver.status === 'REJECTED' ? 'bg-red-500 dark:bg-red-400' : 'bg-orange-500 dark:bg-orange-400'
                      }`} />
                    </div>

                    <div className="min-w-0">
                      {/* Name + Badge */}
                      <div className="flex flex-wrap items-center gap-3 mb-2">
                        <span className="font-extrabold text-slate-900 dark:text-white text-base leading-tight">
                          {driver.user?.firstName} {driver.user?.lastName}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider ${getStatusStyle(driver.status)}`}>
                          {getStatusLabel(driver.status)}
                        </span>
                        {driver.user?.isActive === false && (
                          <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-500/25 animate-pulse">
                            Login Blocked
                          </span>
                        )}
                      </div>

                      {/* Contact */}
                      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-slate-500 mb-2">
                        <span className="flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-slate-400 dark:text-slate-600" />
                          {driver.user?.email || 'No email'}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-slate-400 dark:text-slate-600" />
                          {driver.user?.phone || 'No phone'}
                        </span>
                      </div>

                      {/* Vehicle + Date */}
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-600">
                        <Car className="w-3.5 h-3.5" />
                        <span className="font-semibold text-slate-700 dark:text-slate-400">
                          {driver.vehicleMake} {driver.vehicleModel}
                        </span>
                        <span className="font-mono bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 px-2 py-0.5 rounded-md text-slate-600 dark:text-slate-500">
                          {driver.vehiclePlate}
                        </span>
                        <span className="text-slate-300 dark:text-slate-700">·</span>
                        <Clock className="w-3.5 h-3.5" />
                        <span>{formatDate(driver.submittedAt || driver.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: CTA */}
                  <Link
                    href={`/dashboard/drivers/${driver.userId}`}
                    className="shrink-0 flex items-center gap-2 bg-white dark:bg-[var(--color-neon)] hover:bg-slate-50 dark:hover:bg-[var(--color-neon)]/90 text-slate-900 dark:text-black text-xs font-extrabold px-5 py-3 rounded-xl border border-slate-200 dark:border-transparent hover:border-slate-300 dark:hover:border-transparent transition-all cursor-pointer shadow-sm hover:shadow-md dark:shadow-[0_0_20px_rgba(75,208,67,0.2)] dark:hover:shadow-[0_0_30px_rgba(75,208,67,0.3)] group-hover:scale-[1.02] duration-200"
                  >
                    Inspect Documents
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Pagination ────────────────────────────────────────────────────────── */}
      {total > limit && (
        <div className="flex items-center justify-between gap-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/5 hover:bg-slate-50 dark:hover:border-white/10 disabled:opacity-50 dark:disabled:opacity-30 text-xs font-bold rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer disabled:cursor-not-allowed shadow-sm dark:shadow-none"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Previous
          </button>

          <div className="flex items-center gap-1.5">
            {Array.from({ length: Math.min(totalPages, 7) }).map((_, i) => {
              const pageNum = i + 1;
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={`w-9 h-9 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    page === pageNum
                      ? 'bg-indigo-600 dark:bg-[var(--color-neon)] text-white dark:text-black shadow-md dark:shadow-[0_0_15px_rgba(75,208,67,0.25)]'
                      : 'bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:border-white/10 hover:text-slate-900 dark:hover:text-white shadow-sm dark:shadow-none'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
            {totalPages > 7 && <span className="text-slate-400 dark:text-slate-600 px-1">...</span>}
          </div>

          <button
            onClick={() => setPage((p) => (p * limit < total ? p + 1 : p))}
            disabled={page * limit >= total}
            className="flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/5 hover:bg-slate-50 dark:hover:border-white/10 disabled:opacity-50 dark:disabled:opacity-30 text-xs font-bold rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer disabled:cursor-not-allowed shadow-sm dark:shadow-none"
          >
            Next
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
