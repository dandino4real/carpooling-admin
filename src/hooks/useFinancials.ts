import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useFinancialsQuery() {
  return useQuery({
    queryKey: ['financials'],
    queryFn: async () => {
      const res: any = await api.request('/admin/financials/analytics');
      return res.data || res;
    },
  });
}

export function usePlatformTransactionsQuery(page = 1, limit = 15) {
  return useQuery({
    queryKey: ['platform-transactions', page, limit],
    queryFn: async () => {
      const res: any = await api.request(`/admin/financials/transactions?page=${page}&limit=${limit}`);
      // api.request already unwraps the {success, data} envelope.
      // The backend returns { data: [...], total: N } so we return as-is.
      return res;
    },
  });
}
