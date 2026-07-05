'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import {
  Flag, AlertOctagon, Activity, AlertTriangle, ShieldAlert,
  Search, CheckCircle2, XCircle, ArrowUpRight, MessageSquareWarning, ChevronRight
} from 'lucide-react';

type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
type FlagType = 'PAYMENT_CIRCUMVENTION' | 'OFF_PLATFORM_CONTACT' | 'HARASSMENT' | 'FRAUD';

const SEVERITY_STYLES: Record<Severity, string> = {
  CRITICAL: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900/50 shadow-[0_0_8px_rgba(239,68,68,0.2)]',
  HIGH:     'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-400 dark:border-orange-900/50 shadow-[0_0_8px_rgba(249,115,22,0.2)]',
  MEDIUM:   'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/50 shadow-[0_0_8px_rgba(245,158,11,0.2)]',
  LOW:      'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/60 dark:text-slate-700 dark:text-slate-300 dark:border-slate-700/50 shadow-[0_0_8px_rgba(148,163,184,0.2)]',
};

const SEVERITY_DOTS: Record<Severity, string> = {
  CRITICAL: 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.6)]',
  HIGH:     'bg-orange-500 shadow-[0_0_6px_rgba(249,115,22,0.6)]',
  MEDIUM:   'bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.6)]',
  LOW:      'bg-slate-400 shadow-[0_0_6px_rgba(148,163,184,0.6)]',
};

const FLAG_COLORS: Record<FlagType, string> = {
  PAYMENT_CIRCUMVENTION: 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900/30',
  OFF_PLATFORM_CONTACT:  'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/30',
  HARASSMENT:            'bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-900/30',
  FRAUD:                 'bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-900/30',
};

const FLAG_LABEL: Record<FlagType, string> = {
  PAYMENT_CIRCUMVENTION: 'Payment Circumvention',
  OFF_PLATFORM_CONTACT:  'Off-Platform Contact',
  HARASSMENT:            'Harassment',
  FRAUD:                 'Fraud',
};

const STATUS_DOT: Record<string, string> = {
  OPEN:      'bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.6)]',
  REVIEWED:  'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]',
  ESCALATED: 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.6)]',
  DISMISSED: 'bg-slate-400 shadow-[0_0_6px_rgba(148,163,184,0.6)]',
};

// ─── Metric Card ──────────────────────────────────────────────────────────────

