import { useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";

interface QRScannerProps {
  onScan: (decodedText: string) => void;
  onClose?: () => void;
}

export default function QRScanner({
  onScan,
  onClose,
}: QRScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannedRef = useRef(false);

  useEffect(() => {
    const scannerId = "upi-saathi-qr-reader";

    const scanner = new Html5Qrcode(scannerId);
    scannerRef.current = scanner;

    scanner
      .start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: {
            width: 250,
            height: 250,
          },
        },
        async (decodedText) => {
          if (scannedRef.current) return;

          scannedRef.current = true;

          try {
            await scanner.stop();
          } catch {
            // Scanner may already have stopped.
          }

          onScan(decodedText);
        },
        () => {
          // Ignore normal scanning failures.
        }
      )
      .catch((error) => {
        console.error("Camera error:", error);
      });

    return () => {
      if (scannerRef.current) {
        scannerRef.current
          .stop()
          .catch(() => {});
      }
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <div className="flex items-center justify-between p-4 text-white">
        <h2 className="text-lg font-semibold">
          Scan UPI QR
        </h2>

        {onClose && (
          <button
            onClick={onClose}
            className="rounded-lg bg-white/10 px-4 py-2"
          >
            Close
          </button>
        )}
      </div>

      <div className="flex flex-1 items-center justify-center p-4">
        <div
          id="upi-saathi-qr-reader"
          className="w-full max-w-md overflow-hidden rounded-2xl"
        />
      </div>

      <div className="p-6 text-center text-white">
        <p className="text-sm opacity-80">
          Point your camera at a UPI QR code
        </p>

        <p className="mt-2 text-xs opacity-60">
          UPI-Saathi will analyze the QR before you pay.
        </p>
      </div>
    </div>
  );
}