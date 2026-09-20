export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

export interface QRAnalysis {
  isQRCode: boolean;
  isUPI: boolean;
  riskLevel: RiskLevel;
  riskScore: number;
  upiId?: string;
  payeeName?: string;
  amount?: string;
  currency?: string;
  rawData: string;
  warnings: string[];
  checks: string[];
}

function isValidUPIId(upiId: string): boolean {
  return /^[a-zA-Z0-9._-]{2,}@[a-zA-Z0-9.-]{2,}$/.test(upiId);
}

export function analyzeQR(rawData: string): QRAnalysis {
  const warnings: string[] = [];
  const checks: string[] = [];

  let riskScore = 0;

  const result: QRAnalysis = {
    isQRCode: true,
    isUPI: false,
    riskLevel: "LOW",
    riskScore: 0,
    rawData,
    warnings,
    checks,
  };

  // Basic UPI detection
  if (!rawData.toLowerCase().startsWith("upi://pay")) {
    riskScore += 35;
    warnings.push(
      "This QR does not contain a standard UPI payment URI."
    );

    result.riskLevel = "HIGH";
    result.riskScore = riskScore;

    return result;
  }

  result.isUPI = true;
  checks.push("Valid UPI payment URI detected");

  try {
    const url = new URL(rawData);

    const upiId = url.searchParams.get("pa");
    const payeeName = url.searchParams.get("pn");
    const amount = url.searchParams.get("am");
    const currency = url.searchParams.get("cu");

    result.upiId = upiId || undefined;
    result.payeeName = payeeName || undefined;
    result.amount = amount || undefined;
    result.currency = currency || undefined;

    // UPI ID validation
    if (!upiId) {
      riskScore += 30;
      warnings.push("UPI ID is missing.");
    } else if (!isValidUPIId(upiId)) {
      riskScore += 25;
      warnings.push("UPI ID format appears invalid.");
    } else {
      checks.push("UPI ID format is valid");
    }

    // Payee name
    if (!payeeName) {
      riskScore += 10;
      warnings.push("Payee name is not provided.");
    } else {
      checks.push("Payee information is present");
    }

    // Amount
    if (amount) {
      const numericAmount = Number(amount);

      if (
        !Number.isFinite(numericAmount) ||
        numericAmount <= 0
      ) {
        riskScore += 20;
        warnings.push("Payment amount is invalid.");
      } else {
        checks.push("Payment amount is valid");
      }
    }

    // Currency
    if (currency && currency !== "INR") {
      riskScore += 10;
      warnings.push(
        `Unexpected currency detected: ${currency}`
      );
    } else if (currency === "INR") {
      checks.push("Currency is INR");
    }

    // Suspicious external URLs
    const suspiciousUrl =
      /https?:\/\/|www\./i.test(rawData);

    if (suspiciousUrl) {
      riskScore += 20;
      warnings.push(
        "The QR payload contains an external URL."
      );
    }

    // Determine risk
    if (riskScore >= 50) {
      result.riskLevel = "HIGH";
    } else if (riskScore >= 20) {
      result.riskLevel = "MEDIUM";
    } else {
      result.riskLevel = "LOW";
    }

    result.riskScore = Math.min(riskScore, 100);

    return result;
  } catch (error) {
    console.error(error);

    result.riskScore = 60;
    result.riskLevel = "HIGH";

    warnings.push(
      "The QR payload could not be parsed safely."
    );

    return result;
  }
}