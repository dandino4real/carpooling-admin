'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import {
  ShieldCheck, Eye, Download, Search, Users, Activity,
  ChevronDown, CalendarDays, LockKeyhole
} from 'lucide-react';

const REASON_STYLES: Record<string, string> = {
  SUPPORT_TICKET:       'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900/50 shadow-[0_0_8px_rgba(59,130,246,0.2)]',
  DISPUTE_RESOLUTION:   'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/50 shadow-[0_0_8px_rgba(245,158,11,0.2)]',
  SAFETY_INVESTIGATION: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-900/50 shadow-[0_0_8px_rgba(168,85,247,0.2)]',
  FRAUD_INVESTIGATION:  'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900/50 shadow-[0_0_8px_rgba(239,68,68,0.2)]',
  LEGAL_REQUEST:        'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/60 dark:text-slate-700 dark:text-slate-300 dark:border-slate-700/50 shadow-[0_0_8px_rgba(148,163,184,0.2)]',
};

const REASON_LABEL: Record<string, string> = {
  SUPPORT_TICKET:       'Support Ticket',
  DISPUTE_RESOLUTION:   'Dispute Resolution',
  SAFETY_INVESTIGATION: 'Safety Investigation',
  FRAUD_INVESTIGATION:  'Fraud Investigation',
  LEGAL_REQUEST:        'Legal Request',
};

const ROLE_STYLES: Record<string, string> = {
  SUPER_ADMIN:        'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60',
  ADMIN:              'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60',
  SUPPORT_ADMIN:      'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60',
  TRUST_SAFETY_ADMIN: 'bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800/60',
  FINANCE_ADMIN:      'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60',
};

function formatDuration(sec: number): string {
  if (sec < 60) return `${sec}s`;
  return `${Math.floor(sec / 60)}m ${sec % 60}s`;
}

function exportCSV(data: any[]) {
  const headers = ['Log ID', 'Admin', 'Role', 'Trip ID', 'Route', 'Driver', 'Passenger', 'Reason', 'Records Viewed', 'Duration', 'Access Time'];
  const rows = data.map(l => [
    l.id,
    l.admin?.fullName ?? '',
    l.admin?.adminRole ?? '',
    l.tripId,
    l.tripRoute,
    `${l.driver?.firstName ?? ''} ${l.driver?.lastName ?? ''}`.trim(),
    `${l.passenger?.firstName ?? ''} ${l.passenger?.lastName ?? ''}`.trim(),
    l.reason,
    (l.recordsViewed ?? []).join('; '),
    formatDuration(l.durationSec ?? 0),
    new Date(l.accessedAt).toLocaleString('en-NG'),
  ]);
  const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `comm-access-logs-${Date.now()}.csv`; a.click();
  URL.revokeObjectURL(url);
}

// ─── Metric Card ──────────────────────────────────────────────────────────────

