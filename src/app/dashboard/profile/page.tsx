'use client';

import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  User,
  Shield,
  Mail,
  Phone,
  MapPin,
  Edit3,
  Save,
  X,
  CheckCircle2,
  Clock,
  Key,
  ExternalLink,
  Fingerprint,
  Activity,
  Award
} from 'lucide-react';
import Link from 'next/link';
import { useAdminProfileQuery } from '@/hooks/useTrips';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

const ROLE_LABELS: Record<string, { label: string; className: string; description: string; glow: string }> = {
  SUPER_ADMIN: {
    label: 'Super Admin',
    className: 'bg-emerald-50 dark:bg-[var(--color-neon)]/10 text-emerald-700 dark:text-[var(--color-neon)] border border-emerald-200 dark:border-[var(--color-neon)]/30',
    description: 'Full platform access with user management and security controls.',
    glow: 'shadow-sm dark:shadow-[0_0_15px_rgba(75,208,67,0.2)]'
  },
  ADMIN: {
    label: 'Admin',
    className: 'bg-emerald-50 dark:bg-[var(--color-neon)]/10 text-emerald-700 dark:text-[var(--color-neon)] border border-emerald-200 dark:border-[var(--color-neon)]/30',
    description: 'KYC reviews, user moderation, and analytics access.',
    glow: 'shadow-sm dark:shadow-[0_0_15px_rgba(75,208,67,0.1)]'
  },
  KYC_ADMIN: {
    label: 'KYC Admin',
    className: 'bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10',
    description: 'KYC document review and driver profile verification.',
    glow: ''
  },
  FINANCE_ADMIN: {
    label: 'Finance Admin',
    className: 'bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10',
    description: 'Withdrawal approvals, trip payouts, and financial analytics.',
    glow: ''
  },
  SUPPORT_ADMIN: {
    label: 'Support Admin',
    className: 'bg-slate-100 dark:bg-white/5 text-slate-400 border border-slate-200 dark:border-white/10',
    description: 'Read-only access across all platform sections.',
    glow: ''
  },
};

const NIGERIAN_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno',
  'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT', 'Gombe',
  'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara',
  'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau',
  'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara',
];

const formatDate = (dateStr?: string) => {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
};

