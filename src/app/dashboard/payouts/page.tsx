'use client';

import React, { useState } from 'react';
import { ColumnDef, SortingState } from '@tanstack/react-table';
import { toast } from 'sonner';
import { 
  RotateCcw, 
  AlertTriangle, 
  Inbox,
  CheckCircle2,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { usePayoutsQuery, usePayoutMutation } from '@/hooks/usePayouts';
import { DataTable } from '@/components/table/DataTable';
import { PermissionGuard } from '@/components/guards/PermissionGuard';

interface Booking {
  id: string;
  tripId: string;
  passengerId: string;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'REFUNDED';
  seats: number;
  totalAmount: number;
  pickupPoint: string | null;
  dropoffPoint: string | null;
  payoutStatus: 'PENDING' | 'HELD' | 'RELEASED' | 'WITHHELD';
  createdAt: string;
  updatedAt: string;
  passenger: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    avatarUrl: string | null;
  };
  trip: {
    id: string;
    originState: string;
    destinationState: string;
    originAddress: string;
    destinationAddress: string;
    pricePerSeat: number;
    driver: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
      avatarUrl: string | null;
      driverProfile?: {
        status: string;
        rating: number;
        ratingCount: number;
      } | null;
    };
  };
  dispute?: {
    id: string;
    reason: string;
    description: string;
    status: string;
    createdAt: string;
  } | null;
  rating?: {
    score: number;
    comment: string | null;
  } | null;
}

