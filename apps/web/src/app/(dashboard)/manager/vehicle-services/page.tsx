'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { ServiceJobsTable } from '@/components/vehicle-services/ServiceJobsTable';
import { vehicleServicesApi, ServiceJob, ServiceJobSummary } from '@/lib/api/vehicle-services.api';

export default function ManagerVehicleServicesPage() {
  const { user } = useAuthStore();
  const stationId = user?.stationId ?? '';
  const [jobs, setJobs] = useState<ServiceJob[]>([]);
  const [summary, setSummary] = useState<ServiceJobSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const today = new Date().toISOString().slice(0, 10);
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);

  const loadData = useCallback(async () => {
    if (!stationId) return;
    setLoading(true);
    try {
      const [jobsRes, summaryRes] = await Promise.all([
        vehicleServicesApi.getJobs({ stationId, from, to }),
        vehicleServicesApi.getSummary({ stationId, from, to }),
      ]);
      setJobs(jobsRes.items);
      setSummary(summaryRes);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [stationId, from, to]);

  useEffect(() => { loadData(); }, [loadData]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Vehicle Services</h1>
        <div className="flex gap-2 items-center">
          <input type="date" className="border rounded px-2 py-1 text-sm" value={from} onChange={(e) => setFrom(e.target.value)} />
          <span className="text-gray-400 text-sm">to</span>
          <input type="date" className="border rounded px-2 py-1 text-sm" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white border rounded-lg p-4">
            <p className="text-xs text-gray-500">Total Jobs</p>
            <p className="text-2xl font-bold mt-1">{summary.totalJobs}</p>
          </div>
          <div className="bg-white border rounded-lg p-4">
            <p className="text-xs text-gray-500">Revenue</p>
            <p className="text-2xl font-bold mt-1 text-green-600">Rs. {summary.totalRevenue.toLocaleString()}</p>
          </div>
          {summary.byType.slice(0, 2).map((bt) => (
            <div key={bt.serviceType} className="bg-white border rounded-lg p-4">
              <p className="text-xs text-gray-500">{bt.serviceType.replace(/_/g, ' ')}</p>
              <p className="text-2xl font-bold mt-1">{bt.count}</p>
              <p className="text-xs text-gray-400">Rs. {bt.revenue.toLocaleString()}</p>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white rounded-xl border">
        <div className="px-4 py-3 border-b">
          <h2 className="font-medium text-sm">Service Jobs</h2>
        </div>
        <ServiceJobsTable jobs={jobs} loading={loading} />
      </div>
      </div>
    </div>
  );
}
