const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

export interface AdminUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  adminRole?: string;
}

export interface AdminSession {
  id: string;
  ipAddress?: string;
  userAgent?: string;
  deviceLabel?: string;
  country?: string;
  city?: string;
  lastSeenAt: string;
  expiresAt: string;
  createdAt: string;
}

export interface DriverVehicle {
  id: string;
  driverProfileId: string;
  make: string;
  model: string;
  year: number;
  color: string;
  plate: string;
  seats: number;
  frontUrl?: string;
  rearUrl?: string;
  sideUrl?: string;
  interiorUrl?: string;
  proofOfOwnershipUrl?: string;
  insuranceCertUrl?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  isActive: boolean;
  reviewNote?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DriverProfile {
  id: string;
  userId: string;
  status: 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  reviewNote?: string;
  submittedAt?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  nin?: string;
  licenseNumber?: string;
  licenseExpiry?: string;
  licenseFrontUrl?: string;
  licenseBackUrl?: string;
  liveSelfieUrl?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleYear?: number;
  vehiclePlate?: string;
  vehicleColor?: string;
  vehicleSeats?: number;
  vehicleFrontUrl?: string;
  vehicleRearUrl?: string;
  vehicleSideUrl?: string;
  vehicleInteriorUrl?: string;
  proofOfOwnershipUrl?: string;
  insuranceCertUrl?: string;
  vehicles?: DriverVehicle[];
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    avatarUrl?: string;
    isActive: boolean;
    role: string;
  };
  auditLogs?: Array<{
    id: string;
    action: string;
    adminName: string;
    adminEmail: string;
    reason?: string;
    createdAt: string;
  }>;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

// Session storage key for non-sensitive admin display info only (no token).
const ADMIN_USER_KEY = 'admin_user';
// Refresh token stored in sessionStorage for silent re-auth
const REFRESH_TOKEN_KEY = 'admin_refresh_token';

// Flag to prevent concurrent refresh calls
let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

class ApiClient {
  /**
   * Returns base headers. The JWT access token is NOT read here — the browser
   * automatically sends the HttpOnly admin_token cookie with every request
   * because we use `credentials: 'include'`.
   */
  private getHeaders(): HeadersInit {
    return {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      // 'include' ensures the browser sends the HttpOnly cookie on every request.
      credentials: 'include',
      headers: {
        ...this.getHeaders(),
        ...options.headers,
      },
    });

    if (!response.ok) {
      // ── Silent token refresh on 401 ──────────────────────────────────────────
      // Before redirecting to login, attempt to silently refresh the access
      // token using the stored refresh token. This prevents users from being
      // logged out mid-session when their 15-min access token expires.
      if (response.status === 401 && typeof window !== 'undefined') {
        const refreshed = await this.attemptSilentRefresh();
        if (refreshed) {
          // Retry the original request with the new cookie
          const retryResponse = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            credentials: 'include',
            headers: {
              ...this.getHeaders(),
              ...options.headers,
            },
          });
          
          if (retryResponse.ok) {
            const retryJson = await retryResponse.json();
            if (retryJson && typeof retryJson === 'object' && 'success' in retryJson && 'data' in retryJson) {
              return retryJson.data as T;
            }
            return retryJson as T;
          } else if (retryResponse.status !== 401) {
            // Retry failed with a non-401 error (e.g. 500, 400).
            // Do NOT log the user out. Just throw the error.
            let errorMsg = 'An error occurred during retry';
            try {
              const errorData = await retryResponse.json();
              errorMsg = errorData.message || errorData.error || errorMsg;
            } catch {}
            throw new ApiError(errorMsg, retryResponse.status);
          }
          // If retryResponse.status === 401, it falls through to logout.
        }
        
        // Refresh failed or retry also failed with 401 — redirect to login
        sessionStorage.removeItem(ADMIN_USER_KEY);
        sessionStorage.removeItem(REFRESH_TOKEN_KEY);
        window.location.href = '/login';
        throw new ApiError('Session expired. Please log in again.', 401);
      }

