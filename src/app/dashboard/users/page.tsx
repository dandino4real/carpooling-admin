'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { 
  Users as UsersIcon, 
  UserPlus, 
  RotateCcw, 
  AlertTriangle,
  Search,
  CheckCircle2,
  XCircle,
  Download,
  ArrowRight,
  ArrowLeft,
  Mail,
  Phone,
  ShieldAlert,
  Wallet,
  Star,
  Activity,
  Ban,
  MapPin,
  Calendar,
  CreditCard,
  TrendingUp,
  Car,
  User,
  Clock,
  Hash,
  Shield,
  ChevronRight,
  Bell,
  RefreshCw,
  X,
  UserCheck
} from 'lucide-react';
import { useUsersQuery, useUserMutation } from '@/hooks/useUsers';
import { PermissionGuard } from '@/components/guards/PermissionGuard';
import { api } from '@/lib/api';

interface User {
  id: string;
  email: string | null;
  phone: string | null;
  firstName: string;
  lastName: string;
  stateOfResidence: string | null;
  role: 'PASSENGER' | 'DRIVER' | 'ADMIN';
  avatarUrl: string | null;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  isActive: boolean;
  isBanned: boolean;
  banReason: string | null;
  referralCode: string;
  createdAt: string;
  updatedAt: string;
  wallet?: {
    id: string;
    balance: number;
    currency: string;
  } | null;
}

const ROLE_CONFIG: Record<string, { label: string; bg: string; color: string; border: string; dot: string }> = {
  PASSENGER: { label: 'Passenger', bg: 'bg-indigo-100 dark:bg-indigo-500/10', color: 'text-indigo-700 dark:text-indigo-400', border: 'border-indigo-200 dark:border-indigo-500/20', dot: 'bg-indigo-500' },
  DRIVER:    { label: 'Driver',    bg: 'bg-emerald-100 dark:bg-[var(--color-neon)]/10', color: 'text-emerald-700 dark:text-[var(--color-neon)]', border: 'border-emerald-200 dark:border-[var(--color-neon)]/20', dot: 'bg-[var(--color-neon)]' },
  ADMIN:     { label: 'Admin',     bg: 'bg-purple-100 dark:bg-purple-500/10', color: 'text-purple-700 dark:text-purple-400', border: 'border-purple-200 dark:border-purple-500/20', dot: 'bg-purple-500' },
};

const STATUS_FILTERS = ['', 'active', 'banned', 'inactive'];
const ROLE_FILTERS = ['', 'PASSENGER', 'DRIVER', 'ADMIN'];

type ProfileTab = 'overview' | 'wallet' | 'activity' | 'ratings' | 'moderation';

