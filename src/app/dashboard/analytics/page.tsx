'use client';

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserCheck, 
  ShieldAlert, 
  FileCheck, 
  RefreshCw, 
  BarChart2, 
  MapPin, 
  Car, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Activity,
  TrendingUp,
  Wallet,
  Percent,
  Calendar,
  Layers,
  Award,
  Clock,
  RotateCcw,
  Search,
  Compass,
  ArrowUpRight
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  LineChart, 
  Line,
  AreaChart,
  Area
} from 'recharts';
import { useAnalyticsQuery } from '@/hooks/useAnalytics';
import { useFinancialsQuery, usePlatformTransactionsQuery } from '@/hooks/useFinancials';
import { DataTable } from '@/components/table/DataTable';
import { ColumnDef, SortingState } from '@tanstack/react-table';

const COLORS = {
  approved: '#10b981', // emerald
  underReview: '#3b82f6', // blue
  pendingReview: '#f59e0b', // amber
  rejected: '#f43f5e', // rose
  suspended: '#64748b' // slate
};

export default function AnalyticsPage() {
  const [range, setRange] = useState<'7d' | '30d' | '90d' | '12m'>('30d');
  const [activeTab, setActiveTab] = useState<'users' | 'drivers' | 'passengers' | 'trips' | 'financials' | 'demand' | 'supply'>('users');
  const [mounted, setMounted] = useState(false);

  // Financial-specific state
  const [finRange, setFinRange] = useState<'7d' | '30d' | '90d' | '6m' | '12m'>('6m');
  const [finPageIndex, setFinPageIndex] = useState(0);
  const [finRowSelection, setFinRowSelection] = useState<Record<string, boolean>>({});
  const [finSorting, setFinSorting] = useState<SortingState>([]);

  // TanStack Query hook (for live KYC, state, and vehicle distribution data)
  const { data, isLoading, isError, error, refetch } = useAnalyticsQuery();

  // Financial data hooks
  const { data: finData, isLoading: finLoading, isError: finIsError, error: finError, refetch: finRefetch } = useFinancialsQuery();
  const { data: txData, isLoading: txLoading } = usePlatformTransactionsQuery(finPageIndex + 1, 15);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Check URL param for tab deep-linking
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      if (tab === 'financials') setActiveTab('financials');
    }
  }, []);

  const metrics = data?.metrics || null;
  const recentLogs = data?.recentLogs || [];
  const stateDistribution = data?.stateDistribution || [];
  const vehicleDistribution = data?.vehicleDistribution || [];

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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Financial data derived values
  const finMetrics = finData?.metrics || null;
  const finMonthlyAnalytics = finData?.monthlyAnalytics || [];
  const finRecentTxs = finData?.recentTransactions || [];

  interface WalletTransaction {
    id: string;
    type: 'CREDIT' | 'DEBIT';
    reason: string;
    amount: number;
    balanceBefore: number;
    balanceAfter: number;
    reference: string;
    createdAt: string;
    userName: string;
    userEmail: string;
  }

  const paginatedTransactions: WalletTransaction[] =
    Array.isArray(txData?.data) && txData.data.length > 0
      ? txData.data
      : Array.isArray(txData) && (txData as any).length > 0
        ? txData as any
        : finRecentTxs;

  const getFinChartData = () => {
    if (!finData) return [];
    if (finRange === '90d') {
      return finMonthlyAnalytics.slice(-3).map((item: any) => ({ ...item, gbv: item.commissions * 10 }));
    }
    if (finRange === '6m' || finRange === '12m') {
      return finMonthlyAnalytics.map((item: any) => ({ ...item, gbv: item.commissions * 10 }));
    }
    const days = finRange === '7d' ? 7 : 30;
    const dateMap: Record<string, { deposits: number; withdrawals: number; commissions: number }> = {};
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      dateMap[dateStr] = { deposits: 0, withdrawals: 0, commissions: 0 };
    }
    if (finRecentTxs && Array.isArray(finRecentTxs)) {
      finRecentTxs.forEach((tx: any) => {
        const txDate = new Date(tx.createdAt);
        const dateStr = txDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        if (dateMap[dateStr] !== undefined) {
          if (tx.reason === 'TOP_UP') dateMap[dateStr].deposits += tx.amount;
          else if (tx.reason === 'TRIP_PAYMENT') dateMap[dateStr].commissions += tx.amount * 0.1;
          else if (tx.reason === 'WITHDRAWAL') dateMap[dateStr].withdrawals += tx.amount;
        }
      });
    }
    return Object.entries(dateMap).map(([key, val]) => ({
      month: key,
      deposits: val.deposits,
      withdrawals: val.withdrawals,
      commissions: val.commissions,
      gbv: val.commissions * 10,
      netFlow: val.deposits - val.withdrawals,
    }));
  };

  const finChartData = getFinChartData();

  const getReasonBadgeClass = (reason: string) => {
    switch (reason) {
      case 'TRIP_PAYMENT': return 'bg-emerald-50 dark:bg-[var(--color-neon)]/10 text-emerald-600 dark:text-[var(--color-neon)] border border-emerald-200 dark:border-[var(--color-neon)]/20';
      case 'TRIP_EARNING': return 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20';
      case 'WITHDRAWAL': return 'bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-500/20';
      case 'TOP_UP': return 'bg-blue-50 dark:bg-[#00e5ff]/10 text-blue-600 dark:text-[#00e5ff] border border-blue-200 dark:border-[#00e5ff]/20';
      case 'REFERRAL_BONUS': return 'bg-pink-50 dark:bg-pink-500/10 text-pink-600 dark:text-pink-400 border border-pink-200 dark:border-pink-500/20';
      case 'REFUND': return 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20';
      default: return 'bg-slate-50 dark:bg-white/5 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/10';
    }
  };

  const txColumns: ColumnDef<WalletTransaction>[] = [
    {
      id: 'select',
      header: ({ table }) => (
        <div className="relative flex items-center justify-center shrink-0">
          <input 
            type="checkbox" 
            className="peer w-4 h-4 appearance-none rounded bg-[#f5f5f5] dark:bg-white/10 border-2 border-slate-300 dark:border-white/20 checked:bg-[#e5e5e5] checked:dark:bg-white/30 checked:border-[#d4d4d4] checked:dark:border-white/40 cursor-pointer transition-all"
            checked={table.getIsAllPageRowsSelected()} 
            onChange={table.getToggleAllPageRowsSelectedHandler()} 
          />
          <svg className="w-2.5 h-2.5 absolute pointer-events-none opacity-0 peer-checked:opacity-100 text-slate-800 dark:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
      ),
      cell: ({ row }) => (
        <div className="relative flex items-center justify-center shrink-0">
          <input 
            type="checkbox" 
            className="peer w-4 h-4 appearance-none rounded bg-[#f5f5f5] dark:bg-white/10 border-2 border-slate-300 dark:border-white/20 checked:bg-[#e5e5e5] checked:dark:bg-white/30 checked:border-[#d4d4d4] checked:dark:border-white/40 cursor-pointer transition-all"
            checked={row.getIsSelected()} 
            onChange={row.getToggleSelectedHandler()} 
          />
          <svg className="w-2.5 h-2.5 absolute pointer-events-none opacity-0 peer-checked:opacity-100 text-slate-800 dark:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
      ),
    },
    {
      accessorKey: 'userName',
      header: 'User',
      enableSorting: true,
      cell: ({ row }) => {
        const tx = row.original;
        return (
          <div>
            <span className="block font-bold text-slate-900 dark:text-white">{tx.userName}</span>
            <span className="block text-[10px] text-slate-500 font-mono tracking-widest truncate max-w-xs">{tx.userEmail}</span>
          </div>
        );
      },
    },
    {
      accessorKey: 'reference',
      header: 'Ref ID',
      cell: ({ row }) => <span className="font-mono text-[10px] font-bold text-slate-500 tracking-widest uppercase">{row.getValue('reference') as string}</span>,
    },
    {
      accessorKey: 'type',
      header: 'Type',
      enableSorting: true,
      cell: ({ row }) => {
        const type = row.getValue('type') as string;
        return (
          <div className="w-20">
            <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold tracking-widest uppercase ${
              type === 'CREDIT'
                ? 'bg-emerald-50 dark:bg-[var(--color-neon)]/10 text-emerald-600 dark:text-[var(--color-neon)] border border-emerald-200 dark:border-[var(--color-neon)]/20'
                : 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/20'
            }`}>{type}</span>
          </div>
        );
      },
    },
    {
      accessorKey: 'reason',
      header: 'Reason',
      enableSorting: true,
      accessorFn: (row: WalletTransaction) => row.reason.replace('_', ' '),
      cell: ({ row }) => {
        const reason = row.getValue('reason') as string;
        return (
          <div className="w-28">
            <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[9px] font-bold font-mono tracking-widest uppercase ${getReasonBadgeClass(reason)}`}>{reason.replace('_', ' ')}</span>
          </div>
        );
      },
    },
    {
      accessorKey: 'amount',
      header: 'Amount',
      enableSorting: true,
      accessorFn: (row: WalletTransaction) => `${row.type === 'CREDIT' ? '+' : '-'}${formatCurrency(row.amount)}`,
      cell: ({ row }) => {
        const tx = row.original;
        return (
          <div className="w-24">
            <span className={`font-black tracking-tight whitespace-nowrap ${tx.type === 'CREDIT' ? 'text-emerald-600 dark:text-[var(--color-neon)]' : 'text-slate-900 dark:text-white'}`}>{tx.type === 'CREDIT' ? '+' : '-'}{formatCurrency(tx.amount)}</span>
          </div>
        );
      },
    },
    {
      accessorKey: 'delta',
      header: 'Balance Delta',
      accessorFn: (row: WalletTransaction) => `${formatCurrency(row.balanceBefore)} -> ${formatCurrency(row.balanceAfter)}`,
      cell: ({ row }) => {
        const tx = row.original;
        return (
          <div className="w-32">
            <span className="text-[10px] font-mono text-slate-500 tracking-widest">{formatCurrency(tx.balanceBefore)} → {formatCurrency(tx.balanceAfter)}</span>
          </div>
        );
      },
    },
    {
      accessorKey: 'createdAt',
      header: 'Processed Date',
      enableSorting: true,
      accessorFn: (row: WalletTransaction) => formatDate(row.createdAt),
      cell: ({ row }) => (
        <div className="w-28">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{row.getValue('createdAt') as string}</span>
        </div>
      ),
    },
  ];

  // Generate dynamic, high-fidelity mock datasets according to the active timeline range
  const generateDetailedAnalyticsData = (currentRange: '7d' | '30d' | '90d' | '12m') => {
    const points = currentRange === '7d' ? 7 : currentRange === '30d' ? 30 : currentRange === '90d' ? 90 : 12;
    const dataList = [];
    const now = new Date();

    for (let i = points - 1; i >= 0; i--) {
      const d = new Date();
      let label = '';
      if (currentRange === '12m') {
        d.setMonth(now.getMonth() - i);
        label = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      } else {
        d.setDate(now.getDate() - i);
        label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }

      // Base curves & growth coefficients
      const ratioVal = (points - i) / points;
      const wave = Math.sin(i * 0.4) * 0.12 + 0.98; // deterministic wave

      // 1. User Analytics Data
      const passengerRegistrations = Math.round((28 + ratioVal * 65) * wave);
      const driverRegistrations = Math.round((9 + ratioVal * 22) * wave);
      const registrations = passengerRegistrations + driverRegistrations;
      const activeUsers = Math.round((140 + ratioVal * 580) * wave);
      const growthRate = parseFloat((4.8 + ratioVal * 7.2 + Math.cos(i) * 1.2).toFixed(1));

      // 2. Driver Analytics Data
      const registeredDrivers = Math.round((15 + ratioVal * 45) * wave);
      const verifiedDrivers = Math.round(registeredDrivers * 0.76);
      const activeDrivers = Math.round(verifiedDrivers * 0.82);

      // 3. Passenger Analytics Data
      const passengerGrowth = passengerRegistrations;
      const retention = parseFloat((68 + ratioVal * 14 + Math.sin(i) * 4).toFixed(1));

      // 4. Trip Analytics Data
      const tripsCreated = Math.round((45 + ratioVal * 140) * wave);
      const tripsBooked = Math.round(tripsCreated * 0.88);
      const tripsCompleted = Math.round(tripsBooked * 0.94);
      const cancellationRate = parseFloat((11 - ratioVal * 7.5 + Math.cos(i) * 1.8).toFixed(1));

      // 5. Financial Analytics Data
      const gbv = Math.round((180000 + ratioVal * 740000) * wave);
      const revenue = Math.round(gbv * 0.1); // 10% Platform fee
      const withdrawals = Math.round((90000 + ratioVal * 490000) * wave);
      const driverEarnings = Math.round(gbv * 0.9);

      // 6. Demand & Supply Analytics Data
      const searches = Math.round((600 + ratioVal * 2400) * wave);
      const searchGrowth = parseFloat((5.2 + ratioVal * 9.5 + Math.sin(i) * 1.5).toFixed(1));
      const tripsPublished = Math.round((50 + ratioVal * 160) * wave);
      const driversAvailable = Math.round((40 + ratioVal * 150) * wave);
      const marketplaceBalance = Math.round((1200000 + ratioVal * 5800000) * wave);

      dataList.push({
        name: label,
        registrations,
        activeUsers,
        growthRate,
        registeredDrivers,
        verifiedDrivers,
        activeDrivers,
        passengerGrowth,
        retention,
        tripsCreated,
        tripsBooked,
        tripsCompleted,
        cancellationRate,
        gbv,
        revenue,
        withdrawals,
        driverEarnings,
        searches,
        searchGrowth,
        tripsPublished,
        driversAvailable,
        marketplaceBalance,
      });
    }
    return dataList;
  };

  const currentData = generateDetailedAnalyticsData(range);

  // Compute overall KPI aggregates for headers based on the current tab
  const getAggregates = () => {
    const totalRegistrations = currentData.reduce((acc, curr) => acc + curr.registrations, 0);
    const avgGrowthRate = parseFloat((currentData.reduce((acc, curr) => acc + curr.growthRate, 0) / currentData.length).toFixed(1));
    const peakActiveUsers = Math.max(...currentData.map(d => d.activeUsers));
    const avgRetention = parseFloat((currentData.reduce((acc, curr) => acc + curr.retention, 0) / currentData.length).toFixed(1));
    
    const totalTripsCreated = currentData.reduce((acc, curr) => acc + curr.tripsCreated, 0);
    const totalTripsBooked = currentData.reduce((acc, curr) => acc + curr.tripsBooked, 0);
    const totalTripsCompleted = currentData.reduce((acc, curr) => acc + curr.tripsCompleted, 0);
    const avgCancellationRate = parseFloat((currentData.reduce((acc, curr) => acc + curr.cancellationRate, 0) / currentData.length).toFixed(1));

    const totalGbv = currentData.reduce((acc, curr) => acc + curr.gbv, 0);
    const totalRevenue = currentData.reduce((acc, curr) => acc + curr.revenue, 0);
    const totalWithdrawals = currentData.reduce((acc, curr) => acc + curr.withdrawals, 0);
    const totalDriverEarnings = currentData.reduce((acc, curr) => acc + curr.driverEarnings, 0);

    // Demand & Supply aggregates
    const totalSearches = currentData.reduce((acc, curr) => acc + curr.searches, 0);
    const avgSearchGrowth = parseFloat((currentData.reduce((acc, curr) => acc + curr.searchGrowth, 0) / currentData.length).toFixed(1));
    const totalTripsPublished = currentData.reduce((acc, curr) => acc + curr.tripsPublished, 0);
    const avgDriversAvailable = Math.round(currentData.reduce((acc, curr) => acc + curr.driversAvailable, 0) / currentData.length);
    const latestMarketplaceBalance = currentData[currentData.length - 1]?.marketplaceBalance || 0;

    return {
      totalRegistrations,
      avgGrowthRate,
      peakActiveUsers,
      avgRetention,
      totalTripsCreated,
      totalTripsBooked,
      totalTripsCompleted,
      avgCancellationRate,
      totalGbv,
      totalRevenue,
      totalWithdrawals,
      totalDriverEarnings,
      totalSearches,
      avgSearchGrowth,
      totalTripsPublished,
      avgDriversAvailable,
      latestMarketplaceBalance
    };
  };

  const aggs = getAggregates();

  // Detailed route-by-route search vs trip matching (Demand/Supply ratio)
  const getRouteRatioData = (currentRange: '7d' | '30d' | '90d' | '12m') => {
    const rangeMultiplier = currentRange === '7d' ? 0.25 : currentRange === '30d' ? 1.0 : currentRange === '90d' ? 3.0 : 12.0;
    
    return [
      { from: 'Lagos', to: 'Ibadan', searches: Math.round(5000 * rangeMultiplier), trips: Math.round(4500 * rangeMultiplier) },
      { from: 'Abuja', to: 'Kaduna', searches: Math.round(5000 * rangeMultiplier), trips: Math.round(800 * rangeMultiplier) },
      { from: 'Lagos', to: 'Benin City', searches: Math.round(3200 * rangeMultiplier), trips: Math.round(1800 * rangeMultiplier) },
      { from: 'Port Harcourt', to: 'Owerri', searches: Math.round(2500 * rangeMultiplier), trips: Math.round(300 * rangeMultiplier) },
      { from: 'Enugu', to: 'Onitsha', searches: Math.round(1800 * rangeMultiplier), trips: Math.round(1600 * rangeMultiplier) },
      { from: 'Benin City', to: 'Warri', searches: Math.round(1200 * rangeMultiplier), trips: Math.round(50 * rangeMultiplier) },
      { from: 'Ibadan', to: 'Ilorin', searches: Math.round(800 * rangeMultiplier), trips: Math.round(720 * rangeMultiplier) },
    ].map(item => {
      const ratio = item.trips > 0 ? parseFloat((item.searches / item.trips).toFixed(2)) : item.searches;
      let status: 'healthy' | 'warning' | 'critical' = 'healthy';
      if (ratio >= 3.0) status = 'critical';
      else if (ratio >= 1.5) status = 'warning';
      
      return {
        ...item,
        ratio,
        status
      };
    });
  };

  const routeRatioData = getRouteRatioData(range);
  
  const searchesByState = [
    { name: 'Lagos', value: Math.round(aggs.totalSearches * 0.42) },
    { name: 'Abuja', value: Math.round(aggs.totalSearches * 0.25) },
    { name: 'Oyo', value: Math.round(aggs.totalSearches * 0.12) },
    { name: 'Rivers', value: Math.round(aggs.totalSearches * 0.10) },
    { name: 'Edo', value: Math.round(aggs.totalSearches * 0.06) },
    { name: 'Others', value: Math.round(aggs.totalSearches * 0.05) },
  ];

  const getRoutesWithNoDrivers = (currentRange: '7d' | '30d' | '90d' | '12m') => {
    const rangeMultiplier = currentRange === '7d' ? 0.25 : currentRange === '30d' ? 1.0 : currentRange === '90d' ? 3.0 : 12.0;
    return [
      { from: 'Benin City', to: 'Warri', searches: Math.round(1200 * rangeMultiplier), drivers: 0 },
      { from: 'Calabar', to: 'Uyo', searches: Math.round(950 * rangeMultiplier), drivers: 0 },
      { from: 'Kano', to: 'Zaria', searches: Math.round(780 * rangeMultiplier), drivers: 0 },
      { from: 'Jos', to: 'Bauchi', searches: Math.round(420 * rangeMultiplier), drivers: 0 },
    ];
  };
  
  const routesWithNoDrivers = getRoutesWithNoDrivers(range);


  if (isLoading || !metrics) {
    return (
      <div className="space-y-8 max-w-7xl mx-auto pb-16 animate-pulse">
        <div className="flex justify-between items-center h-16 bg-white dark:bg-slate-900/10 border border-slate-200 dark:border-slate-900 rounded-2xl p-6 shadow-sm dark:shadow-none" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-slate-900/10 border border-slate-205 dark:border-slate-900 rounded-2xl p-6 h-32 space-y-3" />
          ))}
        </div>
        <div className="bg-white dark:bg-slate-900/10 border border-slate-205 dark:border-slate-900 rounded-2xl p-6 h-[400px]" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-red-50 dark:bg-red-955/20 border border-red-200 dark:border-red-900/30 text-red-500 dark:text-red-400 p-6 max-w-lg mx-auto text-center space-y-4 my-12 rounded-2xl shadow-xl">
        <p className="font-bold flex items-center justify-center gap-2">
          <ShieldAlert className="w-5 h-5 text-red-550 dark:text-red-400 shrink-0" />
          {error?.message || 'Failed to retrieve platform analytics.'}
        </p>
        <button
          onClick={() => refetch()}
          className="flex items-center justify-center gap-1.5 mx-auto bg-red-600 hover:bg-red-555 text-slate-900 dark:text-white text-xs font-bold px-4 py-2 rounded-xl transition-all cursor-pointer shadow-sm"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Retry Connection
        </button>
      </div>
    );
  }

  const kycPieData = [
    { name: 'Approved', value: metrics.approved, color: COLORS.approved },
    { name: 'Under Review', value: metrics.underReview, color: COLORS.underReview },
    { name: 'Pending Review', value: metrics.pendingReview, color: COLORS.pendingReview },
    { name: 'Rejected', value: metrics.rejected, color: COLORS.rejected },
    { name: 'Suspended', value: metrics.suspended, color: COLORS.suspended },
  ].filter(item => item.value > 0);

  const verificationRate = metrics.totalDrivers > 0 ? (metrics.approved / metrics.totalDrivers) * 100 : 0;

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto pb-16">
      {/* Title & Timeline Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative">
        <div className="absolute -top-10 -left-10 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none" />
        <div className="relative z-10">
          <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-slate-800 to-slate-500 dark:from-white dark:to-slate-400 tracking-tighter flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 dark:bg-indigo-500/20 rounded-2xl border border-indigo-500/20">
              <BarChart2 className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            Executive Analytics Board
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-2 font-medium tracking-wide">Cross-examine registrations, cancellations, trip statistics, and cash flows.</p>
        </div>

        <div className="flex flex-wrap items-center gap-4 relative z-10">
          {/* Global Timeline selector */}
          <div className="flex items-center bg-slate-50 dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/5 p-1 rounded-xl shadow-inner backdrop-blur-sm">
            {[
              { label: '7 Days', value: '7d' },
              { label: '30 Days', value: '30d' },
              { label: '90 Days', value: '90d' },
              { label: '12 Months', value: '12m' }
            ].map((t) => (
              <button
                key={t.value}
                onClick={() => setRange(t.value as any)}
                className={`px-4 py-2 rounded-lg text-[11px] font-bold font-mono transition-all cursor-pointer uppercase tracking-widest ${
                  range === t.value 
                    ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm border border-slate-200 dark:border-transparent' 
                    : 'text-slate-500 dark:text-slate-400 border border-transparent hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 text-xs font-bold bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/10 hover:border-indigo-500 dark:hover:border-[var(--color-neon)]/50 text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-[var(--color-neon)] px-4 py-2.5 rounded-[12px] transition-all cursor-pointer shadow-sm group"
            title="Refresh analytics data"
          >
            <RefreshCw className="w-3.5 h-3.5 group-hover:rotate-180 transition-transform duration-500" />
            Sync
          </button>
        </div>
      </div>

      {/* Main Tabbed Sections - Segmented Pill Design */}
      <div className="flex flex-wrap gap-2 p-1.5 bg-slate-50 dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/5 rounded-2xl shadow-inner">
        {[
          { id: 'users', label: 'User Growth', icon: <Users className="w-4 h-4" /> },
          { id: 'drivers', label: 'Driver specs', icon: <UserCheck className="w-4 h-4" /> },
          { id: 'passengers', label: 'Passenger Retention', icon: <Award className="w-4 h-4" /> },
          { id: 'trips', label: 'Trips & Bookings', icon: <Calendar className="w-4 h-4" /> },
          { id: 'financials', label: 'Financial Flows', icon: <Wallet className="w-4 h-4" /> },
          { id: 'demand', label: 'Demand Dashboard', icon: <Search className="w-4 h-4" /> },
          { id: 'supply', label: 'Supply Dashboard', icon: <Compass className="w-4 h-4" /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-5 py-2.5 text-[13px] font-bold rounded-xl transition-all cursor-pointer flex items-center gap-2.5 ${
              activeTab === tab.id
                ? 'bg-white dark:bg-[#111111] text-slate-900 dark:text-[var(--color-neon)] border border-slate-200 dark:border-[var(--color-neon)]/20 shadow-sm'
                : 'text-slate-500 border border-transparent hover:text-slate-900 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5'
            }`}
          >
            <span className={activeTab === tab.id ? 'opacity-100' : 'opacity-60'}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* RENDER USER ANALYTICS TAB */}
      {activeTab === 'users' && (
        <div className="space-y-8 animate-fade-in">
          {/* Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/5 rounded-[2rem] p-6 relative overflow-hidden group hover:border-slate-300 dark:hover:border-slate-200 dark:border-white/10 transition-colors shadow-sm">
              <div className="absolute right-0 top-0 -translate-y-4 translate-x-4 w-32 h-32 bg-slate-500/5 dark:bg-slate-100 dark:bg-white/5 rounded-full blur-2xl group-hover:bg-slate-500/10 dark:group-hover:bg-slate-200 dark:bg-white/10 transition-colors" />
              <span className="block text-[10px] uppercase font-mono tracking-widest font-bold text-slate-400 dark:text-slate-500 mb-2">New Registrations</span>
              <span className="block text-4xl font-black text-slate-800 dark:text-white tracking-tighter drop-shadow-sm">{aggs.totalRegistrations.toLocaleString()}</span>
              <span className="block text-[9px] text-slate-400 dark:text-slate-500 mt-3 font-mono uppercase tracking-widest">Total accounts created in timeline</span>
            </div>
            
            <div className="bg-white dark:bg-[#111111] border border-[var(--color-neon)]/20 rounded-[2rem] p-6 relative overflow-hidden group shadow-[0_0_30px_rgba(0,255,128,0.05)] hover:shadow-[0_0_40px_rgba(0,255,128,0.1)] transition-all">
              <div className="absolute right-0 top-0 -translate-y-4 translate-x-4 w-32 h-32 bg-[var(--color-neon)]/10 rounded-full blur-2xl group-hover:bg-[var(--color-neon)]/20 transition-colors" />
              <span className="block text-[10px] uppercase font-mono tracking-widest font-bold text-[var(--color-neon)]/70 mb-2">Avg Growth Velocity</span>
              <span className="block text-4xl font-black text-[var(--color-neon)] tracking-tighter drop-shadow-[0_0_10px_rgba(0,255,128,0.3)]">+{aggs.avgGrowthRate}%</span>
              <span className="block text-[9px] text-slate-400 dark:text-slate-500 mt-3 font-mono uppercase tracking-widest">MoM/DoD signups momentum</span>
            </div>
            
            <div className="bg-white dark:bg-[#111111] border border-cyan-200 dark:border-[#00e5ff]/20 rounded-[2rem] p-6 relative overflow-hidden group hover:border-cyan-300 dark:hover:border-[#00e5ff]/30 transition-colors shadow-sm">
              <div className="absolute right-0 top-0 -translate-y-4 translate-x-4 w-32 h-32 bg-cyan-100 dark:bg-[#00e5ff]/10 rounded-full blur-2xl group-hover:bg-cyan-200 dark:group-hover:bg-[#00e5ff]/20 transition-colors" />
              <span className="block text-[10px] uppercase font-mono tracking-widest font-bold text-cyan-600 dark:text-[#00e5ff]/70 mb-2">Peak Active Users</span>
              <span className="block text-4xl font-black text-cyan-600 dark:text-[#00e5ff] tracking-tighter drop-shadow-sm dark:drop-shadow-[0_0_10px_rgba(0,229,255,0.3)]">{aggs.peakActiveUsers.toLocaleString()}</span>
              <span className="block text-[9px] text-slate-400 dark:text-slate-500 mt-3 font-mono uppercase tracking-widest">Max DAU/MAU platform logins</span>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/5 rounded-[2rem] p-8 shadow-sm dark:shadow-[0_8px_30px_rgba(0,0,0,0.5)]">
              <div className="mb-6">
                <h3 className="text-lg font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-2">
                  <Activity className="w-5 h-5 text-indigo-500" />
                  Registrations Trend
                </h3>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono uppercase tracking-widest mt-1">New driver and passenger signups combined.</p>
              </div>
              {mounted && (
                <div className="w-full bg-slate-50 dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/5 rounded-[1.5rem] p-6 shadow-inner">
                  <ResponsiveContainer width="100%" height={288} minWidth={1} minHeight={1}>
                    <AreaChart data={currentData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="regGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff" opacity={0.03} />
                      <XAxis dataKey="name" stroke="#475569" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis stroke="#475569" fontSize={11} tickLine={false} axisLine={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#111111', borderColor: 'rgba(255,255,255,0.05)', borderRadius: '1rem', color: '#fff' }}
                        itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                      />
                      <Area type="monotone" dataKey="registrations" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#regGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/5 rounded-[2rem] p-8 shadow-sm dark:shadow-[0_8px_30px_rgba(0,0,0,0.5)]">
              <div className="mb-6">
                <h3 className="text-lg font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-[var(--color-neon)]" />
                  Active Users & Growth Velocity
                </h3>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono uppercase tracking-widest mt-1">Comparing active user logins against percentage growth velocity.</p>
              </div>
              {mounted && (
                <div className="w-full bg-slate-50 dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/5 rounded-[1.5rem] p-6 shadow-inner">
                  <ResponsiveContainer width="100%" height={288} minWidth={1} minHeight={1}>
                    <LineChart data={currentData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff" opacity={0.03} />
                      <XAxis dataKey="name" stroke="#475569" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis yAxisId="left" stroke="#475569" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis yAxisId="right" orientation="right" stroke="#475569" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `${val}%`} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#111111', borderColor: 'rgba(255,255,255,0.05)', borderRadius: '1rem', color: '#fff' }}
                        itemStyle={{ fontWeight: 'bold' }}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '20px', fontWeight: 'bold', color: '#94a3b8' }} iconType="circle" />
                      <Line yAxisId="left" type="monotone" dataKey="activeUsers" name="Active Users" stroke="var(--color-neon)" strokeWidth={3} dot={false} activeDot={{ r: 6, fill: 'var(--color-neon)', strokeWidth: 0 }} />
                      <Line yAxisId="right" type="monotone" dataKey="growthRate" name="Growth Rate (%)" stroke="#3b82f6" strokeWidth={3} dot={false} activeDot={{ r: 6, fill: '#3b82f6', strokeWidth: 0 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* RENDER DRIVER ANALYTICS TAB */}
      {activeTab === 'drivers' && (
        <div className="space-y-8 animate-fade-in">
          {/* Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/5 rounded-[2rem] p-6 relative overflow-hidden group hover:border-slate-300 dark:hover:border-slate-200 dark:border-white/10 transition-colors shadow-sm">
              <div className="absolute right-0 top-0 -translate-y-4 translate-x-4 w-32 h-32 bg-slate-500/5 dark:bg-slate-100 dark:bg-white/5 rounded-full blur-2xl group-hover:bg-slate-500/10 dark:group-hover:bg-slate-200 dark:bg-white/10 transition-colors" />
              <span className="block text-[10px] uppercase font-mono tracking-widest font-bold text-slate-400 dark:text-slate-500 mb-2">Registered Drivers</span>
              <span className="block text-4xl font-black text-slate-800 dark:text-white tracking-tighter drop-shadow-sm">{metrics.totalDrivers.toLocaleString()}</span>
              <span className="block text-[9px] text-slate-400 dark:text-slate-500 mt-3 font-mono uppercase tracking-widest">Total driver signups on record</span>
            </div>
            
            <div className="bg-white dark:bg-[#111111] border border-[var(--color-neon)]/20 rounded-[2rem] p-6 relative overflow-hidden group shadow-[0_0_30px_rgba(0,255,128,0.05)] hover:shadow-[0_0_40px_rgba(0,255,128,0.1)] transition-all">
              <div className="absolute right-0 top-0 -translate-y-4 translate-x-4 w-32 h-32 bg-[var(--color-neon)]/10 rounded-full blur-2xl group-hover:bg-[var(--color-neon)]/20 transition-colors" />
              <span className="block text-[10px] uppercase font-mono tracking-widest font-bold text-[var(--color-neon)]/70 mb-2">Verified Drivers (KYC Pass)</span>
              <span className="block text-4xl font-black text-[var(--color-neon)] tracking-tighter drop-shadow-[0_0_10px_rgba(0,255,128,0.3)]">{metrics.approved.toLocaleString()}</span>
              <span className="block text-[9px] text-slate-400 dark:text-slate-500 mt-3 font-mono uppercase tracking-widest">Verification rate: {verificationRate.toFixed(1)}%</span>
            </div>
            
            <div className="bg-white dark:bg-[#111111] border border-blue-500/20 rounded-[2rem] p-6 relative overflow-hidden group hover:border-blue-500/30 transition-colors shadow-sm">
              <div className="absolute right-0 top-0 -translate-y-4 translate-x-4 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-colors" />
              <span className="block text-[10px] uppercase font-mono tracking-widest font-bold text-blue-400/70 mb-2">Active Drivers</span>
              <span className="block text-4xl font-black text-blue-400 tracking-tighter drop-shadow-[0_0_10px_rgba(59,130,246,0.3)]">
                {Math.round(metrics.approved * 0.85).toLocaleString()}
              </span>
              <span className="block text-[9px] text-slate-400 dark:text-slate-500 mt-3 font-mono uppercase tracking-widest">Drivers offering rides in timeline</span>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/5 rounded-[2rem] p-8 shadow-sm dark:shadow-[0_8px_30px_rgba(0,0,0,0.5)]">
              <div className="mb-6">
                <h3 className="text-lg font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-2">
                  <Activity className="w-5 h-5 text-indigo-500" />
                  Driver Activation Pipeline
                </h3>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono uppercase tracking-widest mt-1">Track conversion of driver candidate registrations into verified status.</p>
              </div>
              {mounted && (
                <div className="w-full bg-slate-50 dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/5 rounded-[1.5rem] p-6 shadow-inner">
                  <ResponsiveContainer width="100%" height={288} minWidth={1} minHeight={1}>
                    <BarChart data={currentData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff" opacity={0.03} vertical={false} />
                      <XAxis dataKey="name" stroke="#475569" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis stroke="#475569" fontSize={11} tickLine={false} axisLine={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#111111', borderColor: 'rgba(255,255,255,0.05)', borderRadius: '1rem', color: '#fff' }}
                        cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '20px', fontWeight: 'bold', color: '#94a3b8' }} iconType="circle" />
                      <Bar dataKey="registeredDrivers" name="Registered" fill="#4f46e5" radius={[4, 4, 0, 0]} opacity={0.8} />
                      <Bar dataKey="verifiedDrivers" name="Verified (KYC)" fill="var(--color-neon)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="activeDrivers" name="Active Offerings" fill="#3b82f6" radius={[4, 4, 0, 0]} opacity={0.9} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* KYC status distribution (Pie Chart) & Decision Log Trail */}
            <div className="grid grid-cols-1 gap-6">
              <div className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/5 rounded-[2rem] p-8 shadow-sm flex flex-col md:flex-row items-center gap-8">
                <div className="h-44 w-44 relative flex items-center justify-center shrink-0">
                  {mounted && (
                    <ResponsiveContainer width="100%" height={176} minWidth={1} minHeight={1}>
                      <PieChart>
                        <Pie
                          data={kycPieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={80}
                          paddingAngle={3}
                          dataKey="value"
                          stroke="none"
                        >
                          {kycPieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: '#111111', borderColor: 'rgba(255,255,255,0.05)', borderRadius: '1rem', color: '#fff' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                  <div className="absolute text-center flex flex-col justify-center pointer-events-none">
                    <span className="text-slate-400 dark:text-slate-500 text-[10px] uppercase font-bold tracking-widest font-mono">KYC Pass</span>
                    <span className="text-slate-800 dark:text-white text-2xl font-black tracking-tighter">{verificationRate.toFixed(0)}%</span>
                  </div>
                </div>
                <div className="flex-1 space-y-4 text-xs">
                  <h4 className="font-black text-slate-800 dark:text-white text-lg tracking-tight">KYC Status Share</h4>
                  <div className="grid grid-cols-2 gap-4 text-[10px] uppercase font-bold text-slate-500 font-mono tracking-widest border-t border-slate-100 dark:border-slate-200 dark:border-white/5 pt-4">
                    <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.approved }} />Approved ({metrics.approved})</div>
                    <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.underReview }} />Under Review ({metrics.underReview})</div>
                    <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.pendingReview }} />Pending ({metrics.pendingReview})</div>
                    <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.rejected }} />Rejected ({metrics.rejected})</div>
                  </div>
                </div>
              </div>

              {/* Geographic distribution preview */}
              <div className="bg-white dark:bg-slate-900/10 border border-slate-200 dark:border-slate-900 rounded-2xl p-6 shadow-sm flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                  <MapPin className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <span className="block text-xs uppercase font-mono tracking-wider font-bold text-slate-400 dark:text-slate-500">Demographic Coverage</span>
                  <span className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mt-1">
                    Drivers registered across {stateDistribution.length} Nigerian states.
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Audit trail trail log list */}
          <div className="bg-white dark:bg-slate-900/10 border border-slate-200 dark:border-slate-900 rounded-2xl p-6 shadow-sm space-y-5">
            <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm uppercase tracking-wider pb-3 border-b border-slate-100 dark:border-slate-900 flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-500" />
              Latest KYC Audits
            </h3>
            <div className="space-y-3">
              {recentLogs.slice(0, 3).map((log: any) => (
                <div key={log.id} className="bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-900/80 rounded-xl p-4 text-xs flex justify-between gap-4">
                  <div className="flex items-start gap-2.5">
                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                      log.action === 'APPROVE' ? 'bg-emerald-50 text-emerald-400 border border-emerald-200/20' : 'bg-red-50 text-red-600 border border-red-200/20'
                    }`}>{log.action}</span>
                    <div>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{log.adminName}</span>
                      <p className="text-slate-500 dark:text-slate-400 mt-1 italic">"{log.reason || 'No comments logged'}"</p>
                    </div>
                  </div>
                  <span className="text-slate-500 font-mono text-[10px]">{formatDate(log.createdAt)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* RENDER PASSENGER ANALYTICS TAB */}
      {activeTab === 'passengers' && (
        <div className="space-y-8 animate-fade-in">
          {/* Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/5 rounded-[2rem] p-6 relative overflow-hidden group hover:border-slate-300 dark:hover:border-slate-200 dark:border-white/10 transition-colors shadow-sm">
              <div className="absolute right-0 top-0 -translate-y-4 translate-x-4 w-32 h-32 bg-slate-500/5 dark:bg-slate-100 dark:bg-white/5 rounded-full blur-2xl group-hover:bg-slate-500/10 dark:group-hover:bg-slate-200 dark:bg-white/10 transition-colors" />
              <span className="block text-[10px] uppercase font-mono tracking-widest font-bold text-slate-400 dark:text-slate-500 mb-2">Passenger Growth</span>
              <span className="block text-4xl font-black text-slate-800 dark:text-white tracking-tighter drop-shadow-sm">
                {currentData.reduce((acc, curr) => acc + curr.passengerGrowth, 0).toLocaleString()}
              </span>
              <span className="block text-[9px] text-slate-400 dark:text-slate-500 mt-3 font-mono uppercase tracking-widest">New passenger signups in timeline</span>
            </div>
            
            <div className="bg-white dark:bg-[#111111] border border-[var(--color-neon)]/20 rounded-[2rem] p-6 relative overflow-hidden group shadow-[0_0_30px_rgba(0,255,128,0.05)] hover:shadow-[0_0_40px_rgba(0,255,128,0.1)] transition-all">
              <div className="absolute right-0 top-0 -translate-y-4 translate-x-4 w-32 h-32 bg-[var(--color-neon)]/10 rounded-full blur-2xl group-hover:bg-[var(--color-neon)]/20 transition-colors" />
              <span className="block text-[10px] uppercase font-mono tracking-widest font-bold text-[var(--color-neon)]/70 mb-2">Average Retention Rate</span>
              <span className="block text-4xl font-black text-[var(--color-neon)] tracking-tighter drop-shadow-[0_0_10px_rgba(0,255,128,0.3)]">{aggs.avgRetention}%</span>
              <span className="block text-[9px] text-slate-400 dark:text-slate-500 mt-3 font-mono uppercase tracking-widest">Passengers with multiple rides in timeline</span>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/5 rounded-[2rem] p-8 shadow-sm dark:shadow-[0_8px_30px_rgba(0,0,0,0.5)]">
              <div className="mb-6">
                <h3 className="text-lg font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-2">
                  <Activity className="w-5 h-5 text-[var(--color-neon)]" />
                  Passenger Signups Trend
                </h3>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono uppercase tracking-widest mt-1">Track passenger onboarding velocity.</p>
              </div>
              {mounted && (
                <div className="w-full bg-slate-50 dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/5 rounded-[1.5rem] p-6 shadow-inner">
                  <ResponsiveContainer width="100%" height={288} minWidth={1} minHeight={1}>
                    <AreaChart data={currentData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="passGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--color-neon)" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="var(--color-neon)" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff" opacity={0.03} />
                      <XAxis dataKey="name" stroke="#475569" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis stroke="#475569" fontSize={11} tickLine={false} axisLine={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#111111', borderColor: 'rgba(255,255,255,0.05)', borderRadius: '1rem', color: '#fff' }}
                        itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                      />
                      <Area type="monotone" dataKey="passengerGrowth" name="Passengers Onboarded" stroke="var(--color-neon)" strokeWidth={3} fillOpacity={1} fill="url(#passGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/5 rounded-[2rem] p-8 shadow-sm dark:shadow-[0_8px_30px_rgba(0,0,0,0.5)]">
              <div className="mb-6">
                <h3 className="text-lg font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-purple-500" />
                  MoM Retention Rate
                </h3>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono uppercase tracking-widest mt-1">Percentage of passengers who book and complete subsequent trips.</p>
              </div>
              {mounted && (
                <div className="w-full bg-slate-50 dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/5 rounded-[1.5rem] p-6 shadow-inner">
                  <ResponsiveContainer width="100%" height={288} minWidth={1} minHeight={1}>
                    <LineChart data={currentData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff" opacity={0.03} />
                      <XAxis dataKey="name" stroke="#475569" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis stroke="#475569" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `${val}%`} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#111111', borderColor: 'rgba(255,255,255,0.05)', borderRadius: '1rem', color: '#fff' }}
                        itemStyle={{ fontWeight: 'bold' }}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '20px', fontWeight: 'bold', color: '#94a3b8' }} iconType="circle" />
                      <Line type="monotone" dataKey="retention" name="Retention (%)" stroke="#a855f7" strokeWidth={3} activeDot={{ r: 6, fill: '#a855f7', strokeWidth: 0 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* RENDER TRIP ANALYTICS TAB */}
      {activeTab === 'trips' && (
        <div className="space-y-8 animate-fade-in">
          {/* Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/5 rounded-[2rem] p-6 relative overflow-hidden group hover:border-slate-300 dark:hover:border-slate-200 dark:border-white/10 transition-colors shadow-sm">
              <div className="absolute right-0 top-0 -translate-y-4 translate-x-4 w-32 h-32 bg-slate-500/5 dark:bg-slate-100 dark:bg-white/5 rounded-full blur-2xl group-hover:bg-slate-500/10 dark:group-hover:bg-slate-200 dark:bg-white/10 transition-colors" />
              <span className="block text-[10px] uppercase font-mono tracking-widest font-bold text-slate-400 dark:text-slate-500 mb-2">Trips Created</span>
              <span className="block text-4xl font-black text-slate-800 dark:text-white tracking-tighter drop-shadow-sm">{aggs.totalTripsCreated.toLocaleString()}</span>
              <span className="block text-[9px] text-slate-400 dark:text-slate-500 mt-3 font-mono uppercase tracking-widest">Trips posted by active drivers</span>
            </div>
            
            <div className="bg-white dark:bg-[#111111] border border-indigo-500/20 rounded-[2rem] p-6 relative overflow-hidden group hover:border-indigo-500/30 transition-colors shadow-sm">
              <div className="absolute right-0 top-0 -translate-y-4 translate-x-4 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl group-hover:bg-indigo-500/20 transition-colors" />
              <span className="block text-[10px] uppercase font-mono tracking-widest font-bold text-indigo-400/70 mb-2">Trips Booked</span>
              <span className="block text-4xl font-black text-indigo-400 tracking-tighter drop-shadow-[0_0_10px_rgba(99,102,241,0.3)]">{aggs.totalTripsBooked.toLocaleString()}</span>
              <span className="block text-[9px] text-slate-400 dark:text-slate-500 mt-3 font-mono uppercase tracking-widest">Booking conversion: {((aggs.totalTripsBooked / aggs.totalTripsCreated) * 100).toFixed(0)}%</span>
            </div>
            
            <div className="bg-white dark:bg-[#111111] border border-[var(--color-neon)]/20 rounded-[2rem] p-6 relative overflow-hidden group shadow-[0_0_30px_rgba(0,255,128,0.05)] hover:shadow-[0_0_40px_rgba(0,255,128,0.1)] transition-all">
              <div className="absolute right-0 top-0 -translate-y-4 translate-x-4 w-32 h-32 bg-[var(--color-neon)]/10 rounded-full blur-2xl group-hover:bg-[var(--color-neon)]/20 transition-colors" />
              <span className="block text-[10px] uppercase font-mono tracking-widest font-bold text-[var(--color-neon)]/70 mb-2">Trips Completed</span>
              <span className="block text-4xl font-black text-[var(--color-neon)] tracking-tighter drop-shadow-[0_0_10px_rgba(0,255,128,0.3)]">{aggs.totalTripsCompleted.toLocaleString()}</span>
              <span className="block text-[9px] text-slate-400 dark:text-slate-500 mt-3 font-mono uppercase tracking-widest">Fulfillment rate: {((aggs.totalTripsCompleted / aggs.totalTripsBooked) * 100).toFixed(0)}%</span>
            </div>
            
            <div className="bg-white dark:bg-[#111111] border border-rose-500/20 rounded-[2rem] p-6 relative overflow-hidden group hover:border-rose-500/30 transition-colors shadow-sm">
              <div className="absolute right-0 top-0 -translate-y-4 translate-x-4 w-32 h-32 bg-rose-500/10 rounded-full blur-2xl group-hover:bg-rose-500/20 transition-colors" />
              <span className="block text-[10px] uppercase font-mono tracking-widest font-bold text-rose-400/70 mb-2">Cancellation Rate</span>
              <span className="block text-4xl font-black text-rose-500 tracking-tighter drop-shadow-[0_0_10px_rgba(244,63,94,0.3)]">{aggs.avgCancellationRate}%</span>
              <span className="block text-[9px] text-slate-400 dark:text-slate-500 mt-3 font-mono uppercase tracking-widest">Trips cancelled by drivers/passengers</span>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/5 rounded-[2rem] p-8 shadow-sm dark:shadow-[0_8px_30px_rgba(0,0,0,0.5)]">
              <div className="mb-6">
                <h3 className="text-lg font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-2">
                  <Activity className="w-5 h-5 text-indigo-500" />
                  Trip Lifecycle Pipeline
                </h3>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono uppercase tracking-widest mt-1">Comparing created postings vs passenger bookings vs final completions.</p>
              </div>
              {mounted && (
                <div className="w-full bg-slate-50 dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/5 rounded-[1.5rem] p-6 shadow-inner">
                  <ResponsiveContainer width="100%" height={288} minWidth={1} minHeight={1}>
                    <LineChart data={currentData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff" opacity={0.03} />
                      <XAxis dataKey="name" stroke="#475569" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis stroke="#475569" fontSize={11} tickLine={false} axisLine={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#111111', borderColor: 'rgba(255,255,255,0.05)', borderRadius: '1rem', color: '#fff' }}
                        itemStyle={{ fontWeight: 'bold' }}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '20px', fontWeight: 'bold', color: '#94a3b8' }} iconType="circle" />
                      <Line type="monotone" dataKey="tripsCreated" name="Posted" stroke="#8b5cf6" strokeWidth={3} dot={false} activeDot={{ r: 6, fill: '#8b5cf6', strokeWidth: 0 }} />
                      <Line type="monotone" dataKey="tripsBooked" name="Booked" stroke="#3b82f6" strokeWidth={3} dot={false} activeDot={{ r: 6, fill: '#3b82f6', strokeWidth: 0 }} />
                      <Line type="monotone" dataKey="tripsCompleted" name="Completed" stroke="var(--color-neon)" strokeWidth={3} dot={false} activeDot={{ r: 6, fill: 'var(--color-neon)', strokeWidth: 0 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/5 rounded-[2rem] p-8 shadow-sm dark:shadow-[0_8px_30px_rgba(0,0,0,0.5)]">
              <div className="mb-6">
                <h3 className="text-lg font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-rose-500" />
                  Trip Cancellation Rate Trend
                </h3>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono uppercase tracking-widest mt-1">Track percentage spikes in cancelled reservations.</p>
              </div>
              {mounted && (
                <div className="w-full bg-slate-50 dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/5 rounded-[1.5rem] p-6 shadow-inner">
                  <ResponsiveContainer width="100%" height={288} minWidth={1} minHeight={1}>
                    <AreaChart data={currentData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="cancelGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff" opacity={0.03} />
                      <XAxis dataKey="name" stroke="#475569" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis stroke="#475569" fontSize={11} tickLine={false} axisLine={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#111111', borderColor: 'rgba(255,255,255,0.05)', borderRadius: '1rem', color: '#fff' }}
                        itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                      />
                      <Area type="monotone" dataKey="cancellationRate" name="Cancellation (%)" stroke="#f43f5e" strokeWidth={3} fillOpacity={1} fill="url(#cancelGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* RENDER FINANCIAL FLOWS TAB — merged with full Financial Analytics */}
      {activeTab === 'financials' && (
        <div className="space-y-8 animate-fade-in">

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-2.5">
                <Wallet className="w-6 h-6 text-[var(--color-neon)]" />
                Financial Flows & Platform Revenue
              </h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Track platform liquidity, commission revenues, and withdrawal cash flows.</p>
            </div>
            <button
              onClick={() => finRefetch()}
              className="flex items-center gap-2 self-start sm:self-center text-xs font-bold bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/10 hover:border-[var(--color-neon)]/50 text-slate-500 dark:text-slate-400 hover:text-[var(--color-neon)] px-4 py-2.5 rounded-xl transition-all cursor-pointer shadow-sm"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh Data
            </button>
          </div>

          {/* Error state */}
          {finIsError && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm font-semibold flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <ShieldAlert className="w-5 h-5 shrink-0" />
                <span>{finError?.message || 'Failed to fetch financial analytics.'}</span>
              </div>
              <button onClick={() => finRefetch()} className="flex items-center gap-1.5 bg-red-500/20 hover:bg-red-500/30 text-slate-900 dark:text-white text-xs font-bold px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer">
                <RotateCcw className="w-3.5 h-3.5" /> Retry
              </button>
            </div>
          )}

          {finLoading || !finMetrics ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/5 rounded-[2rem] p-6 h-32 animate-pulse space-y-3">
                  <div className="h-3.5 bg-slate-100 dark:bg-white/5 rounded w-1/2" />
                  <div className="h-7 bg-slate-200 dark:bg-slate-200 dark:bg-white/10 rounded w-3/4" />
                  <div className="h-3 bg-slate-100 dark:bg-white/5 rounded w-1/3" />
                </div>
              ))}
            </div>
          ) : (
            <>
              {/* Primary KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* GBV */}
                <div className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/5 rounded-[2rem] p-6 relative overflow-hidden group hover:border-slate-300 dark:hover:border-slate-200 dark:border-white/10 transition-colors shadow-sm">
                  <div className="absolute right-0 top-0 -translate-y-4 translate-x-4 w-32 h-32 bg-[var(--color-neon)]/5 rounded-full blur-2xl group-hover:bg-[var(--color-neon)]/10 transition-colors" />
                  <div className="flex justify-between items-start">
                    <span className="block text-[10px] uppercase font-mono font-bold text-slate-400 dark:text-slate-500 tracking-widest mb-2">Gross Booking Value (GBV)</span>
                    <Layers className="w-4 h-4 text-[var(--color-neon)]" />
                  </div>
                  <span className="block text-2xl font-black text-slate-800 dark:text-white mt-1 tracking-tighter">{formatCurrency(finMetrics.totalPlatformCommission * 10)}</span>
                  <span className="block text-[9px] text-slate-400 dark:text-slate-500 mt-3 font-mono uppercase tracking-widest">Total bookings volume processed</span>
                </div>

                {/* Platform Fee */}
                <div className="bg-white dark:bg-[#111111] border border-[var(--color-neon)]/20 rounded-[2rem] p-6 relative overflow-hidden group shadow-[0_0_30px_rgba(0,255,128,0.05)] hover:shadow-[0_0_40px_rgba(0,255,128,0.1)] transition-all">
                  <div className="absolute right-0 top-0 -translate-y-4 translate-x-4 w-32 h-32 bg-[var(--color-neon)]/10 rounded-full blur-2xl group-hover:bg-[var(--color-neon)]/20 transition-colors" />
                  <div className="flex justify-between items-start">
                    <span className="block text-[10px] uppercase font-mono font-bold text-[var(--color-neon)]/70 tracking-widest mb-2">Platform Fee (10% Comm.)</span>
                    <TrendingUp className="w-4 h-4 text-[var(--color-neon)]" />
                  </div>
                  <span className="block text-2xl font-black text-[var(--color-neon)] mt-1 tracking-tighter drop-shadow-[0_0_10px_rgba(0,255,128,0.3)]">{formatCurrency(finMetrics.totalPlatformCommission)}</span>
                  <span className="block text-[9px] text-slate-400 dark:text-slate-500 mt-3 font-mono uppercase tracking-widest">Net revenue profit cuts</span>
                </div>

                {/* Withdrawals */}
                <div className="bg-white dark:bg-[#111111] border border-purple-200 dark:border-purple-500/20 rounded-[2rem] p-6 relative overflow-hidden group hover:border-purple-300 dark:hover:border-purple-500/30 transition-colors shadow-sm">
                  <div className="absolute right-0 top-0 -translate-y-4 translate-x-4 w-32 h-32 bg-purple-100 dark:bg-purple-500/10 rounded-full blur-2xl group-hover:bg-purple-200 dark:group-hover:bg-purple-500/20 transition-colors" />
                  <div className="flex justify-between items-start">
                    <span className="block text-[10px] uppercase font-mono font-bold text-purple-600 dark:text-purple-400/70 tracking-widest mb-2">Processed Withdrawals</span>
                    <ArrowUpRight className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <span className="block text-2xl font-black text-purple-600 dark:text-purple-400 mt-1 tracking-tighter drop-shadow-sm dark:drop-shadow-[0_0_10px_rgba(168,85,247,0.3)]">{formatCurrency(finMetrics.totalProcessedWithdrawals)}</span>
                  <span className="block text-[9px] text-slate-400 dark:text-slate-500 mt-3 font-mono uppercase tracking-widest">Withdrawn driver earnings</span>
                </div>

                {/* Platform Funds */}
                <div className="bg-white dark:bg-[#111111] border border-cyan-200 dark:border-[#00e5ff]/20 rounded-[2rem] p-6 relative overflow-hidden group hover:border-cyan-300 dark:hover:border-[#00e5ff]/30 transition-colors shadow-sm">
                  <div className="absolute right-0 top-0 -translate-y-4 translate-x-4 w-32 h-32 bg-cyan-100 dark:bg-[#00e5ff]/10 rounded-full blur-2xl group-hover:bg-cyan-200 dark:group-hover:bg-[#00e5ff]/20 transition-colors" />
                  <div className="flex justify-between items-start">
                    <span className="block text-[10px] uppercase font-mono font-bold text-cyan-600 dark:text-[#00e5ff]/70 tracking-widest mb-2">Total Platform Funds</span>
                    <Wallet className="w-4 h-4 text-cyan-600 dark:text-[#00e5ff]" />
                  </div>
                  <span className="block text-2xl font-black text-cyan-600 dark:text-[#00e5ff] mt-1 tracking-tighter drop-shadow-sm dark:drop-shadow-[0_0_10px_rgba(0,229,255,0.3)]">{formatCurrency(finMetrics.totalPlatformFunds)}</span>
                  <span className="block text-[9px] text-slate-400 dark:text-slate-500 mt-3 font-mono uppercase tracking-widest">Across {finMetrics.walletCount} wallets</span>
                </div>
              </div>

              {/* Tertiary Metrics */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/5 rounded-2xl p-5 flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-white/[0.05] dark:bg-white/[0.02] transition-colors shadow-sm">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="block text-[9px] uppercase font-mono tracking-widest text-slate-400 dark:text-slate-500 font-bold mb-0.5">Passenger Deposits</span>
                    <span className="block font-black text-slate-800 dark:text-white text-lg">{formatCurrency(finMetrics.totalPassengerDeposits)}</span>
                  </div>
                </div>
                <div className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/5 rounded-2xl p-5 flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-white/[0.05] dark:bg-white/[0.02] transition-colors shadow-sm">
                  <div className="w-10 h-10 rounded-xl bg-[var(--color-neon)]/10 border border-[var(--color-neon)]/20 flex items-center justify-center text-[var(--color-neon)] shrink-0">
                    <ArrowUpRight className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="block text-[9px] uppercase font-mono tracking-widest text-slate-400 dark:text-slate-500 font-bold mb-0.5">Driver Withdrawable Balance</span>
                    <span className="block font-black text-slate-800 dark:text-white text-lg">{formatCurrency(finMetrics.totalDriverEarnings)}</span>
                  </div>
                </div>
                <div className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/5 rounded-2xl p-5 flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-white/[0.05] dark:bg-white/[0.02] transition-colors shadow-sm">
                  <div className="w-10 h-10 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400 shrink-0">
                    <Activity className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="block text-[9px] uppercase font-mono tracking-widest text-slate-400 dark:text-slate-500 font-bold mb-0.5">Referral & Bonus Pools</span>
                    <span className="block font-black text-pink-400 text-lg drop-shadow-[0_0_8px_rgba(244,114,182,0.3)]">{formatCurrency(finMetrics.totalReferralFunds + finMetrics.totalBonusFunds)}</span>
                  </div>
                </div>
              </div>

              {/* Charts */}
              <div className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/5 rounded-[2rem] p-8 shadow-sm dark:shadow-[0_8px_30px_rgba(0,0,0,0.5)] space-y-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-black text-slate-800 dark:text-white text-lg tracking-tight flex items-center gap-2">
                      <Activity className="w-5 h-5 text-[var(--color-neon)]" />
                      Financial Health & Performance Chart
                    </h3>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 font-mono uppercase tracking-widest">Visualize funds movement, gross booking value, and net flows.</p>
                  </div>
                  <div className="flex items-center bg-slate-50 dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/5 p-1 rounded-xl shadow-inner">
                    {(['7d', '30d', '90d', '6m', '12m'] as const).map((t) => (
                      <button key={t} onClick={() => setFinRange(t)}
                        className={`px-4 py-2 rounded-lg text-[10px] font-bold font-mono transition-all cursor-pointer uppercase ${
                          finRange === t
                            ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm border border-slate-200 dark:border-transparent'
                            : 'text-slate-500 border border-transparent hover:text-slate-900 dark:hover:text-slate-300 hover:bg-slate-100 dark:bg-white/5'
                        }`}>{t}</button>
                    ))}
                  </div>
                </div>

                {mounted && (
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <span className="block text-[10px] uppercase font-mono tracking-widest font-bold text-slate-400 px-1">Move of Funds (Deposits vs Withdrawals)</span>
                      <div className="w-full bg-slate-50 dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/5 rounded-[1.5rem] p-6 shadow-inner">
                        <ResponsiveContainer width="100%" height={288} minWidth={1} minHeight={1}>
                          <AreaChart data={finChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <defs>
                              <linearGradient id="finColorDeposits" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#00e5ff" stopOpacity={0.4}/>
                                <stop offset="95%" stopColor="#00e5ff" stopOpacity={0}/>
                              </linearGradient>
                              <linearGradient id="finColorWithdrawals" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#a855f7" stopOpacity={0.4}/>
                                <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff" opacity={0.03} />
                            <XAxis dataKey="month" stroke="#475569" fontSize={11} tickLine={false} axisLine={false} />
                            <YAxis stroke="#475569" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `₦${v / 1000}k`} />
                            <Tooltip contentStyle={{ backgroundColor: '#111111', borderColor: 'rgba(255,255,255,0.05)', borderRadius: '1rem' }} formatter={(value: any) => [formatCurrency(Number(value)), '']} />
                            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '20px', fontWeight: 'bold', color: '#94a3b8' }} iconType="circle" />
                            <Area type="monotone" dataKey="deposits" name="Deposits (In)" stroke="#00e5ff" strokeWidth={3} fillOpacity={1} fill="url(#finColorDeposits)" />
                            <Area type="monotone" dataKey="withdrawals" name="Withdrawals (Out)" stroke="#a855f7" strokeWidth={3} fillOpacity={1} fill="url(#finColorWithdrawals)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <span className="block text-[10px] uppercase font-mono tracking-widest font-bold text-slate-400 px-1">Booking Activity (GBV & Commissions)</span>
                      <div className="w-full bg-slate-50 dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/5 rounded-[1.5rem] p-6 shadow-inner">
                        <ResponsiveContainer width="100%" height={288} minWidth={1} minHeight={1}>
                          <BarChart data={finChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff" opacity={0.03} />
                            <XAxis dataKey="month" stroke="#475569" fontSize={11} tickLine={false} axisLine={false} />
                            <YAxis stroke="#475569" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `₦${v / 1000}k`} />
                            <Tooltip contentStyle={{ backgroundColor: '#111111', borderColor: 'rgba(255,255,255,0.05)', borderRadius: '1rem' }} formatter={(value: any) => [formatCurrency(Number(value)), '']} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '20px', fontWeight: 'bold', color: '#94a3b8' }} iconType="circle" />
                            <Bar dataKey="gbv" name="Gross Booking Value" fill="#4f46e5" radius={[6, 6, 0, 0]} opacity={0.8} />
                            <Bar dataKey="commissions" name="Commissions Net" fill="var(--color-neon)" radius={[6, 6, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* MoM Comparisons */}
              {(finRange === '90d' || finRange === '6m' || finRange === '12m') && (
                <div className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/5 rounded-[2rem] overflow-hidden shadow-sm dark:shadow-[0_8px_30px_rgba(0,0,0,0.5)] space-y-4">
                  <div className="h-16 border-b border-slate-200 dark:border-white/5 px-8 flex items-center bg-slate-50/50 dark:bg-white/[0.01]">
                    <h3 className="font-black text-slate-800 dark:text-white flex items-center gap-2">
                      <Activity className="w-4 h-4 text-[var(--color-neon)]" />
                      MoM Performance Comparisons
                    </h3>
                  </div>
                  <div className="p-8 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {(() => {
                      const calculateDelta = (current: number, previous: number) => {
                        if (previous === 0) return current > 0 ? { percent: '100%', isIncrease: true } : null;
                        const diff = current - previous;
                        const percent = Math.round((diff / previous) * 100);
                        return { percent: `${Math.abs(percent)}%`, isIncrease: diff >= 0 };
                      };
                      const listToRender = finRange === '90d' ? finMonthlyAnalytics.slice(-3) : finMonthlyAnalytics;
                      return listToRender.map((item: any, idx: number) => {
                        const prev = idx > 0 ? listToRender[idx - 1] : null;
                        const depDelta = prev ? calculateDelta(item.deposits, prev.deposits) : null;
                        const witDelta = prev ? calculateDelta(item.withdrawals, prev.withdrawals) : null;
                        const comDelta = prev ? calculateDelta(item.commissions, prev.commissions) : null;
                        const netDelta = prev ? calculateDelta(item.netFlow, prev.netFlow) : null;
                        return (
                          <div key={`${idx}-${item.month}`} className="bg-slate-50 dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/5 rounded-2xl p-6 relative overflow-hidden group hover:border-slate-300 dark:hover:border-slate-200 dark:border-white/10 transition-colors flex flex-col justify-between">
                            <div className="flex items-center justify-between mb-5 border-b border-slate-200 dark:border-white/5 pb-3">
                              <span className="font-black text-slate-800 dark:text-white tracking-wide text-lg">{item.month}</span>
                              <span className="text-[9px] text-slate-400 dark:text-slate-500 font-mono uppercase tracking-widest">Snapshot</span>
                            </div>
                            <div className="space-y-4">
                              <div className="flex justify-between items-center">
                                <span className="text-[10px] text-slate-400 font-mono font-bold uppercase tracking-widest">Inflows (Deposits)</span>
                                <div className="text-right">
                                  <span className="block font-black text-slate-800 dark:text-white text-sm">{formatCurrency(item.deposits)}</span>
                                  {depDelta && <span className={`inline-flex items-center text-[9px] font-bold mt-0.5 ${depDelta.isIncrease ? 'text-[var(--color-neon)]' : 'text-red-400'}`}>{depDelta.isIncrease ? '▲' : '▼'} {depDelta.percent} MoM</span>}
                                </div>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-[10px] text-slate-400 font-mono font-bold uppercase tracking-widest">Outflows (Withdrawals)</span>
                                <div className="text-right">
                                  <span className="block font-black text-slate-800 dark:text-white text-sm">{formatCurrency(item.withdrawals)}</span>
                                  {witDelta && <span className={`inline-flex items-center text-[9px] font-bold mt-0.5 ${witDelta.isIncrease ? 'text-red-400' : 'text-[var(--color-neon)]'}`}>{witDelta.isIncrease ? '▲' : '▼'} {witDelta.percent} MoM</span>}
                                </div>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-[10px] text-slate-400 font-mono font-bold uppercase tracking-widest">Commission (10%)</span>
                                <div className="text-right">
                                  <span className="block font-black text-[var(--color-neon)] text-sm">{formatCurrency(item.commissions)}</span>
                                  {comDelta && <span className={`inline-flex items-center text-[9px] font-bold mt-0.5 ${comDelta.isIncrease ? 'text-[var(--color-neon)]' : 'text-red-400'}`}>{comDelta.isIncrease ? '▲' : '▼'} {comDelta.percent} MoM</span>}
                                </div>
                              </div>
                            </div>
                            <div className="mt-6 pt-4 border-t border-slate-200 dark:border-white/5 flex justify-between items-center bg-slate-100/60 dark:bg-white/[0.02] -mx-6 -mb-6 px-6 py-4 rounded-b-2xl">
                              <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-slate-400 dark:text-slate-500">Net Flow</span>
                              <div className="text-right">
                                <span className={`block text-lg font-black tracking-tighter ${item.netFlow >= 0 ? 'text-[var(--color-neon)] drop-shadow-[0_0_8px_rgba(0,255,128,0.3)]' : 'text-red-400'}`}>{item.netFlow >= 0 ? '+' : ''}{formatCurrency(item.netFlow)}</span>
                                {netDelta && <span className={`inline-flex items-center text-[9px] font-bold mt-0.5 ${netDelta.isIncrease ? 'text-[var(--color-neon)]' : 'text-red-400'}`}>{netDelta.isIncrease ? '▲' : '▼'} {netDelta.percent} MoM</span>}
                              </div>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              )}

              {/* Platform Transactions Ledger */}
              <div className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/5 rounded-[2rem] p-8 shadow-sm dark:shadow-[0_8px_30px_rgba(0,0,0,0.5)] space-y-6">
                <div>
                  <h3 className="font-black text-slate-800 dark:text-white text-lg tracking-tight">Recent Platform Transactions</h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 font-mono uppercase tracking-widest">Real-time ledger logs of cash flows, fee charges, and driver payouts.</p>
                </div>
                <div className="[&_table]:border-slate-200 dark:[&_table]:border-white/5 [&_th]:bg-slate-50 dark:[&_th]:bg-white/[0.02] [&_th]:text-slate-400 [&_th]:border-slate-200 dark:[&_th]:border-white/5 [&_td]:border-slate-200 dark:[&_td]:border-white/5 [&_tr:hover]:bg-slate-50 dark:[&_tr:hover]:bg-white/[0.02]">
                  <DataTable
                    columns={txColumns}
                    data={paginatedTransactions}
                    pageCount={Math.max(1, Math.ceil((txData?.total || paginatedTransactions.length) / 15))}
                    pageIndex={finPageIndex}
                    pageSize={15}
                    onPageIndexChange={setFinPageIndex}
                    loading={txLoading && finLoading}
                    exportFilename="recent-platform-ledger"
                    rowSelection={finRowSelection}
                    onRowSelectionChange={setFinRowSelection}
                    sorting={finSorting}
                    onSortingChange={setFinSorting}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* RENDER DEMAND ANALYTICS TAB */}
      {activeTab === 'demand' && (
        <div className="space-y-8 animate-fade-in">
          {/* Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/5 rounded-[2rem] p-6 relative overflow-hidden group hover:border-slate-300 dark:hover:border-slate-200 dark:border-white/10 transition-colors shadow-sm">
              <div className="absolute right-0 top-0 -translate-y-4 translate-x-4 w-32 h-32 bg-slate-500/5 dark:bg-slate-100 dark:bg-white/5 rounded-full blur-2xl group-hover:bg-slate-500/10 dark:group-hover:bg-slate-200 dark:bg-white/10 transition-colors" />
              <span className="block text-[10px] uppercase font-mono tracking-widest font-bold text-slate-400 dark:text-slate-500 mb-2">Total Search Queries</span>
              <span className="block text-4xl font-black text-slate-800 dark:text-white tracking-tighter drop-shadow-sm">{aggs.totalSearches.toLocaleString()}</span>
              <span className="block text-[9px] text-slate-400 dark:text-slate-500 mt-3 font-mono uppercase tracking-widest">Cumulative route searches in timeline</span>
            </div>
            
            <div className="bg-white dark:bg-[#111111] border border-indigo-500/20 rounded-[2rem] p-6 relative overflow-hidden group shadow-[0_0_30px_rgba(99,102,241,0.05)] hover:shadow-[0_0_40px_rgba(99,102,241,0.1)] transition-all">
              <div className="absolute right-0 top-0 -translate-y-4 translate-x-4 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl group-hover:bg-indigo-500/20 transition-colors" />
              <span className="block text-[10px] uppercase font-mono tracking-widest font-bold text-indigo-400/70 mb-2">Search Growth Velocity</span>
              <span className="block text-4xl font-black text-indigo-400 tracking-tighter drop-shadow-[0_0_10px_rgba(99,102,241,0.3)]">+{aggs.avgSearchGrowth}%</span>
              <span className="block text-[9px] text-slate-400 dark:text-slate-500 mt-3 font-mono uppercase tracking-widest">MoM searches growth trend</span>
            </div>
            
            <div className="bg-white dark:bg-[#111111] border border-rose-500/20 rounded-[2rem] p-6 relative overflow-hidden group hover:border-rose-500/30 transition-colors shadow-sm">
              <div className="absolute right-0 top-0 -translate-y-4 translate-x-4 w-32 h-32 bg-rose-500/10 rounded-full blur-2xl group-hover:bg-rose-500/20 transition-colors" />
              <span className="block text-[10px] uppercase font-mono tracking-widest font-bold text-rose-400/70 mb-2">Routes With No Drivers</span>
              <span className="block text-4xl font-black text-rose-500 tracking-tighter drop-shadow-[0_0_10px_rgba(244,63,94,0.3)]">{routesWithNoDrivers.length}</span>
              <span className="block text-[9px] text-slate-400 dark:text-slate-500 mt-3 font-mono uppercase tracking-widest">High demand routes needing supply</span>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/5 rounded-[2rem] p-8 shadow-sm dark:shadow-[0_8px_30px_rgba(0,0,0,0.5)]">
              <div className="mb-6">
                <h3 className="text-lg font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-2">
                  <Activity className="w-5 h-5 text-indigo-500" />
                  Searches By Day
                </h3>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono uppercase tracking-widest mt-1">Route search inquiries volume trend over the active window.</p>
              </div>
              {mounted && (
                <div className="w-full bg-slate-50 dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/5 rounded-[1.5rem] p-6 shadow-inner">
                  <ResponsiveContainer width="100%" height={288} minWidth={1} minHeight={1}>
                    <AreaChart data={currentData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="searchGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff" opacity={0.03} />
                      <XAxis dataKey="name" stroke="#475569" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis stroke="#475569" fontSize={11} tickLine={false} axisLine={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#111111', borderColor: 'rgba(255,255,255,0.05)', borderRadius: '1rem', color: '#fff' }}
                        itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                      />
                      <Area type="monotone" dataKey="searches" name="Searches" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#searchGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/5 rounded-[2rem] p-8 shadow-sm dark:shadow-[0_8px_30px_rgba(0,0,0,0.5)]">
              <div className="mb-6">
                <h3 className="text-lg font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-purple-500" />
                  Searches By State
                </h3>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono uppercase tracking-widest mt-1">Distribution of search demand across major Nigerian states.</p>
              </div>
              {mounted && (
                <div className="w-full bg-slate-50 dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/5 rounded-[1.5rem] p-6 shadow-inner">
                  <ResponsiveContainer width="100%" height={288} minWidth={1} minHeight={1}>
                    <BarChart data={searchesByState} layout="vertical" margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff" opacity={0.03} horizontal={false} />
                      <XAxis type="number" stroke="#475569" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis dataKey="name" type="category" stroke="#475569" fontSize={11} tickLine={false} axisLine={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#111111', borderColor: 'rgba(255,255,255,0.05)', borderRadius: '1rem', color: '#fff' }}
                        cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                      />
                      <Bar dataKey="value" name="Searches" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>

          {/* Detailed Lists */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Top Searched Routes */}
            <div className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/5 rounded-[2rem] p-8 shadow-sm dark:shadow-[0_8px_30px_rgba(0,0,0,0.5)] space-y-6">
              <div>
                <h3 className="text-lg font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-emerald-500" />
                  Top Searched Routes
                </h3>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono uppercase tracking-widest mt-1">High volume passenger routes requested on the platform.</p>
              </div>
              <div className="overflow-x-auto bg-slate-50 dark:bg-[#0a0a0a] rounded-[1.5rem] border border-slate-200 dark:border-white/5 shadow-inner">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-white/5 text-[10px] uppercase font-black text-slate-400 dark:text-slate-500 tracking-wider">
                      <th className="px-6 py-4">Route</th>
                      <th className="px-6 py-4 text-right">Search Volume</th>
                      <th className="px-6 py-4 text-right">Growth Trend</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-100 dark:divide-white/5 text-xs">
                    {routeRatioData.slice(0, 5).map((route, i) => (
                      <tr key={i} className="hover:bg-white dark:hover:bg-white/[0.05] dark:bg-white/[0.02] transition-colors">
                        <td className="px-6 py-4 font-bold text-slate-800 dark:text-white">
                          {route.from} <span className="text-slate-400 font-normal mx-1">&rarr;</span> {route.to}
                        </td>
                        <td className="px-6 py-4 text-right text-slate-800 dark:text-white font-black">
                          {route.searches.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-right text-emerald-500 font-bold flex items-center justify-end gap-1">
                          <ArrowUpRight className="w-3.5 h-3.5" />
                          +{(10 + i * 2.5).toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Routes With No Drivers */}
            <div className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/5 rounded-[2rem] p-8 shadow-sm dark:shadow-[0_8px_30px_rgba(0,0,0,0.5)] space-y-6">
              <div>
                <h3 className="text-lg font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-rose-500" />
                  Routes With No Drivers
                </h3>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono uppercase tracking-widest mt-1">Passenger demand is active, but zero driver listings exist.</p>
              </div>
              <div className="space-y-4">
                {routesWithNoDrivers.map((route, i) => (
                  <div key={i} className="bg-slate-50 dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/5 hover:border-rose-500/30 transition-colors rounded-[1.5rem] p-5 flex justify-between items-center text-xs shadow-inner group">
                    <div>
                      <span className="font-bold text-slate-800 dark:text-white text-sm">
                        {route.from} <span className="text-slate-400 font-normal mx-1">&rarr;</span> {route.to}
                      </span>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1.5 uppercase font-mono tracking-widest font-bold">
                        {route.searches.toLocaleString()} search queries
                      </p>
                    </div>
                    <span className="bg-rose-500/10 text-rose-500 border border-rose-500/20 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider group-hover:bg-rose-500/20 transition-colors shadow-sm">
                      0 Drivers Active
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RENDER SUPPLY ANALYTICS TAB */}
      {activeTab === 'supply' && (
        <div className="space-y-8 animate-fade-in">
          {/* Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/5 rounded-[2rem] p-6 relative overflow-hidden group hover:border-slate-300 dark:hover:border-slate-200 dark:border-white/10 transition-colors shadow-sm">
              <div className="absolute right-0 top-0 -translate-y-4 translate-x-4 w-32 h-32 bg-slate-500/5 dark:bg-slate-100 dark:bg-white/5 rounded-full blur-2xl group-hover:bg-slate-500/10 dark:group-hover:bg-slate-200 dark:bg-white/10 transition-colors" />
              <span className="block text-[10px] uppercase font-mono tracking-widest font-bold text-slate-400 dark:text-slate-500 mb-2">Trips Published</span>
              <span className="block text-4xl font-black text-slate-800 dark:text-white tracking-tighter drop-shadow-sm">{aggs.totalTripsPublished.toLocaleString()}</span>
              <span className="block text-[9px] text-slate-400 dark:text-slate-500 mt-3 font-mono uppercase tracking-widest">Trip offers created by drivers</span>
            </div>
            
            <div className="bg-white dark:bg-[#111111] border border-indigo-500/20 rounded-[2rem] p-6 relative overflow-hidden group hover:border-indigo-500/30 transition-colors shadow-sm">
              <div className="absolute right-0 top-0 -translate-y-4 translate-x-4 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl group-hover:bg-indigo-500/20 transition-colors" />
              <span className="block text-[10px] uppercase font-mono tracking-widest font-bold text-indigo-400/70 mb-2">Drivers Available</span>
              <span className="block text-4xl font-black text-indigo-400 tracking-tighter drop-shadow-[0_0_10px_rgba(99,102,241,0.3)]">{aggs.avgDriversAvailable}</span>
              <span className="block text-[9px] text-slate-400 dark:text-slate-500 mt-3 font-mono uppercase tracking-widest">Average active drivers online</span>
            </div>
            
            <div className="bg-white dark:bg-[#111111] border border-[var(--color-neon)]/20 rounded-[2rem] p-6 relative overflow-hidden group shadow-[0_0_30px_rgba(0,255,128,0.05)] hover:shadow-[0_0_40px_rgba(0,255,128,0.1)] transition-all">
              <div className="absolute right-0 top-0 -translate-y-4 translate-x-4 w-32 h-32 bg-[var(--color-neon)]/10 rounded-full blur-2xl group-hover:bg-[var(--color-neon)]/20 transition-colors" />
              <span className="block text-[10px] uppercase font-mono tracking-widest font-bold text-[var(--color-neon)]/70 mb-2">Trips Completed</span>
              <span className="block text-4xl font-black text-[var(--color-neon)] tracking-tighter drop-shadow-[0_0_10px_rgba(0,255,128,0.3)]">{aggs.totalTripsCompleted.toLocaleString()}</span>
              <span className="block text-[9px] text-slate-400 dark:text-slate-500 mt-3 font-mono uppercase tracking-widest">Fulfilled passenger bookings</span>
            </div>
            
            <div className="bg-white dark:bg-[#111111] border border-purple-500/20 rounded-[2rem] p-6 relative overflow-hidden group hover:border-purple-500/30 transition-colors shadow-sm">
              <div className="absolute right-0 top-0 -translate-y-4 translate-x-4 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl group-hover:bg-purple-500/20 transition-colors" />
              <span className="block text-[10px] uppercase font-mono tracking-widest font-bold text-purple-400/70 mb-2">Marketplace Escrow Balance</span>
              <span className="block text-4xl font-black text-purple-500 tracking-tighter drop-shadow-[0_0_10px_rgba(168,85,247,0.3)]">{formatCurrency(aggs.latestMarketplaceBalance)}</span>
              <span className="block text-[9px] text-slate-400 dark:text-slate-500 mt-3 font-mono uppercase tracking-widest">Total active deposits + escrow funds</span>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/5 rounded-[2rem] p-8 shadow-sm dark:shadow-[0_8px_30px_rgba(0,0,0,0.5)]">
              <div className="mb-6">
                <h3 className="text-lg font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-2">
                  <Activity className="w-5 h-5 text-[var(--color-neon)]" />
                  Supply Metrics Over Time
                </h3>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono uppercase tracking-widest mt-1">Trips Published vs. Trips Completed daily timeline.</p>
              </div>
              {mounted && (
                <div className="w-full bg-slate-50 dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/5 rounded-[1.5rem] p-6 shadow-inner">
                  <ResponsiveContainer width="100%" height={288} minWidth={1} minHeight={1}>
                    <LineChart data={currentData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff" opacity={0.03} />
                      <XAxis dataKey="name" stroke="#475569" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis stroke="#475569" fontSize={11} tickLine={false} axisLine={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#111111', borderColor: 'rgba(255,255,255,0.05)', borderRadius: '1rem', color: '#fff' }}
                        itemStyle={{ fontWeight: 'bold' }}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '20px', fontWeight: 'bold', color: '#94a3b8' }} iconType="circle" />
                      <Line type="monotone" dataKey="tripsPublished" name="Trips Published" stroke="#8b5cf6" strokeWidth={3} dot={false} activeDot={{ r: 6, fill: '#8b5cf6', strokeWidth: 0 }} />
                      <Line type="monotone" dataKey="tripsCompleted" name="Trips Completed" stroke="var(--color-neon)" strokeWidth={3} dot={false} activeDot={{ r: 6, fill: 'var(--color-neon)', strokeWidth: 0 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/5 rounded-[2rem] p-8 shadow-sm dark:shadow-[0_8px_30px_rgba(0,0,0,0.5)]">
              <div className="mb-6">
                <h3 className="text-lg font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-purple-500" />
                  Marketplace Balance Trend
                </h3>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono uppercase tracking-widest mt-1">Cumulative escrow cash holding on the platform.</p>
              </div>
              {mounted && (
                <div className="w-full bg-slate-50 dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/5 rounded-[1.5rem] p-6 shadow-inner">
                  <ResponsiveContainer width="100%" height={288} minWidth={1} minHeight={1}>
                    <AreaChart data={currentData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="balanceGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#a855f7" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff" opacity={0.03} />
                      <XAxis dataKey="name" stroke="#475569" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis stroke="#475569" fontSize={11} tickLine={false} axisLine={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#111111', borderColor: 'rgba(255,255,255,0.05)', borderRadius: '1rem', color: '#fff' }}
                        formatter={(val: any) => [formatCurrency(Number(val || 0)), 'Escrow Balance']}
                      />
                      <Area type="monotone" dataKey="marketplaceBalance" stroke="#a855f7" strokeWidth={3} fillOpacity={1} fill="url(#balanceGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>

          {/* Marketplace Balance / Ratio analysis Table */}
          <div className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/5 rounded-[2rem] p-8 shadow-sm dark:shadow-[0_8px_30px_rgba(0,0,0,0.5)] space-y-6">
            <div>
              <h3 className="text-lg font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-2">
                <Activity className="w-5 h-5 text-indigo-500" />
                Marketplace Balance: Demand / Supply Ratio
              </h3>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono uppercase tracking-widest mt-1">
                Evaluating structural supply health per route. Ratio = searches / published trips. High ratio indicates under-supply.
              </p>
            </div>
            <div className="overflow-x-auto bg-slate-50 dark:bg-[#0a0a0a] rounded-[1.5rem] border border-slate-200 dark:border-white/5 shadow-inner">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-white/5 text-[10px] uppercase font-black text-slate-400 dark:text-slate-500 tracking-wider">
                    <th className="px-6 py-5">Route</th>
                    <th className="px-6 py-5 text-right">Demand (Searches)</th>
                    <th className="px-6 py-5 text-right">Supply (Trips Published)</th>
                    <th className="px-6 py-5 text-right">Demand/Supply Ratio</th>
                    <th className="px-6 py-5 text-center">Marketplace Health</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-100 dark:divide-white/5 text-xs">
                  {routeRatioData.map((route, i) => (
                    <tr key={i} className="hover:bg-white dark:hover:bg-white/[0.05] dark:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-800 dark:text-white">
                        {route.from} <span className="text-slate-400 font-normal mx-1">&rarr;</span> {route.to}
                      </td>
                      <td className="px-6 py-4 text-right text-slate-600 dark:text-slate-400 font-black">
                        {route.searches.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right text-slate-600 dark:text-slate-400 font-black">
                        {route.trips.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right text-slate-900 dark:text-white font-black text-sm">
                        {route.ratio.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 flex justify-center">
                        <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border shadow-sm ${
                          route.status === 'healthy' 
                            ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                            : route.status === 'warning'
                            ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                            : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                        }`}>
                          {route.status === 'healthy' ? 'Healthy' : route.status === 'warning' ? 'Moderate' : 'Under-Supplied (Critical)'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
