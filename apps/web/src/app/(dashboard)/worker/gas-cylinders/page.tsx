'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { CylinderSaleForm } from '@/components/gas-cylinders/CylinderSaleForm';
import { CylinderSalesTable } from '@/components/gas-cylinders/CylinderSalesTable';
import { gasCylindersApi, GasCylinder, CylinderSale } from '@/lib/api/gas-cylinders.api';

export default function WorkerGasCylindersPage() {
  const { user } = useAuthStore();
  const stationId = user?.stationId ?? '';
  const [cylinders, setCylinders] = useState<GasCylinder[]>([]);
  const [sales, setSales] = useState<CylinderSale[]>([]);
  const [loading, setLoading] = useState(true);
  const today = new Date().toISOString().slice(0, 10);

  const loadData = useCallback(async () => {
    if (!stationId) return;
    setLoading(true);
    try {
      const [cylData, salesData] = await Promise.all([
        gasCylindersApi.getCylinders({ stationId }),
        gasCylindersApi.getSales({ stationId, from: today, to: today }),
      ]);
      setCylinders(cylData);
      setSales(salesData.items);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [stationId, today]);

  useEffect(() => { loadData(); }, [loadData]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold">Gas Cylinders</h1>
        <p className="text-sm text-gray-500 mt-0.5">Record a cylinder sale</p>
      </div>
      <div className="bg-white rounded-xl border p-5">
        <CylinderSaleForm stationId={stationId} cylinders={cylinders} onSuccess={loadData} />
      </div>
      <div className="bg-white rounded-xl border">
        <div className="px-4 py-3 border-b">
          <h2 className="font-medium text-sm">Today&apos;s Sales</h2>
        </div>
        <CylinderSalesTable sales={sales} loading={loading} />
      </div>
      </div>
    </div>
  );
}
