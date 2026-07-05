'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';

type InviteStep = 'loading' | 'error' | 'set-password' | 'success';

function AcceptInviteContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token') ?? '';

  const [step, setStep] = useState<InviteStep>('loading');
  const [inviteData, setInviteData] = useState<{
    email: string;
    firstName: string;
    lastName: string;
    adminRole: string;
  } | null>(null);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      setStep('error');
      return;
    }
    api.validateInvite(token)
      .then((data) => {
        setInviteData(data);
        setStep('set-password');
      })
      .catch(() => {
        setStep('error');
      });
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (!/(?=.*[0-9])(?=.*[a-zA-Z])/.test(password)) {
      setError('Password must contain at least one letter and one number.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      setLoading(true);
      await api.acceptInvite(token, password);
      setStep('success');
    } catch (err: any) {
      setError(err.message || 'Failed to set up your account. The invite may have expired.');
    } finally {
      setLoading(false);
    }
  };

  const roleLabel: Record<string, string> = {
    SUPER_ADMIN: 'Super Admin',
    ADMIN: 'Admin',
    FINANCE_ADMIN: 'Finance Admin',
  };

  return (
    <main className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-violet-800/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-indigo-800/10 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md bg-slate-900/40 border border-slate-800/60 backdrop-blur-xl rounded-2xl p-8 shadow-2xl z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-tr from-violet-600 to-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-500/20">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">Accept Admin Invite</h1>
          <p className="text-slate-400 text-sm mt-2">Set your password to activate your RidePal Admin account</p>
        </div>

        {/* Loading */}
        {step === 'loading' && (
          <div className="text-center py-8">
            <svg className="animate-spin h-8 w-8 text-indigo-400 mx-auto" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <p className="text-slate-400 text-sm mt-3">Validating invite link...</p>
          </div>
        )}

        {/* Error */}
        {step === 'error' && (
          <div className="text-center py-8 space-y-4">
            <div className="w-14 h-14 bg-red-950/30 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-7 h-7 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="text-red-300 font-semibold">Invalid or expired invite</p>
            <p className="text-slate-400 text-sm">This invite link is invalid or has already expired. Contact your admin to request a new invite.</p>
          </div>
        )}

        {/* Set password form */}
        {step === 'set-password' && inviteData && (
          <div className="space-y-5">
            <div className="bg-indigo-950/20 border border-indigo-800/30 rounded-xl p-4">
              <p className="text-slate-300 text-sm">
                Welcome, <strong>{inviteData.firstName}</strong>! You've been invited as a{' '}
                <span className="text-indigo-300 font-semibold">{roleLabel[inviteData.adminRole] || inviteData.adminRole}</span>.
              </p>
              <p className="text-slate-400 text-xs mt-1">{inviteData.email}</p>
            </div>

            {error && (
              <div className="bg-red-950/30 border border-red-800/40 text-red-200 text-sm rounded-lg p-3">{error}</div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2" htmlFor="new-password">
                  New Password
                </label>
                <input
                  id="new-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 8 characters, letters + numbers"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-lg py-3 px-4 text-white placeholder-slate-600 focus:outline-none transition-colors"
                  disabled={loading}
                  autoComplete="new-password"
                />
              </div>

              <div>
                <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2" htmlFor="confirm-password">
                  Confirm Password
                </label>
                <input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your password"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-lg py-3 px-4 text-white placeholder-slate-600 focus:outline-none transition-colors"
                  disabled={loading}
                  autoComplete="new-password"
                />
              </div>

              <button
                type="submit"
                id="accept-invite-btn"
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 text-white font-semibold py-3.5 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Setting up account...</span>
                  </>
                ) : (
                  <span>Set Password & Activate Account</span>
                )}
              </button>
            </form>

            <p className="text-slate-500 text-xs text-center">
              After setting your password, you'll be asked to set up an authenticator app for two-factor authentication.
            </p>
          </div>
        )}

        {/* Success */}
        {step === 'success' && (
          <div className="text-center space-y-5">
            <div className="w-16 h-16 bg-emerald-950/30 border border-emerald-700/30 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="text-white font-semibold text-lg">Account Activated!</p>
              <p className="text-slate-400 text-sm mt-2">
                Your password has been set. Log in now and set up your authenticator app to complete your account security.
              </p>
            </div>
            <button
              type="button"
              onClick={() => router.push('/login')}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3.5 rounded-lg transition-all duration-200"
            >
              Go to Login →
            </button>
          </div>
        )}
      </div>

      <p className="text-slate-600 text-xs mt-8">RidePal Security Protocol v3.0</p>
    </main>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6">
        <svg className="animate-spin h-8 w-8 text-indigo-400" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      </div>
    }>
      <AcceptInviteContent />
    </Suspense>
  );
}
