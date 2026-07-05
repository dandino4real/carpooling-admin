'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import {
  FileSearch, Search, LockKeyhole, AlertTriangle, X,
  CalendarDays, Download, ShieldAlert, FileText, ChevronRight
} from 'lucide-react';

const ACCESS_REASONS = ['Support Ticket', 'Dispute Resolution', 'Safety Investigation', 'Fraud Investigation', 'Legal Request'];

const REASON_TO_API: Record<string, string> = {
  'Support Ticket':       'SUPPORT_TICKET',
  'Dispute Resolution':   'DISPUTE_RESOLUTION',
  'Safety Investigation': 'SAFETY_INVESTIGATION',
  'Fraud Investigation':  'FRAUD_INVESTIGATION',
  'Legal Request':        'LEGAL_REQUEST',
};

const STATUS_STYLES: Record<string, string> = {
  SCHEDULED:   'bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700/50',
  IN_PROGRESS: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-900/30',
  COMPLETED:   'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/30',
  CANCELLED:   'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900/30',
};

const CALL_STATUS_STYLE: Record<string, string> = {
  CONNECTED: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/30',
  MISSED:    'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/30',
  DECLINED:  'bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700/50',
  FAILED:    'bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-900/30',
  CANCELLED: 'bg-slate-100 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700/50',
};

// ─── AccessJustificationModal ─────────────────────────────────────────────────

