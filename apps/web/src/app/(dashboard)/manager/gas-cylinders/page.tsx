'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { StockLevelCard } from '@/components/gas-cylinders/StockLevelCard';
import { CylinderSalesTable } from '@/components/gas-cylinders/CylinderSalesTable';
import { CylinderStockInModal } from '@/components/gas-cylinders/CylinderStockInModal';
import { CreateCylinderModal } from '@/components/gas-cylinders/CreateCylinderModal';
import { gasCylindersApi, GasCylinder, CylinderSale } from '@/lib/api/gas-cylinders.api';

type Tab = 'stock' | 'sales';

export default function ManagerGasCylindersPage() {
  const { user } = useAuthStore();
  const stationId = user?.stationId ?? '';
  const [tab, setTab] = useState<Tab>('stock');
  const [cylinders, setCylinders] = useState<GasCylinder[]>([]);
  const [sales, setSales] = useState<CylinderSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [stockInCylinder, setStockInCylinder] = useState<GasCylinder | null>(null);
  const [showCreateCylinder, setShowCreateCylinder] = useState(false);

  const loadData = useCallback(async () => {
    if (!stationId) return;
    setLoading(true);
    try {
      const [cylData, salesData] = await Promise.all([
        gasCylindersApi.getCylinders({ stationId }),
        gasCylindersApi.getSales({ stationId }),
      ]);
      setCylinders(cylData);
      setSales(salesData.items);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [stationId]);

  useEffect(() => { loadData(); }, [loadData]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Gas Cylinders</h1>
        <button
          onClick={() => setShowCreateCylinder(true)}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg font-medium hover:bg-blue-700"
        >
          + Add Cylinder
        </button>
      </div>

      <div className="flex gap-1 border-b">
        {(['stock', 'sales'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors ${tab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            {t === 'stock' ? 'Stock Levels' : 'Sales History'}
          </button>
        ))}
      </div>

      {tab === 'stock' && (
        loading ? <div className="text-center py-8 text-gray-500 text-sm">Loading...</div> : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {cylinders.map((c) => (
              <StockLevelCard key={c.id} cylinder={c} onStockIn={() => setStockInCylinder(c)} />
            ))}
            {!cylinders.length && <p className="text-gray-400 text-sm col-span-3">No cylinders configured.</p>}
          </div>
        )
      )}

      {tab === 'sales' && (
        <div className="bg-white rounded-xl border">
          <CylinderSalesTable sales={sales} loading={loading} />
        </div>
      )}

      {showCreateCylinder && (
        <CreateCylinderModal
          stationId={stationId}
          onClose={() => setShowCreateCylinder(false)}
          onSuccess={() => { setShowCreateCylinder(false); loadData(); }}
        />
      )}

      {stockInCylinder && (
        <CylinderStockInModal
          cylinder={stockInCylinder}
          stationId={stationId}
          onClose={() => setStockInCylinder(null)}
          onSuccess={() => { setStockInCylinder(null); loadData(); }}
        />
      )}
      </div>
    </div>
  );
}
