'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { 
  Bell, 
  Sun, 
  Moon, 
  ShieldAlert, 
  LogOut, 
  Menu, 
  Check, 
  Inbox,
  User,
  Shield,
  ArrowRight
} from 'lucide-react';

interface Notification {
  id: string;
  message: string;
  createdAt: string;
  read: boolean;
}

const INITIAL_NOTIFICATIONS: Notification[] = [
  { id: '1', message: 'New KYC verification request from John Doe', createdAt: '2 mins ago', read: false },
  { id: '2', message: 'Withdrawal request of ₦25,000 pending approval', createdAt: '10 mins ago', read: false },
  { id: '3', message: 'Dispute raised on trip #83910 by passenger', createdAt: '1 hour ago', read: false },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [sessionLoading, setSessionLoading] = useState(true);

  // Notifications State (for showcasing Optimistic Updates)
  const [notifications, setNotifications] = useState<Notification[]>(INITIAL_NOTIFICATIONS);
  const [showNotifications, setShowNotifications] = useState(false);

  // Collapsible sidebar category state — tracks which category titles are collapsed
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

  // Zustand stores
  const { admin, isAuthenticated, login, logout, hasPermission, getCurrentRole } = useAuthStore();
  const sidebarOpen = useUIStore((state) => state.sidebarOpen);
  const toggleSidebar = useUIStore((state) => state.toggleSidebar);
  const theme = useUIStore((state) => state.theme);
  const setTheme = useUIStore((state) => state.setTheme);

  useEffect(() => {
    // If the store already has a user (hydrated from sessionStorage on mount),
    // we're good. Otherwise fall back to a direct sessionStorage check.
    if (!isAuthenticated) {
      const storedUser = api.getStoredUser();
      if (storedUser) {
        login(storedUser);
        setSessionLoading(false);
      } else {
        router.push('/login');
      }
    } else {
      setSessionLoading(false);
    }
  }, [router, isAuthenticated, login]);

  // When the pathname changes, ensure the category that owns the active route is expanded
  useEffect(() => {
    setCollapsedCategories(prev => {
      // We can't reference `categories` here directly (defined later in render),
      // so we derive which titles to keep collapsed from the existing set
      const next = new Set(prev);
      // Always remove — the rendered nav will decide based on active item
      return next;
    });
  }, [pathname]);

  const toggleCategory = (title: string) => {
    setCollapsedCategories(prev => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });
  };

  const handleLogout = async () => {
    try {
      // Do NOT pass the refreshToken — this intentionally triggers revokeAllAdminSessions()
      // on the backend, clearing every active session for this user. Passing the token would
      // only revoke the current device's session, leaving all other sessions alive in the DB.
      await api.adminLogout();
    } catch { /* ignore logout errors */ }
    api.clearRefreshToken();
    logout();
    router.push('/login');
  };

  // Optimistic Read status change
  const markAsRead = (id: string) => {
    // Optimistic Update: Update state instantly in local UI
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    toast.success('Notification marked as read.', { duration: 1500 });

    // Background call simulated (no await, background resolve)
    setTimeout(() => {
      // API call resolved successfully in background
    }, 500);
  };

  const markAllAsRead = () => {
    // Optimistic Update: Update state instantly
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    toast.success('All notifications marked as read.');
  };

  if (sessionLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center">
        <svg className="animate-spin h-8 w-8 text-indigo-500 mb-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <span className="text-slate-500 dark:text-slate-400 text-sm">Validating admin session...</span>
      </div>
    );
  }

  // Define sidebar navigation items and their permission guards
  const categories = [
      {
      title: 'Operations',
      items: [
        {
          label: 'KYC Verifications',
          href: '/dashboard',
          permission: 'view:kyc',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          ),
        },
        {
          label: 'Users & Passengers',
          href: '/dashboard/users',
          permission: 'view:users',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ),
        },
        {
          label: 'Trips & Rides',
          href: '/dashboard/trips',
          permission: 'view:trips',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          ),
        },
        {
          label: 'Disputes',
          href: '/dashboard/disputes',
          permission: 'view:users',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          ),
        },
        {
          label: 'Ratings & Reviews',
          href: '/dashboard/ratings',
          permission: 'view:users',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
          ),
        },
        {
          label: 'App Feedback',
          href: '/dashboard/feedback',
          permission: 'view:users',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
            </svg>
          ),
        },
        {
          label: 'Notifications',
          href: '/dashboard/notifications',
          permission: '*',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          ),
        },
      ]
    },
    {
      title: 'Financials',
      items: [
        {
          label: 'Driver Withdrawals',
          href: '/dashboard/withdrawals',
          permission: 'view:withdrawals',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
        },
        {
          label: 'Trip Payouts',
          href: '/dashboard/payouts',
          permission: 'view:payouts',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          ),
        },
      ]
    },
    {
      title: 'Analytics',
      items: [
        {
          label: 'Financial Flows',
          href: '/dashboard/analytics?tab=financials',
          permission: 'view:financials',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          ),
        },
        {
          label: 'KYC Analytics',
          href: '/dashboard/analytics',
          permission: 'view:analytics',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          ),
        },
        {
          label: 'User Activity',
          href: '/dashboard/analytics/user-activity',
          permission: 'view:analytics',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          ),
        },
      ]
    },
    {
      title: 'Security',
      items: [
        {
          label: 'Security & Sessions',
          href: '/dashboard/security',
          permission: '*',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          ),
        },
        {
          label: 'Audit Logs',
          href: '/dashboard/audit-logs',
          permission: '*',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
          ),
        },
        {
          label: 'Login Activity',
          href: '/dashboard/security/login-activity',
          permission: '*',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
          ),
        },
      ]
    },
    {
      title: 'Trust & Safety',
      items: [
        {
          label: 'Comm. Analytics',
          href: '/dashboard/trust-safety/communication-analytics',
          permission: 'view:trust_safety',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          ),
        },
        {
          label: 'Investigations',
          href: '/dashboard/trust-safety/investigations',
          permission: 'view:trust_safety',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          ),
        },
        {
          label: 'Flagged Convos',
          href: '/dashboard/trust-safety/flagged-conversations',
          permission: 'view:trust_safety',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
            </svg>
          ),
        },
        {
          label: 'Comm. Access Logs',
          href: '/dashboard/trust-safety/access-logs',
          permission: 'view:trust_safety',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          ),
        },
        {
          label: 'SOS Alerts',
          href: '/dashboard/trust-safety/sos-alerts',
          permission: 'view:trust_safety',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          ),
        },
      ]
    }
  ];

  const navItems = categories.flatMap(c => c.items);

  const getPageTitle = () => {
    if (pathname === '/dashboard') return 'KYC Verifications';
    if (pathname === '/dashboard/users') return 'Users & Passengers';
    if (pathname === '/dashboard/withdrawals') return 'Driver Withdrawals';
    if (pathname === '/dashboard/payouts') return 'Trip Payouts';
    if (pathname === '/dashboard/analytics') return 'Platform Analytics';
    if (pathname.startsWith('/dashboard/analytics')) return 'Platform Analytics';
    if (pathname.startsWith('/dashboard/trips')) return 'Trips & Rides Monitor';
    if (pathname === '/dashboard/profile') return 'My Admin Profile';
    if (pathname === '/dashboard/analytics/user-activity') return 'User Activity';
    if (pathname === '/dashboard/security/login-activity') return 'Login Activity';
    if (pathname === '/dashboard/disputes') return 'Disputes Management';
    if (pathname === '/dashboard/ratings') return 'Ratings & Reviews';
    if (pathname === '/dashboard/notifications') return 'Notifications';
    if (pathname === '/dashboard/trust-safety/communication-analytics') return 'Communication Analytics';
    if (pathname === '/dashboard/trust-safety/investigations') return 'Communication Investigations';
    if (pathname === '/dashboard/trust-safety/flagged-conversations') return 'Flagged Conversations';
    if (pathname === '/dashboard/trust-safety/access-logs') return 'Communication Access Logs';
    if (pathname === '/dashboard/trust-safety/sos-alerts') return 'Emergency SOS Alerts';
    if (pathname === '/dashboard/feedback') return 'App Feedback & Suggestions';
    return 'Control Panel';
  };

  const activeRole = getCurrentRole();
  const unreadNotificationsCount = notifications.filter(n => !n.read).length;

  // Route guarding check — find the most-specific nav item for the current path
  const currentPathItem = navItems
    .filter((item) => {
      if (item.href === '/dashboard') return pathname === '/dashboard';
      return pathname === item.href || pathname.startsWith(item.href + '/');
    })
    // Pick the longest (most specific) matching href
    .sort((a, b) => b.href.length - a.href.length)[0];


  const isAuthorized = !currentPathItem || hasPermission(currentPathItem.permission);

  // Return the first page they have permissions to view
  const defaultAuthorizedItem = navItems.find(item => hasPermission(item.permission));

  return (
    <div className="h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 flex text-slate-800 dark:text-slate-100 font-sans transition-colors duration-200">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-40 md:hidden transition-opacity"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar — h-screen + overflow-hidden keeps footer always pinned, nav scrolls internally */}
      <aside className={`fixed md:relative z-50 h-screen border-r border-slate-200 dark:border-slate-900 bg-white dark:bg-slate-900/20 flex flex-col shrink-0 transition-all duration-300 ${sidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full md:translate-x-0 md:w-16'}`}>
        {/* Brand */}
        <div className={`h-16 border-b border-slate-200 dark:border-slate-900 flex items-center overflow-hidden shrink-0 transition-all duration-300 ${sidebarOpen ? 'px-3 gap-2' : 'justify-center'}`}>
          {/* Logo mark */}
          {sidebarOpen && (
            <div className="w-40 h-16 shrink-0 flex items-center justify-start ml-2">
              <img src="/images/logo-light.png" alt="RidePal Logo" className="w-full h-full object-contain scale-[3] origin-center block dark:hidden" />
              <img src="/images/logo-dark.png" alt="RidePal Logo" className="w-full h-full object-contain scale-[3] origin-center hidden dark:block" />
            </div>
          )}

          {/* App name + role removed per request */}
          {sidebarOpen && <div className="flex-1 min-w-0"></div>}

          {/* ── Explicit sidebar toggle button ── */}
          <div className="relative group shrink-0">
            <button
              onClick={toggleSidebar}
              aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
              className={`flex items-center justify-center rounded-lg border transition-all duration-150 cursor-pointer
                bg-slate-100 hover:bg-indigo-50 dark:bg-slate-800/60 dark:hover:bg-indigo-950/40
                border-slate-200 hover:border-indigo-300 dark:border-slate-700 dark:hover:border-indigo-700
                text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400
                shadow-sm hover:shadow-indigo-200/50 dark:hover:shadow-indigo-900/30
                ${sidebarOpen ? 'w-7 h-7' : 'w-8 h-8'}
              `}
            >
              {/* Chevron flips direction based on state */}
              <svg
                className={`w-3.5 h-3.5 transition-transform duration-300 ${sidebarOpen ? 'rotate-0' : 'rotate-180'}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            {/* Tooltip */}
            <div className={`
              pointer-events-none absolute top-1/2 -translate-y-1/2 z-50
              ${sidebarOpen ? 'right-full mr-2' : 'left-full ml-2'}
              opacity-0 group-hover:opacity-100 transition-opacity duration-150 delay-300
            `}>
              <div className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg whitespace-nowrap shadow-lg">
                {sidebarOpen ? '← Collapse sidebar' : 'Expand sidebar →'}
                {/* Tooltip arrow */}
                <div className={`absolute top-1/2 -translate-y-1/2 border-4 border-transparent ${
                  sidebarOpen
                    ? 'right-[-8px] border-l-slate-900 dark:border-l-white'
                    : 'left-[-8px] border-r-slate-900 dark:border-r-white'
                }`} />
              </div>
            </div>
          </div>
        </div>


        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {categories.map((category) => {
            const allowedItems = category.items.filter(item => hasPermission(item.permission));
            if (allowedItems.length === 0) return null;

            // Check if any item in this category is currently active
            const categoryHasActive = allowedItems.some(
              item => pathname === item.href ||
                (item.href !== '/dashboard' && pathname.startsWith(item.href + '/'))
            );

            // Collapsed = user explicitly collapsed it, BUT never collapse the active category
            const isCollapsed = !categoryHasActive && collapsedCategories.has(category.title);

            return (
              <div key={category.title} className="mb-1">
                {sidebarOpen ? (
                  // Clickable category header with chevron
                  <button
                    onClick={() => toggleCategory(category.title)}
                    className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg cursor-pointer group transition-colors select-none ${
                      categoryHasActive
                        ? 'text-indigo-600 dark:text-indigo-400'
                        : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-400 hover:bg-slate-100/60 dark:hover:bg-slate-900/40'
                    }`}
                  >
                    <span className="text-[10px] font-black uppercase tracking-widest">
                      {category.title}
                    </span>
                    <svg
                      className={`w-3 h-3 shrink-0 transition-transform duration-200 ${
                        isCollapsed ? '-rotate-90' : 'rotate-0'
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                ) : (
                  <div className="border-t border-slate-200 dark:border-slate-800/80 my-2 mx-1" />
                )}

                {/* Animated items container */}
                <div
                  className="overflow-hidden transition-all duration-200 ease-in-out"
                  style={{
                    maxHeight: (!sidebarOpen || !isCollapsed) ? '600px' : '0px',
                    opacity: (!sidebarOpen || !isCollapsed) ? 1 : 0,
                  }}
                >
                  <div className="space-y-0.5 pt-0.5">
                    {allowedItems.map((item) => {
                      const isActive = pathname === item.href ||
                        (item.href !== '/dashboard' &&
                          pathname.startsWith(item.href + '/') &&
                          !allowedItems.some(
                            (other) =>
                              other.href !== item.href &&
                              other.href.startsWith(item.href) &&
                              pathname.startsWith(other.href)
                          ));

                      return (
                        <Link
                          key={item.label}
                          href={item.href}
                          onClick={() => {
                            if (window.innerWidth < 768 && sidebarOpen) toggleSidebar();
                          }}
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                            isActive
                              ? 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400 border-l-2 border-indigo-500 pl-2.5'
                              : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900/50'
                          }`}
                          title={item.label}
                        >
                          <span className="shrink-0">{item.icon}</span>
                          {sidebarOpen && <span className="truncate text-[13px]">{item.label}</span>}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </nav>

        {/* ── Sidebar Footer: Profile + Logout ── always pinned, never scrolled away */}
        <div className="shrink-0 border-t border-slate-200 dark:border-slate-900 bg-transparent p-3 space-y-2">

          {/* Profile card */}
          {sidebarOpen ? (
            <Link
              href="/dashboard/profile"
              onClick={() => {
                if (window.innerWidth < 768 && sidebarOpen) toggleSidebar();
              }}
              className="flex items-center gap-3 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20 group transition-all cursor-pointer shadow-sm"
            >
              {/* Avatar */}
              <div className="relative shrink-0">
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-600 border-2 border-indigo-300 dark:border-indigo-700 flex items-center justify-center text-white font-bold uppercase text-sm shadow shadow-indigo-500/20">
                  {admin?.firstName?.[0] || 'A'}{admin?.lastName?.[0] || 'M'}
                </div>
                {/* Online dot */}
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 border-2 border-white dark:border-slate-900 rounded-full" />
              </div>

              {/* Name + role + label */}
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none mb-0.5">My Profile</p>
                <p className="text-xs font-bold text-slate-800 dark:text-white truncate leading-tight">
                  {admin?.firstName} {admin?.lastName}
                </p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono truncate leading-tight mt-0.5">
                  {activeRole.replace('_', ' ')}
                </p>
              </div>

              {/* Arrow affordance */}
              <svg className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 shrink-0 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ) : (
            // Collapsed: avatar icon with tooltip
            <div className="relative group flex justify-center">
              <Link
                href="/dashboard/profile"
                className="relative w-10 h-10 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-600 border-2 border-indigo-300 dark:border-indigo-700 flex items-center justify-center text-white font-bold uppercase text-sm shadow shadow-indigo-500/20 hover:scale-105 transition-transform cursor-pointer"
                title="My Profile"
              >
                {admin?.firstName?.[0] || 'A'}{admin?.lastName?.[0] || 'M'}
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 border-2 border-white dark:border-slate-900 rounded-full" />
              </Link>
              {/* Tooltip — appears to the right */}
              <div className="pointer-events-none absolute top-1/2 -translate-y-1/2 left-full ml-3 opacity-0 group-hover:opacity-100 transition-opacity duration-150 delay-200 z-50 whitespace-nowrap">
                <div className="relative bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg shadow-lg">
                  {admin?.firstName} {admin?.lastName} · My Profile
                  {/* Arrow pointing left */}
                  <div className="absolute top-1/2 -translate-y-1/2 right-full border-4 border-transparent border-r-slate-900 dark:border-r-white" />
                </div>
              </div>
            </div>
          )}

          {/* Logout button */}
          {sidebarOpen ? (
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:bg-red-50 dark:hover:bg-red-950/20 hover:border-red-300 dark:hover:border-red-900/40 text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 text-xs font-bold transition-all cursor-pointer shadow-sm group"
            >
              {/* Exit door icon */}
              <svg className="w-3.5 h-3.5 shrink-0 transition-transform group-hover:-translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Log Out
            </button>
          ) : (
            // Collapsed: icon-only logout with tooltip
            <div className="relative group flex justify-center">
              <button
                onClick={handleLogout}
                className="w-10 h-10 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:bg-red-50 dark:hover:bg-red-950/20 hover:border-red-300 dark:hover:border-red-900/40 text-slate-400 hover:text-red-500 dark:hover:text-red-400 flex items-center justify-center transition-all cursor-pointer shadow-sm"
                aria-label="Log Out"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
              {/* Tooltip — appears to the right */}
              <div className="pointer-events-none absolute top-1/2 -translate-y-1/2 left-full ml-3 opacity-0 group-hover:opacity-100 transition-opacity duration-150 delay-200 z-50 whitespace-nowrap">
                <div className="relative bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg shadow-lg">
                  Log Out
                  {/* Arrow pointing left */}
                  <div className="absolute top-1/2 -translate-y-1/2 right-full border-4 border-transparent border-r-slate-900 dark:border-r-white" />
                </div>
              </div>
            </div>
          )}
        </div>
      </aside>


      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Header */}
        <header className="h-16 border-b border-slate-200 dark:border-slate-900 bg-white dark:bg-slate-900/10 px-8 flex items-center shrink-0 justify-between">
          <div className="flex items-center">
            <button 
              onClick={toggleSidebar} 
              className="md:hidden mr-4 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-bold text-slate-800 dark:text-white tracking-tight">
              {isAuthorized ? getPageTitle() : 'Access Restricted'}
            </h2>
          </div>

          <div className="flex items-center gap-4">
            {/* Optimistic Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/30 hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-500 dark:text-slate-400 cursor-pointer transition-all shadow-sm"
              >
                <Bell className="w-4 h-4" />
                {unreadNotificationsCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-indigo-600 text-white text-[9px] font-bold w-5 h-5 rounded-full flex items-center justify-center animate-bounce border-2 border-white dark:border-slate-950">
                    {unreadNotificationsCount}
                  </span>
                )}
              </button>

              {/* Notification Popover */}
              {showNotifications && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
                  <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-900 rounded-2xl shadow-2xl z-50 overflow-hidden animate-fade-in">
                    <div className="p-4 border-b border-slate-100 dark:border-slate-900 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/20">
                      <span className="font-bold text-slate-800 dark:text-slate-200 text-sm flex items-center gap-1.5">
                        <Bell className="w-4 h-4 text-indigo-500" /> Notifications
                      </span>
                      {unreadNotificationsCount > 0 && (
                        <button
                          onClick={markAllAsRead}
                          className="text-[10px] font-bold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300 font-mono uppercase cursor-pointer"
                        >
                          Mark All Read
                        </button>
                      )}
                    </div>
                    <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-900/50">
                      {notifications.length > 0 ? (
                        notifications.map((item) => (
                          <div 
                            key={item.id} 
                            onClick={() => !item.read && markAsRead(item.id)}
                            className={`p-4 text-xs transition-colors relative group ${
                              !item.read 
                                ? 'bg-indigo-50/20 dark:bg-indigo-950/5 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/10 cursor-pointer' 
                                : 'text-slate-500 dark:text-slate-500'
                            }`}
                          >
                            <p className="font-semibold leading-normal pr-5">{item.message}</p>
                            <span className="block text-[10px] text-slate-400 dark:text-slate-600 mt-2 font-mono">{item.createdAt}</span>
                            {!item.read && (
                              <button 
                                className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full border border-indigo-200 dark:border-indigo-900/40 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Mark as Read"
                              >
                                <Check className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="p-8 text-center text-slate-400 dark:text-slate-600 space-y-2">
                          <Inbox className="w-8 h-8 mx-auto opacity-40" />
                          <p className="text-xs">No notifications yet.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Theme Toggle Button */}
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/30 hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-500 dark:text-slate-400 cursor-pointer transition-all shadow-sm"
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Live Indicator */}
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 px-3.5 py-2 rounded-full shadow-inner">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="hidden sm:inline">Console Live</span>
            </div>
          </div>
        </header>

        {/* Content body with Permission Interceptor */}
        <main className="flex-1 p-8 bg-slate-50 dark:bg-slate-950 transition-colors duration-200">
          {isAuthorized ? (
            children
          ) : (
            <div className="min-h-[450px] bg-white dark:bg-slate-900/10 border border-slate-200 dark:border-slate-900 rounded-2xl flex flex-col items-center justify-center p-8 max-w-2xl mx-auto shadow-2xl text-center space-y-6 animate-fade-in mt-12">
              <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-950/30 border border-red-200 dark:border-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400 shrink-0">
                <ShieldAlert className="w-8 h-8" />
              </div>
              
              <div className="space-y-2.5">
                <h3 className="text-xl font-black text-slate-800 dark:text-white tracking-tight">Security Boundary Intercept</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md leading-relaxed">
                  Your active account role (<span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{activeRole.replace('_', ' ')}</span>) 
                  does not possess read permission (<span className="font-mono text-xs bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-900 px-2 py-0.5 rounded text-red-500 font-bold">{currentPathItem?.permission}</span>) 
                  required to view this segment.
                </p>
              </div>

              {defaultAuthorizedItem ? (
                <Link
                  href={defaultAuthorizedItem.href}
                  className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all cursor-pointer shadow shadow-indigo-500/25"
                >
                  Return to authorized home ({defaultAuthorizedItem.label})
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              ) : (
                <button
                  onClick={handleLogout}
                  className="bg-red-600 hover:bg-red-500 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all cursor-pointer"
                >
                  Exit Session
                </button>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