export default function UsersPage() {
  const [page, setPage] = useState(1);
  const [limit] = useState(12);
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [profileTab, setProfileTab] = useState<ProfileTab>('overview');

  // Inspect / Moderation state
  const [banReason, setBanReason] = useState('');
  const [modifying, setModifying] = useState(false);

  // User relations
  const [loginActivity, setLoginActivity] = useState<{ lastLogin: string | null; isOnline: boolean } | null>(null);
  const [walletData, setWalletData] = useState<any>(null);
  const [walletTxns, setWalletTxns] = useState<any>(null);
  const [rideHistory, setRideHistory] = useState<any>(null);
  const [ratingsData, setRatingsData] = useState<any>(null);
  const [notificationsData, setNotificationsData] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  // Create Admin
  const [showCreateAdminModal, setShowCreateAdminModal] = useState(false);
  const [newAdminFirstName, setNewAdminFirstName] = useState('');
  const [newAdminLastName, setNewAdminLastName] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [newAdminRole, setNewAdminRole] = useState('ADMIN');
  const [creatingAdmin, setCreatingAdmin] = useState(false);
  const [createAdminError, setCreateAdminError] = useState('');

  // Row Selection for CSV export
  const [selectedRows, setSelectedRows] = useState<Record<string, boolean>>({});

  const { data: queryData, isLoading, isError, refetch } = useUsersQuery(page, limit, { role, status, search });
  const userMutation = useUserMutation();

  const users = queryData?.data || [];
  const total = queryData?.total || 0;
  const totalPages = Math.ceil(total / limit);
  const selectedCount = Object.keys(selectedRows).filter(k => selectedRows[k]).length;

  const formatCurrency = (amount?: number) => {
    if (amount === undefined || amount === null) return '₦0.00';
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const formatDateShort = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const toggleRow = (id: string) => {
    setSelectedRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleAll = () => {
    if (selectedCount === users.length && users.length > 0) {
      setSelectedRows({});
    } else {
      const all: Record<string, boolean> = {};
      users.forEach((u: User) => all[u.id] = true);
      setSelectedRows(all);
    }
  };

  const handleExportCSV = (roleFilter?: 'DRIVER' | 'PASSENGER' | 'ADMIN' | 'ALL') => {
    let toExport = users;
    const selectedIds = Object.keys(selectedRows).filter(k => selectedRows[k]);
    if (selectedIds.length > 0) {
      toExport = users.filter((u: User) => selectedIds.includes(u.id));
    }
    if (roleFilter && roleFilter !== 'ALL') {
      toExport = toExport.filter((u: User) => u.role === roleFilter);
      if (!toExport.length) { toast.error(`No ${roleFilter.toLowerCase()}s found to export.`); return; }
    } else if (!toExport.length) { toast.error('No users to export.'); return; }

    const headers = ['ID', 'First Name', 'Last Name', 'Email', 'Phone', 'Role', 'Status', 'Wallet Balance', 'Joined Date'];
    const csvContent = [headers.join(','), ...toExport.map((u: User) => [u.id, u.firstName, u.lastName, u.email || '', u.phone || '', u.role, u.isBanned ? 'Banned' : !u.isActive ? 'Inactive' : 'Active', u.wallet?.balance || 0, new Date(u.createdAt).toLocaleDateString()].map(v => `"${v}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `users-export-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${toExport.length} user(s) to CSV`);
  };

  const handleCreateAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminFirstName || !newAdminLastName || !newAdminEmail || !newAdminPassword) {
      setCreateAdminError('All fields are required.'); return;
    }
    setCreatingAdmin(true); setCreateAdminError('');
    setTimeout(() => {
      setCreatingAdmin(false);
      toast.success(`New admin (${newAdminFirstName} ${newAdminLastName}) created as ${newAdminRole}.`);
      setNewAdminFirstName(''); setNewAdminLastName(''); setNewAdminEmail(''); setNewAdminPassword(''); setNewAdminRole('ADMIN'); setShowCreateAdminModal(false); refetch();
    }, 1500);
  };

  const openUserProfile = async (u: User) => {
    setSelectedUser(u);
    setProfileTab('overview');
    setLoadingProfile(true);
    try {
      const [login, wallet, walletTx, ratings, notifications] = await Promise.allSettled([
        api.getUserLoginActivity(u.id),
        api.getUserWallet(u.id),
        api.getUserWalletTransactions(u.id, { page: 1, limit: 8 }),
        api.getRatingsForUser(u.id),
        api.getUserNotifications(u.id, { page: 1, limit: 5 }),
      ]);
      setLoginActivity(login.status === 'fulfilled' ? login.value : null);
      setWalletData(wallet.status === 'fulfilled' ? wallet.value : null);
      setWalletTxns(walletTx.status === 'fulfilled' ? walletTx.value : null);
      setRatingsData(ratings.status === 'fulfilled' ? ratings.value : null);
      setNotificationsData(notifications.status === 'fulfilled' ? notifications.value : null);

      if (u.role === 'DRIVER') {
        api.getDriverTripHistory(u.id, { page: 1, limit: 8 }).then(setRideHistory).catch(() => setRideHistory(null));
      } else if (u.role === 'PASSENGER') {
        api.getPassengerBookingHistory(u.id, { page: 1, limit: 8 }).then(setRideHistory).catch(() => setRideHistory(null));
      }
    } catch {} finally { setLoadingProfile(false); }
  };

  const closeProfile = () => {
    setSelectedUser(null);
    setWalletData(null); setWalletTxns(null); setRideHistory(null); setRatingsData(null); setNotificationsData(null); setLoginActivity(null); setBanReason('');
  };

  const handleModeration = async (userId: string, action: 'BAN' | 'UNBAN' | 'ACTIVATE' | 'DEACTIVATE') => {
    if (action === 'BAN' && !banReason.trim()) return toast.error('Ban reason is required.');
    try {
      setModifying(true);
      userMutation.mutate({ id: userId, action, reason: action === 'BAN' ? banReason : undefined }, {
        onSuccess: (res: any) => {
          toast.success(`User successfully ${action.toLowerCase()}ed.`);
          setBanReason('');
          setSelectedUser(res.data || res);
          refetch();
        },
        onError: (err: any) => toast.error(err.message || 'Action failed.'),
      });
    } finally { setModifying(false); }
  };

  const PROFILE_TABS: { id: ProfileTab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview',    label: 'Overview',    icon: <User className="w-4 h-4" /> },
    { id: 'wallet',      label: 'Wallet',      icon: <Wallet className="w-4 h-4" /> },
    { id: 'activity',    label: 'Activity',    icon: <Activity className="w-4 h-4" /> },
    { id: 'ratings',     label: 'Ratings',     icon: <Star className="w-4 h-4" /> },
    { id: 'moderation',  label: 'Moderation',  icon: <ShieldAlert className="w-4 h-4" /> },
  ];

  const avgRating = ratingsData?.data?.length
    ? (ratingsData.data.reduce((a: number, r: any) => a + (r.score || r.rating || 0), 0) / ratingsData.data.length).toFixed(1)
    : null;

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-100 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 rounded-xl flex items-center justify-center">
              <UsersIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            Users & Passengers
          </h1>
          <p className="text-slate-500 text-sm mt-2 font-medium">Manage all platform users, view their activity, and handle moderations.</p>
        </div>
        <div className="flex items-center gap-3 self-start md:self-auto">
          <PermissionGuard permission="action:create_admin" fallback={null}>
            <button onClick={() => setShowCreateAdminModal(true)} className="flex items-center gap-2 bg-purple-100 dark:bg-purple-500/10 hover:bg-purple-200 dark:hover:bg-purple-500/20 border border-purple-200 dark:border-purple-500/20 text-purple-700 dark:text-purple-400 text-xs font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer shadow-sm dark:shadow-none">
              <UserPlus className="w-3.5 h-3.5" /> Create Admin
            </button>
          </PermissionGuard>
          <div className="relative group">
            <button className="flex items-center gap-2 bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 text-xs font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer shadow-sm dark:shadow-none">
              <Download className="w-3.5 h-3.5" /> {selectedCount > 0 ? `Export (${selectedCount})` : 'Export CSV'}
            </button>
            <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/10 rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 overflow-hidden">
              <button onClick={() => handleExportCSV('ALL')} className="w-full text-left px-4 py-3 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer">Export Current View</button>
              <button onClick={() => handleExportCSV('DRIVER')} className="w-full text-left px-4 py-3 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white transition-colors border-t border-slate-100 dark:border-white/5 cursor-pointer">Export Drivers Only</button>
              <button onClick={() => handleExportCSV('PASSENGER')} className="w-full text-left px-4 py-3 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white transition-colors border-t border-slate-100 dark:border-white/5 cursor-pointer">Export Passengers Only</button>
              <button onClick={() => handleExportCSV('ADMIN')} className="w-full text-left px-4 py-3 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white transition-colors border-t border-slate-100 dark:border-white/5 cursor-pointer">Export Admins Only</button>
            </div>
          </div>
          <button onClick={() => refetch()} className="flex items-center gap-2 bg-emerald-50 dark:bg-[var(--color-neon)]/10 hover:bg-emerald-100 dark:hover:bg-[var(--color-neon)]/20 border border-emerald-200 dark:border-[var(--color-neon)]/20 text-emerald-700 dark:text-[var(--color-neon)] text-xs font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer shadow-sm dark:shadow-none">
            <RotateCcw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>
      </div>

      {/* ── Filters ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-[#111111] p-1.5 rounded-xl border border-slate-200 dark:border-white/5 shadow-inner dark:shadow-none">
            {ROLE_FILTERS.map((r) => {
              const isActive = role === r;
              const label = r === '' ? 'All Roles' : ROLE_CONFIG[r].label;
              return (
                <button key={r} onClick={() => { setRole(r); setPage(1); }} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${isActive ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm dark:shadow-none' : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5'}`}>
                  {label}
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-[#111111] p-1.5 rounded-xl border border-slate-200 dark:border-white/5 shadow-inner dark:shadow-none">
            {STATUS_FILTERS.map((s) => {
              const isActive = status === s;
              const label = s === '' ? 'All Status' : s.charAt(0).toUpperCase() + s.slice(1);
              return (
                <button key={s} onClick={() => { setStatus(s); setPage(1); }} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${isActive ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm dark:shadow-none' : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5'}`}>
                  {label}
                </button>
              );
            })}
          </div>
        </div>
        <div className="relative w-full lg:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-600 pointer-events-none" />
          <input type="text" placeholder="Search by name, email..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="w-full bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/5 focus:border-indigo-500 dark:focus:border-[var(--color-neon)]/50 rounded-xl py-2.5 pl-11 pr-4 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 dark:focus:ring-[var(--color-neon)]/30 transition-all shadow-sm dark:shadow-none" />
        </div>
      </div>

      {/* ── Users Grid ──────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/5 rounded-[2rem] overflow-hidden min-h-[400px] shadow-sm dark:shadow-none">
        <div className="px-8 py-5 border-b border-slate-200 dark:border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative flex items-center justify-center shrink-0">
              <input type="checkbox" className="peer w-4 h-4 appearance-none rounded bg-[#f5f5f5] dark:bg-white/10 border-2 border-slate-300 dark:border-white/20 checked:bg-[#e5e5e5] checked:dark:bg-white/30 checked:border-[#d4d4d4] checked:dark:border-white/40 cursor-pointer transition-all" checked={users.length > 0 && selectedCount === users.length} onChange={toggleAll} />
              <svg className="w-2.5 h-2.5 absolute pointer-events-none opacity-0 peer-checked:opacity-100 text-slate-800 dark:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-sm">
              <UsersIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /> Platform Registry
            </h3>
          </div>
          {!isLoading && <span className="text-[10px] font-mono text-slate-500 bg-slate-100 dark:bg-white/5 px-3 py-1 rounded-lg">{total} users total</span>}
        </div>

        {isLoading ? (
          <div className="p-12 flex items-center justify-center"><RotateCcw className="w-8 h-8 text-slate-400 dark:text-slate-600 animate-spin" /></div>
        ) : isError ? (
          <div className="p-12 text-center text-red-500 dark:text-red-400 font-bold">Failed to load users.</div>
        ) : users.length === 0 ? (
          <div className="p-24 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 rounded-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 flex items-center justify-center mb-6">
              <UsersIcon className="w-8 h-8 text-slate-400 dark:text-slate-600" />
            </div>
            <p className="text-lg font-bold text-slate-900 dark:text-white mb-2">No users found</p>
            <p className="text-sm text-slate-500">No matching records for your search/filters.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-white/5">
            {users.map((u: User) => {
              const roleCfg = ROLE_CONFIG[u.role] || ROLE_CONFIG.PASSENGER;
              const isSelected = !!selectedRows[u.id];
              return (
                <div key={u.id} className={`p-5 hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-colors group flex flex-col xl:flex-row gap-6 items-start xl:items-center justify-between ${isSelected ? 'bg-indigo-50 dark:bg-indigo-500/5' : ''}`}>
                  <div className="flex items-center gap-5 flex-1 min-w-[200px] xl:min-w-[280px] w-full shrink-0">
                    <div className="relative flex items-center justify-center shrink-0">
                      <input type="checkbox" className="peer w-4 h-4 appearance-none rounded bg-[#f5f5f5] dark:bg-white/10 border-2 border-slate-300 dark:border-white/20 checked:bg-[#e5e5e5] checked:dark:bg-white/30 checked:border-[#d4d4d4] checked:dark:border-white/40 cursor-pointer transition-all" checked={isSelected} onChange={() => toggleRow(u.id)} />
                      <svg className="w-2.5 h-2.5 absolute pointer-events-none opacity-0 peer-checked:opacity-100 text-slate-800 dark:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <div className="relative shrink-0">
                      <div className="w-12 h-12 rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center font-black text-sm uppercase text-slate-600 dark:text-slate-300">
                        {u.avatarUrl ? <img src={u.avatarUrl} className="w-full h-full rounded-full object-cover" alt="" /> : `${u.firstName[0]}${u.lastName[0]}`}
                      </div>
                      <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-[#111111] ${u.isBanned ? 'bg-red-500' : u.isActive ? 'bg-green-500 dark:bg-[var(--color-neon)]' : 'bg-slate-400 dark:bg-slate-500'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-slate-900 dark:text-white text-base truncate">{u.firstName} {u.lastName}</h4>
                      <p className="text-[10px] text-slate-500 font-mono tracking-widest truncate mt-0.5">{u.id}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 xl:gap-10 w-full xl:w-auto overflow-x-auto pb-2 xl:pb-0 hide-scrollbar">

                    <div className="shrink-0 w-28">
                      <p className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest mb-1.5">Role</p>
                      <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold border ${roleCfg.bg} ${roleCfg.color} ${roleCfg.border}`}>{roleCfg.label}</span>
                    </div>
                    <div className="shrink-0 w-28">
                      <p className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest mb-1.5">Status</p>
                      {u.isBanned ? (
                        <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-500/20">Banned</span>
                      ) : u.isActive ? (
                        <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">Active</span>
                      ) : (
                        <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-500/20">Inactive</span>
                      )}
                    </div>
                    <div className="shrink-0 w-24">
                      <p className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest mb-1">Wallet</p>
                      <p className="text-sm font-black text-slate-900 dark:text-white">{formatCurrency(u.wallet?.balance)}</p>
                    </div>
                    <div className="shrink-0 w-20">
                      <p className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest mb-1">Joined</p>
                      <p className="text-[10px] text-slate-600 dark:text-slate-400">{formatDateShort(u.createdAt)}</p>
                    </div>
                    <div className="shrink-0 xl:ml-2">
                      <button onClick={() => openUserProfile(u)} className="flex items-center gap-2 bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 text-slate-700 dark:text-white text-xs font-bold px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10 transition-all cursor-pointer whitespace-nowrap shadow-sm hover:shadow-md dark:shadow-none">
                        View Profile <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {totalPages > 1 && (
          <div className="border-t border-slate-200 dark:border-white/5 px-8 py-5 flex items-center justify-between bg-slate-50 dark:bg-white/[0.01]">
            <span className="text-xs text-slate-500 dark:text-slate-600 font-mono">Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="flex items-center gap-1.5 px-4 py-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 hover:bg-slate-50 dark:hover:border-white/10 disabled:opacity-50 dark:disabled:opacity-30 text-xs font-bold rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer disabled:cursor-not-allowed shadow-sm dark:shadow-none">
                <ArrowLeft className="w-3.5 h-3.5" /> Prev
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="flex items-center gap-1.5 px-4 py-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 hover:bg-slate-50 dark:hover:border-white/10 disabled:opacity-50 dark:disabled:opacity-30 text-xs font-bold rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer disabled:cursor-not-allowed shadow-sm dark:shadow-none">
                Next <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── User Profile Side Drawer ─────────────────────────────────────── */}
      {selectedUser && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={closeProfile} />
          
          {/* Drawer */}
          <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-2xl bg-white dark:bg-[#0d0d0d] border-l border-slate-200 dark:border-white/10 shadow-2xl flex flex-col overflow-hidden">
            
            {/* Drawer Header */}
            <div className="shrink-0 border-b border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02]">
              {/* Hero banner */}
              <div className="relative px-8 pt-8 pb-6 overflow-hidden">
                <div className={`absolute inset-0 opacity-10 dark:opacity-20 bg-gradient-to-br ${selectedUser.role === 'DRIVER' ? 'from-emerald-400 to-teal-600' : selectedUser.role === 'ADMIN' ? 'from-purple-400 to-indigo-600' : 'from-blue-400 to-indigo-600'}`} />
                
                <div className="relative z-10 flex items-start justify-between gap-4">
                  <div className="flex items-center gap-5">
                    <div className="relative">
                      <div className="w-20 h-20 rounded-2xl bg-slate-100 dark:bg-slate-800 border-2 border-white dark:border-white/10 flex items-center justify-center font-black text-2xl uppercase text-slate-500 dark:text-slate-300 shadow-lg">
                        {selectedUser.avatarUrl
                          ? <img src={selectedUser.avatarUrl} className="w-full h-full rounded-2xl object-cover" alt="" />
                          : `${selectedUser.firstName[0]}${selectedUser.lastName[0]}`}
                      </div>
                      <div className={`absolute -bottom-1.5 -right-1.5 w-5 h-5 rounded-full border-2 border-white dark:border-[#0d0d0d] shadow-sm ${selectedUser.isBanned ? 'bg-red-500' : selectedUser.isActive ? 'bg-green-500' : 'bg-slate-400'}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2.5 mb-1">
                        <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{selectedUser.firstName} {selectedUser.lastName}</h2>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${ROLE_CONFIG[selectedUser.role]?.bg} ${ROLE_CONFIG[selectedUser.role]?.color} ${ROLE_CONFIG[selectedUser.role]?.border}`}>
                          {ROLE_CONFIG[selectedUser.role]?.label}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                        {selectedUser.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{selectedUser.email}</span>}
                        {selectedUser.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{selectedUser.phone}</span>}
                      </div>
                      <div className="flex items-center gap-3 mt-2">
                        {selectedUser.isBanned ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-500/20"><Ban className="w-3 h-3" /> Banned</span>
                        ) : selectedUser.isActive ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Active</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-500/20 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-500/20">Inactive</span>
                        )}
                        {loginActivity?.isOnline && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-500/20"><span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> Online Now</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button onClick={closeProfile} className="w-9 h-9 rounded-xl bg-white dark:bg-white/10 hover:bg-slate-100 dark:hover:bg-white/20 border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer shrink-0">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Tab Nav */}
              <div className="flex items-center gap-1 px-6 pb-0">
                {PROFILE_TABS.map(tab => (
                  <button key={tab.id} onClick={() => setProfileTab(tab.id)} className={`flex items-center gap-1.5 px-4 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${profileTab === tab.id ? 'border-indigo-600 dark:border-[var(--color-neon)] text-indigo-600 dark:text-[var(--color-neon)]' : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-white/20'}`}>
                    {tab.icon} {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-8 space-y-6">
              {loadingProfile && (
                <div className="flex items-center justify-center py-12">
                  <RotateCcw className="w-6 h-6 text-slate-400 animate-spin" />
                </div>
              )}

              {!loadingProfile && (
                <>
                  {/* ── OVERVIEW TAB ── */}
                  {profileTab === 'overview' && (
                    <div className="space-y-6">
                      {/* Identity Cards */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/5 rounded-2xl p-4">
                          <p className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1.5"><Hash className="w-3 h-3" /> User ID</p>
                          <p className="text-xs font-mono text-slate-700 dark:text-slate-300 break-all">{selectedUser.id}</p>
                        </div>
                        <div className="bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/5 rounded-2xl p-4">
                          <p className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1.5"><MapPin className="w-3 h-3" /> Location</p>
                          <p className="text-sm font-bold text-slate-900 dark:text-white">{selectedUser.stateOfResidence || 'Not set'}</p>
                        </div>
                        <div className="bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/5 rounded-2xl p-4">
                          <p className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1.5"><Calendar className="w-3 h-3" /> Joined</p>
                          <p className="text-sm font-bold text-slate-900 dark:text-white">{formatDateShort(selectedUser.createdAt)}</p>
                        </div>
                        <div className="bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/5 rounded-2xl p-4">
                          <p className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1.5"><RefreshCw className="w-3 h-3" /> Last Updated</p>
                          <p className="text-sm font-bold text-slate-900 dark:text-white">{formatDateShort(selectedUser.updatedAt)}</p>
                        </div>
                      </div>

                      {/* Verification & Security */}
                      <div className="bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/5 rounded-2xl p-5">
                        <h4 className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-1.5"><Shield className="w-3.5 h-3.5" /> Verification & Security</h4>
                        <div className="grid grid-cols-2 gap-3">
                          {[
                            { label: 'Email Verified', val: selectedUser.isEmailVerified, icon: <Mail className="w-4 h-4" /> },
                            { label: 'Phone Verified', val: selectedUser.isPhoneVerified, icon: <Phone className="w-4 h-4" /> },
                          ].map(item => (
                            <div key={item.label} className={`flex items-center gap-3 p-3 rounded-xl border ${item.val ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20' : 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20'}`}>
                              <span className={item.val ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}>{item.icon}</span>
                              <div>
                                <p className="text-[10px] font-mono uppercase text-slate-500">{item.label}</p>
                                <p className={`text-xs font-bold ${item.val ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'}`}>{item.val ? 'Verified' : 'Unverified'}</p>
                              </div>
                              {item.val ? <CheckCircle2 className="w-4 h-4 text-emerald-500 ml-auto" /> : <AlertTriangle className="w-4 h-4 text-amber-500 ml-auto" />}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Referral & Login */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/5 rounded-2xl p-4">
                          <p className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest mb-2">Referral Code</p>
                          <p className="text-base font-black text-indigo-600 dark:text-indigo-400 font-mono tracking-widest">{selectedUser.referralCode || '—'}</p>
                        </div>
                        <div className="bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/5 rounded-2xl p-4">
                          <p className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1.5"><Clock className="w-3 h-3" /> Last Login</p>
                          <p className="text-xs font-bold text-slate-900 dark:text-white">{loginActivity?.lastLogin ? formatDate(loginActivity.lastLogin) : 'N/A'}</p>
                        </div>
                      </div>

                      {/* Wallet summary */}
                      {walletData && (
                        <div className="bg-gradient-to-br from-slate-900 to-slate-800 dark:from-white/5 dark:to-white/[0.02] border border-slate-700 dark:border-white/10 rounded-2xl p-6">
                          <p className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5"><Wallet className="w-3.5 h-3.5" /> Wallet Summary</p>
                          <div className="grid grid-cols-3 gap-4">
                            {[
                              { label: 'Total Balance', val: walletData.balance },
                              { label: 'Withdrawable', val: walletData.withdrawableBalance },
                              { label: 'Referral Bonus', val: walletData.referralBalance },
                            ].map(item => (
                              <div key={item.label}>
                                <p className="text-[10px] text-slate-400 uppercase font-mono mb-1">{item.label}</p>
                                <p className="text-lg font-black text-white">{formatCurrency(item.val || 0)}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Avg Rating */}
                      {avgRating && (
                        <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-2xl p-4 flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center shrink-0">
                            <Star className="w-6 h-6 text-amber-500 fill-amber-500" />
                          </div>
                          <div>
                            <p className="text-[10px] font-mono uppercase text-amber-600 dark:text-amber-400 font-bold">Average Rating</p>
                            <p className="text-2xl font-black text-slate-900 dark:text-white">{avgRating} <span className="text-sm text-slate-500">/ 5.0</span></p>
                          </div>
                          <p className="text-xs text-slate-500 ml-auto">From {ratingsData.data.length} review{ratingsData.data.length !== 1 ? 's' : ''}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── WALLET TAB ── */}
                  {profileTab === 'wallet' && (
                    <div className="space-y-6">
                      {/* Balance Cards */}
                      <div className="grid grid-cols-3 gap-4">
                        {[
                          { label: 'Total Balance', val: walletData?.balance, color: 'text-slate-900 dark:text-white' },
                          { label: 'Withdrawable', val: walletData?.withdrawableBalance, color: 'text-emerald-600 dark:text-emerald-400' },
                          { label: 'Referral Bonus', val: walletData?.referralBalance, color: 'text-indigo-600 dark:text-indigo-400' },
                        ].map(item => (
                          <div key={item.label} className="bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/5 rounded-2xl p-4">
                            <p className="text-[10px] font-mono uppercase text-slate-500 mb-2">{item.label}</p>
                            <p className={`text-xl font-black ${item.color}`}>{formatCurrency(item.val || 0)}</p>
                          </div>
                        ))}
                      </div>

                      {/* Transactions */}
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2"><CreditCard className="w-4 h-4 text-indigo-500" /> Transaction History</h4>
                        {walletTxns?.data?.length > 0 ? (
                          <div className="space-y-2">
                            {walletTxns.data.map((tx: any) => (
                              <div key={tx.id} className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-colors">
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${tx.type === 'CREDIT' ? 'bg-emerald-100 dark:bg-emerald-500/20' : 'bg-red-100 dark:bg-red-500/20'}`}>
                                  <TrendingUp className={`w-4 h-4 ${tx.type === 'CREDIT' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400 rotate-180'}`} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-bold text-slate-900 dark:text-white">{tx.reason?.replace(/_/g, ' ')}</p>
                                  <p className="text-[10px] font-mono text-slate-500 truncate">{tx.reference} · {formatDate(tx.createdAt)}</p>
                                </div>
                                <p className={`text-sm font-black whitespace-nowrap ${tx.type === 'CREDIT' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                                  {tx.type === 'CREDIT' ? '+' : '-'}{formatCurrency(tx.amount)}
                                </p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-12 text-slate-500">
                            <CreditCard className="w-10 h-10 mx-auto mb-3 opacity-30" />
                            <p className="text-sm font-bold">No transactions found</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ── ACTIVITY TAB ── */}
                  {profileTab === 'activity' && (
                    <div className="space-y-6">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Car className="w-4 h-4 text-blue-500" />
                        {selectedUser.role === 'DRIVER' ? 'Trips Offered' : 'Booking History'}
                      </h4>
                      {rideHistory === null ? (
                        <div className="flex items-center justify-center py-12"><RotateCcw className="w-5 h-5 text-slate-400 animate-spin" /></div>
                      ) : rideHistory?.data?.length > 0 ? (
                        <div className="space-y-3">
                          {rideHistory.data.map((h: any) => {
                            const origin = selectedUser.role === 'DRIVER' ? h.originState : h.trip?.originState;
                            const dest   = selectedUser.role === 'DRIVER' ? h.destinationState : h.trip?.destinationState;
                            const dept   = selectedUser.role === 'DRIVER' ? h.departureTime : h.trip?.departureTime;
                            const status = h.status;
                            return (
                              <div key={h.id} className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-colors">
                                <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center shrink-0">
                                  <Car className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    {origin || '?'} <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" /> {dest || '?'}
                                  </p>
                                  <p className="text-[10px] font-mono text-slate-500 mt-0.5">{dept ? formatDate(dept) : 'N/A'}</p>
                                </div>
                                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase ${status === 'COMPLETED' ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400' : status === 'CANCELLED' ? 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400' : 'bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-400'}`}>
                                  {status}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-center py-12 text-slate-500">
                          <Car className="w-10 h-10 mx-auto mb-3 opacity-30" />
                          <p className="text-sm font-bold">No activity found</p>
                          <p className="text-xs mt-1">No {selectedUser.role === 'DRIVER' ? 'trips' : 'bookings'} yet</p>
                        </div>
                      )}

                      {/* Notifications */}
                      {notificationsData?.data?.length > 0 && (
                        <div>
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4"><Bell className="w-4 h-4 text-purple-500" /> Recent Notifications</h4>
                          <div className="space-y-2">
                            {notificationsData.data.slice(0, 5).map((n: any) => (
                              <div key={n.id} className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5 rounded-xl">
                                <Bell className="w-4 h-4 text-purple-500 shrink-0 mt-0.5" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-bold text-slate-900 dark:text-white">{n.title}</p>
                                  <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-2">{n.body || n.message}</p>
                                  <p className="text-[10px] font-mono text-slate-400 mt-1">{formatDate(n.createdAt)}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── RATINGS TAB ── */}
                  {profileTab === 'ratings' && (
                    <div className="space-y-6">
                      {/* Average */}
                      <div className="flex items-center gap-6 p-6 bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/5 rounded-2xl">
                        <div className="text-center shrink-0">
                          <p className="text-5xl font-black text-slate-900 dark:text-white">{avgRating || '—'}</p>
                          <div className="flex items-center justify-center gap-0.5 mt-2">
                            {[1,2,3,4,5].map(s => (
                              <Star key={s} className={`w-4 h-4 ${Number(avgRating) >= s ? 'text-amber-400 fill-amber-400' : 'text-slate-300 dark:text-slate-600'}`} />
                            ))}
                          </div>
                          <p className="text-[10px] text-slate-500 mt-1">{ratingsData?.data?.length || 0} reviews</p>
                        </div>
                        <div className="flex-1 space-y-2">
                          {[5,4,3,2,1].map(score => {
                            const count = ratingsData?.data?.filter((r: any) => Math.round(r.score || r.rating) === score).length || 0;
                            const total = ratingsData?.data?.length || 1;
                            return (
                              <div key={score} className="flex items-center gap-2">
                                <span className="text-[10px] font-mono text-slate-500 w-4">{score}</span>
                                <div className="flex-1 h-1.5 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
                                  <div className="h-full bg-amber-400 rounded-full transition-all" style={{ width: `${(count / total) * 100}%` }} />
                                </div>
                                <span className="text-[10px] font-mono text-slate-500 w-4">{count}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Reviews */}
                      {ratingsData?.data?.length > 0 ? (
                        <div className="space-y-3">
                          {ratingsData.data.map((r: any) => (
                            <div key={r.id} className="p-4 bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5 rounded-xl">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-0.5">
                                  {[1,2,3,4,5].map(s => <Star key={s} className={`w-3.5 h-3.5 ${(r.score || r.rating) >= s ? 'text-amber-400 fill-amber-400' : 'text-slate-300 dark:text-slate-600'}`} />)}
                                </div>
                                <span className="text-[10px] font-mono text-slate-500">{formatDateShort(r.createdAt)}</span>
                              </div>
                              {r.comment && <p className="text-xs text-slate-700 dark:text-slate-300 italic">"{r.comment}"</p>}
                              <p className="text-[10px] text-slate-500 mt-1">by {r.reviewer?.firstName || r.raterName || 'Anonymous'}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-12 text-slate-500">
                          <Star className="w-10 h-10 mx-auto mb-3 opacity-30" />
                          <p className="text-sm font-bold">No ratings yet</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── MODERATION TAB ── */}
                  {profileTab === 'moderation' && (
                    <div className="space-y-6">
                      {/* Current status summary */}
                      <div className={`p-5 rounded-2xl border ${selectedUser.isBanned ? 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20' : selectedUser.isActive ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20' : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/5'}`}>
                        <div className="flex items-center gap-3">
                          {selectedUser.isBanned
                            ? <Ban className="w-5 h-5 text-red-600 dark:text-red-400" />
                            : selectedUser.isActive
                              ? <UserCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                              : <User className="w-5 h-5 text-slate-500" />}
                          <div>
                            <p className="text-xs font-black text-slate-900 dark:text-white">
                              {selectedUser.isBanned ? 'User is Banned' : selectedUser.isActive ? 'Account Active' : 'Account Inactive'}
                            </p>
                            {selectedUser.isBanned && selectedUser.banReason && (
                              <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">Reason: {selectedUser.banReason}</p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Action Panel */}
                      <div className="space-y-4">
                          {selectedUser.isBanned ? (
                            <div className="space-y-3">
                              <p className="text-xs text-slate-500">This user is currently banned. You can lift the ban to restore their access.</p>
                              <button disabled={modifying} onClick={() => handleModeration(selectedUser.id, 'UNBAN')} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm py-3 rounded-xl transition-colors disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2">
                                <UserCheck className="w-4 h-4" /> {modifying ? 'Processing...' : 'Lift Ban & Restore Access'}
                              </button>
                            </div>
                          ) : (
                            <>
                              <div className="space-y-2">
                                <label className="block text-[10px] uppercase font-mono text-slate-500 font-bold">Ban Reason (required to ban)</label>
                                <textarea placeholder="Describe why this user is being banned..." value={banReason} onChange={e => setBanReason(e.target.value)} rows={3} className="w-full bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-red-500/50 resize-none transition-colors" />
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <button disabled={modifying || !banReason.trim()} onClick={() => handleModeration(selectedUser.id, 'BAN')} className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-bold text-xs py-3 rounded-xl transition-colors disabled:opacity-50 cursor-pointer">
                                  <Ban className="w-4 h-4" /> {modifying ? 'Processing…' : 'Ban User'}
                                </button>
                                {selectedUser.isActive ? (
                                  <button disabled={modifying} onClick={() => handleModeration(selectedUser.id, 'DEACTIVATE')} className="flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs py-3 rounded-xl transition-colors disabled:opacity-50 cursor-pointer">
                                    <XCircle className="w-4 h-4" /> {modifying ? 'Processing…' : 'Deactivate'}
                                  </button>
                                ) : (
                                  <button disabled={modifying} onClick={() => handleModeration(selectedUser.id, 'ACTIVATE')} className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-3 rounded-xl transition-colors disabled:opacity-50 cursor-pointer">
                                    <CheckCircle2 className="w-4 h-4" /> {modifying ? 'Processing…' : 'Activate'}
                                  </button>
                                )}
                              </div>
                            </>
                          )}
                        </div>

                      {/* Login activity */}
                      {loginActivity && (
                        <div className="bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/5 rounded-2xl p-5">
                          <h4 className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-1.5"><Clock className="w-3 h-3" /> Login History</h4>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-slate-500">Online Status</span>
                              <span className={`font-bold flex items-center gap-1.5 ${loginActivity.isOnline ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${loginActivity.isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                                {loginActivity.isOnline ? 'Online' : 'Offline'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-slate-500">Last Login</span>
                              <span className="font-bold text-slate-900 dark:text-white">{loginActivity.lastLogin ? formatDate(loginActivity.lastLogin) : 'Never'}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </>
      )}

      {/* ── Create Admin Modal ───────────────────────────────────────────── */}
      {showCreateAdminModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 dark:bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/10 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl">
            <div className="h-14 border-b border-slate-100 dark:border-white/5 px-6 flex items-center justify-between bg-slate-50 dark:bg-white/[0.02]">
              <span className="font-bold text-slate-900 dark:text-white flex items-center gap-2"><UserPlus className="w-4 h-4 text-purple-600 dark:text-purple-400" /> Register Console Admin</span>
              <button onClick={() => setShowCreateAdminModal(false)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"><XCircle className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCreateAdmin}>
              <div className="p-6 space-y-4">
                {createAdminError && (
                  <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 p-3 rounded-xl text-xs font-semibold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" /><span>{createAdminError}</span>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[10px] uppercase font-mono text-slate-500 font-bold">First Name</label>
                    <input type="text" required placeholder="e.g. John" value={newAdminFirstName} onChange={e => setNewAdminFirstName(e.target.value)} className="w-full bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-purple-500" />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] uppercase font-mono text-slate-500 font-bold">Last Name</label>
                    <input type="text" required placeholder="e.g. Doe" value={newAdminLastName} onChange={e => setNewAdminLastName(e.target.value)} className="w-full bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-purple-500" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] uppercase font-mono text-slate-500 font-bold">Email Address</label>
                  <input type="email" required placeholder="e.g. support@platform.com" value={newAdminEmail} onChange={e => setNewAdminEmail(e.target.value)} className="w-full bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-purple-500" />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] uppercase font-mono text-slate-500 font-bold">Password</label>
                  <input type="password" required placeholder="Min. 8 characters" value={newAdminPassword} onChange={e => setNewAdminPassword(e.target.value)} className="w-full bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-purple-500" />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] uppercase font-mono text-slate-500 font-bold">Admin Role</label>
                  <select value={newAdminRole} onChange={e => setNewAdminRole(e.target.value)} className="w-full bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-purple-500">
                    <option value="ADMIN">Admin</option>
                    <option value="SUPER_ADMIN">Super Admin</option>
                    <option value="SUPPORT">Support</option>
                  </select>
                </div>
              </div>
              <div className="px-6 pb-6 flex items-center justify-end gap-3">
                <button type="button" onClick={() => setShowCreateAdminModal(false)} className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-white/10 rounded-xl transition-colors cursor-pointer">Cancel</button>
                <button type="submit" disabled={creatingAdmin} className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-2">
                  {creatingAdmin ? <><RotateCcw className="w-3.5 h-3.5 animate-spin" /> Creating…</> : <><UserPlus className="w-3.5 h-3.5" /> Create Admin</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
