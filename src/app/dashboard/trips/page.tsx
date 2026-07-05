'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  MapPin,
  Navigation,
  Clock,
  Users,
  RotateCcw,
  AlertTriangle,
  ChevronRight,
  Car,
  Star,
  X,
  TrendingUp,
  Banknote,
  CheckCircle2,
  XCircle,
  Timer,
  Search,
  Filter,
  Download,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';
import { useTripsQuery, useTripDetailsQuery } from '@/hooks/useTrips';
import { api } from '@/lib/api';

// ─── Helpers & Config ─────────────────────────────────────────────────────────

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

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string; icon: React.ReactNode }> = {
  SCHEDULED: { label: 'Scheduled', bg: 'bg-blue-50 dark:bg-blue-500/10', color: 'text-blue-600 dark:text-blue-400', icon: <Timer className="w-3.5 h-3.5" /> },
  IN_PROGRESS: { label: 'In Progress', bg: 'bg-amber-50 dark:bg-amber-500/10', color: 'text-amber-600 dark:text-amber-400', icon: <Navigation className="w-3.5 h-3.5" /> },
  COMPLETED: { label: 'Completed', bg: 'bg-emerald-50 dark:bg-[var(--color-neon)]/10', color: 'text-emerald-600 dark:text-[var(--color-neon)]', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  CANCELLED: { label: 'Cancelled', bg: 'bg-red-50 dark:bg-red-500/10', color: 'text-red-600 dark:text-red-400', icon: <XCircle className="w-3.5 h-3.5" /> },
};

const BOOKING_STATUS: Record<string, string> = {
  PENDING: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  CONFIRMED: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  COMPLETED: 'bg-[var(--color-neon)]/10 text-[var(--color-neon)] border-[var(--color-neon)]/20',
  CANCELLED: 'bg-red-500/10 text-red-400 border-red-500/20',
  REFUNDED: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
};

const PAYOUT_STATUS: Record<string, string> = {
  RELEASED: 'bg-[var(--color-neon)]/10 text-[var(--color-neon)] border-[var(--color-neon)]/20',
  HELD: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  WITHHELD: 'bg-red-500/10 text-red-400 border-red-500/20',
};

const STATUS_FILTERS = ['', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
const TYPE_FILTERS = ['', 'INTRA_STATE', 'INTER_STATE'];

// ─── Detail Modal ─────────────────────────────────────────────────────────────

const MODAL_TABS = ['Overview', 'Pickup Stops', 'Passengers'] as const;
type ModalTab = typeof MODAL_TABS[number];

function TripDetailModal({ tripId, onClose }: { tripId: string; onClose: () => void }) {
  const { data: trip, isLoading, isError } = useTripDetailsQuery(tripId);
  const [activeTab, setActiveTab] = useState<ModalTab>('Overview');
  const [stops, setStops] = useState<any>(null);
  const [stopsLoading, setStopsLoading] = useState(false);
  const [stopsError, setStopsError] = useState(false);

  useEffect(() => {
    if (activeTab === 'Pickup Stops' && !stops && !stopsLoading) {
      setStopsLoading(true);
      api.getTripStops(tripId)
        .then(setStops)
        .catch(() => { setStopsError(true); toast.error('Failed to load pickup stops'); })
        .finally(() => setStopsLoading(false));
    }
  }, [activeTab, stops, stopsLoading, tripId]);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/10 w-full max-w-4xl rounded-[2rem] shadow-2xl dark:shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="h-20 border-b border-slate-200 dark:border-white/5 px-8 flex items-center justify-between shrink-0 bg-slate-50 dark:bg-white/[0.02]">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
              <Car className="w-5 h-5 text-indigo-400" />
              Trip Overview
            </h2>
            <p className="text-[10px] font-mono text-slate-500 mt-1 uppercase tracking-widest">ID: {tripId}</p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:bg-white/10 flex items-center justify-center text-slate-400 hover:text-slate-900 dark:text-white transition-colors border border-slate-200 dark:border-white/5 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex px-8 border-b border-slate-200 dark:border-white/5 shrink-0 bg-slate-50 dark:bg-white/[0.01]">
          {MODAL_TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-4 px-6 text-xs font-bold transition-colors cursor-pointer relative ${
                activeTab === tab ? 'text-[var(--color-neon)]' : 'text-slate-400 hover:text-slate-900 dark:text-white'
              }`}
            >
              {tab}
              {activeTab === tab && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--color-neon)] rounded-t-full shadow-[0_-2px_10px_var(--color-neon)]" />
              )}
              {tab === 'Pickup Stops' && trip?.stops?.length > 0 && (
                <span className={`ml-2 px-1.5 py-0.5 rounded-full text-[9px] font-black ${
                  activeTab === tab ? 'bg-[var(--color-neon)]/20 text-[var(--color-neon)]' : 'bg-slate-200 dark:bg-white/10 text-slate-400'
                }`}>
                  {trip.stops.length}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="overflow-y-auto flex-1 p-8">
          {isLoading && (
            <div className="py-24 flex flex-col items-center justify-center gap-4">
              <RotateCcw className="w-8 h-8 text-indigo-500 animate-spin" />
              <span className="text-sm font-bold text-slate-400">Loading trip details...</span>
            </div>
          )}

          {isError && (
            <div className="py-12 text-center text-red-400 text-sm font-bold">Failed to load trip details.</div>
          )}

          {trip && (
            <div className="space-y-8">
              {/* ── OVERVIEW TAB ── */}
              {activeTab === 'Overview' && (<>
                {/* Hero Route Card */}
                <div className="bg-slate-50 dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/5 rounded-3xl p-8 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[60px] rounded-full pointer-events-none" />
                  
                  <div className="flex items-center gap-4 mb-8">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold ${STATUS_CONFIG[trip.status]?.bg} ${STATUS_CONFIG[trip.status]?.color}`}>
                      {STATUS_CONFIG[trip.status]?.icon}
                      {STATUS_CONFIG[trip.status]?.label}
                    </span>
                    <span className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-[10px] font-mono font-bold text-slate-700 dark:text-slate-300 uppercase">
                      {trip.type === 'INTER_STATE' ? 'Inter-State' : 'Intra-State'}
                    </span>
                  </div>

                  <div className="flex items-center gap-6 relative z-10">
                    <div className="flex-1 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-2xl p-6 shadow-sm dark:shadow-none">
                      <p className="text-[10px] text-slate-500 uppercase font-mono font-bold mb-2">Origin</p>
                      <p className="font-black text-xl text-slate-900 dark:text-white mb-1">{trip.originAddress}</p>
                      <p className="text-sm text-slate-400">{trip.originState}</p>
                    </div>
                    <div className="shrink-0 flex flex-col items-center gap-2">
                      <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center">
                        <ArrowRight className="w-5 h-5 text-slate-400" />
                      </div>
                      <p className="text-[10px] font-mono text-slate-500">{trip.distance || '—'}</p>
                    </div>
                    <div className="flex-1 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-2xl p-6 shadow-sm dark:shadow-none">
                      <p className="text-[10px] text-slate-500 uppercase font-mono font-bold mb-2">Destination</p>
                      <p className="font-black text-xl text-slate-900 dark:text-white mb-1">{trip.destinationAddress}</p>
                      <p className="text-sm text-slate-400">{trip.destinationState}</p>
                    </div>
                  </div>

                  <div className="mt-6 inline-flex items-center gap-2 text-sm text-slate-400 bg-black/40 px-4 py-2 rounded-xl border border-slate-200 dark:border-white/5">
                    <Clock className="w-4 h-4 text-[var(--color-neon)]" />
                    Departure: <span className="font-bold text-slate-900 dark:text-white">{formatDate(trip.departureTime)}</span>
                  </div>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: 'Base Price / Seat', value: formatCurrency(trip.pricePerSeat), color: 'text-indigo-400', icon: Banknote },
                    { label: 'Seats Booked', value: `${trip.seatsBooked} / ${trip.totalSeats}`, color: 'text-slate-900 dark:text-white', icon: Users },
                    { label: 'Total Revenue', value: formatCurrency(trip.totalRevenue), color: 'text-[var(--color-neon)]', icon: TrendingUp },
                    { label: 'Platform Fee (10%)', value: formatCurrency(trip.platformCommission), color: 'text-violet-400', icon: Star },
                  ].map(({ label, value, color, icon: Icon }) => (
                    <div key={label} className="bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-2xl p-5">
                      <div className="flex items-center gap-2 mb-3">
                        <Icon className="w-4 h-4 text-slate-500" />
                        <span className="text-[10px] text-slate-400 uppercase font-mono font-bold">{label}</span>
                      </div>
                      <span className={`block font-black text-2xl tracking-tighter ${color}`}>{value}</span>
                    </div>
                  ))}
                </div>

                {/* Driver Profile */}
                <div className="bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-3xl p-6 shadow-sm dark:shadow-none">
                  <h4 className="text-[10px] uppercase font-mono font-bold text-slate-500 mb-4 tracking-widest">Driver Profile</h4>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-6">
                    <div className="w-16 h-16 rounded-full bg-indigo-500/20 border-2 border-indigo-500/50 flex items-center justify-center text-indigo-400 font-black text-xl uppercase shrink-0 ring-4 ring-indigo-500/10">
                      {trip.driver.avatarUrl ? (
                        <img src={trip.driver.avatarUrl} className="w-full h-full rounded-full object-cover" alt="" />
                      ) : (
                        `${trip.driver.firstName[0]}${trip.driver.lastName[0]}`
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-black text-xl text-slate-900 dark:text-white">{trip.driver.firstName} {trip.driver.lastName}</p>
                      <p className="text-sm text-slate-400 font-mono mt-1">{trip.driver.email}</p>
                    </div>
                    {trip.driver.driverProfile && (
                      <div className="shrink-0 bg-black/40 border border-slate-200 dark:border-white/5 rounded-2xl p-4 flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <Car className="w-4 h-4 text-slate-400" />
                          <span className="text-sm font-bold text-slate-900 dark:text-white">
                            {trip.driver.driverProfile.vehicleColor} {trip.driver.driverProfile.vehicleMake} {trip.driver.driverProfile.vehicleModel}
                          </span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="bg-slate-200 dark:bg-white/10 px-2 py-1 rounded text-xs font-mono text-slate-700 dark:text-slate-300 font-bold border border-slate-200 dark:border-white/10">
                            {trip.driver.driverProfile.vehiclePlate}
                          </span>
                          <span className="flex items-center gap-1.5 text-amber-400 font-black text-sm">
                            <Star className="w-4 h-4 fill-amber-400" />
                            {trip.driver.driverProfile.rating.toFixed(1)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </>)}

              {/* ── PICKUP STOPS TAB ── */}
              {activeTab === 'Pickup Stops' && (<>
                {stopsLoading ? (
                  <div className="py-24 flex flex-col items-center justify-center gap-4">
                    <RotateCcw className="w-8 h-8 text-indigo-500 animate-spin" />
                    <span className="text-sm font-bold text-slate-400">Loading stops...</span>
                  </div>
                ) : stopsError ? (
                  <div className="py-12 text-center text-red-400 text-sm font-bold">Failed to load pickup stops.</div>
                ) : stops?.stops?.length === 0 ? (
                  <div className="bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-3xl p-12 text-center">
                    <MapPin className="w-12 h-12 mx-auto text-slate-600 mb-4" />
                    <p className="text-base font-bold text-slate-900 dark:text-white">No pickup stops configured</p>
                    <p className="text-sm text-slate-400 mt-2">The driver set a single flat price for this route.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Summary */}
                    {stops?.summary && (
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                        {[
                          { label: 'Stops', value: stops.summary.stopCount, color: 'text-slate-900 dark:text-white' },
                          { label: 'Lowest Price', value: formatCurrency(stops.summary.lowestPrice), color: 'text-[var(--color-neon)]' },
                          { label: 'Highest Price', value: formatCurrency(stops.summary.highestPrice), color: 'text-amber-400' },
                          { label: 'Price Spread', value: formatCurrency(stops.summary.priceSpread), color: 'text-indigo-400' },
                        ].map(({ label, value, color }) => (
                          <div key={label} className="bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-2xl p-4">
                            <span className="block text-[10px] text-slate-400 uppercase font-mono font-bold mb-1">{label}</span>
                            <span className={`block font-black text-xl tracking-tight ${color}`}>{value}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Timeline */}
                    <div className="relative pl-6">
                      <div className="absolute top-6 bottom-6 left-[1.65rem] w-0.5 bg-slate-200 dark:bg-white/10" />
                      
                      {/* Origin */}
                      <div className="flex items-start gap-6 mb-6">
                        <div className="w-4 h-4 rounded-full bg-[var(--color-neon)] border-4 border-[#111111] shrink-0 mt-1 relative z-10 shadow-[0_0_10px_var(--color-neon)]" />
                        <div>
                          <p className="text-[10px] text-slate-500 uppercase font-mono font-bold">Departure</p>
                          <p className="text-sm font-bold text-slate-900 dark:text-white">{trip.originAddress}</p>
                        </div>
                      </div>

                      {/* Stops list */}
                      <div className="space-y-4">
                        {stops?.stops?.map((stop: any) => {
                          const isLowest = stop.pricePerSeat === stops.summary?.lowestPrice;
                          const isHighest = stop.pricePerSeat === stops.summary?.highestPrice && stops.summary.stopCount > 1;
                          return (
                            <div key={stop.id} className="flex items-start gap-6">
                              <div className="w-6 h-6 rounded-full bg-slate-800 border-2 border-[#111111] flex items-center justify-center shrink-0 mt-2 relative z-10">
                                <span className="text-[10px] font-black text-slate-700 dark:text-slate-300">{stop.order}</span>
                              </div>
                              
                              <div className="flex-1 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-2xl p-5 hover:border-slate-200 dark:border-white/10 transition-colors">
                                <div className="flex items-start justify-between gap-4 mb-4">
                                  <div>
                                    <div className="flex items-center gap-2 mb-1">
                                      <p className="text-[10px] text-slate-500 font-mono font-bold uppercase">Stop {stop.order}</p>
                                      {isLowest && <span className="text-[9px] font-bold px-2 py-0.5 bg-[var(--color-neon)]/20 text-[var(--color-neon)] rounded-full">Lowest</span>}
                                      {isHighest && <span className="text-[9px] font-bold px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded-full">Highest</span>}
                                    </div>
                                    <p className="font-bold text-base text-slate-900 dark:text-white">{stop.location}</p>
                                    {stop.etaMinutes != null && (
                                      <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                                        <Clock className="w-3.5 h-3.5" /> +{stop.etaMinutes} min from departure
                                      </p>
                                    )}
                                  </div>
                                  <div className="text-right">
                                    <p className={`font-black text-2xl tracking-tighter ${isHighest ? 'text-amber-400' : isLowest ? 'text-[var(--color-neon)]' : 'text-indigo-400'}`}>
                                      {formatCurrency(stop.pricePerSeat)}
                                    </p>
                                    <p className="text-[10px] text-slate-500 font-mono">per seat</p>
                                  </div>
                                </div>

                                {/* Stop metrics */}
                                <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-200 dark:border-white/5">
                                  <div>
                                    <p className="text-lg font-bold text-slate-900 dark:text-white">{stop.bookingCount}</p>
                                    <p className="text-[10px] text-slate-500 font-mono">Bookings</p>
                                  </div>
                                  <div>
                                    <p className="text-lg font-bold text-slate-900 dark:text-white">{stop.seatsBooked}</p>
                                    <p className="text-[10px] text-slate-500 font-mono">{stop.occupancyRate}% fill</p>
                                  </div>
                                  <div>
                                    <p className="text-lg font-bold text-[var(--color-neon)]">{formatCurrency(stop.revenue)}</p>
                                    <p className="text-[10px] text-slate-500 font-mono">Revenue</p>
                                  </div>
                                </div>

                                {/* Passengers */}
                                {stop.passengers?.length > 0 && (
                                  <div className="mt-4 pt-4 border-t border-slate-200 dark:border-white/5">
                                    <p className="text-[10px] text-slate-500 font-mono font-bold uppercase mb-3">Passengers Boarding</p>
                                    <div className="space-y-2">
                                      {stop.passengers.map((p: any) => (
                                        <div key={p.id} className="flex items-center gap-3 bg-black/20 p-2 rounded-xl">
                                          <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-[10px] font-black shrink-0">
                                            {p.name.split(' ').map((n: string) => n[0]).join('')}
                                          </div>
                                          <span className="text-sm font-bold text-slate-200 flex-1 truncate">{p.name}</span>
                                          <span className="text-xs font-mono text-slate-400 px-2 py-1 bg-slate-100 dark:bg-white/5 rounded-md">{p.seats} seat{p.seats > 1 ? 's' : ''}</span>
                                          <span className="text-xs font-black text-[var(--color-neon)]">{formatCurrency(p.amount)}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Destination */}
                      <div className="flex items-start gap-6 mt-6">
                        <div className="w-4 h-4 rounded-full bg-red-500 border-4 border-[#111111] shrink-0 mt-1 relative z-10 shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
                        <div>
                          <p className="text-[10px] text-slate-500 uppercase font-mono font-bold">Destination</p>
                          <p className="text-sm font-bold text-slate-900 dark:text-white">{trip.destinationAddress}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>)}

              {/* ── PASSENGERS TAB ── */}
              {activeTab === 'Passengers' && (
                <div className="space-y-4">
                  {(!trip.bookings || trip.bookings.length === 0) ? (
                    <div className="bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-3xl p-12 text-center">
                      <Users className="w-12 h-12 mx-auto text-slate-600 mb-4" />
                      <p className="text-base font-bold text-slate-900 dark:text-white">No Bookings Yet</p>
                      <p className="text-sm text-slate-400 mt-2">Passengers haven't booked this trip yet.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {trip.bookings.map((b: any) => (
                        <div key={b.id} className="bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-2xl p-5 hover:border-slate-200 dark:border-white/10 transition-colors">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-black text-sm shrink-0 border border-blue-500/20">
                                {b.passenger.avatarUrl ? (
                                  <img src={b.passenger.avatarUrl} className="w-full h-full rounded-full object-cover" alt="" />
                                ) : (
                                  `${b.passenger.firstName[0]}${b.passenger.lastName[0]}`
                                )}
                              </div>
                              <div>
                                <p className="font-bold text-slate-900 dark:text-white text-sm">{b.passenger.firstName} {b.passenger.lastName}</p>
                                <p className="text-[10px] text-slate-400 font-mono">{b.passenger.email}</p>
                              </div>
                            </div>
                            <span className={`inline-flex px-2 py-1 rounded-lg text-[10px] font-bold border ${BOOKING_STATUS[b.status] || 'bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-700'}`}>
                              {b.status}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-3 mb-4">
                            <div className="bg-black/20 rounded-xl p-3">
                              <p className="text-[10px] text-slate-500 uppercase font-mono font-bold mb-1">Seats</p>
                              <p className="font-black text-slate-900 dark:text-white">{b.seats}</p>
                            </div>
                            <div className="bg-black/20 rounded-xl p-3">
                              <p className="text-[10px] text-slate-500 uppercase font-mono font-bold mb-1">Paid</p>
                              <p className="font-black text-[var(--color-neon)]">{formatCurrency(b.totalAmount)}</p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-white/5">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-slate-500 uppercase font-mono font-bold">Payout:</span>
                              <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${PAYOUT_STATUS[b.payoutStatus] || 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                                {b.payoutStatus}
                              </span>
                            </div>
                            {b.pickupPoint && (
                              <div className="flex items-center gap-1.5 max-w-[120px]">
                                <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                                <span className="text-[10px] text-slate-400 truncate">{b.pickupPoint}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TripsPage() {
  const [page, setPage] = useState(1);
  const [limit] = useState(12);
  const [status, setStatus] = useState('');
  const [type, setType] = useState('');
  const [search, setSearch] = useState('');
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);

  const { data: queryData, isLoading, isError, error, refetch } = useTripsQuery(page, limit, { status, type, search });

  const trips = queryData?.data || [];
  const total = queryData?.total || 0;
  const totalPages = Math.ceil(total / limit);

  const hasActiveFilters = status || type || search;

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter flex items-center gap-3">
            <div className="w-9 h-9 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl flex items-center justify-center">
              <MapPin className="w-5 h-5 text-slate-500 dark:text-slate-400" />
            </div>
            Trips & Rides
          </h1>
          <p className="text-slate-500 text-sm mt-2 font-medium">
            Monitor published routes, bookings, and track active drivers.
          </p>
        </div>
        <div className="flex items-center gap-3 self-start sm:self-auto">
          <button
            onClick={() => {}}
            className="flex items-center gap-2 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 text-xs font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 text-xs font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Summary Stats ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Active Trips', value: total.toString(), icon: Car, color: 'text-slate-900 dark:text-white', iconColor: 'text-slate-500', iconBg: 'bg-slate-50 border-slate-100 dark:bg-white/5 dark:border-white/5' },
          { label: 'Total Revenue', value: formatCurrency(trips.reduce((s: number, t: any) => s + t.totalRevenue, 0)), icon: TrendingUp, color: 'text-slate-900 dark:text-white', iconColor: 'text-slate-500 dark:text-slate-400', iconBg: 'bg-slate-50 border-slate-100 dark:bg-white/5 dark:border-white/5' },
          { label: 'Seats Booked', value: trips.reduce((s: number, t: any) => s + t.seatsBooked, 0).toString(), icon: Users, color: 'text-slate-900 dark:text-white', iconColor: 'text-slate-500 dark:text-slate-400', iconBg: 'bg-slate-50 border-slate-100 dark:bg-white/5 dark:border-white/5' },
          { label: 'Platform Fees', value: formatCurrency(trips.reduce((s: number, t: any) => s + t.totalRevenue * 0.1, 0)), icon: Banknote, color: 'text-slate-900 dark:text-white', iconColor: 'text-slate-500 dark:text-slate-400', iconBg: 'bg-slate-50 border-slate-100 dark:bg-white/5 dark:border-white/5' },
        ].map((stat, i) => (
          <div key={i} className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/5 rounded-[2rem] p-6 relative overflow-hidden group hover:border-slate-300 dark:hover:border-white/10 transition-all shadow-sm hover:shadow-md dark:shadow-none">
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center border ${stat.iconBg}`}>
                <stat.icon className={`w-4 h-4 ${stat.iconColor}`} />
              </div>
              <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500">{stat.label}</p>
            </div>
            <p className={`text-3xl font-black tracking-tighter ${stat.color}`}>{isLoading ? '—' : stat.value}</p>
          </div>
        ))}
      </div>

      {/* ── Filters ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-widest text-slate-600 mr-1">
            <Filter className="w-3 h-3" /> Filters
          </span>
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-[#111111] p-1.5 rounded-xl border border-slate-200 dark:border-white/5 shadow-inner dark:shadow-none">
            {STATUS_FILTERS.map((s) => {
              const isActive = status === s;
              const label = s === '' ? 'All Statuses' : STATUS_CONFIG[s].label;
              return (
                <button
                  key={s}
                  onClick={() => { setStatus(s); setPage(1); }}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm dark:shadow-none'
                      : 'bg-transparent border border-transparent hover:bg-slate-100 dark:hover:bg-white/5 text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="relative w-full sm:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 pointer-events-none" />
          <input
            type="text"
            placeholder="Search trips..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="w-full bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/5 focus:border-[var(--color-neon)]/50 rounded-xl py-2.5 pl-11 pr-4 text-sm text-slate-900 dark:text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-[var(--color-neon)]/30 transition-all"
          />
        </div>
      </div>

      {/* ── Trips Grid ──────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/5 rounded-[2rem] overflow-hidden min-h-[400px]">
        {/* Header */}
        <div className="px-8 py-5 border-b border-slate-200 dark:border-white/5 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-sm">
            <Navigation className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            Active Routes
          </h3>
          {!isLoading && (
            <span className="text-[10px] font-mono text-slate-500 bg-slate-100 dark:bg-white/5 px-3 py-1 rounded-lg">
              {total} trips found
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="p-12 flex items-center justify-center">
            <RotateCcw className="w-8 h-8 text-slate-600 animate-spin" />
          </div>
        ) : isError ? (
          <div className="p-12 text-center text-red-400 font-bold">Failed to load trips.</div>
        ) : trips.length === 0 ? (
          <div className="p-24 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 flex items-center justify-center mb-6">
              <Car className="w-8 h-8 text-slate-600" />
            </div>
            <p className="text-lg font-bold text-slate-900 dark:text-white mb-2">No trips found</p>
            <p className="text-sm text-slate-500">Try adjusting your filters or search term.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-white/5">
            {trips.map((t: any) => {
              const cfg = STATUS_CONFIG[t.status];
              const isInter = t.type === 'INTER_STATE';
              
              return (
                <div key={t.id} className="p-6 hover:bg-slate-50 dark:bg-white/[0.02] transition-colors group flex flex-col xl:flex-row gap-6 items-start xl:items-center justify-between">
                  {/* Driver & Route Info */}
                  <div className="flex items-center gap-6 flex-1 min-w-0 w-full">
                    {/* Driver Avatar */}
                    <div className="w-12 h-12 rounded-full bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center justify-center font-black text-sm uppercase shrink-0">
                      {t.driver.avatarUrl ? (
                        <img src={t.driver.avatarUrl} className="w-full h-full rounded-full object-cover" alt="" />
                      ) : (
                        `${t.driver.firstName[0]}${t.driver.lastName[0]}`
                      )}
                    </div>
                    
                    {/* Route */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="inline-flex px-2 py-0.5 rounded text-[9px] font-bold uppercase font-mono border bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/10">
                          {isInter ? 'Inter' : 'Intra'}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono tracking-widest">{formatDate(t.departureTime)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                        <span className="truncate">{t.originState}</span>
                        <ChevronRight className="w-4 h-4 text-slate-600 shrink-0" />
                        <span className="truncate">{t.destinationState}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5 font-medium">{t.driver.firstName} {t.driver.lastName}</p>
                    </div>
                  </div>

                  {/* Metrics Row */}
                  <div className="flex items-center gap-8 xl:gap-12 w-full xl:w-auto overflow-x-auto pb-2 xl:pb-0 hide-scrollbar">
                    {/* Status */}
                    <div className="shrink-0 w-28">
                      <p className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-widest mb-1">Status</p>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold ${cfg.bg} ${cfg.color}`}>
                        {cfg.icon} {cfg.label}
                      </span>
                    </div>

                    {/* Seats */}
                    <div className="shrink-0 w-20">
                      <p className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-widest mb-1">Seats</p>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">{t.seatsBooked} <span className="text-slate-600">/ {t.totalSeats}</span></p>
                    </div>

                    {/* Price */}
                    <div className="shrink-0 w-28">
                      <p className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-widest mb-1">Base Fare</p>
                      <p className="text-sm font-black text-slate-900 dark:text-white">{formatCurrency(t.pricePerSeat)}</p>
                    </div>

                    {/* Revenue */}
                    <div className="shrink-0 w-28">
                      <p className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-widest mb-1">Revenue</p>
                      <p className="text-sm font-black text-slate-900 dark:text-white">{formatCurrency(t.totalRevenue)}</p>
                    </div>

                    {/* Action */}
                    <div className="shrink-0 xl:ml-4">
                      <button
                        onClick={() => setSelectedTripId(t.id)}
                        className="flex items-center gap-2 bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 text-slate-700 dark:text-white text-xs font-bold px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 transition-all cursor-pointer whitespace-nowrap shadow-sm hover:shadow-md dark:shadow-none"
                      >
                        Details <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="border-t border-slate-200 dark:border-white/5 px-8 py-5 flex items-center justify-between bg-slate-50 dark:bg-white/[0.01]">
            <span className="text-xs text-slate-600 font-mono">Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 hover:border-slate-200 dark:border-white/10 disabled:opacity-30 text-xs font-bold rounded-xl text-slate-400 hover:text-slate-900 dark:text-white transition-all cursor-pointer disabled:cursor-not-allowed"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Prev
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 hover:border-slate-200 dark:border-white/10 disabled:opacity-30 text-xs font-bold rounded-xl text-slate-400 hover:text-slate-900 dark:text-white transition-all cursor-pointer disabled:cursor-not-allowed"
              >
                Next <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {selectedTripId && (
        <TripDetailModal tripId={selectedTripId} onClose={() => setSelectedTripId(null)} />
      )}
    </div>
  );
}
