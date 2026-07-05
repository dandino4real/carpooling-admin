'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import {
  AlertOctagon,
  RefreshCw,
  Search,
  Filter,
  ArrowRight as ArrowRightIcon,
  MapPin,
  Calendar,
  ShieldAlert,
  User,
  Car,
  ChevronRight,
  FileText,
  CheckCircle2,
  XCircle,
  MessageSquare,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string; icon: React.ElementType }> = {
  OPEN: { label: 'Open', color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-500/10', dot: 'bg-red-500', icon: AlertOctagon },
  UNDER_REVIEW: { label: 'Under Review', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-500/10', dot: 'bg-amber-500', icon: Search },
  RESOLVED: { label: 'Resolved', color: 'text-emerald-600 dark:text-[var(--color-neon)]', bg: 'bg-emerald-50 dark:bg-[var(--color-neon)]/10', dot: 'bg-emerald-500 dark:bg-[var(--color-neon)]', icon: CheckCircle2 },
  CLOSED: { label: 'Closed', color: 'text-slate-600 dark:text-slate-400', bg: 'bg-slate-100 dark:bg-slate-500/10', dot: 'bg-slate-500', icon: XCircle },
};

const STATUSES = ['', 'OPEN', 'UNDER_REVIEW', 'RESOLVED', 'CLOSED'];

function UserPill({ user, label, color = 'blue' }: { user: any; label: string; color?: 'blue' | 'violet' }) {
  if (!user) return null;
  const initials = `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase() || 'U';
  const roleColor = color === 'violet' ? 'text-violet-700 dark:text-violet-400 border-violet-200 dark:border-violet-500/20 bg-violet-50 dark:bg-violet-500/10 ring-violet-500/10' : 'text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/20 bg-blue-50 dark:bg-blue-500/10 ring-blue-500/10';

  return (
    <div className="flex items-center gap-3 flex-1 min-w-0">
      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm shrink-0 border ring-1 ${roleColor}`}>
        {initials}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest">{label}</p>
        <p className="text-sm font-bold text-slate-900 dark:text-white truncate leading-snug">
          {user.firstName} {user.lastName}
        </p>
        <p className="text-[11px] text-slate-500 truncate">{user.role}</p>
      </div>
    </div>
  );
}

