import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useUsersQuery(page: number, limit: number, filters: { role?: string; status?: string; search?: string }) {
  return useQuery({
    queryKey: ['users', page, limit, filters.role, filters.status, filters.search],
    queryFn: async () => {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (filters.role) queryParams.append('role', filters.role);
      if (filters.status) queryParams.append('status', filters.status);
      if (filters.search?.trim()) queryParams.append('search', filters.search.trim());

      // api.request() already unwraps the { success, data } envelope.
      // res is directly { data: User[], total: number }
      const res: any = await api.request(`/admin/users?${queryParams.toString()}`);
      return res || { data: [], total: 0 };
    },
  });
}

export function useUserMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, action, reason }: { id: string; action: string; reason?: string }) => {
      return api.request(`/admin/users/${id}/action`, {
        method: 'POST',
        body: JSON.stringify({ action, reason }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}
