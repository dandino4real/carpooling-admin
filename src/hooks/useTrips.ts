import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useTripsQuery(
  page: number,
  limit: number,
  filters: { status?: string; type?: string; search?: string },
) {
  return useQuery({
    queryKey: ['trips', page, limit, filters.status, filters.type, filters.search],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (filters.status) params.append('status', filters.status);
      if (filters.type) params.append('type', filters.type);
      if (filters.search?.trim()) params.append('search', filters.search.trim());

      // api.request() already unwraps the { success, data } envelope.
      // res is directly { data: Trip[], total: number }
      const res: any = await api.listTrips(params);
      return res || { data: [], total: 0 };
    },
  });
}

export function useTripDetailsQuery(id: string | null) {
  return useQuery({
    queryKey: ['trips', 'detail', id],
    queryFn: async () => {
      const res: any = await api.getTripDetails(id!);
      return res || null;
    },
    enabled: !!id,
  });
}

export function useAdminProfileQuery() {
  return useQuery({
    queryKey: ['admin-profile'],
    queryFn: async () => {
      const res: any = await api.getAdminProfile();
      return res || null;
    },
  });
}