      let errorMsg = 'An error occurred';
      try {
        const errorData = await response.json();
        errorMsg = errorData.message || errorData.error || errorMsg;
      } catch {}
      throw new ApiError(errorMsg, response.status);
    }

    const json = await response.json();

    // The backend wraps every response in { success: true, data: <payload> }
    // via ResponseTransformInterceptor. Unwrap it transparently.
    if (json && typeof json === 'object' && 'success' in json && 'data' in json) {
      return json.data as T;
    }

    return json as T;
  }

  // ── Silent refresh helper ───────────────────────────────────────────────────
  // Calls the token refresh endpoint once. Returns true if the new access
  // token cookie was successfully set, false otherwise.
  private async attemptSilentRefresh(): Promise<boolean> {
    const storedRefreshToken = this.getRefreshToken();
    if (!storedRefreshToken) return false;

    // Deduplicate concurrent refresh calls
    if (isRefreshing && refreshPromise) return refreshPromise;

    isRefreshing = true;
    refreshPromise = (async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/admin-auth/refresh`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ refreshToken: storedRefreshToken }),
        });

        if (!response.ok) return false;

        const json = await response.json();
        const data = (json?.data ?? json) as { refreshToken?: string };

        // Rotate: store the new refresh token
        if (data?.refreshToken) {
          this.setRefreshToken(data.refreshToken);
        }
        return true;
      } catch {
        return false;
      } finally {
        isRefreshing = false;
        refreshPromise = null;
      }
    })();

    return refreshPromise;
  }

  // ─── Admin Auth ─────────────────────────────────────────────────────────────

  /**
   * Step 1: email + password → returns tempToken + requiresMfa flag
   */
  async adminLogin(email: string, password: string): Promise<{
    requiresMfa: boolean;
    tempToken: string;
    mfaEnrolled: boolean;
  }> {
    return this.request('/admin-auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  /**
   * Step 2: verify TOTP code with tempToken from step 1
   */
  async verifyMfa(tempToken: string, totpCode: string): Promise<{
    accessToken: string;
    refreshToken: string;
    user: AdminUser;
  }> {
    return this.request('/admin-auth/login/verify-mfa', {
      method: 'POST',
      body: JSON.stringify({ tempToken, totpCode }),
    });
  }

  /**
   * Begin MFA enrollment — for admins who have NO authenticator app set up yet.
   * Issues a full session (no TOTP required) so they can reach the Security page
   * to scan the QR code and activate TOTP.
   */
  async beginMfaEnrollment(tempToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
    user: AdminUser;
  }> {
    return this.request('/admin-auth/login/begin-enrollment', {
      method: 'POST',
      body: JSON.stringify({ tempToken }),
    });
  }

  /**
   * Setup MFA — generates secret + QR code URI
   */
  async setupMfa(): Promise<{
    secret: string;
    otpAuthUrl: string;
    qrCodeDataUrl: string;
  }> {
    return this.request('/admin-auth/mfa/setup', { method: 'POST' });
  }

  /**
   * Confirm MFA setup with a TOTP code
   */
  async confirmMfaSetup(totpCode: string): Promise<{ backupCodes: string[] }> {
    return this.request('/admin-auth/mfa/verify-setup', {
      method: 'POST',
      body: JSON.stringify({ totpCode }),
    });
  }

  /**
   * Logout — clears cookie and revokes session
   */
  async adminLogout(refreshToken?: string): Promise<{ message: string }> {
    return this.request('/admin-auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
  }

  /**
   * Get active sessions for the current admin
   */
  async getSessions(): Promise<AdminSession[]> {
    return this.request('/admin-auth/sessions');
  }

  /**
   * Revoke a specific session by ID
   */
  async revokeSession(sessionId: string): Promise<{ message: string }> {
    return this.request(`/admin-auth/sessions/${sessionId}`, { method: 'DELETE' });
  }

  /**
   * Validate invite token (public)
   */
  async validateInvite(token: string): Promise<{
    email: string;
    firstName: string;
    lastName: string;
    adminRole: string;
  }> {
    return this.request(`/admin-auth/invite/${token}`);
  }

  /**
   * Send an invite to a new admin
   */
  async sendAdminInvite(data: { email: string; firstName: string; lastName: string; adminRole: string }): Promise<{ message: string; userId: string }> {
    return this.request('/admin/invite', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Accept an admin invite — set password
   */
  async acceptInvite(token: string, password: string): Promise<{ message: string }> {
    return this.request('/admin-auth/invite/accept', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    });
  }

  /**
   * Re-auth with TOTP before a sensitive action
   */
  async reauth(totpCode: string): Promise<{ reauthed: boolean }> {
    return this.request('/admin-auth/reauth', {
      method: 'POST',
      body: JSON.stringify({ totpCode }),
    });
  }

  /**
   * Get admin audit logs
   */
  async getAuditLogs(params?: {
    page?: number;
    limit?: number;
    adminId?: string;
    action?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<{ data: any[]; total: number }> {
    const qs = new URLSearchParams();
    if (params?.page) qs.set('page', String(params.page));
    if (params?.limit) qs.set('limit', String(params.limit));
    if (params?.adminId) qs.set('adminId', params.adminId);
    if (params?.action) qs.set('action', params.action);
    if (params?.dateFrom) qs.set('dateFrom', params.dateFrom);
    if (params?.dateTo) qs.set('dateTo', params.dateTo);
    return this.request(`/admin/audit-logs?${qs.toString()}`);
  }

  // ─── Session Storage helpers ─────────────────────────────────────────────────

  setRefreshToken(token: string) {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(REFRESH_TOKEN_KEY, token);
    }
  }

  getRefreshToken(): string | null {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem(REFRESH_TOKEN_KEY);
    }
    return null;
  }

  clearRefreshToken() {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(REFRESH_TOKEN_KEY);
    }
  }

  /**
   * Persist only non-sensitive display data (name, email, role) in sessionStorage.
   * The actual JWT token lives exclusively in the HttpOnly cookie — JS cannot read it.
   */
  setAdminUser(user: AdminUser) {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(ADMIN_USER_KEY, JSON.stringify(user));
    }
  }

  logout() {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(ADMIN_USER_KEY);
    }
  }

  getStoredUser(): AdminUser | null {
    if (typeof window !== 'undefined') {
      const userStr = sessionStorage.getItem(ADMIN_USER_KEY);
      if (userStr) {
        try {
          return JSON.parse(userStr);
        } catch {
          return null;
        }
      }
    }
    return null;
  }

  /**
   * A session is considered active when display data is present in sessionStorage.
   * The actual auth state is enforced by the backend — a 401 clears this and redirects.
   */
  isAuthenticated(): boolean {
    if (typeof window !== 'undefined') {
      return !!sessionStorage.getItem(ADMIN_USER_KEY);
    }
    return false;
  }

  // ─── Trips ──────────────────────────────────────────────────────────────────

  async listTrips(params: URLSearchParams): Promise<any> {
    return this.request(`/admin/trips?${params.toString()}`);
  }

  async getTripDetails(id: string): Promise<any> {
    return this.request(`/admin/trips/${id}`);
  }

  async getTripStops(id: string): Promise<any> {
    return this.request(`/admin/trips/${id}/stops`);
  }

  // ─── Admin Profile ───────────────────────────────────────────────────────────

  async getAdminProfile(): Promise<any> {
    return this.request('/admin/profile');
  }

  async updateAdminProfile(data: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    stateOfResidence?: string;
  }): Promise<any> {
    return this.request('/admin/profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async changeAdminPassword(data: {
    currentPassword: string;
    newPassword: string;
  }): Promise<any> {
    return this.request('/admin/profile/password', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // ─── Platform Stats ───────────────────────────────────────────────────────

  async getOverviewStats(): Promise<any> {
    return this.request('/admin/stats/overview');
  }

  // ─── Analytics ────────────────────────────────────────────────────────────

  async getUserActivityAnalytics(): Promise<any> {
    return this.request('/admin/analytics/user-activity');
  }

  // ─── Security ─────────────────────────────────────────────────────────────

  async getLoginLogs(params: {
    page?: number;
    limit?: number;
    role?: string;
    dateRange?: string;
    search?: string;
    userId?: string;
  }): Promise<any> {
    const q = new URLSearchParams();
    if (params.page)      q.set('page',      String(params.page));
    if (params.limit)     q.set('limit',     String(params.limit));
    if (params.role)      q.set('role',      params.role);
    if (params.dateRange) q.set('dateRange', params.dateRange);
    if (params.search)    q.set('search',    params.search);
    if (params.userId)    q.set('userId',    params.userId);
    return this.request(`/admin/security/login-logs?${q.toString()}`);
  }

  async getSecurityMetrics(): Promise<any> {
    return this.request('/admin/security/metrics');
  }

  async getUserLoginActivity(userId: string): Promise<any> {
    return this.request(`/admin/users/${userId}/login-activity`);
  }

  async forceLogoutUser(userId: string, reason?: string): Promise<any> {
    return this.request(`/admin/users/${userId}/force-logout`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  async getDriverTripHistory(
    userId: string,
    params: { page?: number; limit?: number; status?: string } = {},
  ): Promise<any> {
    const q = new URLSearchParams();
    if (params.page) q.set('page', String(params.page));
    if (params.limit) q.set('limit', String(params.limit));
    if (params.status) q.set('status', params.status);
    const qs = q.toString();
    return this.request(`/admin/users/${userId}/trips${qs ? `?${qs}` : ''}`);
  }

  async getPassengerBookingHistory(
    userId: string,
    params: { page?: number; limit?: number; status?: string } = {},
  ): Promise<any> {
    const q = new URLSearchParams();
    if (params.page) q.set('page', String(params.page));
    if (params.limit) q.set('limit', String(params.limit));
    if (params.status) q.set('status', params.status);
    const qs = q.toString();
    return this.request(`/admin/users/${userId}/bookings${qs ? `?${qs}` : ''}`);
  }

  // ─── DISPUTES ────────────────────────────────────────────────────────────────

  async listDisputes(params: { page?: number; limit?: number; status?: string; search?: string } = {}): Promise<any> {
    const q = new URLSearchParams();
    if (params.page)   q.set('page', String(params.page));
    if (params.limit)  q.set('limit', String(params.limit));
    if (params.status) q.set('status', params.status);
    if (params.search) q.set('search', params.search);
    return this.request(`/admin/disputes?${q.toString()}`);
  }

  async getDisputeDetails(id: string): Promise<any> {
    return this.request(`/admin/disputes/${id}`);
  }

  async resolveDispute(id: string, body: { status: string; resolution?: string }): Promise<any> {
    return this.request(`/admin/disputes/${id}/resolve`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

  // ─── RATINGS ─────────────────────────────────────────────────────────────────

  async listRatings(params: { page?: number; limit?: number; minScore?: number; maxScore?: number; search?: string } = {}): Promise<any> {
    const q = new URLSearchParams();
    if (params.page)     q.set('page', String(params.page));
    if (params.limit)    q.set('limit', String(params.limit));
    if (params.minScore !== undefined) q.set('minScore', String(params.minScore));
    if (params.maxScore !== undefined) q.set('maxScore', String(params.maxScore));
    if (params.search)   q.set('search', params.search);
    return this.request(`/admin/ratings?${q.toString()}`);
  }

  async getRatingsForUser(userId: string): Promise<any> {
    return this.request(`/admin/users/${userId}/ratings`);
  }

  // ─── WALLET & TRANSACTIONS ────────────────────────────────────────────────────

  async getUserWallet(userId: string): Promise<any> {
    return this.request(`/admin/users/${userId}/wallet`);
  }

  async getUserWalletTransactions(userId: string, params: { page?: number; limit?: number; reason?: string } = {}): Promise<any> {
    const q = new URLSearchParams();
    if (params.page)   q.set('page', String(params.page));
    if (params.limit)  q.set('limit', String(params.limit));
    if (params.reason) q.set('reason', params.reason);
    return this.request(`/admin/users/${userId}/wallet/transactions?${q.toString()}`);
  }

  async adminWalletAdjustment(userId: string, body: { type: 'CREDIT' | 'DEBIT'; amount: number; note: string }): Promise<any> {
    return this.request(`/admin/users/${userId}/wallet/adjust`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async getPlatformFinancialSummary(): Promise<any> {
    return this.request('/admin/financials/summary');
  }

  // ─── NOTIFICATIONS ────────────────────────────────────────────────────────────

  async broadcastNotification(body: { title: string; body: string; type: string; target: string; userId?: string }): Promise<any> {
    return this.request('/admin/notifications/broadcast', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async getNotificationStats(): Promise<any> {
    return this.request('/admin/notifications/stats');
  }

  async getUserNotifications(userId: string, params: { page?: number; limit?: number } = {}): Promise<any> {
    const q = new URLSearchParams();
    if (params.page)  q.set('page', String(params.page));
    if (params.limit) q.set('limit', String(params.limit));
    return this.request(`/admin/users/${userId}/notifications?${q.toString()}`);
  }

  // ─── USER ENRICHMENT ─────────────────────────────────────────────────────────

  async getUserEnrichedProfile(userId: string): Promise<any> {
    return this.request(`/admin/users/${userId}/profile`);
  }

  // ─── TRUST & SAFETY ──────────────────────────────────────────────────────────

  async getCommunicationAnalytics(period: 'today' | '7d' | '30d' | '90d' = 'today'): Promise<any> {
    return this.request(`/admin/trust-safety/analytics?period=${period}`);
  }

  async listCommunicationInvestigations(params: {
    page?: number; limit?: number; search?: string; dateFrom?: string; dateTo?: string;
  } = {}): Promise<any> {
    const q = new URLSearchParams();
    if (params.page)     q.set('page',     String(params.page));
    if (params.limit)    q.set('limit',    String(params.limit));
    if (params.search)   q.set('search',   params.search);
    if (params.dateFrom) q.set('dateFrom', params.dateFrom);
    if (params.dateTo)   q.set('dateTo',   params.dateTo);
    return this.request(`/admin/trust-safety/investigations?${q.toString()}`);
  }

  async getTripCommunicationTimeline(tripId: string, reason: string): Promise<any> {
    const q = new URLSearchParams({ reason });
    return this.request(`/admin/trust-safety/trips/${tripId}/timeline?${q.toString()}`);
  }

  async listFlaggedConversations(params: {
    page?: number; limit?: number; severity?: string; flagType?: string; status?: string;
  } = {}): Promise<any> {
    const q = new URLSearchParams();
    if (params.page)     q.set('page',     String(params.page));
    if (params.limit)    q.set('limit',    String(params.limit));
    if (params.severity) q.set('severity', params.severity);
    if (params.flagType) q.set('flagType', params.flagType);
    if (params.status)   q.set('status',   params.status);
    return this.request(`/admin/trust-safety/flagged?${q.toString()}`);
  }

  async updateFlagStatus(id: string, status: 'REVIEWED' | 'ESCALATED' | 'DISMISSED', reviewNote?: string): Promise<any> {
    return this.request(`/admin/trust-safety/flagged/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status, reviewNote }),
    });
  }

  async getCommunicationAccessLogs(params: {
    page?: number; limit?: number; adminId?: string; reason?: string; dateFrom?: string;
  } = {}): Promise<any> {
    const q = new URLSearchParams();
    if (params.page)     q.set('page',    String(params.page));
    if (params.limit)    q.set('limit',   String(params.limit));
    if (params.adminId)  q.set('adminId', params.adminId);
    if (params.reason)   q.set('reason',  params.reason);
    if (params.dateFrom) q.set('dateFrom',params.dateFrom);
    return this.request(`/admin/trust-safety/access-logs?${q.toString()}`);
  }

  // ─── SOS ALERTS & FEEDBACK ──────────────────────────────────────────────────

  async listSosAlerts(params: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  } = {}): Promise<any> {
    const q = new URLSearchParams();
    if (params.page) q.set('page', String(params.page));
    if (params.limit) q.set('limit', String(params.limit));
    if (params.status) q.set('status', params.status);
    if (params.search) q.set('search', params.search);
    return this.request(`/admin/sos-alerts?${q.toString()}`);
  }

  async resolveSosAlert(id: string): Promise<any> {
    return this.request(`/admin/sos-alerts/${id}/resolve`, {
      method: 'PATCH',
    });
  }

  async listAppFeedback(params: {
    page?: number;
    limit?: number;
    rating?: number;
    search?: string;
  } = {}): Promise<any> {
    const q = new URLSearchParams();
    if (params.page) q.set('page', String(params.page));
    if (params.limit) q.set('limit', String(params.limit));
    if (params.rating !== undefined) q.set('rating', String(params.rating));
    if (params.search) q.set('search', params.search);
    return this.request(`/admin/app-feedback?${q.toString()}`);
  }

  async getUserEmergencyContacts(userId: string): Promise<any> {
    return this.request(`/admin/users/${userId}/emergency-contacts`);
  }
}

export const api = new ApiClient();
