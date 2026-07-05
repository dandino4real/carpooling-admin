import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useAnalyticsQuery() {
  return useQuery({
    queryKey: ['analytics'],
    queryFn: async () => {
      const res: any = await api.request('/admin/analytics');
      return res.data || res;
    },
  });
}
