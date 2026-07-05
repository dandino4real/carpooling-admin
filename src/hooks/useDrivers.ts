import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useDriversQuery(page: number, limit: number, filters: { status?: string; search?: string }) {
  return useQuery({
    queryKey: ['drivers', page, limit, filters.status, filters.search],
    queryFn: async () => {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (filters.status) queryParams.append('status', filters.status);
      if (filters.search?.trim()) queryParams.append('search', filters.search.trim());

      // api.request() already unwraps the { success, data } envelope.
      // res is directly { data: DriverProfile[], total: number }
      const res: any = await api.request(`/admin/drivers?${queryParams.toString()}`);
      return res || { data: [], total: 0 };
    },
  });
}

export function useDriverDetailsQuery(id: string) {
  return useQuery({
    queryKey: ['drivers', 'detail', id],
    queryFn: async () => {
      const res: any = await api.request(`/admin/drivers/${id}`);
      return res.data || res;
    },
    enabled: !!id,
  });
}

export function useDriverMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, action, reason, adminName, adminEmail }: { 
      id: string; 
      action: string; 
      reason?: string;
      adminName: string;
      adminEmail: string;
    }) => {
      return api.request(`/admin/drivers/${id}/action`, {
        method: 'POST',
        body: JSON.stringify({ action, reason, adminName, adminEmail }),
      });
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      queryClient.invalidateQueries({ queryKey: ['drivers', 'detail', variables.id] });
    },
  });
}

export function useDriverVehiclesQuery(driverId: string) {
  return useQuery({
    queryKey: ['drivers', 'detail', driverId, 'vehicles'],
    queryFn: async () => {
      const res: any = await api.request(`/admin/drivers/${driverId}/vehicles`);
      return res.data || res;
    },
    enabled: !!driverId,
  });
}


export function useUpdateVehicleStatusMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ driverId, vehicleId, status, reason }: { driverId: string; vehicleId: string; status: string; reason?: string }) => {
      return api.request(`/admin/drivers/${driverId}/vehicles/${vehicleId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status, reason }),
      });
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['drivers', 'detail', variables.driverId] });
      queryClient.invalidateQueries({ queryKey: ['drivers', 'detail', variables.driverId, 'vehicles'] });
    },
  });
}

export function useSetActiveVehicleMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ driverId, vehicleId }: { driverId: string; vehicleId: string }) => {
      return api.request(`/admin/drivers/${driverId}/vehicles/${vehicleId}/set-active`, {
        method: 'PATCH',
      });
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['drivers', 'detail', variables.driverId] });
      queryClient.invalidateQueries({ queryKey: ['drivers', 'detail', variables.driverId, 'vehicles'] });
    },
  });
}

