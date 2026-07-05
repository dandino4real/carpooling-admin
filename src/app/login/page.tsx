'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

type Step = 'credentials' | 'mfa' | 'mfa-enroll';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();

  // Step 1 state
  const [step, setStep] = useState<Step>('credentials');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // MFA step state
  const [tempToken, setTempToken] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [mfaEnrolled, setMfaEnrolled] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (api.isAuthenticated()) {
      router.push('/dashboard');
    }
  }, [router]);

  // ─── Step 1: email + password ──────────────────────────────────────────────

  const handleCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password) {
      setError('Please fill in all fields.');
      return;
    }
    try {
      setLoading(true);
      const res = await api.adminLogin(email.trim().toLowerCase(), password);
      setTempToken(res.tempToken);
      setMfaEnrolled(res.mfaEnrolled);
      setStep(res.mfaEnrolled ? 'mfa' : 'mfa-enroll');
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  // ─── Step 2: TOTP verification ─────────────────────────────────────────────

  const handleMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!totpCode || totpCode.length !== 6) {
      setError('Enter the 6-digit code from your authenticator app.');
      return;
    }
    try {
      setLoading(true);
      const res = await api.verifyMfa(tempToken, totpCode);
      // Store the refresh token so the silent refresh interceptor can renew
      // the 15-min access token cookie without forcing the admin to log in again.
      if (res.refreshToken) api.setRefreshToken(res.refreshToken);
      login({
        id: res.user.id,
        firstName: res.user.firstName,
        lastName: res.user.lastName,
        email: res.user.email,
        role: res.user.role,
        adminRole: res.user.adminRole,
      });
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Invalid code. Try again.');
      setTotpCode('');
    } finally {
      setLoading(false);
    }
  };

  // ─── Step 2b: MFA not enrolled — complete login and go set up MFA ────────────

  const handleProceedToEnroll = async () => {
    setError('');
    try {
      setLoading(true);
      // Uses the dedicated enrollment endpoint — no TOTP code required.
      // The backend verifies the tempToken and issues a full session only
      // if MFA is not yet enabled on the account.
      const res = await api.beginMfaEnrollment(tempToken);
      // Store the refresh token for silent re-auth
      if (res.refreshToken) api.setRefreshToken(res.refreshToken);
      login({
        id: res.user.id,
        firstName: res.user.firstName,
        lastName: res.user.lastName,
        email: res.user.email,
        role: res.user.role,
        adminRole: res.user.adminRole,
      });
      router.push('/dashboard/security?setup-mfa=1');
    } catch (err: any) {
      setError(err.message || 'Session error. Please log in again.');
    } finally {
      setLoading(false);
    }
  };

  // ─── UI ────────────────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 relative bg-gradient-to-b from-slate-50 via-emerald-50/40 to-slate-100 dark:bg-none dark:bg-[#0a0a0a]">
      {/* Background Graphic (subtle dots) */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.06] dark:opacity-[0.03] z-0 bg-[radial-gradient(black_1px,_transparent_1px)] dark:bg-[radial-gradient(white_1px,_transparent_1px)] bg-[size:24px_24px]" />

      {/* Hero Background Image replicating marketing site */}
      <div 
        className="absolute inset-0 pointer-events-none z-0 dark:opacity-15 opacity-10" 
        style={{ 
          backgroundImage: "url('/hero-bg.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'grayscale(100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, black 0%, transparent 100%)',
          maskImage: 'linear-gradient(to bottom, black 0%, transparent 100%)'
        }} 
      />
      
      {/* Subtle green top glow replicating marketing site */}
      <div 
        className="absolute inset-0 pointer-events-none z-10 bg-[radial-gradient(circle_at_50%_0%,_rgba(16,185,129,0.15)_0%,_transparent_60%)] dark:bg-[radial-gradient(circle_at_50%_0%,_rgba(75,208,67,0.05)_0%,_transparent_60%)]" 
      />

      <div className="w-full max-w-md relative z-20">
        
        {/* Admin Portal Header Logo */}
        <div className="flex items-center justify-center gap-4 mb-6">
           <div className="w-48 h-16 shrink-0 flex items-center justify-center">
             <img src="/images/logo-light.png" alt="RidePal Logo" className="w-full h-full object-contain scale-[3.5] origin-center block dark:hidden" />
             <img src="/images/logo-dark.png" alt="RidePal Logo" className="w-full h-full object-contain scale-[3.5] origin-center hidden dark:block" />
           </div>
           <span className="text-lg font-medium tracking-wide text-slate-800 dark:text-white border-l border-slate-300 dark:border-white/20 pl-4 py-1 z-10 relative">Admin</span>
        </div>

        {/* Minimalist Card */}
        <div className="rounded-3xl p-12 shadow-2xl bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/10 relative z-20">
          
          {/* Header */}
          <div className="mb-12">
            <h1 className="text-4xl font-bold text-slate-800 dark:text-white tracking-tight mb-3">
              {step === 'credentials' && <>Sign <span className="text-emerald-500 dark:text-[var(--color-neon)]">In.</span></>}
              {step === 'mfa' && <>Verify <span className="text-emerald-500 dark:text-[var(--color-neon)]">Access.</span></>}
              {step === 'mfa-enroll' && <>Secure <span className="text-emerald-500 dark:text-[var(--color-neon)]">Account.</span></>}
            </h1>
            <p className="text-base text-slate-500 dark:text-slate-400">
              {step === 'credentials' && 'Access the administrative control panel.'}
              {step === 'mfa' && 'Enter your authenticator code to proceed.'}
              {step === 'mfa-enroll' && 'Action required: Set up two-factor authentication.'}
            </p>
          </div>

          {/* Step progress */}
          {step !== 'credentials' && (
            <div className="flex items-center gap-3 mb-8">
              <div className="flex-1 h-1 rounded-full" style={{ backgroundColor: 'var(--color-neon)' }} />
              <div className={`flex-1 h-1 rounded-full transition-all duration-500`} style={{ backgroundColor: step === 'mfa' || step === 'mfa-enroll' ? 'var(--color-neon)' : 'var(--color-surface-hover)' }} />
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="rounded-xl p-4 mb-8 flex items-start gap-3" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
              <svg className="w-5 h-5 shrink-0 mt-0.5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span className="text-sm text-red-300">{error}</span>
            </div>
          )}

          {/* ─── STEP 1: Credentials ─────────────────────────────────────────── */}
          {step === 'credentials' && (
            <form onSubmit={handleCredentials} className="space-y-8">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400" htmlFor="email">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@konnectdrive.ng"
                  className="w-full rounded-xl py-4 px-5 text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:focus:ring-[var(--color-neon)]/20 transition-all duration-200 bg-slate-50 dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/10"
                  disabled={loading}
                  autoComplete="email"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400" htmlFor="password">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full rounded-xl py-4 px-5 text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:focus:ring-[var(--color-neon)]/20 transition-all duration-200 bg-slate-50 dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/10"
                  disabled={loading}
                  autoComplete="current-password"
                />
              </div>

              <div className="flex items-center justify-between mt-2">
                <button type="button" className="text-sm font-medium transition-colors hover:text-slate-800 dark:hover:text-white text-slate-500 dark:text-slate-400">
                  Forgot Password?
                </button>
              </div>

              <button
                type="submit"
                id="login-btn"
                disabled={loading}
                className="w-full font-bold py-4 rounded-full transition-all duration-300 flex items-center justify-center gap-2 mt-10 text-white dark:text-black bg-emerald-600 hover:bg-emerald-500 dark:bg-[var(--color-neon)] dark:hover:bg-[var(--color-neon)]"
                style={{ opacity: loading ? 0.7 : 1 }}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-black" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Authenticating...</span>
                  </>
                ) : (
                  <span>Sign In To Admin</span>
                )}
              </button>
            </form>
          )}

          {/* ─── STEP 2: TOTP code ───────────────────────────────────────────── */}
          {step === 'mfa' && (
            <form onSubmit={handleMfa} className="space-y-6">
              <div className="rounded-xl p-4 text-sm flex items-start gap-3 bg-emerald-500/10 dark:bg-[var(--color-neon)]/10 border border-emerald-500/20 dark:border-[var(--color-neon)]/20 text-slate-800 dark:text-slate-200">
                <svg className="w-5 h-5 shrink-0 mt-0.5" style={{ color: 'var(--color-neon)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span>Open your Authenticator App and enter the 6-digit code.</span>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold uppercase tracking-wider mb-2 text-slate-500 dark:text-slate-400" htmlFor="totp">
                  Authenticator Code
                </label>
                <input
                  id="totp"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="------"
                  className="w-full rounded-xl py-4 px-5 text-slate-800 dark:text-white text-center text-3xl tracking-[0.5em] placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:focus:ring-[var(--color-neon)]/20 transition-all duration-300 bg-slate-50 dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/10"
                  disabled={loading}
                  autoFocus
                  autoComplete="one-time-code"
                />
              </div>

              <button
                type="submit"
                id="verify-mfa-btn"
                disabled={loading || totpCode.length !== 6}
                className="w-full font-bold py-4 rounded-full transition-all duration-300 flex items-center justify-center gap-2 mt-8 text-white dark:text-black bg-emerald-600 hover:bg-emerald-500 dark:bg-[var(--color-neon)] dark:hover:bg-[var(--color-neon)]"
                style={{ opacity: (loading || totpCode.length !== 6) ? 0.5 : 1 }}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-black" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Verifying...</span>
                  </>
                ) : (
                  <span>Verify Code</span>
                )}
              </button>

              <button
                type="button"
                onClick={() => { setStep('credentials'); setTotpCode(''); setError(''); }}
                className="w-full text-sm font-medium transition-colors py-2 flex items-center justify-center gap-2 hover:text-slate-800 dark:hover:text-white text-slate-500 dark:text-slate-400"
              >
                ← Back to login
              </button>
            </form>
          )}

          {/* ─── STEP 2b: MFA not enrolled ───────────────────────────────────── */}
          {step === 'mfa-enroll' && (
            <div className="space-y-6">
              <div className="rounded-xl p-5 text-sm flex items-start gap-4 bg-amber-500/10 border border-amber-500/20 text-slate-800 dark:text-slate-200">
                <div className="p-2 rounded-lg shrink-0" style={{ backgroundColor: 'rgba(245, 158, 11, 0.2)' }}>
                  <svg className="w-6 h-6 text-amber-500 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <p className="font-bold text-amber-600 dark:text-amber-400 text-base mb-1">Security Checkpoint</p>
                  <p className="text-amber-700/80 dark:text-amber-200/80 leading-relaxed">Your account does not have an authenticator app linked yet. You must set one up before accessing the admin panel.</p>
                </div>
              </div>

              <button
                type="button"
                id="setup-mfa-btn"
                onClick={handleProceedToEnroll}
                disabled={loading}
                className="w-full bg-amber-500 hover:bg-amber-400 text-white dark:text-black font-bold py-4 rounded-full transition-all duration-300 flex items-center justify-center gap-2 mt-8"
                style={{ opacity: loading ? 0.7 : 1 }}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-black" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Processing...</span>
                  </>
                ) : (
                  <span>Set Up Authenticator App</span>
                )}
              </button>

              <button
                type="button"
                onClick={() => { setStep('credentials'); setError(''); }}
                className="w-full text-sm font-medium transition-colors py-2 flex items-center justify-center gap-2 hover:text-slate-800 dark:hover:text-white text-slate-500 dark:text-slate-400"
              >
                ← Cancel and back
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
