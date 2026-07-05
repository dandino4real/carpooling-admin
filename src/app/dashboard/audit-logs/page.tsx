'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { ClipboardList, Filter, X, FileJson, ChevronLeft, ChevronRight } from 'lucide-react';

interface AuditLogEntry {
  id: string;
  adminId: string;
  adminName: string;
  action: string;
  targetId?: string;
  targetType?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  admin?: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

// ─── Action badge config ──────────────────────────────────────────────────────

const ACTION_BADGES: Record<string, { label: string; color: string }> = {
  'driver.approved':       { label: 'Driver Approved',      color: 'text-emerald-900 bg-emerald-100 border-emerald-200 dark:text-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-800/40' },
  'driver.rejected':       { label: 'Driver Rejected',      color: 'text-red-900 bg-red-100 border-red-200 dark:text-red-300 dark:bg-red-950/40 dark:border-red-800/40' },
  'driver.suspended':      { label: 'Driver Suspended',     color: 'text-orange-900 bg-orange-100 border-orange-200 dark:text-orange-300 dark:bg-orange-950/40 dark:border-orange-800/40' },
  'driver.under_review':   { label: 'Under Review',         color: 'text-amber-900 bg-amber-100 border-amber-200 dark:text-amber-300 dark:bg-amber-950/40 dark:border-amber-800/40' },
  'user.banned':           { label: 'User Banned',          color: 'text-red-900 bg-red-100 border-red-200 dark:text-red-300 dark:bg-red-950/40 dark:border-red-800/40' },
  'user.unbanned':         { label: 'User Unbanned',        color: 'text-slate-800 bg-slate-200 border-slate-300 dark:text-slate-300 dark:bg-slate-800/40 dark:border-slate-700/40' },
  'user.warned':           { label: 'User Warned',          color: 'text-yellow-900 bg-yellow-100 border-yellow-300 dark:text-yellow-300 dark:bg-yellow-950/40 dark:border-yellow-800/40' },
  'withdrawal.approved':   { label: 'Withdrawal Approved',  color: 'text-emerald-900 bg-emerald-100 border-emerald-200 dark:text-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-800/40' },
  'withdrawal.rejected':   { label: 'Withdrawal Rejected',  color: 'text-red-900 bg-red-100 border-red-200 dark:text-red-300 dark:bg-red-950/40 dark:border-red-800/40' },
  'admin.invited':         { label: 'Admin Invited',        color: 'text-indigo-900 bg-indigo-100 border-indigo-200 dark:text-indigo-300 dark:bg-indigo-950/40 dark:border-indigo-800/40' },
  'admin.unlocked':        { label: 'Account Unlocked',     color: 'text-blue-900 bg-blue-100 border-blue-200 dark:text-blue-300 dark:bg-blue-950/40 dark:border-blue-800/40' },
  'admin.profile_updated': { label: 'Profile Updated',      color: 'text-slate-800 bg-slate-200 border-slate-300 dark:text-slate-300 dark:bg-slate-800/40 dark:border-slate-700/40' },
  'payout.released':       { label: 'Payout Released',      color: 'text-emerald-900 bg-emerald-100 border-emerald-200 dark:text-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-800/40' },
  'wallet.credited':       { label: 'Wallet Credited',      color: 'text-violet-900 bg-violet-100 border-violet-200 dark:text-violet-300 dark:bg-violet-950/40 dark:border-violet-800/40' },
  'dispute.resolved':      { label: 'Dispute Resolved',     color: 'text-emerald-900 bg-emerald-100 border-emerald-200 dark:text-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-800/40' },
  'dispute.closed':        { label: 'Dispute Closed',       color: 'text-slate-800 bg-slate-200 border-slate-300 dark:text-slate-300 dark:bg-slate-800/40 dark:border-slate-700/40' },
  'dispute.escalated':     { label: 'Dispute Escalated',    color: 'text-orange-900 bg-orange-100 border-orange-200 dark:text-orange-300 dark:bg-orange-950/40 dark:border-orange-800/40' },
};

// ─── Target type pill colours ─────────────────────────────────────────────────

const TARGET_TYPE_COLORS: Record<string, string> = {
  driver:     'text-indigo-800 bg-indigo-100 border-indigo-200 dark:text-indigo-400 dark:bg-indigo-950/30 dark:border-indigo-900/30',
  user:       'text-blue-800 bg-blue-100 border-blue-200 dark:text-blue-400 dark:bg-blue-950/30 dark:border-blue-900/30',
  withdrawal: 'text-emerald-800 bg-emerald-100 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-950/30 dark:border-emerald-900/30',
  admin:      'text-violet-800 bg-violet-100 border-violet-200 dark:text-violet-400 dark:bg-violet-950/30 dark:border-violet-900/30',
  booking:    'text-amber-800 bg-amber-100 border-amber-200 dark:text-amber-400 dark:bg-amber-950/30 dark:border-amber-900/30',
  dispute:    'text-orange-800 bg-orange-100 border-orange-200 dark:text-orange-400 dark:bg-orange-950/30 dark:border-orange-900/30',
};

// ─── Extract human-readable identity + detail from metadata ──────────────────

function resolveTargetIdentity(log: AuditLogEntry): { name: string | null; subtitle: string | null } {
  const m = log.metadata || {};

  // Name: try known keys in priority order
  const name =
    m.driverName       ||
    m.userName         ||
    m.invitedEmail     ||
    m.targetAdminEmail ||
    m.adminName        ||
    null;

  // Subtitle: the most actionable detail for each entry type
  let subtitle: string | null = null;
  if (m.amount != null) {
    subtitle = `₦${Number(m.amount).toLocaleString()}`;
    if (m.bankName)  subtitle += ` · ${m.bankName}`;
    if (m.tripRef)   subtitle += ` · ${m.tripRef}`;
    if (m.accountNumber) subtitle += ` · ${m.accountNumber}`;
  } else if (m.reason) {
    subtitle = m.reason;
  } else if (m.role) {
    subtitle = `Role: ${m.role}`;
  } else if (m.verdict) {
    subtitle = `Verdict: ${String(m.verdict).replace(/_/g, ' ')}`;
  } else if (m.note) {
    subtitle = m.note;
  } else if (m.resolution) {
    subtitle = m.resolution;
  } else if (m.fieldsUpdated && Array.isArray(m.fieldsUpdated)) {
    subtitle = `Updated: ${m.fieldsUpdated.join(', ')}`;
  }

  return { name, subtitle };
}

// ─── Metadata popover (JSON viewer) ──────────────────────────────────────────

function MetadataPopover({ metadata }: { metadata?: Record<string, any> }) {
  const [open, setOpen] = useState(false);

  if (!metadata || Object.keys(metadata).length === 0) {
    return <span className="text-slate-700 dark:text-slate-300 dark:text-slate-700 text-xs">—</span>;
  }

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold text-slate-800 dark:text-indigo-400 bg-white dark:bg-indigo-950/30 hover:bg-slate-50 dark:hover:bg-indigo-900/50 border border-slate-200 dark:border-indigo-800/40 px-3 py-1.5 rounded-full cursor-pointer transition-colors shadow-sm"
      >
        <FileJson className="w-3.5 h-3.5" />
        JSON {open ? '▴' : '▾'}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-2 z-50 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-950/50 border-b border-slate-200 dark:border-slate-800">
              <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Metadata payload</span>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs cursor-pointer transition-colors">✕</button>
            </div>
            <div className="p-4 bg-white dark:bg-slate-900/80">
              <pre className="text-[10px] font-mono text-slate-600 dark:text-slate-700 dark:text-slate-300 whitespace-pre-wrap break-all leading-relaxed max-h-64 overflow-y-auto custom-scrollbar">
                {JSON.stringify(metadata, null, 2)}
              </pre>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [actionFilter, setActionFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const limit = 20;
  const totalPages = Math.ceil(total / limit);

  const loadLogs = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.getAuditLogs({
        page,
        limit,
        action: actionFilter || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      });
      setLogs(Array.isArray(res.data) ? res.data : []);
      setTotal(res.total || 0);
    } catch (err: any) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  }, [page, actionFilter, dateFrom, dateTo]);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString('en-NG', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

  const getBadge = (action: string) =>
    ACTION_BADGES[action] || {
      label: action.replace(/[._]/g, ' '),
      color: 'text-slate-600 dark:text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/40 border-slate-300 dark:border-slate-700/40',
    };

  const handleFilter = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadLogs();
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-2.5">
            <ClipboardList className="w-7 h-7 text-indigo-500" />
            Audit Logs
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Complete record of all administrative actions — who did what, to whom, and when.
          </p>
        </div>
      </div>

      {/* Filters */}
      <form
        onSubmit={handleFilter}
        className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/5 rounded-[2rem] p-6 lg:p-8 flex flex-wrap items-end gap-5 shadow-sm transition-colors hover:border-slate-300 dark:hover:border-white/10"
      >
        <div className="flex-1 min-w-[200px]">
          <label className="block text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-2 font-mono">Action Filter</label>
          <input
            type="text"
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            placeholder="e.g. driver.approved"
            className="w-full bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 focus:border-slate-800 dark:focus:border-slate-500 rounded-xl py-3 px-4 text-slate-900 dark:text-white text-sm font-bold placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-slate-500/10 transition-all shadow-inner"
          />
        </div>
        <div>
          <label className="block text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-2 font-mono">Date From</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 focus:border-slate-800 dark:focus:border-slate-500 rounded-xl py-3 px-4 text-slate-900 dark:text-white text-sm font-bold focus:outline-none focus:ring-4 focus:ring-slate-500/10 transition-all shadow-inner"
          />
        </div>
        <div>
          <label className="block text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-2 font-mono">Date To</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 focus:border-slate-800 dark:focus:border-slate-500 rounded-xl py-3 px-4 text-slate-900 dark:text-white text-sm font-bold focus:outline-none focus:ring-4 focus:ring-slate-500/10 transition-all shadow-inner"
          />
        </div>
        <div className="flex gap-3">
          <button
            type="submit"
            className="bg-slate-900 hover:bg-black text-white text-sm font-black px-6 py-3 rounded-xl transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5 flex items-center gap-2"
          >
            <Filter className="w-4 h-4" /> Filter
          </button>
          <button
            type="button"
            onClick={() => { setActionFilter(''); setDateFrom(''); setDateTo(''); setPage(1); }}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-300 text-sm font-bold px-5 py-3 rounded-xl transition-colors flex items-center gap-2 shadow-sm"
          >
            <X className="w-4 h-4" /> Clear
          </button>
        </div>
      </form>

      {/* Table */}
      <div className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/5 rounded-[2rem] overflow-hidden shadow-sm transition-colors hover:border-slate-300 dark:hover:border-white/10 p-2">
        <div className="overflow-x-auto rounded-[1.5rem] border border-slate-100 dark:border-white/5">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 dark:border-white/5 bg-slate-50/80 dark:bg-transparent">
                {['Date', 'Admin', 'Action', 'Target', 'Details', 'IP'].map((h) => (
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
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-6 py-4">
                        <div
                          className="h-3.5 bg-slate-100 dark:bg-slate-800/80 rounded animate-pulse"
                          style={{ width: `${50 + (j * 15) % 40}%` }}
                        />
                      </td>
                    ))}
                  </tr>
                ))
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center">
                    <span className="text-3xl mb-3 block opacity-50">📂</span>
                    <p className="text-slate-400 dark:text-slate-500 text-sm font-medium">
                      No audit logs found for the selected filters.
                    </p>
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const badge = getBadge(log.action);
                  const { name: targetName, subtitle: targetSubtitle } = resolveTargetIdentity(log);
                  const typeColor = log.targetType
                    ? (TARGET_TYPE_COLORS[log.targetType] ?? TARGET_TYPE_COLORS['user'])
                    : '';

                  // Admin initials
                  const adminInitials = log.admin
                    ? `${log.admin.firstName[0]}${log.admin.lastName[0]}`
                    : log.adminName.split(' ').map((n: string) => n[0]).join('').slice(0, 2);
                  const adminDisplayName = log.admin
                    ? `${log.admin.firstName} ${log.admin.lastName}`
                    : log.adminName;

                  return (
                    <tr key={log.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">

                      {/* ── Date ── */}
                      <td className="px-6 py-4 text-slate-500 dark:text-slate-400 text-xs whitespace-nowrap font-mono">
                        {formatDate(log.createdAt)}
                      </td>

                      {/* ── Admin who performed the action ── */}
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-slate-900 dark:bg-indigo-950/60 border border-slate-800 dark:border-indigo-900/50 flex items-center justify-center text-[11px] font-black text-white dark:text-indigo-400 uppercase shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                            {adminInitials}
                          </div>
                          <div>
                            <p className="text-slate-800 dark:text-slate-200 text-sm font-black whitespace-nowrap tracking-tight">
                              {adminDisplayName}
                            </p>
                            {log.admin?.email && (
                              <p className="text-slate-400 dark:text-slate-500 text-[10px] font-bold mt-0.5">{log.admin.email}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* ── Action badge ── */}
                      <td className="px-6 py-5">
                        <span className={`inline-flex items-center text-[10px] font-black px-3 py-1.5 rounded-full border whitespace-nowrap shadow-sm tracking-wide ${badge.color}`}>
                          {badge.label}
                        </span>
                      </td>

                      {/* ── Target — entity type pill + human name from metadata ── */}
                      <td className="px-6 py-5">
                        <div className="flex flex-col gap-2 min-w-[120px]">
                          {/* Entity type pill */}
                          {log.targetType && (
                            <span className={`self-start inline-flex px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest font-mono border shadow-sm ${typeColor}`}>
                              {log.targetType}
                            </span>
                          )}

                          {/* Human-readable name (resolved from metadata) */}
                          {targetName ? (
                            <p
                              className="text-slate-800 dark:text-slate-200 text-sm font-bold leading-tight max-w-[190px] truncate"
                              title={targetName}
                            >
                              {targetName}
                            </p>
                          ) : log.targetId ? (
                            /* Fallback: show full UUID only when no name is resolvable */
                            <p
                              className="text-slate-400 dark:text-slate-500 text-[10px] font-mono max-w-[160px] truncate font-bold"
                              title={log.targetId}
                            >
                              {log.targetId}
                            </p>
                          ) : (
                            <span className="text-slate-400 dark:text-slate-600 text-xs font-bold">—</span>
                          )}
                        </div>
                      </td>

                      {/* ── Details: key info from metadata + JSON popover ── */}
                      <td className="px-6 py-5">
                        <div className="flex flex-col gap-2.5">
                          {targetSubtitle && (
                            <p
                              className="text-slate-700 dark:text-slate-300 text-xs leading-snug max-w-[240px] font-bold line-clamp-2"
                              title={targetSubtitle}
                            >
                              {targetSubtitle}
                            </p>
                          )}
                          <div>
                            <MetadataPopover metadata={log.metadata} />
                          </div>
                        </div>
                      </td>

                      {/* ── IP ── */}
                      <td className="px-6 py-5">
                        <span className="text-slate-600 dark:text-slate-400 text-[10px] font-mono font-bold whitespace-nowrap bg-white dark:bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
                          {log.ipAddress || '—'}
                        </span>
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
              Showing {((page - 1) * limit) + 1}–{Math.min(page * limit, total)} of {total}
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider px-3 py-1.5 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-600 dark:text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-slate-900 dark:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Prev
              </button>
              <span className="text-slate-400 dark:text-slate-500 text-[11px] font-bold font-mono px-1">
                {page} / {totalPages}
              </span>
              <button
                type="button"
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

      {!loading && total > 0 && (
        <p className="text-center text-[10px] text-slate-400 dark:text-slate-600 font-bold uppercase tracking-widest font-mono">
          {total} total audit log entries
        </p>
      )}
    </div>
  );
}
