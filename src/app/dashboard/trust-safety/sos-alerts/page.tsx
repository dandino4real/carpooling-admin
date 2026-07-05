'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import {
  Siren, Flame, ShieldCheck, Activity, Search, RefreshCw, 
  MapPin, Phone, Mail, ChevronDown, ChevronUp, AlertOctagon, Info
} from 'lucide-react';

type SosStatus = 'ACTIVE' | 'RESOLVED' | 'DISMISSED';

interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  relation: string;
}

interface SosAlert {
  id: string;
  status: SosStatus;
  latitude?: number;
  longitude?: number;
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
  tripId?: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    avatarUrl?: string;
    emergencyContacts: EmergencyContact[];
  };
  trip?: {
    id: string;
    originState: string;
    destinationState: string;
    driver?: {
      id: string;
      firstName: string;
      lastName: string;
      phone: string;
    };
  };
}

const STATUS_BADGES: Record<SosStatus, string> = {
  ACTIVE:    'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900/50 shadow-[0_0_8px_rgba(239,68,68,0.3)] animate-pulse',
  RESOLVED:  'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/50',
  DISMISSED: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/60 dark:text-slate-700 dark:text-slate-300 dark:border-slate-700/50',
};

const STATUS_DOTS: Record<SosStatus, string> = {
  ACTIVE:    'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.8)]',
  RESOLVED:  'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)]',
  DISMISSED: 'bg-slate-400 shadow-[0_0_6px_rgba(148,163,184,0.6)]',
};

// Nigerian emergency / authority contact directory
const AUTHORITY_CONTACTS = [
  {
    label: 'Emergency (All Services)',
    number: '112',
    icon: '🆘',
    color: 'bg-red-50 border-red-200 text-red-700 dark:bg-red-950/20 dark:border-red-900/40 dark:text-red-400 hover:border-red-300 hover:shadow-sm',
    iconBg: 'bg-red-100 dark:bg-red-900/40 shadow-inner',
  },
  {
    label: 'Nigeria Police Force',
    number: '199',
    icon: '👮',
    color: 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/20 dark:border-blue-900/40 dark:text-blue-400 hover:border-blue-300 hover:shadow-sm',
    iconBg: 'bg-blue-100 dark:bg-blue-900/40 shadow-inner',
  },
  {
    label: 'Federal Road Safety Corps',
    number: '122',
    icon: '🚗',
    color: 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/20 dark:border-amber-900/40 dark:text-amber-400 hover:border-amber-300 hover:shadow-sm',
    iconBg: 'bg-amber-100 dark:bg-amber-900/40 shadow-inner',
  },
  {
    label: 'National Ambulance Service',
    number: '0800-AMBULANCE',
    icon: '🚑',
    color: 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/20 dark:border-emerald-900/40 dark:text-emerald-400 hover:border-emerald-300 hover:shadow-sm',
    iconBg: 'bg-emerald-100 dark:bg-emerald-900/40 shadow-inner',
  },
  {
    label: 'Lagos State Emergency',
    number: '767 / 112',
    icon: '🏙️',
    color: 'bg-purple-50 border-purple-200 text-purple-700 dark:bg-purple-950/20 dark:border-purple-900/40 dark:text-purple-400 hover:border-purple-300 hover:shadow-sm',
    iconBg: 'bg-purple-100 dark:bg-purple-900/40 shadow-inner',
  },
  {
    label: 'National Fire Service',
    number: '01-7944996',
    icon: '🚒',
    color: 'bg-orange-50 border-orange-200 text-orange-700 dark:bg-orange-950/20 dark:border-orange-900/40 dark:text-orange-400 hover:border-orange-300 hover:shadow-sm',
    iconBg: 'bg-orange-100 dark:bg-orange-900/40 shadow-inner',
  },
];

// ─── Metric Card ──────────────────────────────────────────────────────────────

