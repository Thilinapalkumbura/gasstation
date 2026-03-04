'use client';

import { useState, useEffect, useCallback } from 'react';
import { CylinderCatalogTable } from '@/components/gas-cylinders/CylinderCatalogTable';
import { CylinderSalesTable } from '@/components/gas-cylinders/CylinderSalesTable';
import { CylinderStockInModal } from '@/components/gas-cylinders/CylinderStockInModal';
import { CreateCylinderModal } from '@/components/gas-cylinders/CreateCylinderModal';
import { gasCylindersApi, GasCylinder, CylinderSale } from '@/lib/api/gas-cylinders.api';

type Tab = 'catalog' | 'sales';

export default function BackofficeGasCylindersPage() {
  const [tab, setTab] = useState<Tab>('catalog');
  const [stationId, setStationId] = useState('');
  const [cylinders, setCylinders] = useState<GasCylinder[]>([]);
  const [sales, setSales] = useState<CylinderSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [stockInCylinder, setStockInCylinder] = useState<GasCylinder | null>(null);
  const [showCreateCylinder, setShowCreateCylinder] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [cylData, salesData] = await Promise.all([
        gasCylindersApi.getCylinders({ stationId: stationId || undefined }),
        gasCylindersApi.getSales({ stationId: stationId || undefined }),
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold">Gas Cylinders — All Stations</h1>
          {stationId && (
            <button
              onClick={() => setShowCreateCylinder(true)}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg font-medium hover:bg-blue-700"
            >
              + Add Cylinder
            </button>
          )}
        </div>
        <input
          type="text"
          placeholder="Filter by Station ID"
          className="border rounded px-2 py-1 text-sm w-48"
          value={stationId}
          onChange={(e) => setStationId(e.target.value)}
        />
      </div>

      <div className="flex gap-1 border-b">
        {(['catalog', 'sales'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors ${tab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            {t === 'catalog' ? 'Catalog & Stock' : 'Sales History'}
          </button>
        ))}
      </div>

      {tab === 'catalog' && (
        <div className="bg-white rounded-xl border">
          <CylinderCatalogTable cylinders={cylinders} loading={loading} onStockIn={(c) => setStockInCylinder(c)} />
        </div>
      )}
      {tab === 'sales' && (
        <div className="bg-white rounded-xl border">
          <CylinderSalesTable sales={sales} loading={loading} />
        </div>
      )}

      {showCreateCylinder && stationId && (
        <CreateCylinderModal
          stationId={stationId}
          onClose={() => setShowCreateCylinder(false)}
          onSuccess={() => { setShowCreateCylinder(false); loadData(); }}
        />
      )}

      {stockInCylinder && stationId && (
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
