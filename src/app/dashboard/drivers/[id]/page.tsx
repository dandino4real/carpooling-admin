'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { api, DriverProfile, DriverVehicle } from '@/lib/api';

export default function DriverDetailPage() {
  const router = useRouter();
  const params = useParams();
  const driverId = params.id as string;

  const [driver, setDriver] = useState<DriverProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Action state
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);

  // Multi-vehicle management states
  const [showVehicleStatusModal, setShowVehicleStatusModal] = useState<{ status: 'APPROVED' | 'REJECTED' | 'SUSPENDED'; vehicleId: string } | null>(null);
  const [vehicleReason, setVehicleReason] = useState('');

  const handleVehicleStatus = async (status: 'APPROVED' | 'REJECTED' | 'SUSPENDED', vehicleId: string, reason?: string) => {
    try {
      setActionLoading(true);
      setError('');
      await api.request(`/admin/drivers/${driverId}/vehicles/${vehicleId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({
          status,
          reason: reason?.trim() || undefined
        }),
      });
      setShowVehicleStatusModal(null);
      setVehicleReason('');
      await fetchDriverDetails();
    } catch (err: any) {
      console.error(err);
      setError(err.message || `Failed to update vehicle status to ${status.toLowerCase()}.`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSetActiveVehicle = async (vehicleId: string) => {
    try {
      setActionLoading(true);
      setError('');
      await api.request(`/admin/drivers/${driverId}/vehicles/${vehicleId}/set-active`, {
        method: 'PATCH'
      });
      await fetchDriverDetails();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to update active vehicle.');
    } finally {
      setActionLoading(false);
    }
  };

  const [activeVehicleTabId, setActiveVehicleTabId] = useState<string>('');

  useEffect(() => {
    if (driverId) {
      fetchDriverDetails();
    }
  }, [driverId]);

  const fetchDriverDetails = async () => {
    try {
      setLoading(true);
      setError('');
      const res: any = await api.request(`/admin/drivers/${driverId}`);
      const data = res.data || res;
      setDriver(data);
      if (data) {
        const list = data.vehicles || [];
        const active = list.find((v: any) => v.isActive) || list[0];
        if (active) {
          setActiveVehicleTabId(active.id);
        } else if (data.vehicleMake) {
          setActiveVehicleTabId('legacy');
        }
      }
    } catch (err: any) {
      if (err.status === 404) {
        console.warn(`Driver profile ${driverId} not found.`);
        setError('DRIVER_NOT_FOUND');
      } else {
        console.error(err);
        setError(err.message || 'Failed to load driver profile.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action: 'APPROVE' | 'REJECT' | 'SUSPEND', reason?: string) => {
    const adminUser = api.getStoredUser();
    if (!adminUser) {
      setError('Admin session not found. Please log in again.');
      return;
    }

    try {
      setActionLoading(true);
      setError('');
      
      const payload = {
        action,
        reason: reason?.trim() || undefined,
        adminName: `${adminUser.firstName} ${adminUser.lastName}`,
        adminEmail: adminUser.email,
      };

      await api.request(`/admin/drivers/${driverId}/action`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      // Reset modals
      setShowRejectModal(false);
      setShowSuspendModal(false);
      setShowApproveModal(false);
      setRejectionReason('');

      // Refresh data
      await fetchDriverDetails();
    } catch (err: any) {
      console.error(err);
      setError(err.message || `Failed to execute ${action.toLowerCase()} action.`);
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="p-16 flex flex-col items-center justify-center gap-4">
        <svg className="animate-spin h-8 w-8 text-indigo-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <span className="text-slate-500 dark:text-slate-400 text-sm font-semibold">Retrieving profile documents...</span>
      </div>
    );
  }

  if (error === 'DRIVER_NOT_FOUND' || (!driver && !loading && !error)) {
    return (
      <div className="max-w-md mx-auto my-12 text-center space-y-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-sm">
        <div className="mx-auto w-16 h-16 bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 rounded-full flex items-center justify-center shadow-inner">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Driver Profile Not Found</h2>
          <p className="text-slate-550 dark:text-slate-400 text-sm leading-relaxed">
            The driver profile you are trying to view does not exist or has been deleted from the database.
          </p>
        </div>
        <div className="pt-2">
          <button
            onClick={() => router.push('/dashboard')}
            className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 text-slate-900 dark:text-white px-6 py-2.5 rounded-lg text-sm font-semibold cursor-pointer shadow-md transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (error && !driver) {
    return (
      <div className="max-w-md mx-auto my-12 text-center space-y-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-sm">
        <div className="mx-auto w-16 h-16 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center shadow-inner">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Failed to Load Profile</h2>
          <p className="text-slate-550 dark:text-slate-400 text-sm leading-relaxed">
            {error}
          </p>
        </div>
        <div className="pt-2">
          <button
            onClick={() => router.push('/dashboard')}
            className="w-full sm:w-auto bg-white hover:bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-white px-6 py-2.5 rounded-lg text-sm font-semibold cursor-pointer shadow-sm transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!driver) {
    return null;
  }

  const vehiclesList: DriverVehicle[] = driver.vehicles && driver.vehicles.length > 0
    ? driver.vehicles
    : (driver.vehicleMake ? [{
        id: 'legacy',
        driverProfileId: driver.id,
        make: driver.vehicleMake,
        model: driver.vehicleModel || '',
        year: driver.vehicleYear || 0,
        color: driver.vehicleColor || '',
        plate: driver.vehiclePlate || '',
        seats: driver.vehicleSeats || 0,
        frontUrl: driver.vehicleFrontUrl || undefined,
        rearUrl: driver.vehicleRearUrl || undefined,
        sideUrl: driver.vehicleSideUrl || undefined,
        interiorUrl: driver.vehicleInteriorUrl || undefined,
        proofOfOwnershipUrl: driver.proofOfOwnershipUrl || undefined,
        insuranceCertUrl: driver.insuranceCertUrl || undefined,
        status: driver.status === 'APPROVED' ? 'APPROVED' : (driver.status === 'REJECTED' ? 'REJECTED' : 'PENDING'),
        isActive: true,
        createdAt: driver.createdAt,
        updatedAt: driver.updatedAt
      }] : []);

  const currentVehicle = vehiclesList.find(v => v.id === activeVehicleTabId);

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Back & Status Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-900 pb-4">
        <button
          onClick={() => router.push('/dashboard')}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-900 dark:text-white text-sm font-semibold transition-colors cursor-pointer"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>Back to Verification Queue</span>
        </button>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <span className="block text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-wider">Current Status</span>
            <span className={`inline-block px-3 py-1 rounded text-xs font-bold uppercase tracking-wider mt-1 ${
              driver.status === 'SUBMITTED' ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20' :
              driver.status === 'UNDER_REVIEW' ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20' :
              driver.status === 'APPROVED' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20' :
              driver.status === 'REJECTED' ? 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-500/20' :
              'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
            }`}>
              {driver.status === 'SUBMITTED' ? 'Submitted' :
               driver.status === 'UNDER_REVIEW' ? 'Under Review' :
               driver.status === 'APPROVED' ? 'Approved' :
               driver.status === 'REJECTED' ? 'Rejected' :
               driver.status === 'SUSPENDED' ? 'Suspended' : driver.status}
            </span>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2 border-l border-slate-200 dark:border-slate-900 pl-4">
            {driver.status !== 'APPROVED' && (
              <button
                onClick={() => setShowApproveModal(true)}
                className="bg-emerald-600 hover:bg-emerald-500 text-slate-900 dark:text-white font-semibold text-xs py-2.5 px-4 rounded-lg shadow cursor-pointer transition-colors"
              >
                Approve Driver
              </button>
            )}
            {driver.status !== 'REJECTED' && (
              <button
                onClick={() => setShowRejectModal(true)}
                className="bg-white hover:bg-red-50 dark:bg-slate-900 dark:hover:bg-red-950/20 border border-slate-200 dark:border-slate-800 hover:border-red-200 dark:hover:border-red-900/30 text-red-600 dark:text-red-400 font-semibold text-xs py-2.5 px-4 rounded-lg cursor-pointer transition-all shadow-sm"
              >
                Reject KYC
              </button>
            )}
            {driver.status !== 'SUSPENDED' && (
              <button
                onClick={() => setShowSuspendModal(true)}
                className="bg-white hover:bg-red-50 dark:bg-slate-900 dark:hover:bg-red-950/20 border border-slate-200 dark:border-slate-800 hover:border-red-200 dark:hover:border-red-900/30 text-slate-700 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 font-semibold text-xs py-2.5 px-4 rounded-lg cursor-pointer transition-all shadow-sm"
              >
                Suspend User
              </button>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-955/40 border border-red-200 dark:border-red-800/50 text-red-700 dark:text-red-200 text-sm rounded-xl p-4 flex items-center gap-3 shadow-sm">
          <svg className="w-5 h-5 text-red-500 dark:text-red-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* Grid Side-by-Side Panel */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        
        {/* LEFT COLUMN: Identity Documents */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900/10 border border-slate-200 dark:border-slate-900 rounded-xl p-6 space-y-6 shadow-sm dark:shadow-md">
            <h3 className="text-base font-bold text-slate-800 dark:text-white tracking-tight flex items-center gap-2 pb-3 border-b border-slate-200 dark:border-slate-900">
              <svg className="w-5 h-5 text-indigo-500 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span>Identity Verification Documents</span>
            </h3>

            {/* General Info */}
            <div className="grid grid-cols-2 gap-4 text-sm bg-slate-50 dark:bg-slate-950/50 p-4 rounded-lg border border-slate-200 dark:border-slate-900/60 shadow-inner">
              <div>
                <span className="block text-slate-450 dark:text-slate-500 text-xs font-semibold">National ID (NIN)</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 mt-1 block">{driver.nin || 'N/A'}</span>
              </div>
              <div>
                <span className="block text-slate-400 dark:text-slate-500 text-xs font-semibold">Driver License Number</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 mt-1 block">{driver.licenseNumber || 'N/A'}</span>
              </div>
              <div className="col-span-2 border-t border-slate-200 dark:border-slate-900/60 pt-3">
                <span className="block text-slate-400 dark:text-slate-500 text-xs font-semibold">License Expiry Date</span>
                <span className={`font-bold mt-1 block ${
                  driver.licenseExpiry && new Date(driver.licenseExpiry) < new Date() ? 'text-red-600 dark:text-red-400' : 'text-slate-800 dark:text-slate-200'
                }`}>
                  {driver.licenseExpiry ? new Date(driver.licenseExpiry).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'N/A'}
                  {driver.licenseExpiry && new Date(driver.licenseExpiry) < new Date() && ' (EXPIRED)'}
                </span>
              </div>
            </div>

            {/* Selfie vs License Side-by-Side Check */}
            <div className="space-y-3">
              <span className="block text-xs font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">Face Match Verification</span>
              <div className="grid grid-cols-2 gap-4">
                {/* Selfie */}
                <div className="space-y-1.5">
                  <span className="block text-slate-500 dark:text-slate-500 text-xs font-medium">Live Selfie Capture</span>
                  <div className="aspect-[4/3] rounded-lg bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-900 overflow-hidden relative group shadow-sm">
                    {driver.liveSelfieUrl ? (
                      <a href={driver.liveSelfieUrl} target="_blank" rel="noopener noreferrer">
                        <img src={driver.liveSelfieUrl} alt="Live Selfie" className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300" />
                      </a>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400 dark:text-slate-600 text-xs">Missing Selfie Photo</div>
                    )}
                  </div>
                </div>

                {/* License Front */}
                <div className="space-y-1.5">
                  <span className="block text-slate-500 dark:text-slate-550 text-xs font-medium">License Front Document</span>
                  <div className="aspect-[4/3] rounded-lg bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-900 overflow-hidden relative group shadow-sm">
                    {driver.licenseFrontUrl ? (
                      <a href={driver.licenseFrontUrl} target="_blank" rel="noopener noreferrer">
                        <img src={driver.licenseFrontUrl} alt="License Front" className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300" />
                      </a>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400 dark:text-slate-600 text-xs">Missing License Front</div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* License Back */}
            {driver.licenseBackUrl && (
              <div className="space-y-2">
                <span className="block text-slate-500 dark:text-slate-550 text-xs font-medium">License Back Document</span>
                <div className="max-w-md aspect-[16/10] rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-900 overflow-hidden group shadow-sm">
                  <a href={driver.licenseBackUrl} target="_blank" rel="noopener noreferrer">
                    <img src={driver.licenseBackUrl} alt="License Back" className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300" />
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Vehicle Specs & Photos */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900/10 border border-slate-200 dark:border-slate-900 rounded-xl p-6 space-y-6 shadow-sm dark:shadow-md">
            <h3 className="text-base font-bold text-slate-800 dark:text-white tracking-tight flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-900">
              <span className="flex items-center gap-2">
                <svg className="w-5 h-5 text-indigo-500 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
                <span>Vehicle Specifications & Photos</span>
              </span>
            </h3>

            {/* Vehicles Tab Bar */}
            {vehiclesList.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 bg-slate-50 dark:bg-slate-950/40 p-2 rounded-lg border border-slate-200 dark:border-slate-900/60">
                {vehiclesList.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => setActiveVehicleTabId(v.id)}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      activeVehicleTabId === v.id
                        ? 'bg-indigo-600 text-slate-900 dark:text-white shadow'
                        : 'bg-white hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <span>{v.make} {v.model}</span>
                    {v.isActive && (
                      <span className="bg-emerald-500 text-slate-900 dark:text-white px-1.5 py-0.5 rounded-full text-[8px] uppercase tracking-wider font-extrabold scale-90">Active</span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {!currentVehicle ? (
              <div className="text-center text-slate-500 dark:text-slate-400 py-12 text-sm font-medium">
                No vehicles registered.
              </div>
            ) : (
              <div className="space-y-6">
                {/* Status and Active Toggle Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-950/50 p-4 rounded-lg border border-slate-200 dark:border-slate-900/65 shadow-inner">
                  <div>
                    <span className="block text-slate-450 dark:text-slate-500 text-[10px] font-bold uppercase tracking-wider">Vehicle Status</span>
                    <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase mt-1 ${
                      currentVehicle.status === 'APPROVED' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20' :
                      currentVehicle.status === 'PENDING' ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20' :
                      currentVehicle.status === 'REJECTED' ? 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-500/20' :
                      'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
                    }`}>
                      {currentVehicle.status}
                    </span>
                    {currentVehicle.reviewNote && (
                      <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-1.5 italic">
                        Note: "{currentVehicle.reviewNote}"
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {!currentVehicle.isActive && (
                      <button
                        onClick={() => handleSetActiveVehicle(currentVehicle.id)}
                        className="bg-indigo-600 hover:bg-indigo-500 text-slate-900 dark:text-white font-bold text-[11px] py-1.5 px-3 rounded-lg shadow-md cursor-pointer transition-all flex items-center gap-1"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Set as Active</span>
                      </button>
                    )}
                    {currentVehicle.isActive && (
                      <div className="bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/20 rounded-lg py-1.5 px-3 text-[11px] font-extrabold flex items-center gap-1">
                        <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Active Vehicle</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Specs Grid */}
                <div className="grid grid-cols-3 gap-4 text-sm bg-slate-50 dark:bg-slate-950/50 p-4 rounded-lg border border-slate-200 dark:border-slate-900/60 shadow-inner">
                  <div>
                    <span className="block text-slate-400 dark:text-slate-500 text-xs font-semibold">Make / Model</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 mt-1 block">{currentVehicle.make} {currentVehicle.model}</span>
                  </div>
                  <div>
                    <span className="block text-slate-400 dark:text-slate-500 text-xs font-semibold">Year / Color</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 mt-1 block">{currentVehicle.year} / {currentVehicle.color}</span>
                  </div>
                  <div>
                    <span className="block text-slate-400 dark:text-slate-500 text-xs font-semibold">Plate / Seats</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 mt-1 block">{currentVehicle.plate} ({currentVehicle.seats} seats)</span>
                  </div>
                </div>

                {/* Photos */}
                <div className="space-y-3">
                  <span className="block text-xs font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">Vehicle Images</span>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <span className="block text-slate-500 dark:text-slate-500 text-[11px] font-medium">Front View</span>
                      <div className="aspect-[4/3] rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-900 overflow-hidden shadow-sm flex items-center justify-center">
                        {currentVehicle.frontUrl ? (
                          <a href={currentVehicle.frontUrl} target="_blank" rel="noopener noreferrer" className="w-full h-full">
                            <img src={currentVehicle.frontUrl} alt="Vehicle Front" className="w-full h-full object-cover" />
                          </a>
                        ) : (
                          <div className="text-slate-400 dark:text-slate-600 text-[10px] font-medium">No Front Photo</div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="block text-slate-500 dark:text-slate-500 text-[11px] font-medium">Rear View</span>
                      <div className="aspect-[4/3] rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-900 overflow-hidden shadow-sm flex items-center justify-center">
                        {currentVehicle.rearUrl ? (
                          <a href={currentVehicle.rearUrl} target="_blank" rel="noopener noreferrer" className="w-full h-full">
                            <img src={currentVehicle.rearUrl} alt="Vehicle Rear" className="w-full h-full object-cover" />
                          </a>
                        ) : (
                          <div className="text-slate-400 dark:text-slate-655 text-[10px] font-medium">No Rear Photo</div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="block text-slate-500 dark:text-slate-500 text-[11px] font-medium">Side View</span>
                      <div className="aspect-[4/3] rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-900 overflow-hidden shadow-sm flex items-center justify-center">
                        {currentVehicle.sideUrl ? (
                          <a href={currentVehicle.sideUrl} target="_blank" rel="noopener noreferrer" className="w-full h-full">
                            <img src={currentVehicle.sideUrl} alt="Vehicle Side" className="w-full h-full object-cover" />
                          </a>
                        ) : (
                          <div className="text-slate-400 dark:text-slate-600 text-[10px] font-medium">No Side Photo</div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="block text-slate-500 dark:text-slate-500 text-[11px] font-medium">Interior View</span>
                      <div className="aspect-[4/3] rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-900 overflow-hidden shadow-sm flex items-center justify-center">
                        {currentVehicle.interiorUrl ? (
                          <a href={currentVehicle.interiorUrl} target="_blank" rel="noopener noreferrer" className="w-full h-full">
                            <img src={currentVehicle.interiorUrl} alt="Vehicle Interior" className="w-full h-full object-cover" />
                          </a>
                        ) : (
                          <div className="text-slate-400 dark:text-slate-600 text-[10px] font-medium">No Interior Photo</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Documents */}
                <div className="space-y-3 pt-2">
                  <span className="block text-xs font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">Vehicle Legal Ownership Docs</span>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <span className="block text-slate-500 dark:text-slate-500 text-[11px] font-medium">Proof of Ownership</span>
                      <div className="aspect-[4/3] rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-900 overflow-hidden shadow-sm flex items-center justify-center">
                        {currentVehicle.proofOfOwnershipUrl ? (
                          <a href={currentVehicle.proofOfOwnershipUrl} target="_blank" rel="noopener noreferrer" className="w-full h-full">
                            <img src={currentVehicle.proofOfOwnershipUrl} alt="Proof of Ownership" className="w-full h-full object-cover" />
                          </a>
                        ) : (
                          <div className="text-slate-400 dark:text-slate-600 text-[10px] font-medium">No Proof Document</div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="block text-slate-500 dark:text-slate-500 text-[11px] font-medium">Insurance Certificate</span>
                      <div className="aspect-[4/3] rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-900 overflow-hidden shadow-sm flex items-center justify-center">
                        {currentVehicle.insuranceCertUrl ? (
                          <a href={currentVehicle.insuranceCertUrl} target="_blank" rel="noopener noreferrer" className="w-full h-full">
                            <img src={currentVehicle.insuranceCertUrl} alt="Insurance Certificate" className="w-full h-full object-cover" />
                          </a>
                        ) : (
                          <div className="text-slate-400 dark:text-slate-600 text-[10px] font-medium">No Insurance Certificate</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Admin Status Actions for Vehicle */}
                {currentVehicle.id !== 'legacy' && (
                  <div className="flex items-center gap-2 border-t border-slate-200 dark:border-slate-800 pt-4 mt-4 justify-end">
                    <span className="text-xs text-slate-500 dark:text-slate-450 font-semibold mr-auto">Verify Vehicle:</span>
                    {currentVehicle.status !== 'APPROVED' && (
                      <button
                        onClick={() => setShowVehicleStatusModal({ status: 'APPROVED', vehicleId: currentVehicle.id })}
                        className="bg-emerald-600 hover:bg-emerald-500 text-slate-900 dark:text-white font-bold text-[11px] py-1.5 px-3 rounded-lg shadow cursor-pointer transition-colors"
                      >
                        Approve Vehicle
                      </button>
                    )}
                    {currentVehicle.status !== 'REJECTED' && (
                      <button
                        onClick={() => setShowVehicleStatusModal({ status: 'REJECTED', vehicleId: currentVehicle.id })}
                        className="bg-white hover:bg-red-50 dark:bg-slate-900 dark:hover:bg-red-955/20 border border-slate-200 dark:border-slate-800 text-red-600 dark:text-red-400 font-bold text-[11px] py-1.5 px-3 rounded-lg cursor-pointer transition-all shadow-sm"
                      >
                        Reject Vehicle
                      </button>
                    )}
                    {currentVehicle.status !== 'SUSPENDED' && (
                      <button
                        onClick={() => setShowVehicleStatusModal({ status: 'SUSPENDED', vehicleId: currentVehicle.id })}
                        className="bg-white hover:bg-red-50 dark:bg-slate-900 dark:hover:bg-red-955/20 border border-slate-200 dark:border-slate-800 text-slate-700 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 font-bold text-[11px] py-1.5 px-3 rounded-lg cursor-pointer transition-all shadow-sm"
                      >
                        Suspend Vehicle
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Historical Audit Logs */}
      <div className="bg-white dark:bg-slate-900/10 border border-slate-200 dark:border-slate-900 rounded-xl p-6 shadow-sm dark:shadow-md">
        <h3 className="text-base font-bold text-slate-800 dark:text-white tracking-tight flex items-center gap-2 pb-3 border-b border-slate-200 dark:border-slate-900">
          <svg className="w-5 h-5 text-indigo-500 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Audit Log Trail</span>
        </h3>

        {driver.auditLogs && driver.auditLogs.length > 0 ? (
          <div className="mt-4 space-y-4">
            {driver.auditLogs.map((log) => (
              <div key={log.id} className="bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-900 rounded-lg p-4 text-sm flex flex-col md:flex-row md:items-start justify-between gap-4 shadow-sm">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                      log.action === 'APPROVE' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20' :
                      log.action === 'REJECT' ? 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-500/20' :
                      'bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-500/20'
                    }`}>
                      {log.action}
                    </span>
                    <span className="font-bold text-slate-800 dark:text-slate-700 dark:text-slate-300">{log.adminName}</span>
                    <span className="text-slate-450 dark:text-slate-500 text-xs">({log.adminEmail})</span>
                  </div>
                  {log.reason && (
                    <p className="text-slate-600 dark:text-slate-400 mt-2 italic text-xs leading-relaxed">"{log.reason}"</p>
                  )}
                </div>
                <div className="text-slate-500 dark:text-slate-500 text-xs font-mono shrink-0 self-end md:self-start">
                  {formatDate(log.createdAt)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-slate-500 dark:text-slate-500 text-xs p-6 font-medium">No historical actions logged for this driver profile.</div>
        )}
      </div>

      {/* --- APPROVE CONFIRMATION MODAL --- */}
      {showApproveModal && (
        <div className="fixed inset-0 bg-slate-900/80 dark:bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-md w-full p-6 space-y-6 shadow-2xl animate-fade-in">
            <div>
              <h4 className="text-lg font-bold text-slate-900 dark:text-white">Approve Driver?</h4>
              <p className="text-slate-550 dark:text-slate-400 text-xs mt-2 leading-relaxed">
                This will activate the driver's role. They will receive an email verification confirmation and be allowed to publish carpooling rides.
              </p>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowApproveModal(false)}
                disabled={actionLoading}
                className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-950 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-900 dark:text-white px-4 py-2 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-800 cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleAction('APPROVE')}
                disabled={actionLoading}
                className="bg-emerald-600 hover:bg-emerald-500 text-slate-900 dark:text-white px-4 py-2 text-xs font-bold rounded-lg cursor-pointer transition-colors shadow-md shadow-emerald-500/20"
              >
                {actionLoading ? 'Approving...' : 'Confirm Approve'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- REJECT MODAL --- */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-slate-900/80 dark:bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-fade-in">
            <div>
              <h4 className="text-lg font-bold text-slate-900 dark:text-white">Reject Driver Profile</h4>
              <p className="text-slate-550 dark:text-slate-400 text-xs mt-1 leading-relaxed">
                Please provide a rejection note explaining why the verification failed. The driver will see this reason and can re-submit documents.
              </p>
            </div>
            <div>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. The driver license front photo is blurry. Please re-capture in better lighting."
                className="w-full h-28 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 rounded-lg p-3 text-sm text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none resize-none shadow-inner"
                disabled={actionLoading}
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectionReason('');
                }}
                disabled={actionLoading}
                className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-900 dark:text-white px-4 py-2 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-800 cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleAction('REJECT', rejectionReason)}
                disabled={actionLoading || !rejectionReason.trim()}
                className="bg-red-600 hover:bg-red-550 active:bg-red-700 disabled:opacity-50 text-slate-900 dark:text-white px-4 py-2 text-xs font-bold rounded-lg cursor-pointer transition-colors shadow-md shadow-red-500/20"
              >
                {actionLoading ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- SUSPEND MODAL --- */}
      {showSuspendModal && (
        <div className="fixed inset-0 bg-slate-900/80 dark:bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-fade-in">
            <div>
              <h4 className="text-lg font-bold text-red-600 dark:text-red-500">Suspend Driver Account</h4>
              <p className="text-slate-550 dark:text-slate-400 text-xs mt-1 leading-relaxed">
                This will block the driver's active state. They will be immediately logged out and blocked from logging in.
              </p>
            </div>
            <div>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Reason for suspension (e.g. Safety complaints from passengers)..."
                className="w-full h-24 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 rounded-lg p-3 text-sm text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none resize-none shadow-inner"
                disabled={actionLoading}
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowSuspendModal(false);
                  setRejectionReason('');
                }}
                disabled={actionLoading}
                className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-900 dark:text-white px-4 py-2 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-800 cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleAction('SUSPEND', rejectionReason)}
                disabled={actionLoading || !rejectionReason.trim()}
                className="bg-red-600 hover:bg-red-550 active:bg-red-700 disabled:opacity-50 text-slate-900 dark:text-white px-4 py-2 text-xs font-bold rounded-lg cursor-pointer transition-colors shadow-md shadow-red-500/20"
              >
                {actionLoading ? 'Suspending...' : 'Confirm Suspension'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* --- VEHICLE REVIEW STATUS MODAL --- */}
      {showVehicleStatusModal && (
        <div className="fixed inset-0 bg-slate-900/80 dark:bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-fade-in animate-duration-200">
            <div>
              <h4 className="text-lg font-bold text-slate-900 dark:text-white">
                {showVehicleStatusModal.status === 'APPROVED' ? 'Approve Vehicle' :
                 showVehicleStatusModal.status === 'REJECTED' ? 'Reject Vehicle' : 'Suspend Vehicle'}
              </h4>
              <p className="text-slate-550 dark:text-slate-400 text-xs mt-1 leading-relaxed">
                {showVehicleStatusModal.status === 'APPROVED'
                  ? 'Confirm that this vehicle matches the submitted proof of ownership and insurance certificates. The driver will be able to select it as their active ride.'
                  : 'Please specify the reason for this action. The driver will be notified of this review note.'}
              </p>
            </div>
            {showVehicleStatusModal.status !== 'APPROVED' && (
              <div>
                <textarea
                  value={vehicleReason}
                  onChange={(e) => setVehicleReason(e.target.value)}
                  placeholder="e.g. Blurry photo of insurance document. Please upload a clear image."
                  className="w-full h-24 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 rounded-lg p-3 text-sm text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none resize-none shadow-inner"
                  disabled={actionLoading}
                />
              </div>
            )}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowVehicleStatusModal(null);
                  setVehicleReason('');
                }}
                disabled={actionLoading}
                className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-900 dark:text-white px-4 py-2 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-800 cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleVehicleStatus(showVehicleStatusModal.status, showVehicleStatusModal.vehicleId, vehicleReason)}
                disabled={actionLoading || (showVehicleStatusModal.status !== 'APPROVED' && !vehicleReason.trim())}
                className={`px-4 py-2 text-xs font-bold rounded-lg cursor-pointer transition-colors shadow-md ${
                  showVehicleStatusModal.status === 'APPROVED'
                    ? 'bg-emerald-600 hover:bg-emerald-505 text-slate-900 dark:text-white shadow-emerald-500/20'
                    : 'bg-red-600 hover:bg-red-550 disabled:opacity-50 text-slate-900 dark:text-white shadow-red-500/20'
                }`}
              >
                {actionLoading ? 'Updating...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}


    </div>
  );
}
