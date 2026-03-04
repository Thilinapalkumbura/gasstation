'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';

interface Station {
  id: string;
  name: string;
  city: string;
  address: string | null;
  contactNumber: string | null;
  contactEmail: string | null;
  isActive: boolean;
}

interface StationForm {
  name: string;
  city: string;
  address: string;
  contactNumber: string;
  contactEmail: string;
}

async function fetchStations(): Promise<Station[]> {
  const { data } = await apiClient.get('/stations');
  return data;
}

const EMPTY_FORM: StationForm = { name: '', city: '', address: '', contactNumber: '', contactEmail: '' };

function StationModal({
  mode,
  initial,
  onClose,
  onSaved,
}: {
  mode: 'create' | 'edit';
  initial?: Station;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<StationForm>({
    name: initial?.name ?? '',
    city: initial?.city ?? '',
    address: initial?.address ?? '',
    contactNumber: initial?.contactNumber ?? '',
    contactEmail: initial?.contactEmail ?? '',
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name,
        city: form.city,
        address: form.address || undefined,
        contactNumber: form.contactNumber || undefined,
        contactEmail: form.contactEmail || undefined,
      };
      if (mode === 'create') {
        await apiClient.post('/stations', payload);
      } else {
        await apiClient.patch(`/stations/${initial!.id}`, payload);
      }
    },
    onSuccess: () => { onSaved(); onClose(); },
  });

  const set = (field: keyof StationForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const isValid = form.name && form.city;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center sm:p-4">
      <div className="bg-white w-full sm:rounded-2xl rounded-t-2xl shadow-2xl sm:max-w-md max-h-[92vh] overflow-y-auto">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="font-bold text-gray-900">{mode === 'create' ? 'Create Station' : 'Edit Station'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <div className="px-6 py-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Station Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={set('name')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-400"
                placeholder="Colombo North"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">City *</label>
              <input
                type="text"
                value={form.city}
                onChange={set('city')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-400"
                placeholder="Colombo"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Address</label>
            <input
              type="text"
              value={form.address}
              onChange={set('address')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-400"
              placeholder="123 Main Street, Colombo 01"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Contact Number</label>
              <input
                type="tel"
                value={form.contactNumber}
                onChange={set('contactNumber')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-400"
                placeholder="+94 11 234 5678"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Contact Email</label>
              <input
                type="email"
                value={form.contactEmail}
                onChange={set('contactEmail')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-400"
                placeholder="station@example.com"
              />
            </div>
          </div>

          {mutation.isError && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-xs text-red-700">
              Failed to save station. Please check the details and try again.
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t flex gap-3">
          <button onClick={onClose} className="flex-1 py-2 border border-gray-300 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={!isValid || mutation.isPending}
            className="flex-1 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:bg-blue-300"
          >
            {mutation.isPending ? 'Saving…' : mode === 'create' ? 'Create Station' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminStationsPage() {
  const qc = useQueryClient();
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [editStation, setEditStation] = useState<Station | null>(null);

  const { data: stations = [], isLoading } = useQuery({ queryKey: ['admin-stations'], queryFn: fetchStations });

  const refresh = () => qc.invalidateQueries({ queryKey: ['admin-stations'] });

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Station Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">{stations.length} stations registered</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700"
        >
          + Create Station
        </button>
      </header>

      <div className="px-4 sm:px-6 py-6 max-w-7xl mx-auto">
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-gray-400 text-sm">Loading stations…</div>
          ) : stations.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">No stations found.</div>
          ) : (
            <>
              {/* Mobile: card list */}
              <div className="md:hidden divide-y">
                {stations.map((station) => (
                  <div key={station.id} className="px-4 py-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium text-gray-900">{station.name}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{station.city}</div>
                      {station.address && (
                        <div className="text-xs text-gray-400 mt-0.5 truncate">{station.address}</div>
                      )}
                      {(station.contactNumber || station.contactEmail) && (
                        <div className="text-xs text-gray-400 mt-0.5">
                          {station.contactNumber}{station.contactNumber && station.contactEmail && ' · '}{station.contactEmail}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => router.push(`/admin/stations/${station.id}`)}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium py-1"
                      >
                        View
                      </button>
                      <button
                        onClick={() => setEditStation(station)}
                        className="text-xs text-gray-500 hover:text-gray-700 font-medium py-1"
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop: table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Station Name</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">City</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Address</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Contact</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {stations.map((station) => (
                      <tr key={station.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-gray-900">{station.name}</td>
                        <td className="px-4 py-3 text-gray-600">{station.city}</td>
                        <td className="px-4 py-3 text-gray-600">
                          {station.address ?? <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          <div>{station.contactNumber ?? <span className="text-gray-300">—</span>}</div>
                          {station.contactEmail && (
                            <div className="text-xs text-gray-400">{station.contactEmail}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right flex gap-3 justify-end">
                          <button
                            onClick={() => router.push(`/admin/stations/${station.id}`)}
                            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                          >
                            View
                          </button>
                          <button
                            onClick={() => setEditStation(station)}
                            className="text-xs text-gray-500 hover:text-gray-700 font-medium"
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      {showCreate && (
        <StationModal
          mode="create"
          onClose={() => setShowCreate(false)}
          onSaved={refresh}
        />
      )}

      {editStation && (
        <StationModal
          mode="edit"
          initial={editStation}
          onClose={() => setEditStation(null)}
          onSaved={refresh}
        />
      )}
    </div>
  );
}
