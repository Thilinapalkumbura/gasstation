'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { SparePartCatalogTable } from '@/components/spare-parts/SparePartCatalogTable';
import { SparePartSalesTable } from '@/components/spare-parts/SparePartSalesTable';
import { LowStockBanner } from '@/components/spare-parts/LowStockBanner';
import { StockInModal } from '@/components/spare-parts/StockInModal';
import { CreatePartModal } from '@/components/spare-parts/CreatePartModal';
import { sparePartsApi, SparePart, SparePartSale } from '@/lib/api/spare-parts.api';

type Tab = 'catalog' | 'sales';

export default function ManagerSparePartsPage() {
  const { user } = useAuthStore();
  const stationId = user?.stationId ?? '';
  const [tab, setTab] = useState<Tab>('catalog');
  const [parts, setParts] = useState<SparePart[]>([]);
  const [lowStock, setLowStock] = useState<SparePart[]>([]);
  const [sales, setSales] = useState<SparePartSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [stockInPart, setStockInPart] = useState<SparePart | null>(null);
  const [showCreatePart, setShowCreatePart] = useState(false);

  const loadData = useCallback(async () => {
    if (!stationId) return;
    setLoading(true);
    try {
      const [partsData, lowData, salesData] = await Promise.all([
        sparePartsApi.getParts({ stationId }),
        sparePartsApi.getLowStock({ stationId }),
        sparePartsApi.getSales({ stationId }),
      ]);
      setParts(partsData);
      setLowStock(lowData);
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
        <h1 className="text-xl font-bold">Spare Parts</h1>
        <button
          onClick={() => setShowCreatePart(true)}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg font-medium hover:bg-blue-700"
        >
          + Add Part
        </button>
      </div>
      <LowStockBanner parts={lowStock} />

      <div className="flex gap-1 border-b">
        {(['catalog', 'sales'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors ${tab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'catalog' && (
        <div className="bg-white rounded-xl border">
          <SparePartCatalogTable parts={parts} loading={loading} onStockIn={(p) => setStockInPart(p)} />
        </div>
      )}

      {tab === 'sales' && (
        <div className="bg-white rounded-xl border">
          <SparePartSalesTable sales={sales} loading={loading} />
        </div>
      )}

      {showCreatePart && (
        <CreatePartModal
          stationId={stationId}
          onClose={() => setShowCreatePart(false)}
          onSuccess={() => { setShowCreatePart(false); loadData(); }}
        />
      )}

      {stockInPart && (
        <StockInModal
          part={stockInPart}
          stationId={stationId}
          onClose={() => setStockInPart(null)}
          onSuccess={() => { setStockInPart(null); loadData(); }}
        />
      )}
      </div>
    </div>
  );
}
