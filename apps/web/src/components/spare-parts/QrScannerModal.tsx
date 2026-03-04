'use client';

import { useEffect, useRef, useState } from 'react';

interface Props {
  onScan: (value: string) => void;
  onClose: () => void;
}

const SCANNER_ID = 'qr-scanner-region';

export function QrScannerModal({ onScan, onClose }: Props) {
  const scannerRef = useRef<any>(null);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let stopped = false;

    async function startScanner() {
      // Dynamic import so html5-qrcode never runs on the server
      const { Html5Qrcode } = await import('html5-qrcode');
      const scanner = new Html5Qrcode(SCANNER_ID);
      scannerRef.current = scanner;

      try {
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          (decodedText: string) => {
            if (stopped) return;
            stopped = true;
            scanner.stop().catch(() => {});
            onScan(decodedText.trim());
            onClose();
          },
          () => {}, // per-frame errors are normal — suppress them
        );
        setReady(true);
      } catch (err: any) {
        setError(
          err?.message?.includes('Permission')
            ? 'Camera permission denied. Please allow camera access and try again.'
            : 'Could not start camera. Make sure no other app is using it.',
        );
      }
    }

    startScanner();

    return () => {
      stopped = true;
      scannerRef.current?.stop().catch(() => {});
    };
  }, [onScan, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Scan Spare Part QR</h3>
            <p className="text-xs text-gray-500 mt-0.5">Point camera at the part's QR label</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none p-1"
          >
            &times;
          </button>
        </div>

        {/* Scanner viewport */}
        <div className="p-4">
          {error ? (
            <div className="p-4 bg-red-50 text-red-700 text-sm rounded-lg text-center">
              {error}
            </div>
          ) : (
            <div className="relative">
              {/* html5-qrcode mounts the video here */}
              <div
                id={SCANNER_ID}
                className="w-full rounded-lg overflow-hidden bg-gray-900"
                style={{ minHeight: '280px' }}
              />
              {/* Aiming overlay */}
              {ready && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-48 h-48 border-2 border-white/70 rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-5 pb-4 text-center">
          <p className="text-xs text-gray-400">
            The SKU encoded in the QR will auto-match the part in the catalog.
          </p>
          <button
            onClick={onClose}
            className="mt-3 w-full border border-gray-300 text-sm text-gray-700 rounded-lg py-2 hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
