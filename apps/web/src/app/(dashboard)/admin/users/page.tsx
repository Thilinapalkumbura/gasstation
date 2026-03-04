'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';

interface Station {
  id: string;
  name: string;
  city: string;
}

interface User {
  id: string;
  fullName: string;
  email: string;
  role: string;
  stationId: string | null;
  station: Station | null;
  isActive: boolean;
}

interface UserForm {
  fullName: string;
  email: string;
  password: string;
  role: string;
  stationId: string;
}

const ROLES = [
  { value: 'ADMIN', label: 'Admin' },
  { value: 'BACK_OFFICE', label: 'Back Office' },
  { value: 'STATION_MANAGER', label: 'Station Manager' },
  { value: 'WORKER', label: 'Worker' },
];

const ROLE_COLORS: Record<string, string> = {
  ADMIN: 'bg-purple-100 text-purple-700',
  BACK_OFFICE: 'bg-blue-100 text-blue-700',
  STATION_MANAGER: 'bg-green-100 text-green-700',
  WORKER: 'bg-gray-100 text-gray-700',
};

async function fetchUsers(): Promise<User[]> {
  const { data } = await apiClient.get('/users');
  return data;
}

async function fetchStations(): Promise<Station[]> {
  const { data } = await apiClient.get('/stations');
  return data;
}

const EMPTY_FORM: UserForm = { fullName: '', email: '', password: '', role: 'WORKER', stationId: '' };

function UserModal({
  mode,
  initial,
  stations,
  onClose,
  onSaved,
}: {
  mode: 'create' | 'edit';
  initial?: User;
  stations: Station[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<UserForm>({
    fullName: initial?.fullName ?? '',
    email: initial?.email ?? '',
    password: '',
    role: initial?.role ?? 'WORKER',
    stationId: initial?.stationId ?? '',
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, string> = {
        fullName: form.fullName,
        email: form.email,
        role: form.role,
        stationId: form.stationId || '',
      };
      if (form.password) payload.password = form.password;

      if (mode === 'create') {
        await apiClient.post('/users', { ...payload, password: form.password });
      } else {
        await apiClient.patch(`/users/${initial!.id}`, payload);
      }
    },
    onSuccess: () => { onSaved(); onClose(); },
  });

  const set = (field: keyof UserForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const isValid = form.fullName && form.email && form.role && (mode === 'edit' || form.password);

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center sm:p-4">
      <div className="bg-white w-full sm:rounded-2xl rounded-t-2xl shadow-2xl sm:max-w-md max-h-[92vh] overflow-y-auto">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="font-bold text-gray-900">{mode === 'create' ? 'Create User' : 'Edit User'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <div className="px-6 py-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Full Name *</label>
            <input
              type="text"
              value={form.fullName}
              onChange={set('fullName')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-400"
              placeholder="Jane Smith"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Email *</label>
            <input
              type="email"
              value={form.email}
              onChange={set('email')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-400"
              placeholder="jane@example.com"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              {mode === 'create' ? 'Password *' : 'New Password (leave blank to keep current)'}
            </label>
            <input
              type="password"
              value={form.password}
              onChange={set('password')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-400"
              placeholder={mode === 'edit' ? '(unchanged)' : 'Minimum 8 characters'}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Role *</label>
              <select
                value={form.role}
                onChange={set('role')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-400"
              >
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Station</label>
              <select
                value={form.stationId}
                onChange={set('stationId')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-400"
              >
                <option value="">None</option>
                {stations.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          {mutation.isError && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-xs text-red-700">
              Failed to save user. Please check the details and try again.
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
            {mutation.isPending ? 'Saving…' : mode === 'create' ? 'Create User' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminUsersPage() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);

  const { data: users = [], isLoading } = useQuery({ queryKey: ['admin-users'], queryFn: fetchUsers });
  const { data: stations = [] } = useQuery({ queryKey: ['admin-stations'], queryFn: fetchStations });

  const refresh = () => qc.invalidateQueries({ queryKey: ['admin-users'] });

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">User Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">{users.length} users total</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700"
        >
          + Create User
        </button>
      </header>

      <div className="px-4 sm:px-6 py-6 max-w-7xl mx-auto">
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-gray-400 text-sm">Loading users…</div>
          ) : users.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">No users found.</div>
          ) : (
            <>
              {/* Mobile: card list */}
              <div className="md:hidden divide-y">
                {users.map((user) => (
                  <div key={user.id} className="px-4 py-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium text-gray-900 truncate">{user.fullName}</div>
                      <div className="text-xs text-gray-500 truncate">{user.email}</div>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ROLE_COLORS[user.role] ?? 'bg-gray-100 text-gray-600'}`}>
                          {user.role.replace(/_/g, ' ')}
                        </span>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${user.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </span>
                        {user.station && (
                          <span className="text-xs text-gray-500">· {user.station.name}</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => setEditUser(user)}
                      className="shrink-0 text-xs text-blue-600 hover:text-blue-800 font-medium py-1"
                    >
                      Edit
                    </button>
                  </div>
                ))}
              </div>

              {/* Desktop: table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Full Name</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Role</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Station</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {users.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-gray-900">{user.fullName}</td>
                        <td className="px-4 py-3 text-gray-600">{user.email}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ROLE_COLORS[user.role] ?? 'bg-gray-100 text-gray-600'}`}>
                            {user.role.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {user.station ? user.station.name : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${user.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {user.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => setEditUser(user)} className="text-xs text-blue-600 hover:text-blue-800 font-medium">
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
        <UserModal
          mode="create"
          stations={stations}
          onClose={() => setShowCreate(false)}
          onSaved={refresh}
        />
      )}

      {editUser && (
        <UserModal
          mode="edit"
          initial={editUser}
          stations={stations}
          onClose={() => setEditUser(null)}
          onSaved={refresh}
        />
      )}
    </div>
  );
}
