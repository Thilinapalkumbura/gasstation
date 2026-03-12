'use client';

import { useState, useEffect, useCallback } from 'react';
import { workerChangesApi, WorkerChangeRequest } from '@/lib/api/worker-changes.api';

const STATUS_BADGE: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
};

export default function ManagerWorkersPage() {
  const [requests, setRequests] = useState<WorkerChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectNotes, setRejectNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const [statusFilter, setStatusFilter] = useState('PENDING');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await workerChangesApi.getRequests({ status: statusFilter || undefined });
      setRequests(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  async function handleApprove(id: string) {
    setProcessing(true);
    try {
      await workerChangesApi.approve(id);
      load();
    } finally {
      setProcessing(false);
    }
  }

  async function handleReject() {
    if (!rejectId) return;
    setProcessing(true);
    try {
      await workerChangesApi.reject(rejectId, rejectNotes);
      setRejectId(null);
      setRejectNotes('');
      load();
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Worker Approvals</h1>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border rounded px-3 py-1.5 text-sm"
          >
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="">All</option>
          </select>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading...</div>
        ) : requests.length === 0 ? (
          <div className="text-center py-12 text-gray-400">No change requests found.</div>
        ) : (
          <div className="space-y-4">
            {requests.map((req) => (
              <div key={req.id} className="bg-white rounded-xl border p-5 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-gray-900">{req.worker.fullName}</p>
                    <p className="text-xs text-gray-500">
                      Requested by {req.requestedBy.fullName} · {new Date(req.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium shrink-0 ${STATUS_BADGE[req.status]}`}>
                    {req.status}
                  </span>
                </div>

                {/* Proposed changes diff */}
                <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Proposed Changes</p>
                  {req.newWorkerType !== undefined && req.newWorkerType !== null && (
                    <div className="flex gap-2">
                      <span className="text-gray-500 w-24 shrink-0">Worker Type</span>
                      <span className="text-gray-400">{req.worker.workerType ?? 'Unset'}</span>
                      <span className="text-gray-400">→</span>
                      <span className="font-medium text-gray-800">{req.newWorkerType.replace('_', ' ')}</span>
                    </div>
                  )}
                  {req.newFullName !== undefined && req.newFullName !== null && (
                    <div className="flex gap-2">
                      <span className="text-gray-500 w-24 shrink-0">Name</span>
                      <span className="text-gray-400">{req.worker.fullName}</span>
                      <span className="text-gray-400">→</span>
                      <span className="font-medium text-gray-800">{req.newFullName}</span>
                    </div>
                  )}
                  {req.newStationId !== undefined && req.newStationId !== null && (
                    <div className="flex gap-2">
                      <span className="text-gray-500 w-24 shrink-0">Station ID</span>
                      <span className="text-gray-400">{req.worker.stationId ?? 'None'}</span>
                      <span className="text-gray-400">→</span>
                      <span className="font-medium text-gray-800">{req.newStationId}</span>
                    </div>
                  )}
                  {req.newIsActive !== undefined && req.newIsActive !== null && (
                    <div className="flex gap-2">
                      <span className="text-gray-500 w-24 shrink-0">Active</span>
                      <span className="text-gray-400">{req.worker.workerType ?? '—'}</span>
                      <span className="text-gray-400">→</span>
                      <span className="font-medium text-gray-800">{req.newIsActive ? 'Yes' : 'No'}</span>
                    </div>
                  )}
                </div>

                {req.reviewerNotes && (
                  <p className="text-xs text-gray-500 italic">Notes: {req.reviewerNotes}</p>
                )}

                {req.status === 'PENDING' && (
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => handleApprove(req.id)}
                      disabled={processing}
                      className="px-4 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => { setRejectId(req.id); setRejectNotes(''); }}
                      disabled={processing}
                      className="px-4 py-1.5 bg-red-50 text-red-700 text-sm rounded-lg hover:bg-red-100 disabled:opacity-50 font-medium"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {rejectId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-bold">Reject Change Request</h2>
            <label className="block text-sm">
              <span className="text-gray-600 mb-1 block">Notes (optional)</span>
              <textarea
                value={rejectNotes}
                onChange={(e) => setRejectNotes(e.target.value)}
                rows={3}
                className="border rounded px-3 py-2 w-full text-sm"
                placeholder="Reason for rejection..."
              />
            </label>
            <div className="flex gap-3">
              <button
                onClick={() => setRejectId(null)}
                className="flex-1 px-4 py-2 border rounded-lg text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={processing}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
              >
                {processing ? 'Rejecting...' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
