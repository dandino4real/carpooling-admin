'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldAlert, Lock, Smartphone, AlertTriangle,
  Search, Filter, RefreshCw, CheckCircle2, XCircle,
  ChevronLeft, ChevronRight, X, ChevronDown, Check
} from 'lucide-react';
import { api } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SecurityMetrics {
  failedLoginsToday: number;
  lockedAccounts: number;
  newDevicesDetected: number;
  suspiciousActivities: number;
}

interface LoginLog {
  id: string;
  userId: string;
  deviceName: string | null;
  deviceOs: string | null;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: string;
  isRevoked: boolean;
  expiresAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
    role: 'DRIVER' | 'PASSENGER' | 'ADMIN';
    avatarUrl: string | null;
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseBrowser(ua: string | null): string {
  if (!ua) return 'Unknown';
  const u = ua.toLowerCase();
  if (u.includes('edg/') || u.includes('edge/'))  return 'Edge';
  if (u.includes('chrome'))  return 'Chrome';
  if (u.includes('firefox')) return 'Firefox';
  if (u.includes('safari'))  return 'Safari';
  if (u.includes('opera'))   return 'Opera';
  return 'Browser';
}

function parseOs(os: string | null, ua: string | null): string {
  if (os) return os;
  if (!ua) return 'Unknown';
  const u = ua.toLowerCase();
  if (u.includes('windows'))    return 'Windows';
  if (u.includes('macintosh')) return 'macOS';
  if (u.includes('android'))   return 'Android';
  if (u.includes('iphone') || u.includes('ipad')) return 'iOS';
  if (u.includes('linux'))     return 'Linux';
  return 'Unknown OS';
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('en-NG', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

const ROLE_BADGES: Record<string, string> = {
  DRIVER:    'text-indigo-800 bg-indigo-100 border-indigo-200 dark:text-indigo-400 dark:bg-indigo-950/30 dark:border-indigo-900/30',
  PASSENGER: 'text-blue-800 bg-blue-100 border-blue-200 dark:text-blue-400 dark:bg-blue-950/30 dark:border-blue-900/30',
  ADMIN:     'text-violet-800 bg-violet-100 border-violet-200 dark:text-violet-400 dark:bg-violet-950/30 dark:border-violet-900/30',
};

// ─── Metric Card ──────────────────────────────────────────────────────────────

function MetricCard({
  label, value, icon, color, sub,
}: {
  label: string; value: number; icon: React.ReactNode; color: string; sub?: string;
}) {
  return (
    <div className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/5 rounded-[2rem] p-6 shadow-sm flex items-center gap-5 transition-all hover:-translate-y-1 hover:shadow-md hover:border-slate-300 dark:hover:border-white/10 duration-300 group">
      <div className={`w-14 h-14 rounded-[1rem] flex items-center justify-center shrink-0 shadow-inner ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-mono font-bold tracking-widest leading-tight mb-1">{label}</p>
        <p className="text-3xl font-black text-slate-800 dark:text-white leading-none tracking-tight">{value.toLocaleString()}</p>
        {sub && <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold mt-1.5">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Custom Dropdown ──────────────────────────────────────────────────────────

function CustomDropdown({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: string }[];
  value: string;
  onChange: (val: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value) || options[0];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 focus:border-slate-800 dark:focus:border-slate-500 rounded-xl py-3 pl-4 pr-3 text-slate-900 dark:text-white text-sm font-bold focus:outline-none focus:ring-4 focus:ring-slate-500/10 transition-all shadow-inner cursor-pointer"
      >
        <span className="truncate">{selected.label}</span>
        <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] dark:shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="py-2 flex flex-col max-h-60 overflow-y-auto">
              {options.map((option) => {
                const isSelected = option.value === value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      onChange(option.value);
                      setOpen(false);
                    }}
                    className={`flex items-center justify-between w-full px-4 py-2.5 text-sm font-bold transition-colors ${
                      isSelected
                        ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    {option.label}
                    {isSelected && <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const DATE_RANGES = [
  { label: 'All Time', value: '' },
  { label: 'Today',    value: 'today' },
  { label: '7 Days',   value: '7d' },
  { label: '30 Days',  value: '30d' },
];
const ROLE_FILTERS = [
  { label: 'All Roles',  value: '' },
  { label: 'Drivers',    value: 'DRIVER' },
  { label: 'Passengers', value: 'PASSENGER' },
];

export default function LoginActivityPage() {
  const [metrics, setMetrics] = useState<SecurityMetrics | null>(null);
  const [logs, setLogs] = useState<LoginLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [metricsLoading, setMetricsLoading] = useState(true);

  const [dateRange, setDateRange] = useState('7d');
  const [role, setRole] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const limit = 25;
  const totalPages = Math.ceil(total / limit);

  const loadMetrics = useCallback(async () => {
    try {
      setMetricsLoading(true);
      const m = await api.getSecurityMetrics();
      setMetrics(m);
    } catch { /* silent */ } finally {
      setMetricsLoading(false);
    }
  }, []);

  const loadLogs = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.getLoginLogs({ page, limit, dateRange: dateRange || undefined, role: role || undefined, search: search || undefined });
      setLogs(Array.isArray(res.data) ? res.data : []);
      setTotal(res.total || 0);
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, [page, dateRange, role, search]);

  useEffect(() => { loadMetrics(); }, [loadMetrics]);
  useEffect(() => { loadLogs(); }, [loadLogs]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-2.5">
            <ShieldAlert className="w-7 h-7 text-indigo-500" />
            Login Activity
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Successful login history and security monitoring for all platform users.
          </p>
        </div>
        <button
          onClick={() => { loadMetrics(); loadLogs(); }}
          className="flex items-center gap-2 text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-300 dark:hover:border-indigo-900 px-5 py-2.5 rounded-xl transition-all shadow-sm"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* ── Security Metrics ───────────────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-[10px] font-bold uppercase font-mono text-slate-500 dark:text-slate-400 tracking-widest">Security Metrics</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {metricsLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-28 bg-white dark:bg-slate-900/20 border border-slate-200 dark:border-slate-900 rounded-2xl animate-pulse shadow-sm" />
            ))
          ) : metrics ? (
            <>
              <MetricCard label="Failed Logins Today" value={metrics.failedLoginsToday} icon={<XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />} color="bg-red-100 dark:bg-red-950/40 border border-red-200 dark:border-red-900/30" sub="Users with failed attempts" />
              <MetricCard label="Locked Accounts" value={metrics.lockedAccounts} icon={<Lock className="w-6 h-6 text-orange-600 dark:text-orange-400" />} color="bg-orange-100 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-900/30" sub="Currently locked out" />
              <MetricCard label="New Devices (24h)" value={metrics.newDevicesDetected} icon={<Smartphone className="w-6 h-6 text-blue-600 dark:text-blue-400" />} color="bg-blue-100 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/30" sub="New trusted devices" />
              <MetricCard label="Suspicious Activity" value={metrics.suspiciousActivities} icon={<AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400" />} color="bg-amber-100 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/30" sub="3+ failed attempts" />
            </>
          ) : null}
        </div>
      </section>

      {/* ── Filters ────────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/5 rounded-[2rem] p-6 lg:p-8 flex flex-wrap items-end gap-6 shadow-sm transition-colors hover:border-slate-300 dark:hover:border-white/10">
        {/* Search */}
        <form onSubmit={handleSearch} className="flex-1 min-w-[240px] flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Name, email, or phone…"
              className="w-full pl-9 pr-4 py-3 text-sm bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 focus:border-slate-800 dark:focus:border-slate-500 rounded-xl text-slate-900 dark:text-white font-bold placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-slate-500/10 transition-all shadow-inner"
            />
          </div>
          <button type="submit" className="bg-slate-900 hover:bg-black text-white text-sm font-black px-6 py-3 rounded-xl transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5">
            Search
          </button>
        </form>

        {/* Date range */}
        <div className="min-w-[140px] z-20">
          <label className="block text-[10px] font-bold uppercase font-mono text-slate-500 dark:text-slate-400 mb-2 tracking-widest">Period</label>
          <CustomDropdown 
            options={DATE_RANGES}
            value={dateRange}
            onChange={(val) => { setDateRange(val); setPage(1); }}
          />
        </div>

        {/* Role filter */}
        <div className="min-w-[140px] z-10">
          <label className="block text-[10px] font-bold uppercase font-mono text-slate-500 dark:text-slate-400 mb-2 tracking-widest">Role</label>
          <CustomDropdown 
            options={ROLE_FILTERS}
            value={role}
            onChange={(val) => { setRole(val); setPage(1); }}
          />
        </div>

        {/* Clear */}
        {(dateRange || role || search) && (
          <button
            onClick={() => { setDateRange(''); setRole(''); setSearch(''); setSearchInput(''); setPage(1); }}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-900 dark:text-white bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/80 px-4 py-3 rounded-xl transition-colors shadow-sm"
          >
            <X className="w-3.5 h-3.5" /> Clear Filters
          </button>
        )}
      </div>

      {/* ── Login Logs Table ──────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/5 rounded-[2rem] overflow-hidden shadow-sm transition-colors hover:border-slate-300 dark:hover:border-white/10 p-2">
        <div className="px-6 py-4 flex items-center justify-between mb-2">
          <h2 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-3 tracking-tight">
            Login Logs
            {!loading && <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 dark:bg-slate-800/50 px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700/50">{total.toLocaleString()} records</span>}
          </h2>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest">Successful Logins</span>
          </div>
        </div>

        <div className="overflow-x-auto rounded-[1.5rem] border border-slate-100 dark:border-white/5">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 dark:border-white/5 bg-slate-50/80 dark:bg-transparent">
                {['User', 'Role', 'Device', 'OS', 'Browser', 'IP Address', 'Login Time', 'Status'].map((h) => (
                  <th key={h} className="text-left text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest px-6 py-5 font-mono whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-white/5">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="bg-white dark:bg-transparent">
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="px-6 py-4">
                        <div className="h-3.5 bg-slate-100 dark:bg-slate-800/80 rounded animate-pulse" style={{ width: `${50 + (j * 10) % 40}%` }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-20 text-center">
                    <span className="text-3xl mb-3 block opacity-50">🛡️</span>
                    <p className="text-slate-400 dark:text-slate-500 text-sm font-medium">
                      No login records found for the selected filters.
                    </p>
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const isExpired = new Date(log.expiresAt) < new Date();
                  const initials = `${log.user.firstName[0]}${log.user.lastName[0]}`;
                  const browser = parseBrowser(log.userAgent);
                  const os = parseOs(log.deviceOs, log.userAgent);

                  return (
                    <tr key={log.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                      {/* User */}
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-slate-900 dark:bg-indigo-950/60 border border-slate-800 dark:border-indigo-900/50 flex items-center justify-center text-[11px] font-black text-white dark:text-indigo-400 uppercase shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-black text-slate-800 dark:text-slate-200 whitespace-nowrap tracking-tight">
                              {log.user.firstName} {log.user.lastName}
                            </p>
                            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 font-mono truncate max-w-[140px] mt-0.5">
                              {log.user.email || log.user.phone || '—'}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="px-6 py-5">
                        <span className={`inline-flex px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest font-mono border shadow-sm ${ROLE_BADGES[log.user.role] ?? 'text-slate-600 bg-slate-50 border-slate-200'}`}>
                          {log.user.role}
                        </span>
                      </td>

                      {/* Device */}
                      <td className="px-6 py-5">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-300 whitespace-nowrap">
                          {log.deviceName || 'Unknown Device'}
                        </span>
                      </td>

                      {/* OS */}
                      <td className="px-6 py-5">
                        <span className="text-[11px] font-black text-slate-600 dark:text-slate-400 whitespace-nowrap bg-slate-100 dark:bg-slate-800/60 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800">{os}</span>
                      </td>

                      {/* Browser */}
                      <td className="px-6 py-5">
                        <span className="text-[11px] font-black text-slate-600 dark:text-slate-400 whitespace-nowrap bg-slate-100 dark:bg-slate-800/60 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800">{browser}</span>
                      </td>

                      {/* IP */}
                      <td className="px-6 py-5">
                        <span className="text-[10px] font-mono font-bold text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">{log.ipAddress || '—'}</span>
                      </td>

                      {/* Login Time */}
                      <td className="px-6 py-5">
                        <div className="flex flex-col gap-1">
                          <p className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap">{fmtDate(log.createdAt)}</p>
                          <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">{timeAgo(log.createdAt)}</p>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-5">
                        {log.isRevoked || isExpired ? (
                          <span className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-slate-600 bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-full shadow-sm">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-500 inline-block" />
                            Expired
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-emerald-800 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-900/40 px-3 py-1.5 rounded-full shadow-sm">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                            Active
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="border-t border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between bg-slate-50/80 dark:bg-slate-950/50">
            <p className="text-slate-500 dark:text-slate-400 text-[11px] font-bold uppercase tracking-widest font-mono">
              Showing {((page - 1) * limit) + 1}–{Math.min(page * limit, total)} of {total.toLocaleString()}
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider px-3 py-1.5 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-600 dark:text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-slate-900 dark:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Prev
              </button>
              <span className="text-slate-400 dark:text-slate-500 text-[11px] font-bold font-mono px-1">{page} / {totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider px-3 py-1.5 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-600 dark:text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-slate-900 dark:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
              >
                Next <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