function AccessJustificationModal({
  inv, onConfirm, onCancel,
}: {
  inv: any;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}) {
  const [reason, setReason] = useState('');
  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/60 dark:bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/5 rounded-[2rem] shadow-[0_20px_40px_-15px_rgba(0,0,0,0.2)] max-w-md w-full p-8 space-y-6 animate-in zoom-in-95 duration-200">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-[1rem] bg-amber-100 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/30 flex items-center justify-center shrink-0 shadow-inner">
            <LockKeyhole className="w-6 h-6 text-amber-700 dark:text-amber-500" />
          </div>
          <div className="pt-0.5">
            <h3 className="text-lg font-black text-slate-800 dark:text-white tracking-tight">Access Justification</h3>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              You are accessing private communication records for trip <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 px-1 rounded">{inv.tripId}</span>. This action is audited.
            </p>
          </div>
        </div>
        
        <div className="bg-slate-50/80 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800/60 rounded-[1.5rem] p-5 text-xs space-y-3 shadow-inner">
          <div className="flex justify-between items-center"><span className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest font-mono text-[10px]">Driver</span><span className="font-bold text-slate-700 dark:text-slate-200">{inv.driver?.firstName} {inv.driver?.lastName}</span></div>
          {inv.passenger && <div className="flex justify-between items-center"><span className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest font-mono text-[10px]">Passenger</span><span className="font-bold text-slate-700 dark:text-slate-200">{inv.passenger?.firstName} {inv.passenger?.lastName}</span></div>}
          <div className="flex justify-between items-center"><span className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest font-mono text-[10px]">Route</span><span className="font-bold text-slate-700 dark:text-slate-200 truncate max-w-[200px]">{inv.tripRoute}</span></div>
        </div>

        <div className="space-y-3">
          <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest font-mono">Reason for Access</label>
          <div className="grid grid-cols-1 gap-2.5">
            {ACCESS_REASONS.map(r => (
              <label key={r} className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 cursor-pointer transition-all ${reason === r ? 'bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-500 shadow-[0_0_12px_rgba(99,102,241,0.15)]' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-800'}`}>
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors ${reason === r ? 'border-indigo-600' : 'border-slate-300 dark:border-slate-600'}`}>
                  {reason === r && <div className="w-2 h-2 rounded-full bg-indigo-600" />}
                </div>
                <span className={`text-sm font-bold ${reason === r ? 'text-indigo-900 dark:text-indigo-300' : 'text-slate-600 dark:text-slate-700 dark:text-slate-300'}`}>{r}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button onClick={onCancel} className="flex-1 text-xs font-bold text-slate-600 dark:text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 py-3 rounded-xl transition-all cursor-pointer">Cancel</button>
          <button disabled={!reason} onClick={() => onConfirm(reason)} className="flex-1 text-xs font-bold text-slate-900 dark:text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed py-3 rounded-xl transition-all shadow-[0_4px_14px_0_rgb(79,70,229,0.39)] hover:shadow-[0_6px_20px_rgba(79,70,229,0.23)] cursor-pointer">
            Confirm & Access
          </button>
        </div>
      </div>
    </div>
  );
}

function InvestigationModal({ inv, accessReason, onClose }: { inv: any; accessReason: string; onClose: () => void }) {
  const [tab, setTab]         = useState<'timeline' | 'calls' | 'messages'>('timeline');
  const [detail, setDetail]   = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    api.getTripCommunicationTimeline(inv.tripId, accessReason)
      .then(setDetail)
      .catch(() => toast.error('Failed to load trip timeline'))
      .finally(() => setLoading(false));
  }, [inv.tripId, accessReason]);

  const TABS = [
    { key: 'timeline', label: '🕒 Timeline' },
    { key: 'calls',    label: '📞 Phone Records' },
    { key: 'messages', label: '💬 Messages' },
  ] as const;

  // ─── Export Report ──────────────────────────────────────────────────────────

  const exportReport = () => {
    if (!detail) { toast.error('Records not loaded yet.'); return; }
    setExporting(true);

    const now      = new Date().toLocaleString('en-NG', { dateStyle: 'long', timeStyle: 'short' });
    const tripId   = inv.tripId;
    const route    = inv.tripRoute;
    const status   = inv.status;
    const driver   = detail.trip?.driver ? `${detail.trip.driver.firstName} ${detail.trip.driver.lastName}` : 'N/A';
    const passengers = (detail.trip?.passengers ?? []).map((p: any) => `${p.firstName} ${p.lastName}`).join(', ') || 'N/A';
    const reasonLabel: Record<string, string> = {
      SUPPORT_TICKET:       'Support Ticket',
      DISPUTE_RESOLUTION:   'Dispute Resolution',
      SAFETY_INVESTIGATION: 'Safety Investigation',
      FRAUD_INVESTIGATION:  'Fraud Investigation',
      LEGAL_REQUEST:        'Legal Request',
    };

    const timelineRows = (detail.timeline ?? []).map((ev: any) => {
      const time = new Date(ev.time).toLocaleString('en-NG', { dateStyle: 'short', timeStyle: 'short' });
      const typeIcon = ev.type === 'call' ? '📞' : ev.type === 'message' ? '💬' : '⚙️';
      const desc = ev.type === 'message'
        ? `${ev.sender || ''}: ${ev.content || ''}`
        : ev.type === 'call'
        ? `${ev.event} — ${ev.meta || ''}`
        : ev.event;
      return `<tr><td>${time}</td><td>${typeIcon} ${ev.type.toUpperCase()}</td><td>${desc}</td></tr>`;
    }).join('');

    const callRows = (detail.calls ?? []).map((c: any) => {
      const time = new Date(c.time).toLocaleString('en-NG', { dateStyle: 'short', timeStyle: 'short' });
      return `<tr><td>${time}</td><td>${c.direction}</td><td>${c.duration}</td><td>${c.status}</td></tr>`;
    }).join('') || '<tr><td colspan="4" style="text-align:center;color:#94a3b8;">No call records</td></tr>';

    const msgRows = (detail.messages ?? []).map((m: any) => {
      const time = new Date(m.sentAt).toLocaleString('en-NG', { dateStyle: 'short', timeStyle: 'short' });
      return `<tr><td>${time}</td><td>${m.sender} (${m.senderRole})</td><td>${m.receiver}</td><td>${m.content ?? ''}</td></tr>`;
    }).join('') || '<tr><td colspan="4" style="text-align:center;color:#94a3b8;">No message records</td></tr>';

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Investigation Report — ${tripId}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 12px; color: #1e293b; background: #fff; padding: 40px; }
    header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #6366f1; padding-bottom: 16px; margin-bottom: 24px; }
    .logo { font-size: 18px; font-weight: 900; color: #6366f1; letter-spacing: -0.5px; }
    .logo span { color: #1e293b; }
    .meta { text-align: right; font-size: 10px; color: #64748b; }
    .meta strong { display: block; font-size: 13px; color: #1e293b; margin-bottom: 2px; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 10px; font-weight: 700; }
    .badge-amber   { background: #fef3c7; color: #92400e; }
    .badge-red     { background: #fee2e2; color: #991b1b; }
    .badge-green   { background: #dcfce7; color: #166534; }
    .badge-blue    { background: #dbeafe; color: #1e40af; }
    .badge-slate   { background: #f1f5f9; color: #475569; }
    section { margin-bottom: 28px; }
    h2 { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b; margin-bottom: 10px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
    .info-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px; }
    .info-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 12px; }
    .info-card .label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #94a3b8; margin-bottom: 3px; }
    .info-card .value { font-size: 12px; font-weight: 600; color: #1e293b; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th { background: #f1f5f9; text-align: left; padding: 7px 10px; font-weight: 700; color: #475569; font-size: 9px; text-transform: uppercase; letter-spacing: 0.06em; }
    td { padding: 7px 10px; border-bottom: 1px solid #f1f5f9; color: #334155; vertical-align: top; }
    tr:last-child td { border-bottom: none; }
    tr:hover td { background: #f8fafc; }
    .warning { background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 10px 14px; font-size: 10px; color: #92400e; margin-bottom: 20px; }
    footer { margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 12px; display: flex; justify-content: space-between; font-size: 9px; color: #94a3b8; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <header>
    <div>
      <div class="logo">Ride<span>Pal</span> Admin</div>
      <div style="font-size:11px;color:#6366f1;font-weight:600;margin-top:2px;">Trust &amp; Safety — Investigation Report</div>
    </div>
    <div class="meta">
      <strong>CONFIDENTIAL</strong>
      Exported: ${now}<br/>
      Access Reason: ${reasonLabel[accessReason] ?? accessReason}
    </div>
  </header>

  <section>
    <h2>Trip Overview</h2>
    <div class="info-grid">
      <div class="info-card"><div class="label">Trip ID</div><div class="value" style="font-family:monospace;">${tripId}</div></div>
      <div class="info-card"><div class="label">Route</div><div class="value">${route}</div></div>
      <div class="info-card"><div class="label">Status</div><div class="value"><span class="badge badge-slate">${status}</span></div></div>
      <div class="info-card"><div class="label">Driver</div><div class="value">${driver}</div></div>
      <div class="info-card"><div class="label">Passenger(s)</div><div class="value">${passengers}</div></div>
      <div class="info-card"><div class="label">Access Reason</div><div class="value"><span class="badge badge-amber">${reasonLabel[accessReason] ?? accessReason}</span></div></div>
    </div>
  </section>

  <div class="warning">
    ⚠️ <strong>CONFIDENTIAL — FOR AUTHORISED ADMIN USE ONLY.</strong>
    This report contains private communication records accessed under documented justification.
    Distribution outside the Trust &amp; Safety team is strictly prohibited.
    All access is logged and audited.
  </div>

  <section>
    <h2>📋 Event Timeline (${(detail.timeline ?? []).length} events)</h2>
    <table>
      <thead><tr><th style="width:140px">Time</th><th style="width:100px">Type</th><th>Description</th></tr></thead>
      <tbody>${timelineRows || '<tr><td colspan="3" style="text-align:center;color:#94a3b8;">No events</td></tr>'}</tbody>
    </table>
  </section>

  <section>
    <h2>📞 Phone Call Records — Metadata Only (${(detail.calls ?? []).length} records)</h2>
    <p style="font-size:10px;color:#64748b;margin-bottom:8px;">⚠️ Audio recordings are never stored or accessible. Only call metadata is shown.</p>
    <table>
      <thead><tr><th style="width:140px">Time</th><th>Direction</th><th style="width:100px">Duration</th><th style="width:100px">Status</th></tr></thead>
      <tbody>${callRows}</tbody>
    </table>
  </section>

  <section>
    <h2>💬 Message Records (${(detail.messages ?? []).length} messages)</h2>
    <table>
      <thead><tr><th style="width:140px">Time</th><th style="width:140px">Sender</th><th style="width:140px">Receiver</th><th>Content</th></tr></thead>
      <tbody>${msgRows}</tbody>
    </table>
  </section>

  <footer>
    <span>RidePal Admin Dashboard · Trust &amp; Safety · Investigation Report</span>
    <span>Trip: ${tripId} · Generated: ${now}</span>
  </footer>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `investigation-report-${tripId.slice(0, 8)}-${Date.now()}.html`;
    a.click();
    URL.revokeObjectURL(url);

    toast.success('Investigation report downloaded');
    setExporting(false);
  };

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/60 dark:bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/5 rounded-[2rem] shadow-[0_20px_40px_-15px_rgba(0,0,0,0.3)] w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-start justify-between px-8 py-6 bg-slate-50/50 dark:bg-white/5 border-b border-slate-200 dark:border-white/5 shrink-0">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-500" /> Investigation Details
              </h2>
              <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] uppercase tracking-widest font-black ${STATUS_STYLES[inv.status] ?? ''}`}>{inv.status}</span>
            </div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1.5 flex items-center gap-2">
              <span className="font-mono bg-slate-200 dark:bg-slate-800 px-1.5 rounded text-slate-700 dark:text-slate-300">{inv.tripId}</span>
              <ChevronRight className="w-3 h-3 text-slate-700 dark:text-slate-300 dark:text-slate-600" /> 
              {inv.tripRoute}
            </p>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 cursor-pointer transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Warning Banner */}
        <div className="px-7 py-3 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-100 dark:border-amber-900/30 flex items-center justify-between shrink-0 shadow-inner">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
            <p className="text-[11px] font-bold text-amber-700 dark:text-amber-400 tracking-wide uppercase">Confidential Records Session Logged</p>
          </div>
          <p className="text-[11px] font-bold text-amber-600/70 dark:text-amber-500/70">Reason: {accessReason}</p>
        </div>

        {/* Tabs */}
        <div className="flex px-7 pt-4 gap-2 border-b border-slate-200 dark:border-slate-800 shrink-0 bg-white dark:bg-slate-950">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`pb-3 px-4 text-xs font-bold uppercase tracking-widest transition-all cursor-pointer relative ${
                tab === t.key
                  ? 'text-indigo-600 dark:text-indigo-400'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-700 dark:text-slate-300'
              }`}
            >
              {t.label}
              {tab === t.key && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-400 rounded-t-full" />
              )}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-7 bg-slate-50/30 dark:bg-slate-900/10">
          {loading ? (
            <div className="space-y-4">{Array(5).fill(0).map((_, i) => <div key={i} className="h-16 bg-white dark:bg-slate-800/50 rounded-2xl animate-pulse shadow-sm" />)}</div>
          ) : !detail ? (
            <div className="py-20 flex flex-col items-center gap-3 text-slate-400">
              <AlertTriangle className="w-10 h-10 opacity-30" />
              <p className="text-sm font-bold">Failed to load records.</p>
            </div>
          ) : tab === 'timeline' ? (
            <div className="relative">
              <div className="absolute left-7 top-4 bottom-4 w-0.5 bg-slate-200 dark:bg-slate-800 rounded-full" />
              <div className="space-y-6">
                {detail.timeline?.map((ev: any, i: number) => {
                  const isCall = ev.type === 'call';
                  const isMsg = ev.type === 'message';
                  const isSystem = !isCall && !isMsg;
                  const icons: Record<string, string> = { system: ev.event.includes('Completed') ? '🏁' : ev.event.includes('Started') ? '🚗' : ev.event.includes('Created') ? '🛣️' : '⚙️', call: '📞', message: '💬' };
                  return (
                    <div key={i} className="flex gap-5 pl-16 relative group">
                      <div className={`absolute left-0 top-0 w-14 h-14 rounded-2xl flex items-center justify-center text-xl border shadow-sm z-10 transition-transform group-hover:scale-105 ${isCall ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-100 dark:border-indigo-900/30' : isMsg ? 'bg-violet-50 dark:bg-violet-950/40 border-violet-100 dark:border-violet-900/30' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
                        {icons[ev.type] ?? '📌'}
                      </div>
                      <div className="flex-1 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm group-hover:border-slate-300 dark:group-hover:border-slate-700 transition-colors">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-[10px] font-bold uppercase tracking-widest font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">{new Date(ev.time).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })}</span>
                          {!isMsg && <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{ev.event}</span>}
                          {isMsg && <span className={`text-xs font-black uppercase tracking-wider ${ev.senderRole === 'DRIVER' ? 'text-indigo-600 dark:text-indigo-400' : 'text-violet-600 dark:text-violet-400'}`}>{ev.sender}</span>}
                        </div>
                        {isCall && <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 rounded-lg px-3 py-2 w-fit inline-block">{ev.meta}</p>}
                        {isMsg && ev.content && (
                          <div className={`text-sm font-medium px-4 py-3 rounded-2xl w-fit max-w-sm shadow-sm ${ev.senderRole === 'DRIVER' ? 'bg-indigo-600 text-slate-900 dark:text-white rounded-tl-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-sm border border-slate-200 dark:border-slate-700'}`}>
                            {ev.content}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : tab === 'calls' ? (
            <div className="space-y-4">
              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 rounded-xl p-3 mb-6 flex items-center justify-center">
                <p className="text-[11px] text-amber-700 dark:text-amber-500 font-bold uppercase tracking-widest text-center">⚠️ Audio recordings are never accessible. Displaying metadata only.</p>
              </div>
              {detail.calls?.length === 0 && <div className="text-center py-16 text-slate-400"><span className="text-4xl mb-4 block opacity-50">📵</span><p className="text-sm font-bold">No call records found</p></div>}
              {detail.calls?.map((c: any) => (
                <div key={c.id} className="bg-white dark:bg-slate-900/20 border border-slate-200 dark:border-slate-900 rounded-2xl p-5 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/30 flex items-center justify-center text-xl shrink-0 shadow-inner">📞</div>
                    <div>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{c.direction}</p>
                      <p className="text-xs font-semibold text-slate-400 mt-1 flex items-center gap-2">
                        <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 rounded">{new Date(c.time).toLocaleTimeString()}</span>
                        <span>Duration: <span className="font-bold text-slate-600 dark:text-slate-700 dark:text-slate-300">{c.duration}</span></span>
                      </p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full shadow-sm ${CALL_STATUS_STYLE[c.status] ?? ''}`}>{c.status}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-6 flex flex-col">
              {detail.messages?.length === 0 && <div className="text-center py-16 text-slate-400"><span className="text-4xl mb-4 block opacity-50">💬</span><p className="text-sm font-bold">No messages found</p></div>}
              {detail.messages?.map((m: any) => {
                const isDriver = m.senderRole === 'DRIVER';
                return (
                  <div key={m.id} className={`flex gap-3 ${isDriver ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-10 h-10 rounded-full shrink-0 flex items-center justify-center text-xs font-black shadow-sm ${isDriver ? 'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800' : 'bg-violet-100 dark:bg-violet-900/60 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800'}`}>
                      {m.sender.split(' ').map((s: string) => s[0]).join('')}
                    </div>
                    <div className={`max-w-[70%] flex flex-col gap-1 ${isDriver ? 'items-end' : 'items-start'}`}>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">{m.sender} <span className="font-normal font-mono text-[9px] opacity-70 ml-1">{new Date(m.sentAt).toLocaleTimeString()}</span></span>
                      <div className={`text-sm font-medium px-4 py-3 rounded-2xl leading-relaxed shadow-sm ${isDriver ? 'bg-indigo-600 text-slate-900 dark:text-white rounded-tr-sm' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-tl-sm'}`}>
                        {m.content}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-7 py-5 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <button
            onClick={exportReport}
            disabled={loading || exporting || !detail}
            className="flex items-center gap-2 text-xs font-bold text-indigo-700 dark:text-indigo-400 border-2 border-indigo-200 dark:border-indigo-900/60 bg-indigo-50 dark:bg-indigo-950/30 hover:bg-indigo-100 dark:hover:bg-indigo-950/50 disabled:opacity-40 disabled:cursor-not-allowed px-5 py-2.5 rounded-xl transition-colors cursor-pointer"
          >
            {exporting ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
            ) : (
              <Download className="w-4 h-4" />
            )}
            {exporting ? 'Generating Report…' : 'Export Full Report'}
          </button>
          <button onClick={onClose} className="text-xs font-bold text-slate-900 dark:text-white bg-indigo-600 hover:bg-indigo-500 px-6 py-2.5 rounded-xl transition-all shadow-[0_4px_14px_0_rgb(79,70,229,0.39)] hover:shadow-[0_6px_20px_rgba(79,70,229,0.23)] cursor-pointer">
            Close Investigation
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function InvestigationsPage() {
  const [search, setSearch]       = useState('');
  const [dateFrom, setDateFrom]   = useState('');
  const [dateTo, setDateTo]       = useState('');
  const [data, setData]           = useState<any[]>([]);
  const [total, setTotal]         = useState(0);
  const [loading, setLoading]     = useState(true);
  const [justifyFor, setJustifyFor]   = useState<any | null>(null);
  const [openInv, setOpenInv]         = useState<{ inv: any; reason: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.listCommunicationInvestigations({ search: search || undefined, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined });
      setData(res.data ?? []);
      setTotal(res.total ?? 0);
    } catch {
      toast.error('Failed to load investigations');
    } finally {
      setLoading(false);
    }
  }, [search, dateFrom, dateTo]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-2.5">
            <FileSearch className="w-7 h-7 text-indigo-500" />
            Communication Investigations
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Audited access to private trip communication records.
          </p>
        </div>
      </div>

      {/* Privacy banner */}
      <div className="bg-red-50/80 dark:bg-red-950/30 border border-red-200/60 dark:border-red-900/40 rounded-[2rem] px-8 py-6 flex items-start gap-4 shadow-sm animate-in fade-in slide-in-from-bottom-2">
        <ShieldAlert className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-black text-red-800 dark:text-red-400 tracking-wide">Restricted Access — Communication Records</p>
          <p className="text-xs text-red-700/80 dark:text-red-500/80 mt-1.5 font-bold leading-relaxed">Opening an investigation requires a documented justification. All access events are permanently logged and directly attributed to your admin account.</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/5 rounded-[2rem] p-6 lg:p-8 flex flex-wrap items-end gap-5 shadow-sm transition-colors hover:border-slate-300 dark:hover:border-white/10">
        <div className="relative flex-1 min-w-[240px]">
          <label className="block text-[10px] font-bold uppercase font-mono text-slate-500 dark:text-slate-400 mb-2 tracking-widest">Search Query</label>
          <Search className="absolute left-4 bottom-3.5 w-4 h-4 text-slate-400" />
          <input 
            className="w-full pl-11 pr-4 py-3 text-sm font-bold bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 dark:focus:border-indigo-500 rounded-xl text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-inner" 
            placeholder="Search Trip ID, Driver, Passenger…" 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
          />
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
            />
          </div>
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase font-mono text-slate-500 dark:text-slate-400 mb-2 tracking-widest">Date To</label>
          <div className="relative">
            <CalendarDays className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input 
              type="date" 
              value={dateTo} 
              onChange={e => setDateTo(e.target.value)} 
              className="text-sm font-bold bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 dark:focus:border-indigo-500 rounded-xl pl-11 pr-4 py-3 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-inner cursor-pointer" 
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/5 rounded-[2rem] overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
        <div className="px-6 py-5 border-b border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-white/5 flex justify-between items-center">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">
            {total} trip{total !== 1 ? 's' : ''} <span className="hidden sm:inline">with communication records</span>
          </span>
        </div>

        {loading ? (
          <div className="p-6 space-y-4">{Array(5).fill(0).map((_, i) => <div key={i} className="h-16 bg-slate-100 dark:bg-slate-800/50 rounded-xl animate-pulse" />)}</div>
        ) : data.length === 0 ? (
          <div className="py-32 flex flex-col items-center gap-4 text-slate-400">
            <div className="w-24 h-24 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center shadow-inner border border-slate-100 dark:border-slate-800">
              <Search className="w-10 h-10 text-slate-400 dark:text-slate-600" />
            </div>
            <div className="text-center">
              <p className="text-lg font-black text-slate-800 dark:text-slate-300">No communication records found</p>
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-500 mt-2 max-w-md">Trips will appear here once calls or messages are exchanged between drivers and passengers.</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/50">
                  {['Trip', 'Driver', 'Passenger', 'Calls', 'Msgs', 'Status', 'Flags', 'Action'].map(h => (
                    <th key={h} className="px-6 py-4 text-left text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest font-mono whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                {data.map((inv: any) => (
                  <tr key={inv.tripId} className="group hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-bold font-mono text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 px-2 py-0.5 rounded-md border border-indigo-100 dark:border-indigo-900/30">{inv.tripId.slice(0, 8)}…</span>
                      <span className="block text-[11px] font-semibold text-slate-500 mt-1.5 truncate max-w-[140px]">{inv.tripRoute}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 flex items-center justify-center text-[11px] font-black group-hover:scale-105 transition-transform shadow-sm">{(inv.driver?.firstName?.[0] ?? '') + (inv.driver?.lastName?.[0] ?? '')}</div>
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">{inv.driver?.firstName} {inv.driver?.lastName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {inv.passenger ? (
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-900/60 border border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-300 flex items-center justify-center text-[11px] font-black group-hover:scale-105 transition-transform shadow-sm">{(inv.passenger?.firstName?.[0] ?? '') + (inv.passenger?.lastName?.[0] ?? '')}</div>
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">{inv.passenger?.firstName} {inv.passenger?.lastName}</span>
                        </div>
                      ) : <span className="text-slate-400 dark:text-slate-600 font-bold">—</span>}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 rounded-md bg-slate-100 dark:bg-slate-800 font-mono text-[11px] font-bold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">{inv.calls}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 rounded-md bg-slate-100 dark:bg-slate-800 font-mono text-[11px] font-bold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">{inv.messages}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${STATUS_STYLES[inv.status] ?? ''}`}>{inv.status}</span>
                    </td>
                    <td className="px-6 py-4">
                      {inv.hasFlag ? (
                        <span className={`inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full border shadow-sm ${inv.flagSeverity === 'CRITICAL' ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900/50' : inv.flagSeverity === 'HIGH' ? 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-400 dark:border-orange-900/50' : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/50'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${inv.flagSeverity === 'CRITICAL' ? 'bg-red-500' : inv.flagSeverity === 'HIGH' ? 'bg-orange-500' : 'bg-amber-500'}`} />
                          {inv.flagSeverity}
                        </span>
                      ) : <span className="text-slate-700 dark:text-slate-300 dark:text-slate-700 font-bold">—</span>}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => setJustifyFor(inv)}
                        className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-900 dark:text-indigo-400 border-2 border-slate-200 dark:border-indigo-900/50 bg-white dark:bg-indigo-950/30 hover:border-slate-800 hover:shadow-md dark:hover:bg-indigo-500 dark:hover:border-indigo-500 dark:text-white px-5 py-2.5 rounded-xl transition-all cursor-pointer"
                      >
                        <LockKeyhole className="w-3.5 h-3.5" />
                        Access
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      {justifyFor && (
        <AccessJustificationModal
          inv={justifyFor}
          onCancel={() => setJustifyFor(null)}
          onConfirm={(reason) => {
            toast.success(`Access granted — ${reason}`);
            setOpenInv({ inv: justifyFor, reason });
            setJustifyFor(null);
          }}
        />
      )}

      {openInv && (
        <InvestigationModal
          inv={openInv.inv}
          accessReason={REASON_TO_API[openInv.reason] ?? openInv.reason}
          onClose={() => setOpenInv(null)}
        />
      )}
    </div>
  );
}
