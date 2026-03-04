'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportsApi } from '@/lib/api/reports.api';
import { IncomeStatement } from '@/components/reports/IncomeStatement';
import { CashFlowStatement } from '@/components/reports/CashFlowStatement';
import { StockValuationReport } from '@/components/reports/StockValuationReport';
import { MonthlyTrendChart } from '@/components/reports/MonthlyTrendChart';
import { useAuthStore } from '@/store/auth.store';

type Tab = 'income' | 'cashflow' | 'stock' | 'trend';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'income', label: 'Income Statement', icon: '📊' },
  { id: 'cashflow', label: 'Cash Flow', icon: '💸' },
  { id: 'stock', label: 'Stock Valuation', icon: '🛢️' },
  { id: 'trend', label: 'Monthly Trend', icon: '📈' },
];

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function fiscalYearStart(fy: number) {
  return `${fy}-04-01`;
}

function fiscalYearEnd(fy: number) {
  return `${fy + 1}-03-31`;
}

function currentFiscalYear() {
  const now = new Date();
  // SL fiscal year starts April 1
  return now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
}

export default function BackofficeReportsPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';

  const [activeTab, setActiveTab] = useState<Tab>('income');
  const [stationId, setStationId] = useState<string>('');

  // Date range for income/cashflow
  const [from, setFrom] = useState(fiscalYearStart(currentFiscalYear()));
  const [to, setTo] = useState(fiscalYearEnd(currentFiscalYear()));

  // Stock valuation date
  const [stockDate, setStockDate] = useState(todayStr());

  // Fiscal year for trend
  const [fiscalYear, setFiscalYear] = useState(currentFiscalYear());

  // Only use stationId filter if admin; managers are scoped by default in backend
  const stationParam = isAdmin && stationId ? stationId : undefined;

  const incomeQuery = useQuery({
    queryKey: ['report-income', stationParam, from, to],
    queryFn: () => reportsApi.getIncomeStatement({ stationId: stationParam, from, to }),
    enabled: activeTab === 'income' && !!from && !!to,
  });

  const cashFlowQuery = useQuery({
    queryKey: ['report-cashflow', stationParam, from, to],
    queryFn: () => reportsApi.getCashFlow({ stationId: stationParam, from, to }),
    enabled: activeTab === 'cashflow' && !!from && !!to,
  });

  const stockQuery = useQuery({
    queryKey: ['report-stock', stationParam, stockDate],
    queryFn: () => reportsApi.getStockValuation({ stationId: stationParam, date: stockDate }),
    enabled: activeTab === 'stock' && !!stockDate,
  });

  const trendQuery = useQuery({
    queryKey: ['report-trend', stationParam, fiscalYear],
    queryFn: () => reportsApi.getMonthlyTrend({ stationId: stationParam, fiscalYear }),
    enabled: activeTab === 'trend',
  });

  const fyOptions = Array.from({ length: 5 }, (_, i) => currentFiscalYear() - i);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* Page Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Financial Reports</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              SLFRS / LKAS compliant statements — {isAdmin ? 'All Stations' : 'Your Station'}
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span>🖨️</span>
            <span>Use browser print (Ctrl+P) to export to PDF</span>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-xl border shadow-sm px-5 py-4">
          <div className="flex flex-wrap gap-4 items-end">
            {/* Station selector — Admin only */}
            {isAdmin && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Station</label>
                <input
                  type="text"
                  value={stationId}
                  onChange={(e) => setStationId(e.target.value)}
                  placeholder="Station ID (leave blank = all)"
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-52 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            {/* Date range — for income & cashflow */}
            {(activeTab === 'income' || activeTab === 'cashflow') && (
              <>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">From</label>
                  <input
                    type="date"
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">To</label>
                  <input
                    type="date"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                {/* Quick fiscal year buttons */}
                <div className="flex gap-2">
                  {fyOptions.slice(0, 3).map((fy) => (
                    <button
                      key={fy}
                      onClick={() => { setFrom(fiscalYearStart(fy)); setTo(fiscalYearEnd(fy)); }}
                      className="px-3 py-2 text-xs border border-gray-300 rounded-lg hover:bg-gray-50 whitespace-nowrap"
                    >
                      FY {fy}
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* Stock date picker */}
            {activeTab === 'stock' && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">As at Date</label>
                <input
                  type="date"
                  value={stockDate}
                  onChange={(e) => setStockDate(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            {/* Fiscal year selector for trend */}
            {activeTab === 'trend' && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Fiscal Year</label>
                <select
                  value={fiscalYear}
                  onChange={(e) => setFiscalYear(parseInt(e.target.value, 10))}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {fyOptions.map((fy) => (
                    <option key={fy} value={fy}>FY {fy} (Apr {fy} – Mar {fy + 1})</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex gap-1">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2.5 text-sm font-medium rounded-t-lg border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600 bg-white'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div>
          {/* Income Statement */}
          {activeTab === 'income' && (
            <>
              {incomeQuery.isLoading && <LoadingCard />}
              {incomeQuery.isError && <ErrorCard />}
              {incomeQuery.data && <IncomeStatement data={incomeQuery.data} />}
            </>
          )}

          {/* Cash Flow */}
          {activeTab === 'cashflow' && (
            <>
              {cashFlowQuery.isLoading && <LoadingCard />}
              {cashFlowQuery.isError && <ErrorCard />}
              {cashFlowQuery.data && <CashFlowStatement data={cashFlowQuery.data} />}
            </>
          )}

          {/* Stock Valuation */}
          {activeTab === 'stock' && (
            <>
              {stockQuery.isLoading && <LoadingCard />}
              {stockQuery.isError && <ErrorCard />}
              {stockQuery.data && <StockValuationReport data={stockQuery.data} />}
            </>
          )}

          {/* Monthly Trend */}
          {activeTab === 'trend' && (
            <>
              {trendQuery.isLoading && <LoadingCard />}
              {trendQuery.isError && <ErrorCard />}
              {trendQuery.data && <MonthlyTrendChart data={trendQuery.data} />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function LoadingCard() {
  return (
    <div className="bg-white rounded-xl border shadow-sm p-12 text-center">
      <div className="inline-block w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      <p className="text-sm text-gray-500 mt-3">Loading report data…</p>
    </div>
  );
}

function ErrorCard() {
  return (
    <div className="bg-white rounded-xl border border-red-200 shadow-sm p-12 text-center">
      <div className="text-3xl mb-2">⚠️</div>
      <p className="text-sm text-red-600 font-medium">Failed to load report</p>
      <p className="text-xs text-gray-500 mt-1">Check your network connection or date range and try again.</p>
    </div>
  );
}
