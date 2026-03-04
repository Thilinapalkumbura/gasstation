'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { ServiceJobForm } from '@/components/vehicle-services/ServiceJobForm';
import { ServiceJobsTable } from '@/components/vehicle-services/ServiceJobsTable';
import { vehicleServicesApi, ServiceJob } from '@/lib/api/vehicle-services.api';

export default function WorkerVehicleServicesPage() {
  const { user } = useAuthStore();
  const stationId = user?.stationId ?? '';
  const [jobs, setJobs] = useState<ServiceJob[]>([]);
  const [loading, setLoading] = useState(true);

  const today = new Date().toISOString().slice(0, 10);

  const loadJobs = useCallback(async () => {
    if (!stationId) return;
    setLoading(true);
    try {
      const res = await vehicleServicesApi.getJobs({ stationId, from: today, to: today });
      setJobs(res.items);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [stationId, today]);

  useEffect(() => { loadJobs(); }, [loadJobs]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold">Vehicle Services</h1>
        <p className="text-sm text-gray-500 mt-0.5">Record a service job</p>
      </div>
      <div className="bg-white rounded-xl border p-5">
        <ServiceJobForm stationId={stationId} onSuccess={loadJobs} />
      </div>
      <div className="bg-white rounded-xl border">
        <div className="px-4 py-3 border-b">
          <h2 className="font-medium text-sm">Today&apos;s Jobs</h2>
        </div>
        <ServiceJobsTable jobs={jobs} loading={loading} />
      </div>
      </div>
    </div>
  );
}