function MetricCard({
  label, value, icon, accentColor, textColor, loading, pulsing
}: {
  label: string; value: number; icon: React.ReactNode; accentColor: string; textColor: string; loading: boolean; pulsing?: boolean;
}) {
  return (
    <div className={`bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/5 rounded-[2rem] p-6 shadow-sm flex flex-col gap-3 transition-all hover:-translate-y-1 hover:shadow-md hover:border-slate-300 dark:hover:border-white/10 duration-300 relative overflow-hidden`}>
      {pulsing && <div className="absolute inset-0 bg-red-500/5 animate-pulse" />}
      <div className="flex items-start justify-between mb-1 relative z-10">
        <span className={`text-[10px] font-bold uppercase tracking-widest font-mono ${textColor}`}>{label}</span>
        <div className={`w-14 h-14 rounded-[1rem] flex items-center justify-center shrink-0 shadow-inner ${accentColor}`}>
          {icon}
        </div>
      </div>
      <div className="relative z-10">
        {loading ? (
          <div className="h-10 w-20 bg-slate-100 dark:bg-slate-800/50 rounded-lg animate-pulse" />
        ) : (
          <span className={`text-4xl font-black tracking-tight leading-none ${textColor}`}>{value.toLocaleString()}</span>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SosAlertsPage() {
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [data, setData] = useState<SosAlert[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expandedContacts, setExpandedContacts] = useState<Set<string>>(new Set());

  // Statistics
  const [activeCount, setActiveCount] = useState(0);
  const [resolvedCount, setResolvedCount] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.listSosAlerts({
        status: statusFilter || undefined,
        search: searchQuery || undefined,
        limit: 100,
      });
      setData(res.data ?? []);
      setTotal(res.total ?? 0);

      if (!statusFilter && !searchQuery) {
        const active = (res.data as SosAlert[]).filter(x => x.status === 'ACTIVE').length;
        const resolved = (res.data as SosAlert[]).filter(x => x.status === 'RESOLVED').length;
        setActiveCount(active);
        setResolvedCount(resolved);
      }
    } catch {
      toast.error('Failed to load SOS alerts');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchQuery]);

  useEffect(() => {
    load();
    const interval = setInterval(() => { load(); }, 10000);
    return () => clearInterval(interval);
  }, [load]);

  const resolveAlert = async (id: string) => {
    try {
      await api.resolveSosAlert(id);
      toast.success('SOS alert successfully marked as resolved');
      setData(prev =>
        prev.map(item =>
          item.id === id
            ? { ...item, status: 'RESOLVED', resolvedAt: new Date().toISOString() }
            : item
        )
      );
      setActiveCount(prev => Math.max(0, prev - 1));
      setResolvedCount(prev => prev + 1);
    } catch (err: any) {
      toast.error(err.message || 'Failed to resolve SOS alert');
    }
  };

  const toggleContactsExpand = (alertId: string) => {
    setExpandedContacts(prev => {
      const next = new Set(prev);
      if (next.has(alertId)) next.delete(alertId);
      else next.add(alertId);
      return next;
    });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-2.5">
            <Siren className="w-8 h-8 text-red-600 dark:text-red-500 drop-shadow-sm" />
            Emergency SOS Alerts
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Real-time monitoring and resolution of passenger and driver distress signals.
          </p>
        </div>
      </div>

      {/* Alert Banner */}
      <div className="bg-red-50/80 dark:bg-red-950/30 border border-red-200/60 dark:border-red-900/40 rounded-[2rem] px-8 py-6 flex items-start gap-4 shadow-sm animate-in fade-in slide-in-from-bottom-2">
        <div className="mt-0.5 relative">
          <AlertOctagon className="w-7 h-7 text-red-600 dark:text-red-500 relative z-10" />
          <div className="absolute inset-0 bg-red-500 rounded-full blur-md opacity-40 animate-pulse" />
        </div>
        <div>
          <p className="text-sm font-black text-red-800 dark:text-red-400 tracking-wide uppercase">Live Trust & Safety Board — SOS Monitoring</p>
          <p className="text-xs text-red-700/80 dark:text-red-500/80 mt-1.5 font-bold leading-relaxed max-w-4xl">
            This dashboard displays real-time SOS alerts triggered by riders and drivers. Each alert card shows the user's personal emergency contacts and relevant authority numbers. Click "Resolve" ONLY after confirming the user's safety or contacting emergency services.
          </p>
        </div>
      </div>

      {/* Two-column main layout */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

        {/* ── Left column: Metrics + Alerts ── */}
        <div className="xl:col-span-2 space-y-8">

          {/* Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <MetricCard
              label="Active Alarms" value={activeCount} loading={loading} pulsing={activeCount > 0}
              icon={<Flame className={`w-6 h-6 ${activeCount > 0 ? 'text-red-700 dark:text-red-500 animate-pulse' : 'text-red-700'}`} />}
              accentColor="bg-red-100 dark:bg-red-900/40 border border-red-200 dark:border-transparent" textColor="text-red-700 dark:text-red-400"
            />
            <MetricCard
              label="Resolved Alarms" value={resolvedCount} loading={loading}
              icon={<ShieldCheck className="w-6 h-6 text-emerald-700 dark:text-emerald-500" />}
              accentColor="bg-emerald-100 dark:bg-emerald-900/40 border border-emerald-200 dark:border-transparent" textColor="text-emerald-700 dark:text-emerald-400"
            />
            <MetricCard
              label="Total Triggered" value={total} loading={loading}
              icon={<Activity className="w-6 h-6 text-slate-700 dark:text-slate-500" />}
              accentColor="bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-transparent" textColor="text-slate-700 dark:text-slate-400"
            />
          </div>

          {/* Filters */}
          <div className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/5 rounded-[2rem] p-6 shadow-sm transition-colors hover:border-slate-300 dark:hover:border-white/10 flex flex-wrap gap-5 items-center justify-between">
            <div className="flex flex-wrap items-center gap-4">
              <span className="text-[10px] font-bold uppercase tracking-widest font-mono text-slate-500 dark:text-slate-400">Status</span>
              <div className="flex bg-slate-50 dark:bg-slate-900/50 p-1.5 rounded-[1.5rem] border border-slate-200 dark:border-slate-800 shadow-inner">
                {['', 'ACTIVE', 'RESOLVED'].map(s => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={`text-[11px] font-black uppercase tracking-wider px-5 py-2.5 rounded-xl transition-all cursor-pointer ${
                      statusFilter === s
                        ? 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-400 shadow-sm border border-slate-200 dark:border-slate-700'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 border border-transparent'
                    }`}
                  >
                    {s === '' ? 'All Alarms' : s}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="flex items-center gap-3 w-full lg:w-auto">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by name, phone…"
                  className="w-full pl-11 pr-4 py-3 text-sm font-bold bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 rounded-xl text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-inner"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <button
                onClick={load}
                className="bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold px-5 py-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-2 cursor-pointer transition-colors shrink-0 hover:shadow-md"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
            </div>
          </div>

          {/* Alerts list */}
          {loading && data.length === 0 ? (
            <div className="space-y-4">
              {Array(3).fill(0).map((_, i) => (
                <div key={i} className="h-72 bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/5 rounded-[2rem] animate-pulse shadow-sm" />
              ))}
            </div>
          ) : data.length === 0 ? (
            <div className="py-32 flex flex-col items-center gap-4 text-slate-400">
              <div className="w-24 h-24 bg-emerald-50 dark:bg-emerald-900/20 rounded-full flex items-center justify-center shadow-inner border border-emerald-100 dark:border-emerald-800/50">
                <ShieldCheck className="w-10 h-10 text-emerald-500 dark:text-emerald-400" />
              </div>
              <div className="text-center">
                <p className="text-lg font-black text-slate-800 dark:text-slate-300">No SOS alerts found</p>
                <p className="text-sm font-semibold text-slate-500 dark:text-slate-500 mt-2">There are no matching SOS alerts for your current filters.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {data.map((alert) => {
                const isActive = alert.status === 'ACTIVE';
                return (
                  <div
                    key={alert.id}
                    className={`bg-white dark:bg-[#111111] border rounded-[2rem] overflow-hidden transition-all duration-300 ${
                      isActive
                        ? 'border-red-400 dark:border-red-800/60 shadow-[0_8px_30px_rgba(239,68,68,0.15)] dark:shadow-[0_8px_30px_rgba(239,68,68,0.05)] relative'
                        : 'border-slate-200 dark:border-white/5 shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-white/10'
                    }`}
                  >
                    {/* Active indicator gradient bar */}
                    {isActive && (
                      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-red-500 via-orange-500 to-red-500 animate-pulse" />
                    )}

                    <div className="p-6 md:p-8 space-y-6">
                      {/* Header row: status badge + ID + time */}
                      <div className="flex flex-wrap items-center gap-3">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${STATUS_BADGES[alert.status]}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOTS[alert.status]}`} />
                          {alert.status}
                        </span>
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 font-mono">
                          Alert #{alert.id.substring(0, 8)}…
                        </span>
                        <span className="text-slate-700 dark:text-slate-300 dark:text-slate-700 hidden sm:inline">·</span>
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-500 flex items-center gap-1.5">
                          Triggered: <span className="font-mono bg-slate-100 dark:bg-slate-800/60 px-1.5 rounded text-slate-600 dark:text-slate-400">{new Date(alert.createdAt).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                        </span>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* ── Left: User profile & Trip ── */}
                        <div className="space-y-5">
                          {/* User info */}
                          <div className="flex items-start gap-4">
                            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-red-100 to-orange-100 dark:from-red-900/40 dark:to-orange-900/40 text-red-700 dark:text-red-400 flex items-center justify-center font-black text-xl shrink-0 border-2 border-white dark:border-slate-900 shadow-md">
                              {alert.user.firstName[0]}{alert.user.lastName[0]}
                            </div>
                            <div className="pt-1">
                              <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight">
                                {alert.user.firstName} {alert.user.lastName}
                              </h3>
                              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                                <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-slate-400" /> {alert.user.phone}</span>
                                <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-slate-400" /> {alert.user.email}</span>
                              </div>
                            </div>
                          </div>

                          {/* Trip details */}
                          {alert.trip ? (
                            <div className="bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-[1.5rem] p-5 shadow-inner">
                              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 font-mono mb-2">Active Carpool Route</p>
                              <div className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 shadow-sm w-fit mb-4">
                                <span>{alert.trip.originState}</span>
                                <span className="text-indigo-500">→</span>
                                <span>{alert.trip.destinationState}</span>
                              </div>
                              
                              {alert.trip.driver && (
                                <div className="border-t border-slate-200 dark:border-slate-800 pt-4 mt-2">
                                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 font-mono mb-2">Driver on Trip</p>
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center text-[10px] font-black border border-indigo-200 dark:border-indigo-800">
                                      {alert.trip.driver.firstName[0]}{alert.trip.driver.lastName[0]}
                                    </div>
                                    <div>
                                      <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{alert.trip.driver.firstName} {alert.trip.driver.lastName}</p>
                                      <p className="text-[10px] font-mono text-slate-500 mt-0.5">{alert.trip.driver.phone}</p>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-[1.5rem] p-4 text-xs text-amber-800 dark:text-amber-400 flex items-start gap-3 shadow-inner">
                              <Info className="w-4 h-4 shrink-0 mt-0.5" />
                              <p className="font-semibold leading-relaxed">No active carpooling trip linked. This alert was triggered manually from the general safety screen.</p>
                            </div>
                          )}

                          {/* Location */}
                          {alert.latitude && alert.longitude && (
                            <div className="flex flex-wrap items-center gap-4 text-xs bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 rounded-xl px-4 py-3 w-fit">
                              <span className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400 font-semibold">
                                <MapPin className="w-4 h-4" />
                                <span className="font-mono">{alert.latitude.toFixed(5)}, {alert.longitude.toFixed(5)}</span>
                              </span>
                              <div className="w-px h-4 bg-indigo-200 dark:bg-indigo-800" />
                              <a
                                href={`https://www.google.com/maps/search/?api=1&query=${alert.latitude},${alert.longitude}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-indigo-700 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 font-bold underline flex items-center gap-1"
                              >
                                View on Maps
                              </a>
                            </div>
                          )}
                        </div>

                        {/* ── Right: Emergency contacts + actions ── */}
                        <div className="space-y-5 flex flex-col">
                          
                          {/* Emergency contacts card */}
                          <div className={`border-2 rounded-2xl overflow-hidden shadow-sm transition-colors ${isActive ? 'border-orange-300 dark:border-orange-800/60' : 'border-slate-200 dark:border-slate-800'}`}>
                            <button
                              onClick={() => toggleContactsExpand(alert.id)}
                              className={`w-full flex items-center justify-between px-5 py-4 text-xs font-bold cursor-pointer transition-colors ${isActive ? 'bg-orange-50 dark:bg-orange-950/30 text-orange-800 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-900/40' : 'bg-slate-50 dark:bg-slate-900/50 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80'}`}
                            >
                              <span className="flex items-center gap-2 uppercase tracking-widest font-mono text-[10px]">
                                🆘 Emergency Contacts
                                <span className={`inline-flex items-center justify-center min-w-[20px] h-5 rounded-md ${isActive ? 'bg-orange-200 dark:bg-orange-900 text-orange-800 dark:text-orange-300' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}>
                                  {alert.user.emergencyContacts?.length ?? 0}
                                </span>
                              </span>
                              <span className="opacity-60">
                                {expandedContacts.has(alert.id) ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              </span>
                            </button>

                            {expandedContacts.has(alert.id) && (
                              <div className={`divide-y ${isActive ? 'divide-orange-100 dark:divide-orange-900/30' : 'divide-slate-100 dark:divide-slate-800'}`}>
                                {!alert.user.emergencyContacts || alert.user.emergencyContacts.length === 0 ? (
                                  <div className="px-5 py-6 text-xs text-slate-500 dark:text-slate-400 italic text-center bg-white dark:bg-slate-950/50">
                                    No emergency contacts have been saved by this user.
                                  </div>
                                ) : (
                                  alert.user.emergencyContacts.map((contact) => (
                                    <div key={contact.id} className="flex items-center justify-between px-5 py-4 bg-white dark:bg-slate-950/50 gap-4">
                                      <div className="flex items-center gap-3 min-w-0">
                                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-black shrink-0 ${isActive ? 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'}`}>
                                          {contact.name[0]}
                                        </div>
                                        <div className="min-w-0">
                                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{contact.name}</p>
                                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">{contact.relation}</p>
                                        </div>
                                      </div>
                                      <a
                                        href={`tel:${contact.phone}`}
                                        className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-xl px-3 py-1.5 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors shrink-0 flex items-center gap-1.5 shadow-sm"
                                      >
                                        <Phone className="w-3 h-3" /> {contact.phone}
                                      </a>
                                    </div>
                                  ))
                                )}
                              </div>
                            )}

                            {/* Always show contacts expanded on ACTIVE alarms */}
                            {!expandedContacts.has(alert.id) && isActive && alert.user.emergencyContacts?.length > 0 && (
                              <div className="px-5 py-4 bg-orange-50/50 dark:bg-orange-950/10 border-t border-orange-200 dark:border-orange-800/50">
                                <div className="flex flex-wrap gap-2.5">
                                  {alert.user.emergencyContacts.slice(0, 2).map(c => (
                                    <a
                                      key={c.id}
                                      href={`tel:${c.phone}`}
                                      className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-lg px-2.5 py-1.5 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors flex items-center gap-1.5 shadow-sm"
                                    >
                                      <Phone className="w-3 h-3" /> {c.name}: <span className="font-mono">{c.phone}</span>
                                    </a>
                                  ))}
                                  {alert.user.emergencyContacts.length > 2 && (
                                    <span className="text-[10px] font-bold text-orange-600 dark:text-orange-500 bg-orange-100 dark:bg-orange-900/40 px-2 py-1.5 rounded-lg border border-orange-200 dark:border-orange-800">
                                      +{alert.user.emergencyContacts.length - 2} more
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Resolve / Resolved timestamp */}
                          <div className="mt-auto pt-4">
                            {isActive ? (
                              <button
                                onClick={() => resolveAlert(alert.id)}
                                className="bg-red-600 hover:bg-red-500 text-slate-900 dark:text-white text-sm font-black px-6 py-4 rounded-2xl border border-transparent flex items-center gap-2 cursor-pointer w-full justify-center transition-all shadow-[0_4px_14px_0_rgb(239,68,68,0.39)] hover:shadow-[0_6px_20px_rgba(239,68,68,0.23)] hover:-translate-y-0.5"
                              >
                                <ShieldCheck className="w-5 h-5" />
                                CONFIRM SAFETY & RESOLVE ALARM
                              </button>
                            ) : (
                              <div className="bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-4 w-full flex items-center justify-between shadow-inner">
                                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest font-mono">Status</span>
                                <p className="text-xs text-slate-700 dark:text-slate-300 font-bold flex items-center gap-2">
                                  Resolved at 
                                  <span className="font-mono bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-1 rounded-md shadow-sm">
                                    {alert.resolvedAt ? new Date(alert.resolvedAt).toLocaleString('en-NG', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                                  </span>
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Right column: Authority Contacts panel ── */}
        <div className="xl:col-span-1">
          <div className="sticky top-8 space-y-6">
            
            {/* Contacts Card */}
            <div className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/5 rounded-[2rem] shadow-sm overflow-hidden transition-all hover:border-slate-300 dark:hover:border-white/10">
              {/* Panel header */}
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 dark:from-slate-950 dark:to-slate-900 px-8 py-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <Siren className="w-20 h-20 text-slate-900 dark:text-white" />
                </div>
                <div className="relative z-10 flex items-start gap-4">
                  <div className="w-12 h-12 rounded-[1rem] bg-slate-200/20 dark:bg-white/10 flex items-center justify-center text-xl shrink-0 shadow-inner">
                    📡
                  </div>
                  <div className="pt-0.5">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono mb-1">Authority Contacts</p>
                    <p className="text-sm text-white font-bold">Nigerian Emergency Services</p>
                  </div>
                </div>
              </div>

              <div className="p-4 space-y-3">
                {AUTHORITY_CONTACTS.map((auth) => (
                  <div
                    key={auth.number}
                    className={`group flex items-center gap-4 p-4 rounded-[1.5rem] border transition-all ${auth.color}`}
                  >
                    <div className={`w-12 h-12 rounded-[1rem] ${auth.iconBg} flex items-center justify-center text-2xl shrink-0 group-hover:scale-110 transition-transform duration-300`}>
                      {auth.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-1">{auth.label}</p>
                      <a
                        href={`tel:${auth.number.replace(/[^0-9+]/g, '')}`}
                        className="text-lg font-black font-mono hover:underline"
                      >
                        {auth.number}
                      </a>
                    </div>
                    <a
                      href={`tel:${auth.number.replace(/[^0-9+]/g, '')}`}
                      className="shrink-0 w-12 h-12 rounded-[1rem] bg-white/60 dark:bg-black/20 border border-current/20 flex items-center justify-center text-sm font-bold hover:bg-white transition-colors cursor-pointer shadow-sm"
                      title={`Call ${auth.label}`}
                    >
                      📞
                    </a>
                  </div>
                ))}
              </div>

              <div className="px-6 py-5 bg-slate-50 dark:bg-slate-950/50 border-t border-slate-100 dark:border-slate-800">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center leading-relaxed">
                  These numbers are for official Nigerian emergency services. Notify the appropriate authorities immediately when an active SOS alert is detected.
                </p>
              </div>
            </div>

            {/* Protocol Card */}
            <div className="bg-blue-50/80 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40 rounded-[2rem] p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-[1rem] shadow-inner bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400">
                  <Info className="w-5 h-5" />
                </div>
                <p className="font-black text-sm text-blue-800 dark:text-blue-400 uppercase tracking-wider font-mono">Response Protocol</p>
              </div>
              <ol className="list-decimal list-inside space-y-3.5 text-xs font-bold leading-relaxed text-blue-800 dark:text-blue-300/80 marker:text-blue-500 dark:marker:text-blue-600 marker:font-black">
                <li>Open the alert and review user's current GPS location.</li>
                <li>Contact user's listed emergency contacts to verify status.</li>
                <li>Dispatch appropriate authority (Police/Ambulance) if safety cannot be confirmed.</li>
                <li>Mark the alert as resolved ONLY once safety is officially confirmed.</li>
              </ol>
            </div>
            
          </div>
        </div>

      </div>
    </div>
  );
}