function MetricCard({
  label, value, icon, accentColor, textColor, loading
}: {
  label: string; value: number; icon: React.ReactNode; accentColor: string; textColor: string; loading: boolean;
}) {
  return (
    <div className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/5 rounded-[2rem] p-6 shadow-sm flex flex-col gap-4 transition-all hover:-translate-y-1 hover:shadow-md hover:border-slate-300 dark:hover:border-white/10 duration-300">
      <div className="flex items-start justify-between">
        <span className={`text-[10px] font-bold uppercase tracking-widest font-mono ${textColor}`}>{label}</span>
        <div className={`w-14 h-14 rounded-[1rem] flex items-center justify-center shrink-0 shadow-inner ${accentColor}`}>
          {icon}
        </div>
      </div>
      <div>
        {loading ? (
          <div className="h-9 w-16 bg-slate-100 dark:bg-slate-800/50 rounded animate-pulse" />
        ) : (
          <span className={`text-3xl font-black tracking-tight leading-none ${textColor}`}>{value.toLocaleString()}</span>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function FlaggedConversationsPage() {
  const [severityFilter, setSeverityFilter] = useState('');
  const [typeFilter, setTypeFilter]         = useState('');
  const [statusFilter, setStatusFilter]     = useState('');
  const [data, setData]                     = useState<any[]>([]);
  const [summary, setSummary]               = useState<any[]>([]);
  const [total, setTotal]                   = useState(0);
  const [loading, setLoading]               = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.listFlaggedConversations({
        severity: severityFilter || undefined,
        flagType: typeFilter || undefined,
        status:   statusFilter || undefined,
      });
      setData(res.data ?? []);
      setTotal(res.total ?? 0);
      setSummary(res.summary ?? []);
    } catch {
      toast.error('Failed to load flagged conversations');
    } finally {
      setLoading(false);
    }
  }, [severityFilter, typeFilter, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const updateFlag = async (id: string, status: 'REVIEWED' | 'ESCALATED' | 'DISMISSED') => {
    try {
      await api.updateFlagStatus(id, status);
      toast.success(`Flag marked as ${status.toLowerCase()}`);
      setData(prev => prev.map(f => f.id === id ? { ...f, status } : f));
    } catch {
      toast.error('Failed to update flag status');
    }
  };

  const getCount = (ft: string) => summary.find((s: any) => s.flagType === ft)?._count?.id ?? 0;

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-2.5">
            <Flag className="w-7 h-7 text-indigo-500" />
            Flagged Conversations
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Review and adjudicate system-flagged messages and platform violations.
          </p>
        </div>
      </div>

      {/* Alert Banner */}
      <div className="bg-purple-50/80 dark:bg-purple-950/30 border border-purple-200/60 dark:border-purple-900/40 rounded-[2rem] px-8 py-6 flex items-start gap-4 shadow-sm animate-in fade-in slide-in-from-bottom-2">
        <ShieldAlert className="w-6 h-6 text-purple-600 dark:text-purple-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-black text-purple-800 dark:text-purple-400 tracking-wide">Fraud Detection — Automated System Flags</p>
          <p className="text-xs text-purple-700/80 dark:text-purple-500/80 mt-1.5 font-bold leading-relaxed">Flags require manual review before any enforcement action is taken. All review decisions are permanently logged and directly attributed to your admin account.</p>
        </div>
      </div>

      {/* Metric cards */}
      <section>
        <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 font-mono mb-4">Detection Overview</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            label="Off-Platform Attempts" value={getCount('OFF_PLATFORM_CONTACT')} loading={loading}
            icon={<Activity className="w-5 h-5 text-amber-700 dark:text-amber-500" />}
            accentColor="bg-amber-100 dark:bg-amber-900/40 border border-amber-200 dark:border-transparent" textColor="text-amber-700 dark:text-amber-400"
          />
          <MetricCard
            label="Payment Bypass" value={getCount('PAYMENT_CIRCUMVENTION')} loading={loading}
            icon={<AlertOctagon className="w-5 h-5 text-red-700 dark:text-red-500" />}
            accentColor="bg-red-100 dark:bg-red-900/40 border border-red-200 dark:border-transparent" textColor="text-red-700 dark:text-red-400"
          />
          <MetricCard
            label="Fraud Alerts" value={getCount('FRAUD')} loading={loading}
            icon={<AlertTriangle className="w-5 h-5 text-orange-700 dark:text-orange-500" />}
            accentColor="bg-orange-100 dark:bg-orange-900/40 border border-orange-200 dark:border-transparent" textColor="text-orange-700 dark:text-orange-400"
          />
          <MetricCard
            label="Harassment Flags" value={getCount('HARASSMENT')} loading={loading}
            icon={<MessageSquareWarning className="w-5 h-5 text-purple-700 dark:text-purple-500" />}
            accentColor="bg-purple-100 dark:bg-purple-900/40 border border-purple-200 dark:border-transparent" textColor="text-purple-700 dark:text-purple-400"
          />
        </div>
      </section>

      {/* Filters */}
      <section className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/5 rounded-[2rem] p-6 lg:p-8 shadow-sm transition-colors hover:border-slate-300 dark:hover:border-white/10 flex flex-col gap-6">
        
        {/* Row 1: Severities & Statuses */}
        <div className="flex flex-col lg:flex-row lg:items-center gap-6 lg:gap-8">
          <div>
            <label className="block text-[10px] font-bold uppercase font-mono text-slate-500 dark:text-slate-400 mb-2.5 tracking-widest">Severity</label>
            <div className="flex flex-wrap bg-slate-50 dark:bg-slate-900/50 p-1.5 rounded-[1.5rem] border border-slate-200 dark:border-slate-800 w-fit shadow-inner">
              {['', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(s => (
                <button
                  key={s} onClick={() => setSeverityFilter(s)}
                  className={`text-[11px] font-black uppercase tracking-wider px-5 py-2.5 rounded-xl transition-all cursor-pointer ${
                    severityFilter === s
                      ? 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-400 shadow-sm border border-slate-200 dark:border-slate-700'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 border border-transparent'
                  }`}
                >
                  {s === '' ? 'All Severities' : s}
                </button>
              ))}
            </div>
          </div>
          <div className="hidden lg:block w-px h-12 bg-slate-200 dark:bg-slate-800/60 self-end mb-2" />
          <div>
            <label className="block text-[10px] font-bold uppercase font-mono text-slate-500 dark:text-slate-400 mb-2.5 tracking-widest">Status</label>
            <div className="flex flex-wrap bg-slate-50 dark:bg-slate-900/50 p-1.5 rounded-[1.5rem] border border-slate-200 dark:border-slate-800 w-fit shadow-inner">
              {['', 'OPEN', 'REVIEWED', 'ESCALATED'].map(s => (
                <button
                  key={s} onClick={() => setStatusFilter(s)}
                  className={`text-[11px] font-black uppercase tracking-wider px-5 py-2.5 rounded-xl transition-all cursor-pointer ${
                    statusFilter === s
                      ? 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-400 shadow-sm border border-slate-200 dark:border-slate-700'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 border border-transparent'
                  }`}
                >
                  {s === '' ? 'All Statuses' : s}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Row 2: Flag Types */}
        <div>
          <label className="block text-[10px] font-bold uppercase font-mono text-slate-500 dark:text-slate-400 mb-2.5 tracking-widest">Violation Type</label>
          <div className="flex flex-wrap bg-slate-50 dark:bg-slate-900/50 p-1.5 rounded-[1.5rem] border border-slate-200 dark:border-slate-800 w-fit shadow-inner">
            {['', 'PAYMENT_CIRCUMVENTION', 'OFF_PLATFORM_CONTACT', 'HARASSMENT', 'FRAUD'].map(t => (
              <button
                key={t} onClick={() => setTypeFilter(t)}
                className={`text-[11px] font-black uppercase tracking-wider px-5 py-2.5 rounded-xl transition-all cursor-pointer ${
                  typeFilter === t
                    ? 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-400 shadow-sm border border-slate-200 dark:border-slate-700'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 border border-transparent'
                }`}
              >
                {t === '' ? 'All Types' : FLAG_LABEL[t as FlagType] ?? t}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Flags list */}
      {loading ? (
        <div className="space-y-4">{Array(4).fill(0).map((_, i) => <div key={i} className="h-48 bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/5 rounded-[2rem] animate-pulse shadow-sm" />)}</div>
      ) : data.length === 0 ? (
        <div className="py-32 flex flex-col items-center gap-4 text-slate-400">
          <div className="w-24 h-24 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center shadow-inner border border-slate-100 dark:border-slate-800">
            <Flag className="w-10 h-10 text-slate-400 dark:text-slate-600" />
          </div>
          <div className="text-center">
            <p className="text-lg font-black text-slate-800 dark:text-slate-300">No flagged conversations</p>
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-500 mt-2 max-w-sm">No conversations match the currently selected filters.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2">
            <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 font-mono">Detection Results</h2>
            <span className="text-[10px] font-bold text-slate-500 font-mono">{total} records found</span>
          </div>
          {data.map((flag: any) => (
            <div key={flag.id} className="group bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/5 rounded-[2rem] p-6 lg:p-8 shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-white/10 transition-all duration-300">
              
              <div className="flex flex-col sm:flex-row sm:items-start gap-5">
                {/* Meta block */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-3 mb-6">
                    {/* Severity Badge */}
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border ${SEVERITY_STYLES[flag.severity as Severity] ?? ''}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${SEVERITY_DOTS[flag.severity as Severity] ?? ''}`} />
                      {flag.severity}
                    </span>
                    <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border ${FLAG_COLORS[flag.flagType as FlagType] ?? ''}`}>
                      {FLAG_LABEL[flag.flagType as FlagType] ?? flag.flagType}
                    </span>
                    
                    <span className="text-slate-700 dark:text-slate-300 dark:text-slate-600 hidden sm:inline font-bold px-1">·</span>
                    <span className="font-bold font-mono text-indigo-700 dark:text-indigo-400 text-xs bg-indigo-50 dark:bg-indigo-950/30 px-3 py-1 rounded-lg border border-indigo-200 dark:border-indigo-900/30">{flag.tripId.slice(0, 8)}…</span>
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 hidden lg:inline">{flag.tripRoute}</span>
                    
                    <div className="flex items-center gap-2 sm:ml-auto">
                      <span className={`w-2 h-2 rounded-full ${STATUS_DOT[flag.status] ?? 'bg-slate-400'}`} />
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{flag.status}</span>
                    </div>
                  </div>
                  
                  {/* Flag Snippet Box */}
                  <div className="bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-[1.5rem] p-5 mb-5 shadow-inner">
                    <div className="flex items-start gap-4">
                      <MessageSquareWarning className="w-5 h-5 text-slate-400 shrink-0" />
                      <div>
                        <p className="text-[15px] text-slate-700 dark:text-slate-300 font-medium leading-relaxed italic">"{flag.snippet}"</p>
                        <div className="flex flex-wrap gap-2 mt-4">
                          {flag.keywords?.map((kw: string) => (
                            <span key={kw} className="bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 text-[10px] font-black px-3 py-1.5 rounded-lg border border-red-200/60 dark:border-red-900/50 uppercase tracking-widest">{kw}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Users */}
                  <div className="flex flex-wrap items-center gap-5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    {flag.driver && (
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center text-[9px] font-black group-hover:scale-105 transition-transform shadow-sm">{(flag.driver.firstName?.[0] ?? '') + (flag.driver.lastName?.[0] ?? '')}</div>
                        <span className="text-slate-700 dark:text-slate-300">{flag.driver.firstName} {flag.driver.lastName}</span>
                      </div>
                    )}
                    {flag.passenger && (
                      <>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-700 dark:text-slate-300 dark:text-slate-600" />
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-violet-100 dark:bg-violet-900/60 text-violet-700 dark:text-violet-300 flex items-center justify-center text-[9px] font-black group-hover:scale-105 transition-transform shadow-sm">{(flag.passenger.firstName?.[0] ?? '') + (flag.passenger.lastName?.[0] ?? '')}</div>
                          <span className="text-slate-700 dark:text-slate-300">{flag.passenger.firstName} {flag.passenger.lastName}</span>
                        </div>
                      </>
                    )}
                    <span className="text-slate-700 dark:text-slate-300 dark:text-slate-600 hidden sm:inline">·</span>
                    <span className="font-mono text-[10px]">Detected: {new Date(flag.detectedAt).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 mt-5 pt-5 border-t border-slate-100 dark:border-slate-800/60">
                <button onClick={() => toast.info('Navigate to Investigations page to open a full investigation.')} className="flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 border-2 border-indigo-200 dark:border-indigo-900/50 bg-indigo-50 dark:bg-indigo-950/30 hover:bg-indigo-600 hover:border-indigo-600 hover:text-slate-900 dark:text-white dark:hover:bg-indigo-500 dark:hover:border-indigo-500 dark:hover:text-slate-900 dark:text-white px-4 py-2.5 rounded-xl transition-all shadow-sm cursor-pointer">
                  <ArrowUpRight className="w-4 h-4" />
                  Open Investigation
                </button>
                {flag.status !== 'REVIEWED' && (
                  <button onClick={() => updateFlag(flag.id, 'REVIEWED')} className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50 dark:bg-emerald-950/20 hover:bg-emerald-100 dark:hover:bg-emerald-950/60 px-4 py-2.5 rounded-xl transition-colors cursor-pointer">
                    <CheckCircle2 className="w-4 h-4" />
                    Mark Reviewed
                  </button>
                )}
                {flag.status !== 'ESCALATED' && (
                  <button onClick={() => updateFlag(flag.id, 'ESCALATED')} className="flex items-center gap-2 text-xs font-bold text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-950/60 px-4 py-2.5 rounded-xl transition-colors cursor-pointer">
                    <XCircle className="w-4 h-4" />
                    Escalate
                  </button>
                )}
                <span className="ml-auto text-[10px] text-slate-400 font-mono hidden sm:inline">Flag ID: {flag.id.slice(0, 8)}…</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
