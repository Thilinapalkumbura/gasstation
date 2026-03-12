'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api/client';
import { workerChangesApi, WorkerChangeRequest } from '@/lib/api/worker-changes.api';

interface Worker {
  id: string;
  fullName: string;
  email: string;
  role: string;
  stationId: string | null;
  isActive: boolean;
  workerType: string | null;
  station: { id: string; name: string; city: string } | null;
  createdAt: string;
}

const STATUS_BADGE: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
};

const WORKER_TYPE_BADGE: Record<string, string> = {
  SHIFT: 'bg-blue-100 text-blue-800',
  FULL_TIME: 'bg-purple-100 text-purple-800',
};

interface EditModal {
  worker: Worker;
  newWorkerType: string;
  newFullName: string;
  newStationId: string;
  newIsActive: string;
  submitting: boolean;
  error: string;
}

export default function BackofficeWorkersPage() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [requests, setRequests] = useState<WorkerChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'workers' | 'requests'>('workers');
  const [editModal, setEditModal] = useState<EditModal | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: workersData }, reqData] = await Promise.all([
        apiClient.get('/v1/users', { params: { role: 'WORKER' } }),
        workerChangesApi.getRequests(),
      ]);
      setWorkers(workersData);
      setRequests(reqData);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function openEdit(worker: Worker) {
    setEditModal({
      worker,
      newWorkerType: worker.workerType ?? '',
      newFullName: worker.fullName,
      newStationId: worker.stationId ?? '',
      newIsActive: String(worker.isActive),
      submitting: false,
      error: '',
    });
  }

  async function submitChange() {
    if (!editModal) return;
    const payload: any = { workerId: editModal.worker.id };

    if (editModal.newWorkerType && editModal.newWorkerType !== (editModal.worker.workerType ?? '')) {
      payload.newWorkerType = editModal.newWorkerType;
    }
    if (editModal.newFullName !== editModal.worker.fullName) {
      payload.newFullName = editModal.newFullName;
    }
    if (editModal.newStationId !== (editModal.worker.stationId ?? '')) {
      payload.newStationId = editModal.newStationId || null;
    }
    if (editModal.newIsActive !== String(editModal.worker.isActive)) {
      payload.newIsActive = editModal.newIsActive === 'true';
    }

    if (Object.keys(payload).length <= 1) {
      setEditModal({ ...editModal, error: 'No changes detected.' });
      return;
    }

    setEditModal({ ...editModal, submitting: true, error: '' });
    try {
      await workerChangesApi.createRequest(payload);
      setEditModal(null);
      load();
    } catch (err: any) {
      setEditModal({
        ...editModal,
        submitting: false,
        error: err?.response?.data?.message ?? 'Failed to submit request.',
      });
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <h1 className="text-xl font-bold">Workers</h1>

        <div className="flex gap-1 border-b">
          {(['workers', 'requests'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors ${tab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              {t === 'workers' ? 'Worker List' : 'My Change Requests'}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading...</div>
        ) : tab === 'workers' ? (
          <div className="bg-white rounded-xl border overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['Name', 'Email', 'Station', 'Type', 'Active', 'Actions'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-medium text-gray-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {workers.map((w) => (
                  <tr key={w.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{w.fullName}</td>
                    <td className="px-4 py-3 text-gray-500">{w.email}</td>
                    <td className="px-4 py-3 text-gray-500">{w.station?.name ?? '—'}</td>
                    <td className="px-4 py-3">
                      {w.workerType ? (
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${WORKER_TYPE_BADGE[w.workerType] ?? ''}`}>
                          {w.workerType.replace('_', ' ')}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">Unset</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${w.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {w.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => openEdit(w)}
                        className="px-3 py-1 text-xs bg-blue-50 text-blue-700 rounded hover:bg-blue-100 font-medium"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
                {workers.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-400">No workers found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.length === 0 && (
              <div className="text-center py-12 text-gray-400">No change requests yet.</div>
            )}
            {requests.map((req) => (
              <div key={req.id} className="bg-white rounded-xl border p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{req.worker.fullName}</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_BADGE[req.status]}`}>
                    {req.status}
                  </span>
                </div>
                <div className="text-xs text-gray-500 space-y-1">
                  {req.newWorkerType && <div>Worker Type → <b>{req.newWorkerType.replace('_', ' ')}</b></div>}
                  {req.newFullName && <div>Name → <b>{req.newFullName}</b></div>}
                  {req.newStationId !== undefined && req.newStationId !== null && (
                    <div>Station ID → <b>{req.newStationId}</b></div>
                  )}
                  {req.newIsActive !== undefined && req.newIsActive !== null && (
                    <div>Active → <b>{req.newIsActive ? 'Yes' : 'No'}</b></div>
                  )}
                  {req.reviewerNotes && <div>Notes: <i>{req.reviewerNotes}</i></div>}
                  <div className="text-gray-400">{new Date(req.createdAt).toLocaleString()}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-bold">Submit Change Request — {editModal.worker.fullName}</h2>

            <div className="space-y-3">
              <label className="block text-sm">
                <span className="text-gray-600 mb-1 block">Worker Type</span>
                <select
                  value={editModal.newWorkerType}
                  onChange={(e) => setEditModal({ ...editModal, newWorkerType: e.target.value })}
                  className="border rounded px-3 py-2 w-full text-sm"
                >
                  <option value="">— No change —</option>
                  <option value="SHIFT">Shift</option>
                  <option value="FULL_TIME">Full Time</option>
                </select>
              </label>

              <label className="block text-sm">
                <span className="text-gray-600 mb-1 block">Full Name</span>
                <input
                  type="text"
                  value={editModal.newFullName}
                  onChange={(e) => setEditModal({ ...editModal, newFullName: e.target.value })}
                  className="border rounded px-3 py-2 w-full text-sm"
                />
              </label>

              <label className="block text-sm">
                <span className="text-gray-600 mb-1 block">Station ID</span>
                <input
                  type="text"
                  value={editModal.newStationId}
                  onChange={(e) => setEditModal({ ...editModal, newStationId: e.target.value })}
                  className="border rounded px-3 py-2 w-full text-sm"
                  placeholder="Leave blank to remove from station"
                />
              </label>

              <label className="block text-sm">
                <span className="text-gray-600 mb-1 block">Active Status</span>
                <select
                  value={editModal.newIsActive}
                  onChange={(e) => setEditModal({ ...editModal, newIsActive: e.target.value })}
                  className="border rounded px-3 py-2 w-full text-sm"
                >
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </label>
            </div>

            {editModal.error && (
              <p className="text-sm text-red-600">{editModal.error}</p>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setEditModal(null)}
                className="flex-1 px-4 py-2 border rounded-lg text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={submitChange}
                disabled={editModal.submitting}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {editModal.submitting ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
