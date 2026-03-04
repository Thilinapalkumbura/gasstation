'use client';

import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/store/auth.store';
import { useStockStore } from '@/store/stock.store';
import { useAlertsStore } from '@/store/alerts.store';

const WS_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/**
 * Establishes a WebSocket connection to the /stock namespace and listens for
 * ALL reorder alert events (fuel tanks, spare parts, gas cylinders).
 * Call this once at the dashboard layout level so alerts are always received.
 */
export function useAlertsSocket() {
  const socketRef = useRef<Socket | null>(null);
  const accessToken = useAuthStore((s) => s.accessToken);
  const { addAlert: addTankAlert } = useStockStore();
  const { addSparePartAlert, addCylinderAlert } = useAlertsStore();

  useEffect(() => {
    if (!accessToken) return;

    const socket = io(`${WS_URL}/stock`, {
      auth: { token: accessToken },
      transports: ['websocket'],
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    socketRef.current = socket;

    // Fuel tank low-stock alert
    socket.on('stock:low-alert', (payload: { data: any; timestamp: string }) => {
      addTankAlert({ ...payload.data, receivedAt: payload.timestamp });
    });

    // Spare parts reorder alert
    socket.on('alert:spare-parts-low', (payload: { data: any; timestamp: string }) => {
      addSparePartAlert(payload.data, payload.timestamp);
    });

    // Gas cylinder reorder alert
    socket.on('alert:cylinder-low', (payload: { data: any; timestamp: string }) => {
      addCylinderAlert(payload.data, payload.timestamp);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [accessToken]);

  return socketRef.current;
}
