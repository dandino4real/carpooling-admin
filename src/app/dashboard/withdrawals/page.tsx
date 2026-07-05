'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';
import { 
  RotateCcw, 
  AlertTriangle, 
  Inbox, 
  XCircle, 
  CheckCircle2,
  Wallet,
  ShieldAlert,
  Download,
  Building,
  CreditCard,
  User as UserIcon,
  Search,
  ArrowRight,
  ArrowLeft
} from 'lucide-react';
import { useWithdrawalsQuery, useWithdrawalMutation } from '@/hooks/useWithdrawals';
import { PermissionGuard } from '@/components/guards/PermissionGuard';

interface WithdrawalRequest {
  id: string;
  userId: string;
  amount: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  bankName: string;
  accountNumber: string;
  accountName: string;
  rejectionReason: string | null;
  processedAt: string | null;
  createdAt: string;
  updatedAt: string;
  user: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    avatarUrl: string | null;
    wallet?: {
      balance: number;
      withdrawableBalance: number;
    } | null;
    disputesAgainst?: Array<{
      id: string;
      reason: string;
      description: string;
      status: string;
      createdAt: string;
    }>;
  };
}

const TABS = [
  { label: 'Pending Requests', value: 'PENDING' },
  { label: 'Approved', value: 'APPROVED' },
  { label: 'Rejected', value: 'REJECTED' },
  { label: 'All Requests', value: '' },
];

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string; border: string }> = {
  PENDING: { label: 'Pending', bg: 'bg-amber-50 dark:bg-amber-500/10', color: 'text-amber-600 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-500/20' },
  APPROVED: { label: 'Approved', bg: 'bg-emerald-50 dark:bg-[var(--color-neon)]/10', color: 'text-emerald-600 dark:text-[var(--color-neon)]', border: 'border-emerald-200 dark:border-[var(--color-neon)]/20' },
  REJECTED: { label: 'Rejected', bg: 'bg-red-50 dark:bg-red-500/10', color: 'text-red-600 dark:text-red-400', border: 'border-red-200 dark:border-red-500/20' },
};

