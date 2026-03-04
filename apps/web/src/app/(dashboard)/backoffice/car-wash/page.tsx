'use client';

import { useState, useEffect, useCallback } from 'react';
import { CarWashJobsTable } from '@/components/car-wash/CarWashJobsTable';
import { carWashApi, CarWashJob } from '@/lib/api/car-wash.api';

export default function BackofficeCarWashPage() {
  const [jobs, setJobs] = useState<CarWashJob[]>([]);
  const [loading, setLoading] = useState(true);
  const today = new Date().toISOString().slice(0, 10);
  const firstOfMonth = today.slice(0, 8) + '01';
  const [from, setFrom] = useState(firstOfMonth);
  const [to, setTo] = useState(today);
  const [stationId, setStationId] = useState('');

  const loadJobs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await carWashApi.getJobs({ stationId: stationId || undefined, from, to, limit: 100 });
      setJobs(res.items);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [stationId, from, to]);

  useEffect(() => { loadJobs(); }, [loadJobs]);

  const totalRevenue = jobs.reduce((s, j) => s + Number(j.amountLkr), 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">Car Wash — All Stations</h1>
        <div className="flex flex-wrap gap-2 items-center">
          <input
            type="text"
            placeholder="Station ID (optional)"
            className="border rounded px-2 py-1 text-sm w-44"
            value={stationId}
            onChange={(e) => setStationId(e.target.value)}
          />
          <input type="date" className="border rounded px-2 py-1 text-sm" value={from} onChange={(e) => setFrom(e.target.value)} />
          <span className="text-gray-400 text-sm">to</span>
          <input type="date" className="border rounded px-2 py-1 text-sm" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white border rounded-lg p-4">
          <p className="text-xs text-gray-500">Total Washes</p>
          <p className="text-2xl font-bold mt-1">{jobs.length}</p>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <p className="text-xs text-gray-500">Total Revenue</p>
          <p className="text-2xl font-bold mt-1 text-green-600">Rs. {totalRevenue.toLocaleString('en-LK', { minimumFractionDigits: 2 })}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border">
        <div className="px-4 py-3 border-b">
          <h2 className="font-medium text-sm">Car Wash History</h2>
        </div>
        <CarWashJobsTable jobs={jobs} loading={loading} />
      </div>
      </div>
    </div>
  );
}
