'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { usageApi } from '@/lib/api/usage.api';
import { ordersApi } from '@/lib/api/orders.api';

async function getUsers(): Promise<{ id: string; fullName: string; email: string; role: string; isActive: boolean }[]> {
  const { data } = await apiClient.get('/users');
  return data;
}

async function getStations(): Promise<{ id: string; name: string; city: string }[]> {
  const { data } = await apiClient.get('/stations');
  return data;
}

async function getStockSummary(): Promise<{ tanks: { isLow: boolean; isCritical: boolean }[] }[]> {
  const { data } = await apiClient.get('/stock/summary');
  return data;
}

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className="bg-white rounded-xl border shadow-sm px-5 py-4">
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-sm font-medium text-gray-700 mt-0.5">{label}</div>
      {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
    </div>
  );
}

export default function AdminDashboard() {
  const { data: users = [] } = useQuery({ queryKey: ['admin-users'], queryFn: getUsers });
  const { data: stations = [] } = useQuery({ queryKey: ['admin-stations'], queryFn: getStations });
  const { data: stockSummaries = [] } = useQuery({ queryKey: ['admin-stock-summary'], queryFn: getStockSummary });
  const { data: orderSummary } = useQuery({ queryKey: ['admin-order-summary'], queryFn: () => ordersApi.getSummary() });
  const { data: recentLogs } = useQuery({
    queryKey: ['admin-recent-logs'],
    queryFn: () => usageApi.getLogs({ limit: 5 }),
  });

  const allTanks = stockSummaries.flatMap((s: any) => s.tanks ?? []);
  const lowStockCount = allTanks.filter((t: any) => t.isLow || t.isCritical).length;
  const pendingApprovals = (orderSummary?.submitted ?? 0) + (orderSummary?.draft ?? 0);
  const activeUsers = users.filter((u) => u.isActive).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4">
        <h1 className="text-xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">System overview</p>
      </header>

      <div className="px-6 py-6 max-w-7xl mx-auto space-y-6">
        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Users" value={users.length} sub={`${activeUsers} active`} color="text-blue-600" />
          <StatCard label="Active Stations" value={stations.length} color="text-green-600" />
          <StatCard label="Low Stock Alerts" value={lowStockCount} sub="tanks at or below threshold" color={lowStockCount > 0 ? 'text-yellow-600' : 'text-gray-600'} />
          <StatCard label="Pending Approvals" value={pendingApprovals} sub="orders awaiting action" color={pendingApprovals > 0 ? 'text-red-600' : 'text-gray-600'} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick links */}
          <div className="bg-white rounded-xl border shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">Quick Links</h2>
            <div className="space-y-2">
              <Link href="/admin/users" className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-blue-50 text-sm font-medium text-gray-700 hover:text-blue-700 transition-colors">
                <span className="text-lg">👥</span> User Management
              </Link>
              <Link href="/admin/stations" className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-blue-50 text-sm font-medium text-gray-700 hover:text-blue-700 transition-colors">
                <span className="text-lg">⛽</span> Station Management
              </Link>
              <Link href="/admin/reports" className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-blue-50 text-sm font-medium text-gray-700 hover:text-blue-700 transition-colors">
                <span className="text-lg">📊</span> Reports
              </Link>
              <Link href="/admin/tax" className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-blue-50 text-sm font-medium text-gray-700 hover:text-blue-700 transition-colors">
                <span className="text-lg">🧾</span> Tax / IRD
              </Link>
            </div>
          </div>

          {/* Recent activity */}
          <div className="lg:col-span-2 bg-white rounded-xl border shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">Recent Usage Logs</h2>
            {!recentLogs?.items?.length ? (
              <p className="text-sm text-gray-400 py-4 text-center">No recent activity</p>
            ) : (
              <div className="divide-y">
                {recentLogs.items.map((log) => (
                  <div key={log.id} className="py-2.5 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-gray-800">
                        {log.tank?.station?.name} — {log.tank?.fuelType?.replace(/_/g, ' ')}
                      </div>
                      <div className="text-xs text-gray-400">
                        {log.shiftType} shift · {log.date} · by {log.recordedBy?.fullName}
                      </div>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      log.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                      log.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {log.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* System info */}
        <div className="bg-white rounded-xl border shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">System Info</h2>
          <div className="flex flex-wrap gap-3">
            <a
              href="http://localhost:3001/api/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 border border-indigo-200 rounded-lg text-sm font-medium text-indigo-700 hover:bg-indigo-100 transition-colors"
            >
              📄 Swagger API Docs
            </a>
            <a
              href="http://localhost:3001/health"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-lg text-sm font-medium text-green-700 hover:bg-green-100 transition-colors"
            >
              ✅ API Health Check
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
