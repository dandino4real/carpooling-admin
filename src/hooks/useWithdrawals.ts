import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useWithdrawalsQuery(page: number, limit: number, filters: { status?: string; search?: string }) {
  return useQuery({
    queryKey: ['withdrawals', page, limit, filters.status, filters.search],
    queryFn: async () => {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (filters.status) queryParams.append('status', filters.status);
      if (filters.search?.trim()) queryParams.append('search', filters.search.trim());

      // api.request() already unwraps the { success, data } envelope.
      // res is directly { data: WithdrawalRequest[], total: number }
      const res: any = await api.request(`/admin/withdrawals?${queryParams.toString()}`);
      return res || { data: [], total: 0 };
    },
  });
}

export function useWithdrawalMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, action, reason }: { id: string; action: string; reason?: string }) => {
      return api.request(`/admin/withdrawals/${id}/action`, {
        method: 'POST',
        body: JSON.stringify({ action, reason }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['withdrawals'] });
      queryClient.invalidateQueries({ queryKey: ['financials'] });
    },
  });
}
