'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import {
  Send,
  Bell,
  MailOpen,
  Users,
  Car,
  UserCheck,
  User,
  Smartphone,
  Info,
  AlertTriangle,
  Megaphone,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';

const TARGETS = ['ALL', 'DRIVERS', 'PASSENGERS', 'USER'];
const TARGET_LABELS: Record<string, { label: string; icon: React.ElementType }> = {
  ALL: { label: 'All Users', icon: Users },
  DRIVERS: { label: 'Drivers Only', icon: Car },
  PASSENGERS: { label: 'Passengers Only', icon: UserCheck },
  USER: { label: 'Specific User', icon: User },
};

const TYPE_OPTIONS: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  SYSTEM: { label: 'System Update', icon: Info, color: 'text-blue-400' },
  PROMOTION: { label: 'Promotion', icon: Megaphone, color: 'text-[var(--color-neon)]' },
  ALERT: { label: 'Alert', icon: AlertTriangle, color: 'text-red-400' },
  REMINDER: { label: 'Reminder', icon: Bell, color: 'text-amber-400' },
  UPDATE: { label: 'General Update', icon: RefreshCw, color: 'text-slate-700 dark:text-slate-300' },
};

export default function NotificationsPage() {
  const [stats, setStats] = useState<any>(null);
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState({
    title: '',
    body: '',
    type: 'SYSTEM',
    target: 'ALL',
    userId: '',
  });

  const loadStats = () => {
    api.getNotificationStats()
      .then(setStats)
      .catch(() => toast.error('Failed to load notification stats'));
  };

  useEffect(() => { loadStats(); }, []);

  const handleSend = async () => {
    if (!form.title.trim() || !form.body.trim()) {
      toast.error('Title and body are required');
      return;
    }
    if (form.target === 'USER' && !form.userId.trim()) {
      toast.error('Please enter a User ID for targeted notification');
      return;
    }

    setSending(true);
    try {
      const res = await api.broadcastNotification({
        title: form.title,
        body: form.body,
        type: form.type,
        target: form.target,
        userId: form.target === 'USER' ? form.userId : undefined,
      });
      toast.success(`✅ ${res.message}`);
      setForm(f => ({ ...f, title: '', body: '', userId: '' }));
      loadStats();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to send notification');
    } finally {
      setSending(false);
    }
  };

  const currentType = TYPE_OPTIONS[form.type];

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16">

      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter flex items-center gap-3">
            <div className="w-9 h-9 bg-[var(--color-neon)]/10 border border-[var(--color-neon)]/20 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(75,208,67,0.15)]">
              <Bell className="w-5 h-5 text-[var(--color-neon)]" />
            </div>
            Push Notifications
          </h1>
          <p className="text-slate-500 text-sm mt-2 font-medium">
            Broadcast targeted messages directly to driver and passenger devices.
          </p>
        </div>
      </div>

      {/* ── Stats Row ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Total Sent', value: stats?.total ?? '—', icon: Send, color: 'text-blue-600 dark:text-blue-400', iconBg: 'bg-blue-50 dark:bg-blue-500/10', blob: 'bg-blue-500' },
          { label: 'Unread', value: stats?.unread ?? '—', icon: Bell, color: 'text-amber-500 dark:text-amber-400', iconBg: 'bg-amber-50 dark:bg-amber-500/10', blob: 'bg-amber-500' },
          { label: 'Read Rate', value: stats ? `${stats.readRate}%` : '—', icon: MailOpen, color: 'text-emerald-600 dark:text-[var(--color-neon)]', iconBg: 'bg-emerald-50 dark:bg-[var(--color-neon)]/10', blob: 'bg-emerald-500 dark:bg-[#4bd043]' },
        ].map(s => (
          <div key={s.label} className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/5 rounded-[2rem] p-6 flex items-center gap-5 relative overflow-hidden group hover:border-slate-300 dark:hover:border-white/10 transition-all shadow-sm hover:shadow-md dark:shadow-none">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border border-slate-100 dark:border-white/5 transition-colors ${s.iconBg}`}>
              <s.icon className={`w-6 h-6 transition-colors ${s.color}`} />
            </div>
            <div className="relative z-10">
              <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500 mb-1">{s.label}</p>
              <p className={`text-4xl font-black tracking-tighter leading-none transition-colors ${s.color}`}>{s.value}</p>
            </div>
            <div className={`absolute -bottom-6 -right-6 w-32 h-32 rounded-full blur-[40px] opacity-[0.04] group-hover:opacity-[0.08] dark:opacity-20 dark:group-hover:opacity-40 transition-opacity ${s.blob}`} />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* ── Left Column: Compose Form ─────────────────────────────────────── */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/5 rounded-[2rem] p-8">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center">
                <Send className="w-4 h-4 text-slate-700 dark:text-slate-300" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Compose Message</h2>
            </div>

            <div className="space-y-6">
              {/* Audience */}
              <div>
                <label className="flex items-center gap-2 text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest mb-3">
                  <Users className="w-3 h-3" /> Target Audience
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {TARGETS.map(t => {
                    const TargetIcon = TARGET_LABELS[t].icon;
                    const isActive = form.target === t;
                    return (
                      <button
                        key={t}
                        onClick={() => setForm(f => ({ ...f, target: t }))}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all cursor-pointer border ${
                          isActive
                            ? 'bg-[var(--color-neon)]/10 border-[var(--color-neon)]/30 text-[var(--color-neon)] shadow-[0_0_15px_rgba(75,208,67,0.1)]'
                            : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/5 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-white/10 hover:text-slate-900 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10'
                        }`}
                      >
                        <TargetIcon className="w-4 h-4" />
                        {TARGET_LABELS[t].label}
                      </button>
                    );
                  })}
                </div>

                {form.target === 'USER' && (
                  <div className="mt-3 relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5 focus:border-[var(--color-neon)]/50 rounded-xl py-3 pl-11 pr-4 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-[var(--color-neon)]/30 transition-all"
                      placeholder="Enter specific User ID..."
                      value={form.userId}
                      onChange={e => setForm(f => ({ ...f, userId: e.target.value }))}
                    />
                  </div>
                )}
              </div>

              {/* Type */}
              <div>
                <label className="flex items-center gap-2 text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest mb-3">
                  <Info className="w-3 h-3" /> Notification Category
                </label>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(TYPE_OPTIONS).map(([key, { label, icon: TypeIcon, color }]) => {
                    const isActive = form.type === key;
                    return (
                      <button
                        key={key}
                        onClick={() => setForm(f => ({ ...f, type: key }))}
                        className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                          isActive
                            ? 'bg-slate-200 dark:bg-white/10 border-white/20 text-slate-900 dark:text-white'
                            : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 hover:border-slate-300 dark:hover:border-white/10'
                        }`}
                      >
                        <TypeIcon className={`w-3.5 h-3.5 ${isActive ? color : 'text-slate-600'}`} />
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Title */}
              <div>
                <div className="flex justify-between items-end mb-3">
                  <label className="flex items-center gap-2 text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest">
                    Message Title
                  </label>
                  <span className={`text-[10px] font-mono ${form.title.length > 70 ? 'text-orange-400' : 'text-slate-600'}`}>
                    {form.title.length}/80
                  </span>
                </div>
                <input
                  className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5 focus:border-[var(--color-neon)]/50 rounded-xl px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-[var(--color-neon)]/30 transition-all"
                  placeholder="E.g., Weekend Bonus Drive! 🚀"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  maxLength={80}
                />
              </div>

              {/* Body */}
              <div>
                <div className="flex justify-between items-end mb-3">
                  <label className="flex items-center gap-2 text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest">
                    Message Body
                  </label>
                  <span className={`text-[10px] font-mono ${form.body.length > 250 ? 'text-orange-400' : 'text-slate-600'}`}>
                    {form.body.length}/300
                  </span>
                </div>
                <textarea
                  className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5 focus:border-[var(--color-neon)]/50 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-slate-300 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-[var(--color-neon)]/30 transition-all resize-none leading-relaxed"
                  placeholder="Write your push notification content here..."
                  rows={5}
                  value={form.body}
                  onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                  maxLength={300}
                />
              </div>
            </div>
          </div>

          {/* Breakdown Stats */}
          {stats?.byType?.length > 0 && (
            <div className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/5 rounded-[2rem] p-8">
              <h3 className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest mb-4">Historical Sent by Type</h3>
              <div className="flex flex-wrap gap-2">
                {stats.byType.map((t: any) => {
                  const typeData = TYPE_OPTIONS[t.type] || TYPE_OPTIONS.SYSTEM;
                  return (
                    <div key={t.type} className="flex items-center gap-2.5 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5 rounded-xl px-3 py-2">
                      <typeData.icon className={`w-3.5 h-3.5 ${typeData.color}`} />
                      <span className="text-xs font-bold text-slate-400">{typeData.label}</span>
                      <span className="text-[10px] font-mono bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded-lg text-slate-500">
                        {t._count?.type}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── Right Column: Device Preview & Action ─────────────────────────── */}
        <div className="lg:col-span-5 space-y-6">
          
          <div className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/5 rounded-[2rem] p-8 flex flex-col h-full relative overflow-hidden">
            <h3 className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2 mb-8">
              <Smartphone className="w-3.5 h-3.5" /> Live Device Preview
            </h3>

            {/* Faux Phone UI */}
            <div className="flex-1 flex flex-col items-center justify-center mb-8 relative z-10">
              <div className="w-[280px] h-[580px] bg-black rounded-[3rem] border-4 border-slate-800 p-4 relative shadow-2xl overflow-hidden flex flex-col">
                {/* Notch */}
                <div className="absolute top-0 inset-x-0 h-6 flex justify-center z-20">
                  <div className="w-24 h-5 bg-slate-800 rounded-b-xl" />
                </div>
                
                {/* Status Bar */}
                <div className="flex justify-between items-center text-[10px] text-white px-2 mt-2 mb-6 font-medium z-10">
                  <span>9:41</span>
                  <div className="flex gap-1.5">
                    <span className="w-4 h-2.5 bg-white rounded-sm" />
                  </div>
                </div>

                {/* Wallpaper / background app UI */}
                <div className="absolute inset-0 bg-slate-900 pointer-events-none" />
                <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-48 h-48 bg-indigo-500/20 rounded-full blur-[50px] pointer-events-none" />

                {/* Notification Dropdown Preview */}
                <div className={`relative z-10 w-full bg-[#1a1a1a]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl transition-all duration-500 transform ${
                  (form.title || form.body) ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0'
                }`}>
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-black flex items-center justify-center shrink-0 border border-white/10">
                      <currentType.icon className={`w-4 h-4 ${currentType.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-0.5">
                        <span className="text-[10px] font-bold text-white uppercase tracking-wider">RidePal</span>
                        <span className="text-[9px] text-slate-400">now</span>
                      </div>
                      <p className="text-sm font-bold text-white mb-0.5 leading-tight truncate">
                        {form.title || 'Notification Title'}
                      </p>
                      <p className="text-xs text-slate-300 leading-snug line-clamp-3 opacity-90">
                        {form.body || 'Your message body will appear here. Start typing to see it live...'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Send Button */}
            <button
              onClick={handleSend}
              disabled={sending || (!form.title && !form.body)}
              className="relative z-10 w-full bg-[var(--color-neon)] hover:bg-[var(--color-neon)]/90 text-black py-4 rounded-2xl font-black text-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(75,208,67,0.2)] hover:shadow-[0_0_30px_rgba(75,208,67,0.3)] hover:scale-[1.02] flex items-center justify-center gap-2 group cursor-pointer"
            >
              {sending ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Broadcasting...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform" />
                  Broadcast to {TARGET_LABELS[form.target].label}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