export default function AdminProfilePage() {
  const queryClient = useQueryClient();
  const { admin: storedAdmin, login } = useAuthStore();

  const { data: profile, isLoading, isError } = useAdminProfileQuery();

  // Edit state
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    stateOfResidence: '',
  });

  // Hydrate form when profile loads
  useEffect(() => {
    if (profile) {
      setForm({
        firstName: profile.firstName || '',
        lastName: profile.lastName || '',
        phone: profile.phone || '',
        stateOfResidence: profile.stateOfResidence || '',
      });
    }
  }, [profile]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await api.updateAdminProfile({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        phone: form.phone.trim() || undefined,
        stateOfResidence: form.stateOfResidence || undefined,
      });

      queryClient.setQueryData(['admin-profile'], (old: any) => ({ ...old, ...updated }));
      if (storedAdmin) {
        login({ ...storedAdmin, firstName: updated.firstName, lastName: updated.lastName });
      }

      toast.success('Profile updated successfully!');
      setEditing(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (profile) {
      setForm({
        firstName: profile.firstName || '',
        lastName: profile.lastName || '',
        phone: profile.phone || '',
        stateOfResidence: profile.stateOfResidence || '',
      });
    }
    setEditing(false);
  };

  const roleInfo = profile?.adminRole ? ROLE_LABELS[profile.adminRole] : ROLE_LABELS['ADMIN'];

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-8 animate-pulse">
        <div className="h-64 bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/5 rounded-[2rem]" />
        <div className="h-96 bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/5 rounded-[2rem]" />
      </div>
    );
  }

  if (isError || !profile) {
    return (
      <div className="max-w-md mx-auto mt-16 bg-red-950/20 border border-red-900/30 rounded-3xl p-8 text-center space-y-4 backdrop-blur-xl">
        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-2">
          <X className="w-8 h-8 text-red-400" />
        </div>
        <p className="text-base font-semibold text-red-400">Failed to load premium profile data.</p>
        <button
          onClick={() => queryClient.invalidateQueries({ queryKey: ['admin-profile'] })}
          className="text-xs font-bold text-slate-900 dark:text-white bg-red-600/80 hover:bg-red-600 px-6 py-3 rounded-xl cursor-pointer transition-all shadow-[0_0_15px_rgba(220,38,38,0.3)]"
        >
          Initialize Retry
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto pb-24 space-y-8">
      {/* Page Title */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tighter flex items-center gap-3">
            My Admin Profile
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-2 font-medium">
            Manage your personal details and console account information.
          </p>
        </div>
      </div>

      {/* ─── Premium Hero Card ─────────────────────────────────────────────────── */}
      <div className="relative bg-slate-50 dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/5 rounded-[2rem] p-8 md:p-10 shadow-sm overflow-hidden group">
        {/* Neon Glow Orbs */}
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-emerald-400/10 dark:bg-[var(--color-neon)]/10 blur-[100px] rounded-full pointer-events-none transition-opacity duration-700 group-hover:opacity-100 opacity-60" />
        <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-emerald-400/5 dark:bg-[var(--color-neon)]/5 blur-[80px] rounded-full pointer-events-none transition-opacity duration-700 group-hover:opacity-100 opacity-40" />
        
        {/* Glass overlay pattern */}
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.02] mix-blend-overlay pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start gap-8">
          {/* Avatar Area */}
          <div className="relative shrink-0">
            <div className="w-28 h-28 rounded-full bg-slate-50 dark:bg-[#111111] border border-slate-200 dark:border-white/10 flex items-center justify-center text-4xl font-black uppercase text-slate-900 dark:text-white shadow-md ring-4 ring-emerald-50 dark:ring-[var(--color-neon)]/40 ring-offset-4 ring-offset-white dark:ring-offset-[#0a0a0a] overflow-hidden">
              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} className="w-full h-full object-cover" alt="" />
              ) : (
                `${profile.firstName?.[0] || ''}${profile.lastName?.[0] || ''}`
              )}
            </div>
            {/* Online indicator */}
            <div className="absolute bottom-1 right-1 w-6 h-6 bg-emerald-500 dark:bg-[var(--color-neon)] rounded-full border-4 border-white dark:border-[#0a0a0a] shadow-sm dark:shadow-[0_0_15px_var(--color-neon)]" />
          </div>

          {/* Info Area */}
          <div className="flex-1 min-w-0 pt-2">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-1">
                  {profile.firstName} {profile.lastName}
                </h2>
                <p className="text-slate-400 text-sm font-mono tracking-wide">{profile.email}</p>
              </div>

              {/* Edit Button */}
              {!editing && (
                <button
                  onClick={() => setEditing(true)}
                  className="shrink-0 flex items-center gap-2 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all cursor-pointer backdrop-blur-md shadow-sm"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Edit Profile
                </button>
              )}
            </div>

            {/* Badges */}
            <div className="flex flex-wrap gap-3 mt-6">
              {roleInfo && (
                <span className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-bold backdrop-blur-md ${roleInfo.className} ${roleInfo.glow}`}>
                  <Shield className="w-3.5 h-3.5" />
                  {roleInfo.label}
                </span>
              )}
              {profile.mfaEnabled ? (
                <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 dark:bg-[var(--color-neon)]/10 text-emerald-700 dark:text-[var(--color-neon)] border border-emerald-200 dark:border-[var(--color-neon)]/30 backdrop-blur-md shadow-sm dark:shadow-[0_0_15px_rgba(75,208,67,0.1)]">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  MFA Active
                </span>
              ) : (
                <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30 backdrop-blur-md">
                  <Key className="w-3.5 h-3.5" />
                  MFA Not Set Up
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Footer Meta */}
        <div className="relative z-10 mt-8 pt-6 border-t border-slate-200 dark:border-white/5 flex flex-wrap items-center gap-6 text-xs text-slate-500 font-medium">
          <span className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-400" />
            Joined {formatDate(profile.createdAt)}
          </span>
          <span className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-slate-400" />
            Last updated {formatDate(profile.updatedAt)}
          </span>
          <span className="flex items-center gap-2 ml-auto">
            <Fingerprint className="w-4 h-4 text-slate-400" />
            <span className="font-mono text-[10px] bg-slate-100 dark:bg-white/5 px-2 py-1 rounded-md">{profile.id}</span>
          </span>
        </div>
      </div>

      {/* ─── Personal Information Glass Panel ──────────────────────────────────── */}
      <div className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/5 rounded-[2rem] overflow-hidden shadow-sm hover:border-slate-300 dark:hover:border-white/10 transition-colors">
        <div className="p-8 md:p-10 border-b border-slate-200 dark:border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2.5 text-lg">
              <User className="w-5 h-5 text-indigo-600 dark:text-[var(--color-neon)]" />
              Personal Information
            </h3>
            <p className="text-slate-500 text-xs mt-1">Review and update your contact details.</p>
          </div>

          {editing && (
            <div className="flex items-center gap-3">
              <button
                onClick={handleCancel}
                disabled={saving}
                className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-slate-900 dark:text-white border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:bg-white/5 px-5 py-2.5 rounded-xl transition-all cursor-pointer disabled:opacity-40"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 text-xs font-black bg-indigo-600 hover:bg-indigo-500 dark:bg-[var(--color-neon)] dark:hover:bg-[var(--color-neon)]/90 text-white dark:text-black px-6 py-2.5 rounded-xl transition-all cursor-pointer disabled:opacity-60 shadow-[0_4px_14px_0_rgb(79,70,229,0.39)] dark:shadow-[0_0_20px_rgba(75,208,67,0.3)]"
              >
                {saving ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        <div className="p-8 md:p-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* First Name */}
            <div className="space-y-2">
              <label className="block text-[10px] uppercase font-mono tracking-widest text-slate-500 font-bold">
                First Name
              </label>
              {editing ? (
                <input
                  type="text"
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-4 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 dark:focus:border-[var(--color-neon)] focus:ring-4 focus:ring-indigo-500/10 dark:focus:ring-[var(--color-neon)] transition-all shadow-inner"
                  placeholder="First name"
                />
              ) : (
                <div className="bg-slate-50 dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/5 rounded-2xl px-5 py-4 shadow-inner">
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{profile.firstName}</p>
                </div>
              )}
            </div>

            {/* Last Name */}
            <div className="space-y-2">
              <label className="block text-[10px] uppercase font-mono tracking-widest text-slate-500 font-bold">
                Last Name
              </label>
              {editing ? (
                <input
                  type="text"
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-4 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 dark:focus:border-[var(--color-neon)] focus:ring-4 focus:ring-indigo-500/10 dark:focus:ring-[var(--color-neon)] transition-all shadow-inner"
                  placeholder="Last name"
                />
              ) : (
                <div className="bg-slate-50 dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/5 rounded-2xl px-5 py-4 shadow-inner">
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{profile.lastName}</p>
                </div>
              )}
            </div>

            {/* Email (read-only) */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-[10px] uppercase font-mono tracking-widest text-slate-500 font-bold">
                <Mail className="w-3.5 h-3.5" /> Email Address
                <span className="text-[9px] text-slate-600 normal-case font-medium">(read-only)</span>
              </label>
              <div className="bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-2xl px-5 py-4 relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                <p className="text-sm font-mono text-slate-700 dark:text-slate-300 relative z-10">{profile.email}</p>
              </div>
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-[10px] uppercase font-mono tracking-widest text-slate-500 font-bold">
                <Phone className="w-3.5 h-3.5" /> Phone Number
              </label>
              {editing ? (
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-4 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 dark:focus:border-[var(--color-neon)] focus:ring-4 focus:ring-indigo-500/10 dark:focus:ring-[var(--color-neon)] transition-all shadow-inner"
                  placeholder="e.g. +2348012345678"
                />
              ) : (
                <div className="bg-slate-50 dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/5 rounded-2xl px-5 py-4 shadow-inner">
                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                    {profile.phone || <span className="text-slate-600 italic font-medium">Not set</span>}
                  </p>
                </div>
              )}
            </div>

            {/* State of Residence */}
            <div className="space-y-2 md:col-span-2">
              <label className="flex items-center gap-2 text-[10px] uppercase font-mono tracking-widest text-slate-500 font-bold">
                <MapPin className="w-3.5 h-3.5" /> State of Residence
              </label>
              {editing ? (
                <div className="relative">
                  <select
                    value={form.stateOfResidence}
                    onChange={(e) => setForm({ ...form, stateOfResidence: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-4 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 dark:focus:border-[var(--color-neon)] focus:ring-4 focus:ring-indigo-500/10 dark:focus:ring-[var(--color-neon)] transition-all cursor-pointer appearance-none shadow-inner"
                  >
                    <option value="" className="bg-white dark:bg-[#111111] text-slate-400">Select state...</option>
                    {NIGERIAN_STATES.map((s) => (
                      <option key={s} value={s} className="bg-white dark:bg-[#111111]">{s}</option>
                    ))}
                  </select>
                  <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/5 rounded-2xl px-5 py-4 shadow-inner">
                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                    {profile.stateOfResidence || <span className="text-slate-600 italic font-medium">Not set</span>}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Security & Access Card ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Access Level */}
        {roleInfo && (
          <div className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/5 rounded-[2rem] p-8 md:p-10 shadow-sm flex flex-col justify-between hover:border-slate-300 dark:hover:border-white/10 transition-colors">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-[var(--color-neon)]/10 border border-emerald-200 dark:border-[var(--color-neon)]/20 flex items-center justify-center mb-6 shadow-sm dark:shadow-[0_0_20px_rgba(75,208,67,0.15)]">
                <Award className="w-6 h-6 text-emerald-600 dark:text-[var(--color-neon)]" />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white text-lg mb-2">Access Level</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-6 font-medium">
                {roleInfo.description}
              </p>
            </div>
            
            <div className="mt-auto">
              <span className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-bold ${roleInfo.className} ${roleInfo.glow}`}>
                <Shield className="w-3.5 h-3.5" />
                Current Role: {roleInfo.label}
              </span>
            </div>
          </div>
        )}

        {/* Security Settings */}
        <div className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/5 rounded-[2rem] p-8 md:p-10 shadow-sm flex flex-col justify-between relative overflow-hidden group hover:border-slate-300 dark:hover:border-white/10 transition-colors">
          {/* Subtle glow on hover */}
          <div className="absolute inset-0 bg-gradient-to-tr from-slate-100 to-transparent dark:from-[var(--color-neon)]/0 dark:to-[var(--color-neon)]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
          
          <div className="relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-white/5 border border-indigo-200 dark:border-white/10 flex items-center justify-center mb-6 text-indigo-600 dark:text-white shadow-sm">
              <Shield className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white text-lg mb-2">Security & Identity</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-6 font-medium">
              Manage your password, active sessions, and configure Two-Factor Authentication for enhanced security.
            </p>
          </div>

          <div className="relative z-10 mt-auto flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            {profile?.mfaEnabled ? (
               <span className="inline-flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-[var(--color-neon)]">
                 <CheckCircle2 className="w-4 h-4" /> MFA Secured
               </span>
            ) : (
               <span className="inline-flex items-center gap-2 text-xs font-bold text-amber-500 dark:text-amber-400">
                 <Key className="w-4 h-4" /> MFA Recommended
               </span>
            )}
            
            <Link
              href="/dashboard/security"
              className="inline-flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-black bg-slate-50 dark:bg-white hover:bg-slate-100 dark:hover:bg-slate-200 border border-slate-200 dark:border-transparent px-5 py-2.5 rounded-xl transition-all cursor-pointer shadow-sm"
            >
              Security Settings
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
      
      <p className="text-center text-xs text-slate-500 font-medium">
        System configurations and core roles are managed by Super Admins.
      </p>

    </div>
  );
}
