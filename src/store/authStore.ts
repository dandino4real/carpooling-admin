import { create } from 'zustand';
import { api, AdminUser } from '@/lib/api';

export type AdminRole = 'SUPER_ADMIN' | 'ADMIN' | 'KYC_ADMIN' | 'FINANCE_ADMIN' | 'SUPPORT_ADMIN' | 'TRUST_SAFETY_ADMIN';

export const ROLE_PERMISSIONS: Record<AdminRole, string[]> = {
  SUPER_ADMIN:         ['*'],
  ADMIN:               ['view:kyc', 'action:kyc', 'view:users', 'action:users', 'view:analytics', 'view:trips', 'view:trust_safety'],
  KYC_ADMIN:           ['view:kyc', 'action:kyc', 'view:users'],
  FINANCE_ADMIN:       ['view:financials', 'view:payouts', 'action:payouts', 'view:withdrawals', 'action:withdrawals', 'view:trips'],
  SUPPORT_ADMIN:       ['view:kyc', 'view:users', 'view:financials', 'view:payouts', 'view:withdrawals', 'view:analytics', 'view:trips', 'view:trust_safety'],
  TRUST_SAFETY_ADMIN:  ['view:users', 'view:trips', 'view:trust_safety', 'action:trust_safety'],
};

interface AuthState {
  admin: AdminUser | null;
  isAuthenticated: boolean;
  login: (user: AdminUser) => void;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
  getCurrentRole: () => AdminRole;
}

export const useAuthStore = create<AuthState>((set, get) => {
  // Restore display data from sessionStorage on mount.
  // The actual JWT lives in an HttpOnly cookie — never exposed to JS.
  const getInitialUser = (): AdminUser | null => {
    if (typeof window === 'undefined') return null;
    return api.getStoredUser();
  };

  const initialUser = getInitialUser();

  const getCurrentRole = (): AdminRole => {
    const admin = get().admin;
    if (!admin) return 'SUPPORT_ADMIN'; // Safe default

    // Use the granular adminRole from the JWT payload (set by backend).
    if (admin.adminRole === 'SUPER_ADMIN') return 'SUPER_ADMIN';
    if (admin.adminRole === 'FINANCE_ADMIN') return 'FINANCE_ADMIN';
    if (admin.adminRole === 'KYC_ADMIN') return 'KYC_ADMIN';
    if (admin.adminRole === 'SUPPORT_ADMIN') return 'SUPPORT_ADMIN';
    if (admin.adminRole === 'ADMIN') return 'ADMIN';

    // Fallback: role field is always 'ADMIN' for all admin accounts.
    // When adminRole is not yet set (e.g. legacy session or first login before
    // the MFA route populated it), treat as SUPER_ADMIN so existing accounts
    // don't lose access.
    if ((admin.role || '').toUpperCase() === 'ADMIN') return 'SUPER_ADMIN';

    return 'SUPPORT_ADMIN';
  };

  return {
    admin: initialUser,
    // isAuthenticated is derived from sessionStorage display data.
    // The backend enforces real auth via the HttpOnly cookie; a 401 will redirect.
    isAuthenticated: !!initialUser,
    getCurrentRole,
    login: (user) => {
      api.setAdminUser(user);
      set({ admin: user, isAuthenticated: true });
    },
    logout: () => {
      api.logout();
      set({ admin: null, isAuthenticated: false });
    },
    hasPermission: (permission: string) => {
      // '*' sentinel means "always visible to all authenticated admins"
      if (permission === '*') return true;
      const role = getCurrentRole();
      const permissions = ROLE_PERMISSIONS[role] || [];
      // SUPER_ADMIN wildcard
      if (permissions.includes('*')) return true;
      return permissions.includes(permission);
    },
  };
});

