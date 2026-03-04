'use client';

import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/store/auth.store';
import { useStockStore } from '@/store/stock.store';
import { TankSnapshot } from '@/lib/api/stock.api';

const WS_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export function useStockSocket(stationId?: string) {
  const socketRef = useRef<Socket | null>(null);
  const accessToken = useAuthStore((s) => s.accessToken);
  const { updateTank, setTanks, addAlert, setConnected } = useStockStore();

  useEffect(() => {
    if (!accessToken) return;

    // Create socket with JWT auth
    const socket = io(`${WS_URL}/stock`, {
      auth: { token: accessToken },
      transports: ['websocket'],
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    socketRef.current = socket;

    // ── Connection lifecycle ─────────────────────────────────────────────────
    socket.on('connect', () => {
      setConnected(true);

      // Subscribe to a specific station room if provided
      if (stationId) {
        socket.emit('subscribe:station', { stationId });
      }
    });

    socket.on('disconnect', () => setConnected(false));
    socket.on('connect_error', () => setConnected(false));

    // ── Initial snapshot — full list pushed on connect ─────────────────────
    socket.on('stock:snapshot', (payload: { data: TankSnapshot[] }) => {
      setTanks(payload.data);
    });

    // ── Real-time stock level update ───────────────────────────────────────
    socket.on('stock:update', (payload: { data: TankSnapshot }) => {
      updateTank(payload.data);
    });

    // ── Low-stock alert ────────────────────────────────────────────────────
    socket.on('stock:low-alert', (payload: { data: any; timestamp: string }) => {
      addAlert({ ...payload.data, receivedAt: payload.timestamp });
    });

    return () => {
      if (stationId) {
        socket.emit('unsubscribe:station', { stationId });
      }
      socket.disconnect();
      setConnected(false);
    };
  }, [accessToken, stationId]);

  return socketRef.current;
}
