import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function usePayoutsQuery(page: number, limit: number, filters: { payoutStatus?: string; search?: string }) {
  return useQuery({
    queryKey: ['payouts', page, limit, filters.payoutStatus, filters.search],
    queryFn: async () => {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (filters.payoutStatus) queryParams.append('payoutStatus', filters.payoutStatus);
      if (filters.search?.trim()) queryParams.append('search', filters.search.trim());

      // api.request() already unwraps the { success, data } envelope.
      // res is directly { data: Booking[], total: number }
      const res: any = await api.request(`/admin/bookings?${queryParams.toString()}`);
      return res || { data: [], total: 0 };
    },
  });
}

export function usePayoutMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, action, reason }: { id: string; action: string; reason?: string }) => {
      return api.request(`/admin/bookings/${id}/payout`, {
        method: 'POST',
        body: JSON.stringify({ action, reason }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payouts'] });
      queryClient.invalidateQueries({ queryKey: ['financials'] });
    },
  });
}
