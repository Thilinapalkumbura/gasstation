import { create } from 'zustand';
import { UsageLog } from '@/lib/api/usage.api';

interface UsageNotification {
  id: string;
  type: 'approved' | 'rejected';
  log: UsageLog;
  receivedAt: string;
  read: boolean;
}

interface UsageState {
  // Pending logs visible to managers
  pendingLogs: UsageLog[];
  pendingCount: number;

  // Worker's own recent logs
  myLogs: UsageLog[];

  // Manager notifications (approval decisions)
  notifications: UsageNotification[];
  unreadCount: number;

  // Actions
  setPendingLogs: (logs: UsageLog[]) => void;
  addPendingLog: (log: UsageLog) => void;
  removePendingLog: (logId: string) => void;
  setMyLogs: (logs: UsageLog[]) => void;
  updateMyLog: (log: UsageLog) => void;
  addNotification: (type: 'approved' | 'rejected', log: UsageLog) => void;
  markAllRead: () => void;
}

export const useUsageStore = create<UsageState>((set) => ({
  pendingLogs: [],
  pendingCount: 0,
  myLogs: [],
  notifications: [],
  unreadCount: 0,

  setPendingLogs: (logs) =>
    set({ pendingLogs: logs, pendingCount: logs.length }),

  addPendingLog: (log) =>
    set((state) => ({
      pendingLogs: [log, ...state.pendingLogs.filter((l) => l.id !== log.id)],
      pendingCount: state.pendingCount + 1,
    })),

  removePendingLog: (logId) =>
    set((state) => ({
      pendingLogs: state.pendingLogs.filter((l) => l.id !== logId),
      pendingCount: Math.max(0, state.pendingCount - 1),
    })),

  setMyLogs: (logs) => set({ myLogs: logs }),

  updateMyLog: (log) =>
    set((state) => ({
      myLogs: state.myLogs.map((l) => (l.id === log.id ? log : l)),
    })),

  addNotification: (type, log) =>
    set((state) => ({
      notifications: [
        { id: log.id, type, log, receivedAt: new Date().toISOString(), read: false },
        ...state.notifications,
      ],
      unreadCount: state.unreadCount + 1,
    })),

  markAllRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    })),
}));