const TABS = [
  { label: 'Disputed (Held)', value: 'HELD' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Released', value: 'RELEASED' },
  { label: 'Withheld & Refunded', value: 'WITHHELD' },
  { label: 'All Bookings', value: '' },
];

export default function PayoutsPage() {
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [payoutStatus, setPayoutStatus] = useState('HELD');
  const [search, setSearch] = useState('');
  const [sorting, setSorting] = useState<SortingState>([]);

  // Modals / Action States
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [actionType, setActionType] = useState<'RELEASE' | 'WITHHOLD' | null>(null);
  const [reason, setReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  // TanStack Query Hooks
  const { data: queryData, isLoading, isError, error, refetch } = usePayoutsQuery(page, limit, { payoutStatus, search });
  const payoutMutation = usePayoutMutation();

  const bookings = queryData?.data || [];
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

  const handlePayoutAction = async () => {
    if (!selectedBooking || !actionType) return;

    try {
      setProcessing(true);
      setActionError('');
      setActionSuccess('');

      payoutMutation.mutate(
        {
          id: selectedBooking.id,
          action: actionType,
          reason: reason.trim() ? reason : undefined,
        },
        {
          onSuccess: () => {
            setActionSuccess(`Payout successfully ${actionType === 'RELEASE' ? 'released to driver' : 'withheld & passenger refunded'}.`);
            setReason('');
            toast.success(`Payout successfully ${actionType === 'RELEASE' ? 'released' : 'withheld'}.`);

            setTimeout(() => {
              setSelectedBooking(null);
              setActionType(null);
              setActionSuccess('');
            }, 1200);
          },
          onError: (err: any) => {
            setActionError(err.message || 'Failed to moderate payout.');
            toast.error(err.message || 'Action failed.');
          },
        }
      );
    } finally {
      setProcessing(false);
    }
  };

  const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string; border: string }> = {
    PENDING: { label: 'PENDING', bg: 'bg-amber-50 dark:bg-yellow-500/10', color: 'text-amber-600 dark:text-yellow-500', border: 'border-amber-200 dark:border-yellow-500/20' },
    HELD: { label: 'HELD (Disputed)', bg: 'bg-orange-50 dark:bg-amber-500/10', color: 'text-orange-600 dark:text-amber-500', border: 'border-orange-200 dark:border-amber-500/20' },
    RELEASED: { label: 'RELEASED', bg: 'bg-emerald-50 dark:bg-[var(--color-neon)]/10', color: 'text-emerald-600 dark:text-[var(--color-neon)]', border: 'border-emerald-200 dark:border-[var(--color-neon)]/20' },
    WITHHELD: { label: 'WITHHELD', bg: 'bg-red-50 dark:bg-red-500/10', color: 'text-red-600 dark:text-red-400', border: 'border-red-200 dark:border-red-500/20' },
  };

  const handleClearFilters = () => {
    setSearch('');
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Filters and Search */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        {/* Tabs */}
        <div className="flex flex-wrap gap-2 bg-slate-50 dark:bg-transparent p-1.5 rounded-xl border border-slate-200 dark:border-transparent shadow-inner dark:shadow-none">
          {TABS.map((tab) => {
            const isActive = payoutStatus === tab.value;
            return (
              <button
                key={tab.label}
                onClick={() => {
                  setPayoutStatus(tab.value);
                  setPage(1);
                }}
                className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm dark:shadow-none'
                    : 'bg-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative w-full xl:w-80 shrink-0">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search driver, passenger, route..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/5 focus:border-[var(--color-neon)]/50 rounded-xl py-2.5 pl-11 pr-4 text-sm text-slate-900 dark:text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-[var(--color-neon)]/30 transition-all"
          />
        </div>
      </div>

      {/* Error notification with Retry */}
      {isError && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm font-semibold flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <span>{error?.message || 'Failed to fetch bookings.'}</span>
          </div>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-1.5 bg-red-500/20 hover:bg-red-500/30 text-slate-900 dark:text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Retry
          </button>
        </div>
      )}

      {/* Main List Box */}
      <div className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/5 rounded-[2rem] overflow-hidden min-h-[400px]">
        {/* Header */}
        <div className="px-8 py-5 border-b border-slate-200 dark:border-white/5 flex items-center justify-between bg-slate-50 dark:bg-white/[0.01]">
          <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-sm">
            <Inbox className="w-4 h-4 text-[var(--color-neon)]" />
            Escrow Payouts
          </h3>
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
        ) : bookings.length === 0 ? (
          <div className="p-24 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 flex items-center justify-center mb-6">
              <Inbox className="w-8 h-8 text-slate-600" />
            </div>
            <p className="text-lg font-bold text-slate-900 dark:text-white mb-2">No Payouts Found</p>
            <p className="text-sm text-slate-500">
              {search 
                ? "No matching passenger bookings or trips were found." 
                : `There are currently no trip payments registered under the "${TABS.find(t => t.value === payoutStatus)?.label}" category.`}
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
            {bookings.map((booking: Booking) => {
              const statusCfg = STATUS_CONFIG[booking.payoutStatus] || STATUS_CONFIG.PENDING;
              
              return (
                <div key={booking.id} className="p-5 hover:bg-slate-50 dark:bg-white/[0.02] transition-colors group grid grid-cols-1 xl:grid-cols-12 gap-4 items-center">
                  
                  {/* Driver & Passenger block */}
                  <div className="xl:col-span-5 min-w-0 grid grid-cols-2 gap-4 border-b xl:border-b-0 border-slate-200 dark:border-white/5 pb-4 xl:pb-0">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center font-black text-xs uppercase text-slate-600 dark:text-slate-300 shrink-0">
                        {booking.trip.driver.avatarUrl ? (
                          <img src={booking.trip.driver.avatarUrl} className="w-full h-full rounded-full object-cover" alt="" />
                        ) : (
                          `${booking.trip.driver.firstName[0]}${booking.trip.driver.lastName[0]}`
                        )}
                      </div>
                      <div className="min-w-0">
                        <span className="block text-[11px] font-mono font-bold text-slate-500 uppercase mb-1 tracking-widest">Driver</span>
                        <h4 className="font-bold text-slate-900 dark:text-slate-200 text-sm truncate">{booking.trip.driver.firstName} {booking.trip.driver.lastName}</h4>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 min-w-0 border-l border-slate-200 dark:border-white/5 pl-4">
                      <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center font-black text-xs uppercase text-slate-600 dark:text-slate-300 shrink-0">
                        {booking.passenger.avatarUrl ? (
                          <img src={booking.passenger.avatarUrl} className="w-full h-full rounded-full object-cover" alt="" />
                        ) : (
                          `${booking.passenger.firstName[0]}${booking.passenger.lastName[0]}`
                        )}
                      </div>
                      <div className="min-w-0">
                        <span className="block text-[11px] font-mono font-bold text-slate-500 uppercase mb-1 tracking-widest">Passenger</span>
                        <h4 className="font-bold text-slate-900 dark:text-slate-200 text-sm truncate">{booking.passenger.firstName} {booking.passenger.lastName}</h4>
                      </div>
                    </div>
                  </div>

                  {/* Metrics Row */}
                  <div className="xl:col-span-7 flex flex-wrap xl:flex-nowrap items-center justify-between gap-4 xl:gap-6 min-w-0 border-t xl:border-t-0 border-slate-200 dark:border-white/5 pt-4 xl:pt-0">
                    
                    {/* Route & Fare Group */}
                    <div className="flex items-center gap-4 xl:gap-6 flex-1 min-w-0">
                      {/* Route */}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-mono font-bold text-slate-500 uppercase tracking-widest mb-1.5">Route</p>
                        <div className="flex items-center gap-1.5 text-sm text-slate-900 dark:text-white font-bold">
                          <span className="truncate">{booking.trip.originState}</span>
                          <svg className="w-3.5 h-3.5 text-[var(--color-neon)] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                          </svg>
                          <span className="truncate">{booking.trip.destinationState}</span>
                        </div>
                      </div>

                      {/* Fare */}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-mono font-bold text-slate-500 uppercase tracking-widest mb-1.5">Fare (Escrow)</p>
                        <p className="text-base font-black text-slate-900 dark:text-white truncate">{formatCurrency(booking.totalAmount)}</p>
                      </div>
                    </div>

                    {/* Status & Actions Group */}
                    <div className="flex items-start gap-4 xl:gap-8 w-full xl:w-auto shrink-0 justify-between xl:justify-end">
                      {/* Status */}
                      <div className="w-[130px] shrink-0">
                        <p className="text-xs font-mono font-bold text-slate-500 uppercase tracking-widest mb-1.5">Payout Status</p>
                        <div className="space-y-1">
                          <span className={`inline-flex px-2.5 py-1 rounded-md text-[11px] font-bold border ${statusCfg.bg} ${statusCfg.color} ${statusCfg.border} ${booking.payoutStatus === 'HELD' ? 'animate-pulse' : ''}`}>
                            {statusCfg.label}
                          </span>
                          {booking.dispute && booking.payoutStatus === 'HELD' && (
                            <span className="block text-[9px] text-red-500 font-mono font-bold mt-1 truncate">
                              Disputed: "{booking.dispute.reason}"
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="w-[80px] shrink-0 flex justify-end xl:block pt-[22px]">
                        {booking.payoutStatus === 'PENDING' || booking.payoutStatus === 'HELD' ? (
                          <PermissionGuard permission="action:payouts" fallback={
                            <span className="text-slate-500 text-xs font-mono border border-slate-200 dark:border-white/5 px-2 py-1 rounded bg-slate-50 dark:bg-white/5">Locked</span>
                          }>
                            <div className="flex flex-col gap-1.5 w-[80px]">
                              <button
                                onClick={() => { setSelectedBooking(booking); setActionType('RELEASE'); setActionError(''); setActionSuccess(''); }}
                                className="w-full bg-emerald-50 dark:bg-[var(--color-neon)]/10 hover:bg-emerald-100 dark:hover:bg-[var(--color-neon)]/20 text-emerald-700 dark:text-[var(--color-neon)] text-[10px] font-bold px-2 py-1.5 rounded-lg border border-emerald-200 dark:border-[var(--color-neon)]/20 transition-all cursor-pointer shadow-sm hover:shadow-md dark:shadow-none"
                              >
                                Release
                              </button>
                              <button
                                onClick={() => { setSelectedBooking(booking); setActionType('WITHHOLD'); setActionError(''); setActionSuccess(''); }}
                                className="w-full bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 text-red-700 dark:text-red-400 text-[10px] font-bold px-2 py-1.5 rounded-lg border border-red-200 dark:border-red-500/20 transition-all cursor-pointer shadow-sm hover:shadow-md dark:shadow-none"
                              >
                                Withhold
                              </button>
                            </div>
                          </PermissionGuard>
                        ) : (
                          <span className="text-slate-500 text-[10px] font-mono font-bold border border-slate-200 dark:border-white/5 px-2 py-1 rounded bg-slate-50 dark:bg-white/5 shadow-sm dark:shadow-none">Completed</span>
                        )}
                      </div>
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
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 hover:border-slate-200 dark:border-white/10 disabled:opacity-30 text-xs font-bold rounded-xl text-slate-400 hover:text-slate-900 dark:text-white transition-all cursor-pointer disabled:cursor-not-allowed"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"/></svg> Prev
              </button>
              <button
                onClick={() => setPage(p => Math.min(pageCount, p + 1))}
                disabled={page === pageCount}
                className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 hover:border-slate-200 dark:border-white/10 disabled:opacity-30 text-xs font-bold rounded-xl text-slate-400 hover:text-slate-900 dark:text-white transition-all cursor-pointer disabled:cursor-not-allowed"
              >
                Next <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/></svg>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Moderation Modal */}
      {selectedBooking && actionType && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/10 w-full max-w-lg rounded-[2rem] shadow-2xl dark:shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col max-h-[90vh] overflow-hidden animate-fade-in">
            
            {/* Header */}
            <div className="h-16 border-b border-slate-200 dark:border-white/5 px-6 flex items-center justify-between bg-slate-50 dark:bg-white/[0.02] shrink-0">
              <span className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                {actionType === 'RELEASE' ? (
                  <><CheckCircle2 className="w-5 h-5 text-[var(--color-neon)]" /> Release Escrow Payout</>
                ) : (
                  <><XCircle className="w-5 h-5 text-red-500" /> Withhold & Refund Passenger</>
                )}
              </span>
              <button
                onClick={() => {
                  setSelectedBooking(null);
                  setActionType(null);
                }}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:bg-white/10 flex items-center justify-center text-slate-400 hover:text-slate-900 dark:text-white transition-colors border border-slate-200 dark:border-white/5 cursor-pointer"
              >
                <XCircle className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-8 overflow-y-auto space-y-6">
              
              {/* Feedback messages */}
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

              <p className="text-slate-400 text-sm leading-relaxed">
                You are about to moderate the payout of{' '}
                <span className="font-bold text-slate-900 dark:text-white">{formatCurrency(selectedBooking.totalAmount)}</span>.
                {actionType === 'RELEASE' 
                  ? ' Releasing will transfer 90% of the funds to the driver\'s withdrawable balance (with 10% platform commission fee deducted).' 
                  : ' Withholding will cancel the payout to the driver and refund 100% of the fare back to the passenger\'s deposit balance.'
                }
              </p>

              {/* Trip summary */}
              <div className="bg-slate-50 dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/5 p-5 rounded-2xl space-y-3">
                <div className="grid grid-cols-2 gap-4 border-b border-slate-200 dark:border-white/5 pb-3">
                  <div>
                    <span className="block text-[10px] text-slate-500 uppercase font-mono mb-1">Passenger</span>
                    <span className="text-sm font-bold text-slate-900 dark:text-white">{selectedBooking.passenger.firstName} {selectedBooking.passenger.lastName}</span>
                  </div>
                  <div className="text-right">
                    <span className="block text-[10px] text-slate-500 uppercase font-mono mb-1">Driver</span>
                    <span className="text-sm font-bold text-slate-900 dark:text-white">{selectedBooking.trip.driver.firstName} {selectedBooking.trip.driver.lastName}</span>
                  </div>
                </div>

                <div className="pt-1">
                  <span className="block text-[10px] text-slate-500 uppercase font-mono mb-2">Route & Locations</span>
                  <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold mb-1.5 text-sm">
                    <span>{selectedBooking.trip.originState}</span>
                    <svg className="w-3.5 h-3.5 text-[var(--color-neon)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                    <span>{selectedBooking.trip.destinationState}</span>
                  </div>
                  <span className="block text-slate-400 font-mono text-[10px]">{selectedBooking.trip.originAddress}</span>
                </div>
              </div>

              {/* Passenger Complaint / Dispute */}
              <div className="bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-mono font-bold text-slate-500 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                    Customer Complaints
                  </span>
                  {selectedBooking.dispute ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/20 animate-pulse">
                      1 active dispute
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-500/10 text-slate-400 border border-slate-500/20">
                      0 disputes
                    </span>
                  )}
                </div>

                {selectedBooking.dispute ? (
                  <div className="bg-black/30 border border-slate-200 dark:border-white/5 p-3 rounded-xl space-y-1.5">
                    <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white text-xs">
                      <span className="truncate max-w-[200px]">{selectedBooking.dispute.reason}</span>
                      <span className={`text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded ${
                        selectedBooking.dispute.status === 'RESOLVED' ? 'bg-[var(--color-neon)]/10 text-[var(--color-neon)]' : 'bg-red-500/10 text-red-400'
                      }`}>
                        {selectedBooking.dispute.status}
                      </span>
                    </div>
                    <p className="text-slate-400 text-xs leading-relaxed">{selectedBooking.dispute.description}</p>
                    <span className="block text-[10px] font-mono text-slate-500">{formatDate(selectedBooking.dispute.createdAt)}</span>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">No customer complaints or disputes recorded for this booking.</p>
                )}
              </div>

              {/* Moderation Comment Box */}
              <div className="space-y-1.5">
                <label className="block text-[10px] uppercase font-mono text-slate-400 font-bold">Moderation Note / Reason</label>
                <textarea
                  placeholder="Provide details about why the payout is being released or withheld (this will resolve the passenger complaint)..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-50 dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/5 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white placeholder-slate-600 focus:outline-none focus:border-[var(--color-neon)]/50 resize-none transition-colors"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="h-16 border-t border-slate-200 dark:border-white/5 px-8 flex items-center justify-end bg-slate-50 dark:bg-white/[0.02] gap-3 shrink-0">
              <button
                onClick={() => {
                  setSelectedBooking(null);
                  setActionType(null);
                }}
                disabled={processing}
                className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:text-white bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:bg-white/10 border border-slate-200 dark:border-white/5 transition-colors disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handlePayoutAction}
                disabled={processing}
                className={`px-5 py-2.5 rounded-xl text-sm font-bold text-black transition-all disabled:opacity-50 cursor-pointer shadow-[0_0_20px_rgba(0,0,0,0.3)] ${
                  actionType === 'RELEASE' ? 'bg-[var(--color-neon)] hover:brightness-110 shadow-[var(--color-neon)]/20' : 'bg-red-500 hover:bg-red-400 shadow-red-500/20 text-slate-900 dark:text-white'
                }`}
              >
                {processing ? 'Processing...' : actionType === 'RELEASE' ? 'Release to Driver' : 'Withhold & Refund'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
