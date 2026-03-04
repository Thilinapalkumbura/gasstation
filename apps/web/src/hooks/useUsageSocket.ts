'use client';

import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/store/auth.store';
import { useUsageStore } from '@/store/usage.store';
import { UsageLog } from '@/lib/api/usage.api';

const WS_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export function useUsageSocket(stationId?: string) {
  const socketRef = useRef<Socket | null>(null);
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const { addPendingLog, removePendingLog, updateMyLog, addNotification } = useUsageStore();

  useEffect(() => {
    if (!accessToken) return;

    const socket = io(`${WS_URL}/usage`, {
      auth: { token: accessToken },
      transports: ['websocket'],
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    socketRef.current = socket;

    if (stationId) {
      socket.on('connect', () => socket.emit('subscribe:station', { stationId }));
    }

    // ── A worker submitted a shift log (managers/back-office see this) ──────
    socket.on('usage:submitted', (payload: { data: UsageLog }) => {
      if (['STATION_MANAGER', 'BACK_OFFICE', 'ADMIN'].includes(user?.role ?? '')) {
        addPendingLog(payload.data);
      }
    });

    // ── Manager approved — update worker's log + show notification ──────────
    socket.on('usage:approved', (payload: { data: UsageLog }) => {
      updateMyLog(payload.data);
      removePendingLog(payload.data.id);
      // If current user is the worker, add a notification
      if (user?.role === 'WORKER') {
        addNotification('approved', payload.data);
      } else {
        removePendingLog(payload.data.id);
      }
    });

    // ── Manager rejected — update worker's log + show notification ──────────
    socket.on('usage:rejected', (payload: { data: UsageLog }) => {
      updateMyLog(payload.data);
      if (user?.role === 'WORKER') {
        addNotification('rejected', payload.data);
      } else {
        removePendingLog(payload.data.id);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [accessToken, stationId]);

  return socketRef.current;
}
