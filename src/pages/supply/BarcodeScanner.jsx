// BarcodeScanner.jsx
// Requires: npm install html5-qrcode
import { useEffect, useRef, useState } from 'react'
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode'
import { X, Camera } from 'lucide-react'

/**
 * Camera barcode scanner modal.
 * Props:
 *   onScan(decodedText) — called when a barcode is successfully read
 *   onClose()           — called when user dismisses the scanner
 *   title               — optional modal title (default "Scan Barcode")
 */
export default function BarcodeScanner({ onScan, onClose, title = 'Scan Barcode' }) {
  const scannerRef = useRef(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const scannerId = 'barcode-scanner-region'

    const scanner = new Html5QrcodeScanner(
      scannerId,
      {
        fps: 10,
        qrbox: { width: 260, height: 160 },
        supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
        aspectRatio: 1.6,
        showTorchButtonIfSupported: true,
      },
      false // verbose
    )

    scanner.render(
      (decodedText) => {
        scanner.clear().catch(() => {})
        onScan(decodedText.trim())
      },
      (errorMsg) => {
        // Suppress continuous "not found" errors — only show real failures
        if (!errorMsg.includes('No MultiFormat Readers')) {
          setError(errorMsg)
        }
      }
    )

    scannerRef.current = scanner

    return () => {
      scanner.clear().catch(() => {})
    }
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Camera size={18} className="text-brand-600" />
            <h2 className="font-display font-semibold text-slate-800">{title}</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Scanner region */}
        <div className="p-4">
          <div id="barcode-scanner-region" className="w-full rounded-xl overflow-hidden" />
          {error && (
            <p className="mt-3 text-xs text-red-500 text-center">{error}</p>
          )}
          <p className="mt-3 text-xs text-slate-400 text-center">
            Point your camera at a barcode or QR code
          </p>
        </div>

        <div className="px-5 pb-4">
          <button onClick={onClose}
            className="w-full py-2.5 border border-slate-200 text-slate-600 text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors">
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
