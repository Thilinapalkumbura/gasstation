'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { CarWashJobForm } from '@/components/car-wash/CarWashJobForm';
import { CarWashJobsTable } from '@/components/car-wash/CarWashJobsTable';
import { carWashApi, CarWashJob } from '@/lib/api/car-wash.api';

export default function WorkerCarWashPage() {
  const { user } = useAuthStore();
  const stationId = user?.stationId ?? '';
  const [jobs, setJobs] = useState<CarWashJob[]>([]);
  const [loading, setLoading] = useState(true);
  const today = new Date().toISOString().slice(0, 10);

  const loadJobs = useCallback(async () => {
    if (!stationId) return;
    setLoading(true);
    try {
      const res = await carWashApi.getJobs({ stationId, from: today, to: today });
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
        <h1 className="text-xl font-bold">Car Wash</h1>
        <p className="text-sm text-gray-500 mt-0.5">Record a car wash job</p>
      </div>
      <div className="bg-white rounded-xl border p-5">
        <CarWashJobForm stationId={stationId} onSuccess={loadJobs} />
      </div>
      <div className="bg-white rounded-xl border">
        <div className="px-4 py-3 border-b">
          <h2 className="font-medium text-sm">Today&apos;s Washes</h2>
        </div>
        <CarWashJobsTable jobs={jobs} loading={loading} />
      </div>
      </div>
    </div>
  );
}
