'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { api, AdminSession } from '@/lib/api';
import { ShieldCheck, Key, Smartphone, Monitor, RotateCcw, Globe } from 'lucide-react';

export default function SecurityPage() {
  const searchParams = useSearchParams();
  const setupMfa = searchParams.get('setup-mfa') === '1';

  const [sessions, setSessions] = useState<AdminSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  // MFA enrollment state
  const [mfaSetup, setMfaSetup] = useState<{
    secret: string;
    qrCodeDataUrl: string;
    otpAuthUrl: string;
  } | null>(null);
  const [mfaSetupLoading, setMfaSetupLoading] = useState(false);
  const [totpCode, setTotpCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [mfaError, setMfaError] = useState('');
  const [mfaSuccess, setMfaSuccess] = useState('');
  const [confirmingMfa, setConfirmingMfa] = useState(false);

  // Password change state
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwError, setPwError] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);

  const loadSessions = useCallback(async () => {
    try {
      setSessionsLoading(true);
      const data = await api.getSessions();
      setSessions(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Failed to load sessions:', err);
    } finally {
      setSessionsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSessions();
    if (setupMfa) {
      startMfaSetup();
    }
  }, [loadSessions, setupMfa]);

  const handleRevokeSession = async (sessionId: string) => {
    try {
      setRevokingId(sessionId);
      await api.revokeSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    } catch (err: any) {
      console.error('Revoke failed:', err);
    } finally {
      setRevokingId(null);
    }
  };

  const startMfaSetup = async () => {
    try {
      setMfaSetupLoading(true);
      setMfaError('');
      const data = await api.setupMfa();
      setMfaSetup(data);
    } catch (err: any) {
      setMfaError(err.message || 'Failed to start MFA setup.');
    } finally {
      setMfaSetupLoading(false);
    }
  };

  const confirmMfaSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (totpCode.length !== 6) return;
    try {
      setConfirmingMfa(true);
      setMfaError('');
      const res = await api.confirmMfaSetup(totpCode);
      setBackupCodes(res.backupCodes);
      setMfaSetup(null);
      setMfaSuccess('MFA enabled successfully! Save your backup codes in a secure location.');
    } catch (err: any) {
      setMfaError(err.message || 'Invalid code. Try again.');
      setTotpCode('');
    } finally {
      setConfirmingMfa(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError('');

    if (pwForm.newPassword.length < 8) {
      setPwError('New password must be at least 8 characters.');
      return;
    }
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setPwError('New passwords do not match.');
      return;
    }
    if (pwForm.currentPassword === pwForm.newPassword) {
      setPwError('New password must differ from your current password.');
      return;
    }

    setPwSaving(true);
    try {
      await api.changeAdminPassword({
        currentPassword: pwForm.currentPassword,
        newPassword: pwForm.newPassword,
      });
      toast.success('Password changed successfully! All active sessions remain valid.');
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      setPwError(err.message || 'Failed to change password.');
    } finally {
      setPwSaving(false);
    }
  };

  // Password strength helper
  const getPasswordStrength = (pw: string): { label: string; color: string; width: string } => {
    if (!pw) return { label: '', color: '', width: '0%' };
    const hasUpper = /[A-Z]/.test(pw);
    const hasLower = /[a-z]/.test(pw);
    const hasNum = /[0-9]/.test(pw);
    const hasSpecial = /[^A-Za-z0-9]/.test(pw);
    const score = [pw.length >= 8, hasUpper, hasLower, hasNum, hasSpecial].filter(Boolean).length;
    if (score <= 2) return { label: 'Weak', color: 'bg-red-500', width: '33%' };
    if (score <= 3) return { label: 'Fair', color: 'bg-amber-500', width: '60%' };
    return { label: 'Strong', color: 'bg-emerald-500', width: '100%' };
  };

  const pwStrength = getPasswordStrength(pwForm.newPassword);

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleString('en-NG', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const getBrowserIcon = (userAgent?: string) => {
    if (!userAgent) return <Globe className="w-5 h-5 text-slate-500" />;
    if (userAgent.includes('Chrome') || userAgent.includes('Safari') || userAgent.includes('Edge') || userAgent.includes('Firefox')) {
      return <Monitor className="w-5 h-5 text-indigo-500" />;
    }
    if (userAgent.includes('Mobile') || userAgent.includes('Android') || userAgent.includes('iPhone')) {
      return <Smartphone className="w-5 h-5 text-violet-500" />;
    }
    return <Globe className="w-5 h-5 text-slate-500" />;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-2.5">
            <ShieldCheck className="w-7 h-7 text-indigo-500" />
            Security & Sessions
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Manage your password, two-factor authentication, and active sessions.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ─── Change Password ─────────────────────────────────────────────────── */}
        <section className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/5 rounded-[2rem] p-8 shadow-sm flex flex-col transition-colors hover:border-slate-300 dark:hover:border-white/10 group">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 rounded-[14px] flex items-center justify-center shrink-0 border border-indigo-100 dark:border-indigo-800/50 group-hover:bg-indigo-100 transition-colors">
              <Key className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-800 dark:text-white tracking-tight">Change Password</h2>
              <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mt-1">Keep your account secure with a strong password.</p>
            </div>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-4 flex-1 flex flex-col">
            {/* Current Password */}
            <div className="space-y-1.5">
              <label htmlFor="current-password" className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                Current Password
              </label>
              <div className="relative">
                <input
                  id="current-password"
                  type={showCurrentPw ? 'text' : 'password'}
                  value={pwForm.currentPassword}
                  onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })}
                  required
                  placeholder="Enter your current password"
                  className="w-full bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 dark:focus:border-indigo-500 rounded-xl py-2.5 px-4 pr-12 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all text-sm"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPw(!showCurrentPw)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-500 text-[10px] font-bold cursor-pointer transition-colors uppercase tracking-wider"
                  tabIndex={-1}
                >
                  {showCurrentPw ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div className="space-y-1.5">
              <label htmlFor="new-password" className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                New Password
              </label>
              <div className="relative">
                <input
                  id="new-password"
                  type={showNewPw ? 'text' : 'password'}
                  value={pwForm.newPassword}
                  onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })}
                  required
                  minLength={8}
                  placeholder="Min. 8 characters"
                  className="w-full bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 dark:focus:border-indigo-500 rounded-xl py-2.5 px-4 pr-12 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all text-sm"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPw(!showNewPw)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-500 text-[10px] font-bold cursor-pointer transition-colors uppercase tracking-wider"
                  tabIndex={-1}
                >
                  {showNewPw ? 'Hide' : 'Show'}
                </button>
              </div>
              {/* Strength meter */}
              {pwForm.newPassword && (
                <div className="space-y-1.5 mt-2 animate-in fade-in duration-300">
                  <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${pwStrength.color}`}
                      style={{ width: pwStrength.width }}
                    />
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${
                    pwStrength.label === 'Strong' ? 'text-emerald-500' :
                    pwStrength.label === 'Fair' ? 'text-amber-500' :
                    'text-red-500'
                  }`}>{pwStrength.label} password</span>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <label htmlFor="confirm-password" className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  id="confirm-password"
                  type="password"
                  value={pwForm.confirmPassword}
                  onChange={(e) => setPwForm({ ...pwForm, confirmPassword: e.target.value })}
                  required
                  placeholder="Repeat new password"
                  className={`w-full bg-slate-50 dark:bg-slate-950/50 border focus:outline-none focus:ring-4 transition-all rounded-xl py-2.5 px-4 text-slate-900 dark:text-white placeholder-slate-400 text-sm ${
                    pwForm.confirmPassword && pwForm.newPassword !== pwForm.confirmPassword
                      ? 'border-red-400 focus:border-red-500 focus:ring-red-500/10'
                      : 'border-slate-200 dark:border-slate-800 focus:border-indigo-500 focus:ring-indigo-500/10'
                  }`}
                  autoComplete="new-password"
                />
                {pwForm.confirmPassword && pwForm.newPassword === pwForm.confirmPassword && (
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-emerald-500 text-sm animate-in zoom-in duration-300">✓</span>
                )}
              </div>
            </div>

            {/* Error */}
            {pwError && (
              <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-400 text-xs rounded-xl p-3 font-medium animate-in fade-in">
                {pwError}
              </div>
            )}

            <div className="mt-auto pt-6">
              <button
                type="submit"
                id="change-password-btn"
                disabled={pwSaving || !pwForm.currentPassword || !pwForm.newPassword || !pwForm.confirmPassword}
                className="w-full bg-slate-900 hover:bg-black disabled:bg-slate-100 disabled:border disabled:border-slate-200 disabled:text-slate-400 text-white font-bold py-3.5 px-5 rounded-xl transition-all text-sm flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed shadow-sm uppercase tracking-wider"
              >
                {pwSaving ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Updating...
                  </>
                ) : (
                  'Update Password'
                )}
              </button>
            </div>
          </form>
        </section>

        {/* ─── MFA Enrollment ─────────────────────────────────────────────────── */}
        <section className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/5 rounded-[2rem] p-8 shadow-sm flex flex-col transition-colors hover:border-slate-300 dark:hover:border-white/10 group">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-violet-50 dark:bg-violet-900/30 rounded-[14px] flex items-center justify-center shrink-0 border border-violet-100 dark:border-violet-800/50 group-hover:bg-violet-100 transition-colors">
              <Smartphone className="w-6 h-6 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-800 dark:text-white tracking-tight">Authenticator App (TOTP)</h2>
              <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mt-1">Google Authenticator · Microsoft Authenticator · Authy</p>
            </div>
          </div>

          <div className="flex-1 flex flex-col">
            {mfaError && (
              <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-400 text-xs rounded-xl p-3 mb-4 font-medium animate-in fade-in">
                {mfaError}
              </div>
            )}

            {mfaSuccess && (
              <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-xs rounded-xl p-3 mb-4 font-medium animate-in fade-in">
                {mfaSuccess}
              </div>
            )}

            {/* Backup codes display after successful setup */}
            {backupCodes.length > 0 && (
              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 rounded-xl p-4 mb-4">
                <div className="flex items-start gap-3 mb-3">
                  <div className="mt-0.5">
                    <svg className="w-4 h-4 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-amber-900 dark:text-amber-200 font-bold text-xs">Save these backup codes now</p>
                    <p className="text-amber-700/80 dark:text-amber-400/80 text-[10px] mt-0.5 font-medium">Each code can only be used once. Store them securely.</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {backupCodes.map((code, i) => (
                    <code key={i} className="bg-white dark:bg-slate-900/50 text-slate-800 dark:text-slate-200 text-xs font-mono font-bold py-2 px-3 rounded-lg border border-amber-100 dark:border-amber-900/30 text-center tracking-widest">
                      {code}
                    </code>
                  ))}
                </div>
              </div>
            )}

            {/* QR Code setup flow */}
            {mfaSetup ? (
              <div className="space-y-6 animate-in fade-in duration-300 flex-1 flex flex-col">
                <div className="flex flex-col sm:flex-row gap-5 items-center sm:items-start">
                  <div className="flex flex-col items-center gap-3 shrink-0">
                    <div className="p-2 bg-white rounded-xl shadow-sm border border-slate-200">
                      <img
                        src={mfaSetup.qrCodeDataUrl}
                        alt="QR Code for authenticator app"
                        className="w-28 h-28 rounded-lg"
                      />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <p className="text-slate-700 dark:text-slate-300 text-xs font-medium">1. Open your authenticator app.</p>
                      <p className="text-slate-700 dark:text-slate-300 text-xs font-medium">2. Tap <strong>+</strong> → <strong>Scan QR code</strong>.</p>
                      <p className="text-slate-700 dark:text-slate-300 text-xs font-medium">3. Enter the 6-digit code below.</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-lg p-3">
                      <p className="text-slate-400 dark:text-slate-500 text-[9px] uppercase font-bold tracking-widest mb-1.5">Manual Entry Key</p>
                      <code className="text-violet-600 dark:text-violet-400 text-[11px] font-mono font-bold break-all select-all">{mfaSetup.secret}</code>
                    </div>
                  </div>
                </div>

                <form onSubmit={confirmMfaSetup} className="flex gap-3 mt-auto">
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    className="flex-1 bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 focus:border-violet-500 rounded-xl py-2.5 px-4 text-slate-900 dark:text-white text-center text-lg font-mono font-bold tracking-[0.3em] placeholder-slate-300 dark:placeholder-slate-700 focus:outline-none focus:ring-4 focus:ring-violet-500/10 transition-all"
                    id="totp-confirm-input"
                    autoFocus
                    autoComplete="one-time-code"
                  />
                  <button
                    type="submit"
                    id="confirm-mfa-btn"
                    disabled={confirmingMfa || totpCode.length !== 6}
                    className="bg-violet-600 hover:bg-violet-700 disabled:bg-slate-300 disabled:dark:bg-slate-800 disabled:text-slate-500 text-slate-900 dark:text-white font-bold px-5 py-2.5 rounded-xl transition-all text-sm cursor-pointer disabled:cursor-not-allowed shadow-sm"
                  >
                    {confirmingMfa ? '...' : 'Confirm'}
                  </button>
                </form>
              </div>
            ) : (
              !mfaSuccess && (
                <div className="mt-auto flex justify-center items-center h-full pb-4 pt-6">
                  <button
                    type="button"
                    id="start-mfa-setup-btn"
                    onClick={startMfaSetup}
                    disabled={mfaSetupLoading}
                    className="w-full bg-slate-50 dark:bg-[#1a1a1a] hover:bg-violet-50 dark:hover:bg-violet-900/20 hover:border-violet-200 border-2 border-dashed border-slate-200 dark:border-white/10 text-slate-600 hover:text-violet-700 dark:text-slate-400 dark:hover:text-violet-300 font-bold px-5 py-4 rounded-[1rem] transition-all text-sm cursor-pointer flex items-center justify-center gap-2 uppercase tracking-wider"
                  >
                    {mfaSetupLoading ? (
                      <span className="animate-pulse">Loading...</span>
                    ) : (
                      <>
                        <span className="text-lg leading-none font-black">+</span> Set Up Authenticator
                      </>
                    )}
                  </button>
                </div>
              )
            )}
          </div>
        </section>
      </div>

      {/* ─── Active Sessions ────────────────────────────────────────────────── */}
      <section className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/5 rounded-[2rem] p-8 shadow-sm transition-colors hover:border-slate-300 dark:hover:border-white/10 group">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800/50 rounded-[14px] flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700/50 group-hover:bg-slate-100 transition-colors">
              <svg className="w-6 h-6 text-slate-600 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2h-2" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-800 dark:text-white tracking-tight">Active Sessions</h2>
              <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mt-1">
                {sessions.length} active session{sessions.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={loadSessions}
            className="flex items-center gap-2 text-xs font-semibold bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-300 dark:hover:border-indigo-900 px-3 py-2 rounded-xl transition-all cursor-pointer shadow-sm"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${sessionsLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {sessionsLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="animate-pulse bg-slate-50 dark:bg-slate-950/30 rounded-xl h-16 border border-slate-100 dark:border-slate-800/50" />
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 bg-slate-50 dark:bg-slate-950/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
            <span className="text-3xl mb-2 opacity-50">🔌</span>
            <p className="text-slate-400 dark:text-slate-500 text-xs font-semibold">No active sessions found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sessions.map((session, index) => (
              <div
                key={session.id}
                className="group/session flex flex-col justify-between bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-300 shadow-sm animate-in fade-in"
                style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'both' }}
              >
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-10 h-10 bg-white dark:bg-slate-900 rounded-xl flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-800 shadow-sm">
                    {getBrowserIcon(session.userAgent)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-slate-800 dark:text-slate-200 text-sm font-black truncate tracking-tight">
                      {session.deviceLabel || session.userAgent?.split(' ')[0] || 'Unknown device'}
                    </p>
                    <div className="flex flex-col gap-1 mt-1.5">
                      {session.ipAddress && (
                        <span className="text-slate-500 dark:text-slate-500 text-[10px] font-mono font-bold uppercase tracking-widest">
                          IP: {session.ipAddress}
                        </span>
                      )}
                      <span className="text-slate-400 dark:text-slate-500 text-[10px] font-mono uppercase tracking-widest">
                        {formatDate(session.lastSeenAt)}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  id={`revoke-session-${session.id}`}
                  onClick={() => handleRevokeSession(session.id)}
                  disabled={revokingId === session.id}
                  className="w-full text-red-600 dark:text-red-400 hover:text-white dark:hover:text-white bg-red-50 dark:bg-red-950/20 hover:bg-red-600 dark:hover:bg-red-600 disabled:opacity-50 text-[11px] font-bold py-2.5 rounded-xl transition-all border border-red-200 dark:border-red-900/30 cursor-pointer disabled:cursor-not-allowed text-center uppercase tracking-widest"
                >
                  {revokingId === session.id ? 'Revoking...' : 'Revoke Session'}
                </button>
              </div>
            ))}
          </div>

        )}
      </section>
    </div>
  );
}