export default function WithdrawalsPage() {
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [status, setStatus] = useState('PENDING');
  const [search, setSearch] = useState('');
  const [selectedRows, setSelectedRows] = useState<Record<string, boolean>>({});

  const selectedCount = Object.values(selectedRows).filter(Boolean).length;

  // Action states for Approval/Rejection Modal
  const [actionRequest, setActionRequest] = useState<WithdrawalRequest | null>(null);
  const [actionType, setActionType] = useState<'APPROVE' | 'REJECT' | null>(null);
  const [reason, setReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  // TanStack Query Hooks
  const { data: queryData, isLoading, isError, error, refetch } = useWithdrawalsQuery(page, limit, { status, search });
  const withdrawalMutation = useWithdrawalMutation();

  const requests = queryData?.data || [];
  const total = queryData?.total || 0;
  const pageCount = Math.ceil(total / limit);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(amount);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleAction = async () => {
    if (!actionRequest || !actionType) return;
    if (actionType === 'REJECT' && !reason.trim()) {
      setActionError('A rejection reason is required.');
      return;
    }

    try {
      setProcessing(true);
      setActionError('');
      setActionSuccess('');

      withdrawalMutation.mutate(
        { id: actionRequest.id, action: actionType, reason: actionType === 'REJECT' ? reason : undefined },
        {
          onSuccess: () => {
            setActionSuccess(`Withdrawal successfully ${actionType === 'APPROVE' ? 'approved' : 'rejected'}.`);
            setReason('');
            toast.success(`Withdrawal request ${actionType.toLowerCase()}ed successfully.`);

            setTimeout(() => {
              setActionRequest(null);
              setActionType(null);
              setActionSuccess('');
              refetch();
            }, 1200);
          },
          onError: (err: any) => {
            setActionError(err.message || 'Failed to complete review action.');
            toast.error(err.message || 'Action failed.');
          },
        }
      );
    } finally {
      setProcessing(false);
    }
  };

  const handleClearFilters = () => {
    setSearch('');
    setPage(1);
  };

  const handleExportCSV = (statusFilter?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL') => {
    let toExport = requests;
    
    const selectedIds = Object.keys(selectedRows).filter(k => selectedRows[k]);
    if (selectedIds.length > 0) {
      toExport = requests.filter((r: WithdrawalRequest) => selectedIds.includes(r.id));
    }

    if (statusFilter && statusFilter !== 'ALL') {
      toExport = toExport.filter((r: WithdrawalRequest) => r.status === statusFilter);
      if (!toExport.length) {
        toast.error(`No ${statusFilter.toLowerCase()} requests found to export.`);
        return;
      }
    } else if (!toExport.length) {
      toast.error('No requests to export.');
      return;
    }

    const headers = ['Driver Name', 'Email', 'Bank Name', 'Account Number', 'Account Name', 'Amount', 'Status', 'Date Requested'];
    const csvContent = [
      headers.join(','),
      ...toExport.map((r: WithdrawalRequest) => [
        `${r.user.firstName} ${r.user.lastName}`,
        r.user.email,
        r.bankName,
        r.accountNumber,
        r.accountName,
        r.amount,
        r.status,
        new Date(r.createdAt).toLocaleDateString()
      ].map(v => `"${v}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `withdrawals-export-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success(`Exported ${toExport.length} request(s) to CSV`);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter flex items-center gap-3">
            <div className="w-9 h-9 bg-[var(--color-neon)]/10 border border-[var(--color-neon)]/20 rounded-xl flex items-center justify-center">
              <Wallet className="w-5 h-5 text-[var(--color-neon)]" />
            </div>
            Earnings Payouts
          </h1>
          <p className="text-slate-500 text-sm mt-2 font-medium">
            Manage and process driver earnings payout requests securely.
          </p>
        </div>
        <div className="flex items-center gap-3 self-start md:self-auto">
          <div className="relative group">
            <button
              className="flex items-center gap-2 bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 text-xs font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer shadow-sm hover:shadow-md dark:shadow-none"
            >
              <Download className="w-3.5 h-3.5" />
              {selectedCount > 0 ? `Export (${selectedCount})` : 'Export CSV'}
            </button>
            <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/10 rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 overflow-hidden">
              <button onClick={() => handleExportCSV('ALL')} className="w-full text-left px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:bg-white/5 hover:text-slate-900 dark:text-white transition-colors cursor-pointer">Export Current View</button>
              <button onClick={() => handleExportCSV('PENDING')} className="w-full text-left px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:bg-white/5 hover:text-slate-900 dark:text-white transition-colors border-t border-slate-200 dark:border-white/5 cursor-pointer">Export Pending Only</button>
              <button onClick={() => handleExportCSV('APPROVED')} className="w-full text-left px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:bg-white/5 hover:text-slate-900 dark:text-white transition-colors border-t border-slate-200 dark:border-white/5 cursor-pointer">Export Approved Only</button>
              <button onClick={() => handleExportCSV('REJECTED')} className="w-full text-left px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:bg-white/5 hover:text-slate-900 dark:text-white transition-colors border-t border-slate-200 dark:border-white/5 cursor-pointer">Export Rejected Only</button>
            </div>
          </div>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 bg-emerald-50 dark:bg-[var(--color-neon)]/10 hover:bg-emerald-100 dark:hover:bg-[var(--color-neon)]/20 border border-emerald-200 dark:border-[var(--color-neon)]/20 text-emerald-700 dark:text-[var(--color-neon)] text-xs font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer shadow-sm hover:shadow-md dark:shadow-none"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Filters ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="flex items-center gap-2 bg-slate-50 dark:bg-[#111111] p-1.5 rounded-xl border border-slate-200 dark:border-white/5 overflow-x-auto max-w-full shadow-inner dark:shadow-none">
          {TABS.map((tab) => {
            const isActive = status === tab.value;
            return (
              <button
                key={tab.label}
                onClick={() => { setStatus(tab.value); setPage(1); setSelectedRows({}); }}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  isActive ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm dark:shadow-none' : 'bg-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="relative w-full lg:w-80 shrink-0">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by driver name or email..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); setSelectedRows({}); }}
            className="w-full bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/5 focus:border-[var(--color-neon)]/50 rounded-xl py-2.5 pl-11 pr-4 text-sm text-slate-900 dark:text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-[var(--color-neon)]/30 transition-all"
          />
        </div>
      </div>

      {/* ── Error State ──────────────────────────────────────────────────────── */}
      {isError && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm font-semibold flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <span>{error?.message || 'Failed to fetch withdrawals.'}</span>
          </div>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-1.5 bg-red-500/20 hover:bg-red-500/30 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Retry
          </button>
        </div>
      )}

      {/* ── Requests List ────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/5 rounded-[2rem] overflow-hidden min-h-[400px]">
        {/* Header */}
        <div className="px-8 py-5 border-b border-slate-200 dark:border-white/5 flex items-center justify-between bg-slate-50 dark:bg-white/[0.01]">
          <div className="flex items-center gap-4">
            <div className="relative flex items-center justify-center shrink-0">
              <input
                type="checkbox"
                checked={requests.length > 0 && selectedCount === requests.length}
                onChange={(e) => {
                  if (e.target.checked) {
                    const newSelection: Record<string, boolean> = {};
                    requests.forEach((r: WithdrawalRequest) => newSelection[r.id] = true);
                    setSelectedRows(newSelection);
                  } else {
                    setSelectedRows({});
                  }
                }}
                className="peer w-4 h-4 appearance-none rounded bg-[#f5f5f5] dark:bg-white/10 border-2 border-slate-300 dark:border-white/20 checked:bg-[#e5e5e5] checked:dark:bg-white/30 checked:border-[#d4d4d4] checked:dark:border-white/40 cursor-pointer transition-all"
              />
              <svg className="w-2.5 h-2.5 absolute pointer-events-none opacity-0 peer-checked:opacity-100 text-slate-800 dark:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-sm">
              <Wallet className="w-4 h-4 text-[var(--color-neon)]" />
              Withdrawal Requests
            </h3>
          </div>
          {!isLoading && (
            <span className="text-[10px] font-mono text-slate-500 bg-slate-100 dark:bg-white/5 px-3 py-1 rounded-lg">
              {total} request{total !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="p-12 flex items-center justify-center">
            <RotateCcw className="w-8 h-8 text-slate-600 animate-spin" />
          </div>
        ) : requests.length === 0 ? (
          <div className="p-24 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 flex items-center justify-center mb-6">
              <Inbox className="w-8 h-8 text-slate-600" />
            </div>
            <p className="text-lg font-bold text-slate-900 dark:text-white mb-2">No Requests Found</p>
            <p className="text-sm text-slate-500">
              {search ? "No matching drivers found for your search." : "There are currently no withdrawal requests in this queue."}
            </p>
            {search && (
              <button
                onClick={handleClearFilters}
                className="mt-6 bg-[var(--color-neon)]/10 text-[var(--color-neon)] border border-[var(--color-neon)]/20 px-4 py-2 rounded-xl text-xs font-bold transition-all hover:bg-[var(--color-neon)]/20 cursor-pointer"
              >
                Reset Search
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-white/5">
            {requests.map((req: WithdrawalRequest) => {
              const statusCfg = STATUS_CONFIG[req.status] || STATUS_CONFIG.PENDING;
              
              return (
                <div key={req.id} className="p-5 hover:bg-slate-50 dark:bg-white/[0.02] transition-colors group grid grid-cols-1 xl:grid-cols-12 gap-4 items-center">
                  {/* Driver Identity */}
                  <div className="flex items-center gap-4 xl:col-span-3 min-w-0">
                    <div className="relative flex items-center justify-center shrink-0">
                      <input
                        type="checkbox"
                        checked={!!selectedRows[req.id]}
                        onChange={(e) => setSelectedRows(prev => ({ ...prev, [req.id]: e.target.checked }))}
                        className="peer w-4 h-4 appearance-none rounded bg-[#f5f5f5] dark:bg-white/10 border-2 border-slate-300 dark:border-white/20 checked:bg-[#e5e5e5] checked:dark:bg-white/30 checked:border-[#d4d4d4] checked:dark:border-white/40 cursor-pointer transition-all"
                      />
                      <svg className="w-2.5 h-2.5 absolute pointer-events-none opacity-0 peer-checked:opacity-100 text-slate-800 dark:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center font-black text-xs uppercase text-slate-600 dark:text-slate-300 shrink-0">
                      {req.user.avatarUrl ? (
                        <img src={req.user.avatarUrl} className="w-full h-full rounded-full object-cover" alt="" />
                      ) : (
                        `${req.user.firstName[0]}${req.user.lastName[0]}`
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-slate-900 dark:text-white text-sm truncate">{req.user.firstName} {req.user.lastName}</h4>
                      <p className="text-[10px] text-slate-500 font-mono tracking-widest truncate mt-0.5">{req.user.email}</p>
                    </div>
                  </div>

                  {/* Metrics Row */}
                  <div className="flex flex-row items-center gap-6 xl:gap-8 w-full xl:col-span-9 overflow-x-auto pb-2 xl:pb-0 hide-scrollbar xl:justify-start">
                    
                    {/* Bank Details */}
                    <div className="shrink-0 min-w-[150px]">
                      <p className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest mb-1">Bank Details</p>
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">{req.bankName}</p>
                      <p className="text-[10px] font-mono text-slate-500 truncate mt-0.5">{req.accountNumber} • {req.accountName}</p>
                    </div>

                    {/* Amount */}
                    <div className="shrink-0 min-w-[120px]">
                      <p className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest mb-1">Amount</p>
                      <p className="text-xl font-black text-slate-900 dark:text-white">{formatCurrency(req.amount)}</p>
                    </div>

                    {/* Date */}
                    <div className="shrink-0 min-w-[120px]">
                      <p className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest mb-1">Date</p>
                      <p className="text-xs text-slate-400">{formatDate(req.createdAt)}</p>
                    </div>

                    {/* Status */}
                    <div className="shrink-0 min-w-[100px]">
                      <p className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest mb-1.5">Status</p>
                      <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold border ${statusCfg.bg} ${statusCfg.color} ${statusCfg.border}`}>
                        {statusCfg.label}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="shrink-0 xl:ml-auto flex flex-col justify-center gap-2">
                      {req.status === 'PENDING' ? (
                        <PermissionGuard permission="action:withdrawals" fallback={
                          <span className="text-slate-500 text-xs font-mono">Action Locked</span>
                        }>
                          <div className="flex flex-col gap-1.5 w-full min-w-[90px]">
                            <button
                              onClick={() => { setActionRequest(req); setActionType('APPROVE'); setActionError(''); setActionSuccess(''); }}
                              className="w-full bg-emerald-50 dark:bg-[var(--color-neon)]/10 hover:bg-emerald-100 dark:hover:bg-[var(--color-neon)]/20 text-emerald-700 dark:text-[var(--color-neon)] text-[11px] font-bold px-3 py-1.5 rounded-lg border border-emerald-200 dark:border-[var(--color-neon)]/20 transition-all cursor-pointer shadow-sm hover:shadow-md dark:shadow-none"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => { setActionRequest(req); setActionType('REJECT'); setActionError(''); setActionSuccess(''); }}
                              className="w-full bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 text-red-700 dark:text-red-400 text-[11px] font-bold px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-500/20 transition-all cursor-pointer shadow-sm hover:shadow-md dark:shadow-none"
                            >
                              Reject
                            </button>
                          </div>
                        </PermissionGuard>
                      ) : (
                        <div className="text-right flex flex-col items-end">
                          <span className="block text-[10px] font-mono text-slate-500">Processed</span>
                          <span className="block text-xs text-slate-400 mt-0.5">{formatDate(req.processedAt || '')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {pageCount > 1 && (
          <div className="border-t border-slate-200 dark:border-white/5 px-8 py-5 flex items-center justify-between bg-slate-50 dark:bg-white/[0.01]">
            <span className="text-xs text-slate-600 font-mono">Page {page} of {pageCount}</span>
            <div className="flex gap-2">
              <button
                onClick={() => { setPage(p => Math.max(1, p - 1)); setSelectedRows({}); }}
                disabled={page === 1}
                className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 hover:border-slate-200 dark:border-white/10 disabled:opacity-30 text-xs font-bold rounded-xl text-slate-400 hover:text-slate-900 dark:text-white transition-all cursor-pointer disabled:cursor-not-allowed"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Prev
              </button>
              <button
                onClick={() => { setPage(p => Math.min(pageCount, p + 1)); setSelectedRows({}); }}
                disabled={page === pageCount}
                className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 hover:border-slate-200 dark:border-white/10 disabled:opacity-30 text-xs font-bold rounded-xl text-slate-400 hover:text-slate-900 dark:text-white transition-all cursor-pointer disabled:cursor-not-allowed"
              >
                Next <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Detail / Approval Modal ───────────────────────────────────────────── */}
      {actionRequest && actionType && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/10 w-full max-w-lg rounded-[2rem] shadow-2xl dark:shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="h-16 border-b border-slate-200 dark:border-white/5 px-6 flex items-center justify-between bg-slate-50 dark:bg-white/[0.02] shrink-0">
              <span className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                {actionType === 'APPROVE' ? (
                  <><CheckCircle2 className="w-5 h-5 text-[var(--color-neon)]" /> Approve Withdrawal</>
                ) : (
                  <><XCircle className="w-5 h-5 text-red-500" /> Reject Withdrawal</>
                )}
              </span>
              <button
                onClick={() => { setActionRequest(null); setActionType(null); }}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:bg-white/10 flex items-center justify-center text-slate-400 hover:text-slate-900 dark:text-white transition-colors border border-slate-200 dark:border-white/5 cursor-pointer"
              >
                <XCircle className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-8 overflow-y-auto space-y-6">
              
              {/* Status / Errors */}
              {actionSuccess && (
                <div className="bg-[var(--color-neon)]/10 border border-[var(--color-neon)]/20 text-[var(--color-neon)] p-4 rounded-xl text-xs font-bold flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full bg-[var(--color-neon)] animate-ping shrink-0" />
                  <span>{actionSuccess}</span>
                </div>
              )}
              {actionError && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-xs font-bold flex items-center gap-3">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{actionError}</span>
                </div>
              )}

              <p className="text-slate-400 text-sm">
                You are about to <span className={actionType === 'APPROVE' ? 'text-[var(--color-neon)] font-bold' : 'text-red-400 font-bold'}>{actionType}</span> a cash withdrawal of{' '}
                <span className="font-bold text-slate-900 dark:text-white">{formatCurrency(actionRequest.amount)}</span> for{' '}
                <span className="font-bold text-slate-900 dark:text-white">{actionRequest.user.firstName} {actionRequest.user.lastName}</span>.
              </p>

              {/* Bank Details */}
              <div className="bg-slate-50 dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/5 p-5 rounded-2xl space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <Building className="w-4 h-4 text-indigo-400" />
                  <span className="text-xs uppercase font-mono font-bold text-slate-500">Destination Account</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="block text-[10px] text-slate-500 uppercase font-mono mb-1">Bank Name</span>
                    <span className="text-sm font-bold text-slate-900 dark:text-white">{actionRequest.bankName}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-500 uppercase font-mono mb-1">Account Number</span>
                    <span className="text-sm font-bold font-mono text-[var(--color-neon)]">{actionRequest.accountNumber}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="block text-[10px] text-slate-500 uppercase font-mono mb-1">Account Name</span>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{actionRequest.accountName}</span>
                  </div>
                </div>
              </div>

              {/* Driver Balances */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 p-4 rounded-2xl relative overflow-hidden group">
                  <div className="absolute right-0 top-0 -translate-y-4 translate-x-4 w-16 h-16 bg-[var(--color-neon)]/10 rounded-full blur-xl pointer-events-none" />
                  <span className="block text-[10px] text-slate-500 uppercase font-mono mb-2">Withdrawable Balance</span>
                  <span className="text-xl font-black text-[var(--color-neon)] relative z-10">
                    {formatCurrency(actionRequest.user.wallet?.withdrawableBalance || 0)}
                  </span>
                </div>
                <div className="bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 p-4 rounded-2xl relative overflow-hidden">
                  <span className="block text-[10px] text-slate-500 uppercase font-mono mb-2">Total Balance</span>
                  <span className="text-xl font-black text-slate-900 dark:text-white relative z-10">
                    {formatCurrency(actionRequest.user.wallet?.balance || 0)}
                  </span>
                </div>
              </div>



              {/* Rejection reason box */}
              {actionType === 'REJECT' && (
                <div className="space-y-2 pt-2">
                  <label className="block text-[10px] uppercase font-mono text-slate-400 font-bold">Rejection Reason (Required)</label>
                  <textarea
                    placeholder="Provide details about why the withdrawal was rejected..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={3}
                    className="w-full bg-black/40 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white placeholder-slate-600 focus:outline-none focus:border-red-500/50 resize-none transition-colors"
                  />
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="h-20 border-t border-slate-200 dark:border-white/5 px-8 flex items-center justify-end bg-slate-50 dark:bg-white/[0.02] gap-3 shrink-0">
              <button
                onClick={() => { setActionRequest(null); setActionType(null); }}
                disabled={processing}
                className="bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:bg-white/10 border border-slate-200 dark:border-white/5 text-slate-700 dark:text-slate-300 px-5 py-2.5 rounded-xl text-sm font-bold transition-colors disabled:opacity-40 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleAction}
                disabled={processing || (actionType === 'REJECT' && !reason.trim())}
                className={`px-6 py-2.5 rounded-xl text-sm font-bold text-slate-900 dark:text-white transition-all disabled:opacity-40 cursor-pointer flex items-center gap-2 ${
                  actionType === 'APPROVE' ? 'bg-[var(--color-neon)] text-black hover:bg-[var(--color-neon)]/90 shadow-[0_0_20px_var(--color-neon)]' : 'bg-red-500 hover:bg-red-600 shadow-[0_0_20px_rgba(239,68,68,0.5)]'
                }`}
              >
                {processing && <RotateCcw className="w-4 h-4 animate-spin" />}
                {processing ? 'Processing...' : actionType === 'APPROVE' ? 'Approve & Release' : 'Reject & Refund'}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
