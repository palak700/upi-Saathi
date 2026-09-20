import type { QRAnalysis } from "../lib/qrAnalyzer";

interface QRResultProps {
  result: QRAnalysis;
  onScanAgain: () => void;
}

export default function QRResult({
  result,
  onScanAgain,
}: QRResultProps) {
  const riskStyles = {
    LOW: {
      title: "LOW RISK",
      icon: "✓",
      box: "border-green-500 bg-green-50",
      text: "text-green-700",
    },
    MEDIUM: {
      title: "MEDIUM RISK",
      icon: "!",
      box: "border-yellow-500 bg-yellow-50",
      text: "text-yellow-700",
    },
    HIGH: {
      title: "HIGH RISK",
      icon: "⚠",
      box: "border-red-500 bg-red-50",
      text: "text-red-700",
    },
  };

  const style = riskStyles[result.riskLevel];

  return (
    <div className="mx-auto max-w-xl p-6">
      <div
        className={`rounded-2xl border-2 p-6 ${style.box}`}
      >
        <div className="flex items-center gap-4">
          <div
            className={`flex h-14 w-14 items-center justify-center rounded-full bg-white text-2xl font-bold ${style.text}`}
          >
            {style.icon}
          </div>

          <div>
            <h2
              className={`text-xl font-bold ${style.text}`}
            >
              {style.title}
            </h2>

            <p className="text-sm text-gray-600">
              Risk score: {result.riskScore}/100
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold">
          Payment Details
        </h3>

        <div className="space-y-4">
          <div>
            <p className="text-xs text-gray-500">
              Payee
            </p>
            <p className="font-medium">
              {result.payeeName || "Not available"}
            </p>
          </div>

          <div>
            <p className="text-xs text-gray-500">
              UPI ID
            </p>
            <p className="font-medium break-all">
              {result.upiId || "Not available"}
            </p>
          </div>

          <div>
            <p className="text-xs text-gray-500">
              Amount
            </p>
            <p className="font-medium">
              {result.amount
                ? `₹${result.amount}`
                : "Not specified"}
            </p>
          </div>

          <div>
            <p className="text-xs text-gray-500">
              QR Type
            </p>
            <p className="font-medium">
              {result.isUPI
                ? "UPI Payment QR"
                : "Unknown QR"}
            </p>
          </div>
        </div>
      </div>

      {result.checks.length > 0 && (
        <div className="mt-6 rounded-2xl border bg-white p-6">
          <h3 className="mb-4 font-semibold">
            Security Checks
          </h3>

          <div className="space-y-3">
            {result.checks.map((check, index) => (
              <div
                key={index}
                className="flex gap-3 text-sm"
              >
                <span className="text-green-600">
                  ✓
                </span>
                <span>{check}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {result.warnings.length > 0 && (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-6">
          <h3 className="mb-4 font-semibold text-red-700">
            Warnings
          </h3>

          <div className="space-y-3">
            {result.warnings.map((warning, index) => (
              <div
                key={index}
                className="flex gap-3 text-sm text-red-700"
              >
                <span>⚠</span>
                <span>{warning}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={onScanAgain}
        className="mt-6 w-full rounded-xl bg-black px-6 py-3 font-semibold text-white"
      >
        Scan Another QR
      </button>
    </div>
  );
}