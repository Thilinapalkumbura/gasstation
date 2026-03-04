'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { SparePartSaleForm } from '@/components/spare-parts/SparePartSaleForm';
import { SparePartSalesTable } from '@/components/spare-parts/SparePartSalesTable';
import { LowStockBanner } from '@/components/spare-parts/LowStockBanner';
import { sparePartsApi, SparePart, SparePartSale } from '@/lib/api/spare-parts.api';

export default function WorkerSparePartsPage() {
  const { user } = useAuthStore();
  const stationId = user?.stationId ?? '';
  const [parts, setParts] = useState<SparePart[]>([]);
  const [lowStock, setLowStock] = useState<SparePart[]>([]);
  const [sales, setSales] = useState<SparePartSale[]>([]);
  const [loading, setLoading] = useState(true);
  const today = new Date().toISOString().slice(0, 10);

  const loadData = useCallback(async () => {
    if (!stationId) return;
    setLoading(true);
    try {
      const [partsData, lowData, salesData] = await Promise.all([
        sparePartsApi.getParts({ stationId }),
        sparePartsApi.getLowStock({ stationId }),
        sparePartsApi.getSales({ stationId, from: today, to: today }),
      ]);
      setParts(partsData);
      setLowStock(lowData);
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
        <h1 className="text-xl font-bold">Spare Parts</h1>
        <p className="text-sm text-gray-500 mt-0.5">Record a spare parts sale</p>
      </div>
      <LowStockBanner parts={lowStock} />
      <div className="bg-white rounded-xl border p-5">
        <SparePartSaleForm stationId={stationId} parts={parts} onSuccess={loadData} />
      </div>
      <div className="bg-white rounded-xl border">
        <div className="px-4 py-3 border-b">
          <h2 className="font-medium text-sm">Today&apos;s Sales</h2>
        </div>
        <SparePartSalesTable sales={sales} loading={loading} />
      </div>
      </div>
    </div>
  );
}
