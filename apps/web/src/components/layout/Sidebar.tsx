'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { cn } from '@/lib/utils';

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

const ADMIN_NAV: NavItem[] = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: '⊞' },
  { href: '/admin/users', label: 'Users', icon: '👥' },
  { href: '/admin/stations', label: 'Stations', icon: '⛽' },
  { href: '/admin/reports', label: 'Reports', icon: '📊' },
  { href: '/admin/tax', label: 'Tax / IRD', icon: '🧾' },
];

const BACKOFFICE_NAV: NavItem[] = [
  { href: '/backoffice/dashboard', label: 'Dashboard', icon: '⊞' },
  { href: '/backoffice/stock', label: 'Stock', icon: '⛽' },
  { href: '/backoffice/usage', label: 'Usage Logs', icon: '📋' },
  { href: '/backoffice/orders', label: 'Orders', icon: '🛒' },
  { href: '/backoffice/reports', label: 'Reports', icon: '📊' },
  { href: '/backoffice/tax', label: 'Tax / IRD', icon: '🧾' },
  { href: '/backoffice/vehicle-services', label: 'Vehicle Services', icon: '🔧' },
  { href: '/backoffice/car-wash', label: 'Car Wash', icon: '🚿' },
  { href: '/backoffice/spare-parts', label: 'Spare Parts', icon: '🔩' },
  { href: '/backoffice/gas-cylinders', label: 'Gas Cylinders', icon: '🫙' },
];

const MANAGER_NAV: NavItem[] = [
  { href: '/manager/dashboard', label: 'Dashboard', icon: '⊞' },
  { href: '/manager/orders', label: 'Orders', icon: '🛒' },
  { href: '/manager/vehicle-services', label: 'Vehicle Services', icon: '🔧' },
  { href: '/manager/car-wash', label: 'Car Wash', icon: '🚿' },
  { href: '/manager/spare-parts', label: 'Spare Parts', icon: '🔩' },
  { href: '/manager/gas-cylinders', label: 'Gas Cylinders', icon: '🫙' },
];

const WORKER_NAV: NavItem[] = [
  { href: '/worker/dashboard', label: 'Dashboard', icon: '⊞' },
  { href: '/worker/usage', label: 'Log Usage', icon: '📋' },
  { href: '/worker/vehicle-services', label: 'Vehicle Services', icon: '🔧' },
  { href: '/worker/car-wash', label: 'Car Wash', icon: '🚿' },
  { href: '/worker/spare-parts', label: 'Spare Parts', icon: '🔩' },
  { href: '/worker/gas-cylinders', label: 'Gas Cylinders', icon: '🫙' },
];

function getNav(role: string | undefined): NavItem[] {
  if (role === 'ADMIN') return ADMIN_NAV;
  if (role === 'BACK_OFFICE') return BACKOFFICE_NAV;
  if (role === 'STATION_MANAGER') return MANAGER_NAV;
  return WORKER_NAV;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: Props) {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const nav = getNav(user?.role);

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar panel */}
      <aside className={cn(
        'fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 text-white flex flex-col transition-transform duration-200 ease-in-out',
        'md:static md:w-56 md:translate-x-0 md:shrink-0',
        isOpen ? 'translate-x-0' : '-translate-x-full',
      )}>
        {/* Logo + close button on mobile */}
        <div className="px-5 py-5 border-b border-gray-800 flex items-center justify-between">
          <div>
            <div className="font-bold text-lg leading-tight">⛽ GasStation</div>
            <div className="text-xs text-gray-400 mt-0.5">Management System</div>
          </div>
          <button
            onClick={onClose}
            className="md:hidden text-gray-400 hover:text-white p-1 rounded"
            aria-label="Close menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {nav.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  active
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white',
                )}
              >
                <span className="text-base leading-none">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className="px-4 py-4 border-t border-gray-800">
          <div className="text-xs text-gray-400 truncate">{user?.fullName}</div>
          <div className="text-xs text-gray-500 truncate">{user?.role?.replace(/_/g, ' ')}</div>
          <button
            onClick={logout}
            className="mt-2 text-xs text-red-400 hover:text-red-300"
          >
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