export default function DisputesPage() {
  const [disputes, setDisputes] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  
  // Modal states
  const [selected, setSelected] = useState<any | null>(null);
  const [resolveForm, setResolveForm] = useState({ status: '', resolution: '' });
  const [saving, setSaving] = useState(false);

  const limit = 15;

  const fetchDisputes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.listDisputes({ page, limit, status: status || undefined, search: search || undefined });
      setDisputes(res.data ?? []);
      setTotal(res.total ?? 0);
    } catch {
      toast.error('Failed to load disputes');
    } finally {
      setLoading(false);
    }
  }, [page, status, search]);

  useEffect(() => { fetchDisputes(); }, [fetchDisputes]);

  const openDetail = async (id: string) => {
    try {
      const d = await api.getDisputeDetails(id);
      setSelected(d);
      setResolveForm({ status: d.status, resolution: d.resolution ?? '' });
    } catch {
      toast.error('Failed to load dispute details');
    }
  };

  const handleResolve = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await api.resolveDispute(selected.id, resolveForm);
      toast.success('Dispute updated successfully');
      setSelected(null);
      fetchDisputes();
    } catch {
      toast.error('Failed to update dispute');
    } finally {
      setSaving(false);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">

      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter flex items-center gap-3">
            <div className="w-9 h-9 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center justify-center">
              <ShieldAlert className="w-5 h-5 text-red-400" />
            </div>
            Disputes Management
          </h1>
          <p className="text-slate-500 text-sm mt-2 font-medium">
            Review and resolve conflicts between passengers and drivers.
          </p>
        </div>
        <button
          onClick={fetchDisputes}
          className="self-start sm:self-auto flex items-center gap-2 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 text-xs font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {/* ── Status Overview Cards ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {['OPEN', 'UNDER_REVIEW', 'RESOLVED', 'CLOSED'].map((s) => {
          const cfg = STATUS_CONFIG[s];
          const count = loading ? '—' : disputes.filter(d => d.status === s).length;
          const isActive = status === s;
          
          return (
            <button
              key={s}
              onClick={() => { setStatus(status === s ? '' : s); setPage(1); }}
              className={`relative overflow-hidden p-6 rounded-[2rem] text-left transition-all duration-300 border shadow-sm hover:shadow-md dark:shadow-none ${
                isActive
                  ? `border-${cfg.color.match(/text-([a-z]+)/)?.[1] || 'blue'}-500/50 bg-white dark:bg-[#111111] shadow-[0_0_20px_rgba(0,0,0,0.05)] dark:shadow-[0_0_20px_rgba(0,0,0,0.5)]`
                  : 'border-slate-200 dark:border-white/5 bg-white dark:bg-[#111111] hover:border-slate-300 dark:hover:border-white/10'
              }`}
            >
              {/* Glow orb for active state */}
              {isActive && (
                <div className={`absolute -top-10 -right-10 w-32 h-32 blur-[40px] rounded-full opacity-[0.05] dark:opacity-20 pointer-events-none ${cfg.bg.replace('/10', '')}`} />
              )}
              
              <div className="flex items-center justify-between mb-4 relative z-10">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest border border-current/20 ${cfg.bg} ${cfg.color}`}>
                  <cfg.icon className="w-3 h-3" />
                  {cfg.label}
                </span>
              </div>
              <p className={`text-4xl font-black tracking-tighter relative z-10 ${isActive ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'}`}>
                {count}
              </p>
            </button>
          );
        })}
      </div>

      {/* ── Filters ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Pill tabs */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-widest text-slate-600 mr-1">
            <Filter className="w-3 h-3" /> Filter
          </span>
          {STATUSES.map((s) => {
            const isActive = status === s;
            const label = s === '' ? 'All Statuses' : STATUS_CONFIG[s].label;
            const dotColor = s === '' ? 'bg-slate-400' : STATUS_CONFIG[s].dot;
            return (
              <button
                key={s}
                onClick={() => { setStatus(s); setPage(1); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white shadow-sm dark:shadow-lg'
                    : 'bg-transparent border border-transparent hover:bg-slate-100 dark:bg-white/5 text-slate-500 hover:text-slate-700 dark:text-slate-300'
                }`}
              >
                {isActive && <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />}
                {label}
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by name, reason..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="w-full bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/5 focus:border-[var(--color-neon)]/50 rounded-xl py-2.5 pl-11 pr-4 text-sm text-slate-900 dark:text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-[var(--color-neon)]/30 transition-all"
          />
        </div>
      </div>

      {/* ── Disputes List ────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/5 rounded-[2rem] overflow-hidden">
        {/* List Header */}
        <div className="px-8 py-5 border-b border-slate-200 dark:border-white/5 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-sm">
            <AlertOctagon className="w-4 h-4 text-red-400" />
            Dispute Cases
          </h3>
          {!loading && (
            <span className="text-[10px] font-mono text-slate-500 bg-slate-100 dark:bg-white/5 px-3 py-1 rounded-lg">
              {total} case{total !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {loading ? (
          <div className="divide-y divide-slate-100 dark:divide-white/5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="px-8 py-6 flex items-center gap-6 animate-pulse">
                <div className="w-10 h-10 bg-slate-100 dark:bg-white/5 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-100 dark:bg-white/5 rounded w-1/3" />
                  <div className="h-3 bg-slate-100 dark:bg-white/5 rounded w-1/2" />
                </div>
                <div className="w-24 h-8 bg-slate-100 dark:bg-white/5 rounded-xl shrink-0" />
              </div>
            ))}
          </div>
        ) : disputes.length === 0 ? (
          <div className="py-24 flex flex-col items-center gap-5">
            <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 flex items-center justify-center">
              <ShieldAlert className="w-9 h-9 text-slate-600" />
            </div>
            <div className="text-center">
              <p className="text-base font-bold text-slate-700 dark:text-slate-300 mb-1">No disputes found</p>
              <p className="text-sm text-slate-600">All quiet on the platform. Try adjusting your filters.</p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-white/5">
            {disputes.map((d) => {
              const cfg = STATUS_CONFIG[d.status];
              return (
                <div key={d.id} className="px-8 py-6 flex flex-col lg:flex-row lg:items-center gap-8 hover:bg-slate-50 dark:bg-white/[0.02] transition-all duration-200 group">
                  
                  {/* Parties */}
                  <div className="flex items-center gap-4 flex-[1.5] min-w-0">
                    <UserPill user={d.raisedBy} label="Raised By" color="blue" />
                    <div className="shrink-0 text-slate-700">
                      <ArrowRightIcon className="w-4 h-4" />
                    </div>
                    <UserPill user={d.against} label="Against" color="violet" />
                  </div>

                  {/* Issue & Status */}
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border border-current/20 ${cfg.bg} ${cfg.color}`}>
                        <cfg.icon className="w-3 h-3" />
                        {cfg.label}
                      </span>
                      <span className="text-xs text-slate-500 font-mono">ID: {d.id.substring(0, 8)}…</span>
                    </div>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{d.reason}</p>
                  </div>

                  {/* Trip details */}
                  <div className="shrink-0 flex flex-col items-end gap-2">
                    {d.trip?.originState && (
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 px-3 py-1 rounded-lg">
                        <MapPin className="w-3 h-3 text-slate-500" />
                        {d.trip.originState}
                        <span className="text-slate-600 mx-0.5">→</span>
                        {d.trip.destinationState}
                      </div>
                    )}
                    <div className="flex items-center gap-3 text-[11px] text-slate-500 font-mono">
                      <span className="font-bold text-slate-700 dark:text-slate-300">₦{(d.booking?.totalAmount ?? 0).toLocaleString()}</span>
                      <span className="text-slate-700">•</span>
                      <span>{new Date(d.createdAt).toLocaleDateString('en-NG')}</span>
                    </div>
                  </div>

                  {/* CTA */}
                  <button
                    onClick={() => openDetail(d.id)}
                    className="shrink-0 flex items-center gap-2 bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 text-slate-900 dark:text-white text-xs font-bold px-5 py-3 rounded-xl border border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 transition-all cursor-pointer shadow-sm hover:shadow-md dark:shadow-none"
                  >
                    Review Case
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
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

      {/* ── Dispute Resolution Modal ─────────────────────────────────────────── */}
      {selected && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/10 rounded-[2rem] w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-8 py-6 border-b border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02]">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                  <FileText className="w-5 h-5 text-indigo-400" />
                  Case Resolution
                </h2>
                <p className="text-[10px] font-mono text-slate-500 mt-1 uppercase tracking-widest">ID: {selected.id}</p>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="w-10 h-10 rounded-full bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:bg-white/10 flex items-center justify-center text-slate-400 hover:text-slate-900 dark:text-white transition-colors border border-slate-200 dark:border-white/5"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body (Scrollable) */}
            <div className="p-8 overflow-y-auto space-y-8">
              
              {/* Parties Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-5">
                  <p className="text-[10px] font-mono font-bold text-blue-400 uppercase tracking-widest mb-4">Complainant (Raised By)</p>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center font-black text-[15px] text-blue-400">
                      {selected.raisedBy?.firstName?.[0]}{selected.raisedBy?.lastName?.[0]}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white text-base leading-tight">{selected.raisedBy?.firstName} {selected.raisedBy?.lastName}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{selected.raisedBy?.email}</p>
                      <p className="text-[10px] font-mono text-slate-500 uppercase mt-1">{selected.raisedBy?.role}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-violet-500/5 border border-violet-500/20 rounded-2xl p-5">
                  <p className="text-[10px] font-mono font-bold text-violet-400 uppercase tracking-widest mb-4">Defendant (Against)</p>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-violet-500/10 border border-violet-500/20 flex items-center justify-center font-black text-[15px] text-violet-400">
                      {selected.against?.firstName?.[0]}{selected.against?.lastName?.[0]}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white text-base leading-tight">{selected.against?.firstName} {selected.against?.lastName}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{selected.against?.email}</p>
                      <p className="text-[10px] font-mono text-slate-500 uppercase mt-1">{selected.against?.role}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Dispute Details */}
              <div className="bg-slate-50 dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/5 rounded-2xl p-6 shadow-sm dark:shadow-none">
                <div className="flex items-center gap-2 mb-4">
                  <AlertOctagon className="w-4 h-4 text-red-400" />
                  <p className="text-[10px] font-mono font-bold text-red-400/80 uppercase tracking-widest">Dispute Reason</p>
                </div>
                <p className="text-lg font-bold text-slate-900 dark:text-white mb-2">{selected.reason}</p>
                <p className="text-sm text-slate-400 leading-relaxed italic border-l-2 border-slate-800 pl-4">
                  "{selected.description}"
                </p>
              </div>

              {/* Trip Context */}
              <div className="bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-2xl p-6 shadow-sm dark:shadow-none">
                <p className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest mb-4">Trip Context</p>
                <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
                  <div>
                    <span className="block text-[10px] font-mono text-slate-500 uppercase mb-1">Route</span>
                    <span className="font-medium text-slate-900 dark:text-white">{selected.trip?.originAddress} → {selected.trip?.destinationAddress}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-mono text-slate-500 uppercase mb-1">Driver Assigned</span>
                    <span className="font-medium text-slate-900 dark:text-white">{selected.trip?.driver?.firstName} {selected.trip?.driver?.lastName}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-mono text-slate-500 uppercase mb-1">Amount</span>
                    <span className="font-mono text-[var(--color-neon)] font-bold">₦{(selected.booking?.totalAmount ?? 0).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-mono text-slate-500 uppercase mb-1">Payout Status</span>
                    <span className="font-medium text-slate-900 dark:text-white">{selected.booking?.payoutStatus}</span>
                  </div>
                </div>
              </div>

              {/* Existing Resolution */}
              {selected.resolution && (
                <div className="bg-[var(--color-neon)]/5 border border-[var(--color-neon)]/20 rounded-2xl p-6 shadow-sm dark:shadow-none">
                  <div className="flex items-center gap-2 mb-3">
                    <MessageSquare className="w-4 h-4 text-[var(--color-neon)]" />
                    <p className="text-[10px] font-mono font-bold text-[var(--color-neon)]/80 uppercase tracking-widest">Existing Resolution Note</p>
                  </div>
                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                    {selected.resolution}
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer (Action Area) */}
            <div className="p-8 border-t border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02]">
              <p className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest mb-4">Action & Resolve</p>
              
              <div className="space-y-4">
                <div className="flex gap-4">
                  {/* Status Select */}
                  <div className="w-1/3">
                    <select
                      className="w-full bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-[var(--color-neon)]/50 focus:ring-1 focus:ring-[var(--color-neon)]/30 transition-all appearance-none"
                      value={resolveForm.status}
                      onChange={e => setResolveForm(f => ({ ...f, status: e.target.value }))}
                    >
                      {['OPEN', 'UNDER_REVIEW', 'RESOLVED', 'CLOSED'].map(s => (
                        <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Resolution Textarea */}
                  <div className="flex-1">
                    <textarea
                      className="w-full bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-slate-700 dark:text-slate-300 placeholder-slate-600 focus:outline-none focus:border-[var(--color-neon)]/50 focus:ring-1 focus:ring-[var(--color-neon)]/30 transition-all resize-none"
                      placeholder="Add an internal note or resolution summary..."
                      rows={2}
                      value={resolveForm.resolution}
                      onChange={e => setResolveForm(f => ({ ...f, resolution: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Save Button */}
                <button
                  onClick={handleResolve}
                  disabled={saving}
                  className="w-full bg-[var(--color-neon)] hover:bg-[var(--color-neon)]/90 text-black py-4 rounded-xl font-black text-sm transition-all disabled:opacity-30 shadow-[0_0_20px_rgba(75,208,67,0.2)] hover:shadow-[0_0_30px_rgba(75,208,67,0.3)] hover:scale-[1.01] flex items-center justify-center gap-2 mt-2"
                >
                  {saving ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5" />
                      Confirm & Save Resolution
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