function MetricCard({
  label, value, icon, accentColor, textColor, loading, subtext
}: {
  label: string; value: number; icon: React.ReactNode; accentColor: string; textColor: string; loading: boolean; subtext: string;
}) {
  return (
    <div className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/5 rounded-[2rem] p-6 lg:p-8 shadow-sm flex flex-col gap-3 transition-all hover:-translate-y-1 hover:shadow-md hover:border-slate-300 dark:hover:border-white/10 duration-300">
      <div className="flex items-start justify-between mb-1">
        <span className={`text-[10px] font-bold uppercase tracking-widest font-mono ${textColor}`}>{label}</span>
        <div className={`w-14 h-14 rounded-[1rem] flex items-center justify-center shrink-0 shadow-inner ${accentColor}`}>
          {icon}
        </div>
      </div>
      <div>
        {loading ? (
          <div className="h-9 w-16 bg-slate-100 dark:bg-slate-800/50 rounded animate-pulse" />
        ) : (
          <span className={`text-4xl font-black tracking-tight leading-none ${textColor}`}>{value.toLocaleString()}</span>
        )}
      </div>
      <p className="text-[11px] font-bold text-slate-400 mt-1 uppercase tracking-wider">{subtext}</p>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CommunicationAccessLogsPage() {
  const [reasonFilter, setReasonFilter] = useState('');
  const [dateFrom, setDateFrom]         = useState('');
  const [data, setData]                 = useState<any[]>([]);
  const [total, setTotal]               = useState(0);
  const [loading, setLoading]           = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getCommunicationAccessLogs({
        reason:   reasonFilter || undefined,
        dateFrom: dateFrom || undefined,
        limit: 100,
      });
      setData(res.data ?? []);
      setTotal(res.total ?? 0);
    } catch {
      toast.error('Failed to load access logs');
    } finally {
      setLoading(false);
    }
  }, [reasonFilter, dateFrom]);

  useEffect(() => { load(); }, [load]);

  // Derived metrics
  const byReason  = Object.keys(REASON_LABEL).map(r => ({ reason: r, count: data.filter(l => l.reason === r).length }));
  const uniqueAdmins = new Set(data.map(l => l.admin?.id)).size;

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-2.5">
            <ShieldCheck className="w-7 h-7 text-emerald-500" />
            Communication Access Logs
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Immutable audit trail of all accesses to private trip communications.
          </p>
        </div>
      </div>

      {/* Alert Banner */}
      <div className="bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-900/40 rounded-[2rem] px-8 py-6 flex items-start gap-4 shadow-sm animate-in fade-in slide-in-from-bottom-2">
        <Eye className="w-6 h-6 text-emerald-600 dark:text-emerald-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-black text-emerald-800 dark:text-emerald-400 tracking-wide">Communication Access Audit Trail</p>
          <p className="text-xs text-emerald-700/80 dark:text-emerald-500/80 mt-1.5 font-bold leading-relaxed">Every access to private communication records is logged here automatically. These logs cannot be deleted or modified. They are reviewed periodically by the compliance team.</p>
        </div>
      </div>

      {/* Summary metrics */}
      <section>
        <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 font-mono mb-4">Audit Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            label="Total Accesses" value={total} loading={loading} subtext="Filtered records"
            icon={<Activity className="w-5 h-5 text-indigo-700 dark:text-indigo-500" />}
            accentColor="bg-indigo-100 dark:bg-indigo-900/40 border border-indigo-200 dark:border-transparent" textColor="text-indigo-700 dark:text-indigo-400"
          />
          <MetricCard
            label="Admins Involved" value={uniqueAdmins} loading={loading} subtext="Unique accounts"
            icon={<Users className="w-5 h-5 text-violet-700 dark:text-violet-500" />}
            accentColor="bg-violet-100 dark:bg-violet-900/40 border border-violet-200 dark:border-transparent" textColor="text-violet-700 dark:text-violet-400"
          />
          <div className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/5 rounded-[2rem] p-6 lg:p-8 shadow-sm col-span-1 md:col-span-2 flex flex-col transition-all hover:border-slate-300 dark:hover:border-white/10">
            <p className="text-[10px] font-bold uppercase tracking-widest font-mono text-slate-500 mb-6">Accesses by Reason</p>
            {loading ? <div className="h-10 bg-slate-100 dark:bg-slate-800/50 rounded-xl animate-pulse" /> : (
              <div className="flex flex-wrap gap-3 mt-auto">
                {byReason.filter(r => r.count > 0).map(r => (
                  <div key={r.reason} className={`flex items-center gap-3 px-4 py-2 rounded-xl border text-xs font-bold shadow-sm ${REASON_STYLES[r.reason] ?? ''}`}>
                    <span className="uppercase tracking-wider">{REASON_LABEL[r.reason]}</span>
                    <span className="w-px h-3 bg-current opacity-30" />
                    <span className="font-black text-sm">{r.count}</span>
                  </div>
                ))}
                {byReason.every(r => r.count === 0) && <span className="text-sm font-bold text-slate-400 italic">No records yet</span>}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Filters */}
      <section className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/5 rounded-[2rem] p-6 lg:p-8 shadow-sm transition-colors hover:border-slate-300 dark:hover:border-white/10 flex flex-wrap items-end gap-5">
        <div className="relative flex-1 min-w-[200px]">
          <label className="block text-[10px] font-bold uppercase font-mono text-slate-500 dark:text-slate-400 mb-2 tracking-widest">Justification Filter</label>
          <div className="relative">
            <select 
              value={reasonFilter} 
              onChange={e => setReasonFilter(e.target.value)} 
              className="w-full pl-5 pr-11 py-3 text-sm font-bold bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 dark:focus:border-indigo-500 rounded-xl text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-inner appearance-none cursor-pointer"
            >
              <option value="">All Reasons</option>
              {Object.entries(REASON_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase font-mono text-slate-500 dark:text-slate-400 mb-2 tracking-widest">Date From</label>
          <div className="relative">
            <CalendarDays className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input 
              type="date" 
              value={dateFrom} 
              onChange={e => setDateFrom(e.target.value)} 
              className="text-sm font-bold bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 dark:focus:border-indigo-500 rounded-xl pl-11 pr-4 py-3 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-inner cursor-pointer" 
              placeholder="From date" 
            />
          </div>
        </div>
        <div className="w-full sm:w-auto mt-2 sm:mt-0 ml-auto">
          <button 
            onClick={() => { exportCSV(data); toast.success('CSV exported'); }} 
            className="w-full sm:w-auto flex items-center justify-center gap-2 text-xs font-black text-slate-900 dark:text-white bg-indigo-600 hover:bg-indigo-500 px-6 py-3 rounded-xl transition-all shadow-[0_4px_14px_0_rgb(79,70,229,0.39)] hover:shadow-[0_6px_20px_rgba(79,70,229,0.23)] cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </section>

      {/* Table */}
      <div className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/5 rounded-[2rem] overflow-hidden shadow-sm transition-colors hover:border-slate-300 dark:hover:border-white/10">
        <div className="px-6 py-5 border-b border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-white/5 flex justify-between items-center">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">
            {total} access log{total !== 1 ? 's' : ''}
          </span>
        </div>

        {loading ? (
          <div className="p-6 space-y-4">{Array(6).fill(0).map((_, i) => <div key={i} className="h-16 bg-slate-100 dark:bg-slate-800/50 rounded-xl animate-pulse" />)}</div>
        ) : data.length === 0 ? (
          <div className="py-32 flex flex-col items-center gap-4 text-slate-400">
            <div className="w-24 h-24 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center shadow-inner border border-slate-100 dark:border-slate-800">
              <LockKeyhole className="w-10 h-10 text-slate-400 dark:text-slate-600" />
            </div>
            <div className="text-center">
              <p className="text-lg font-black text-slate-800 dark:text-slate-300">No access logs yet</p>
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-500 mt-2 max-w-sm">Logs will appear here when admins access trip communication records.</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/50">
                  {['Admin', 'Role', 'Trip', 'Driver', 'Passenger', 'Reason', 'Records Viewed', 'Duration', 'Access Time'].map(h => (
                    <th key={h} className="px-6 py-4 text-left text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest font-mono whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                {data.map((log: any) => (
                  <tr key={log.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 flex items-center justify-center text-[10px] font-black shrink-0 group-hover:scale-105 transition-transform shadow-sm">
                          {(log.admin?.firstName?.[0] ?? '') + (log.admin?.lastName?.[0] ?? '')}
                        </div>
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">{log.admin?.fullName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest shadow-sm ${ROLE_STYLES[log.admin?.adminRole ?? ''] ?? 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                        {(log.admin?.adminRole ?? 'ADMIN').replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-bold font-mono text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 px-2 py-0.5 rounded-md border border-indigo-100 dark:border-indigo-900/30">{log.tripId.slice(0, 8)}…</span>
                      <span className="block text-[11px] font-semibold text-slate-500 mt-1.5 truncate max-w-[120px]">{log.tripRoute}</span>
                    </td>
                    <td className="px-6 py-4 text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">{log.driver?.firstName} {log.driver?.lastName}</td>
                    <td className="px-6 py-4 text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      {log.passenger ? `${log.passenger.firstName} ${log.passenger.lastName}` : <span className="text-slate-700 dark:text-slate-300 dark:text-slate-700">—</span>}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border ${REASON_STYLES[log.reason] ?? ''}`}>{REASON_LABEL[log.reason] ?? log.reason}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1.5">
                        {(log.recordsViewed ?? []).map((r: string) => (
                          <span key={r} className="bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 text-slate-600 dark:text-slate-700 dark:text-slate-300 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded shadow-sm">{r}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono font-bold text-slate-600 dark:text-slate-400 text-xs whitespace-nowrap">{formatDuration(log.durationSec ?? 0)}</td>
                    <td className="px-6 py-4 text-xs font-semibold text-slate-500 whitespace-nowrap">{new Date(log.accessedAt).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="flex justify-center pt-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 max-w-2xl text-center leading-relaxed">
          Access logs are retained for 24 months per platform data governance policy. Records are tamper-proof and cannot be deleted.
        </p>
      </div>
    </div>
  );
}
