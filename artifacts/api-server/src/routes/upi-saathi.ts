import { Router, type IRouter } from "express";
import { and, desc, eq } from "drizzle-orm";
import {
  GetAnalyticsResponse,
  GetAssistantHistoryResponse,
  ConfirmPaymentBody,
  DetectIntentBody,
  GetDashboardResponse,
  GetFraudAlertsResponse,
  GetHistoryResponse,
  GetLanguagesResponse,
  GetNotificationsResponse,
  GetQrHistoryResponse,
  GetSettingsResponse,
  GetTutorialsResponse,
  MarkNotificationReadParams,
  MarkNotificationReadResponse,
  ReadQrBody,
  ReadQrResponse,
  GuidePaymentBody,
  SendAssistantMessageBody,
  SaveSettingsBody,
  SpeakTextBody,
  SpeakTextResponse,
  SubmitFraudQuizBody,
  SubmitFraudQuizResponse,
  TranslateTextBody,
  TranslateTextResponse,
  UpdateTutorialProgressBody,
  UpdateTutorialProgressParams,
  UpdateTutorialProgressResponse,
  TranscribeVoiceBody,
} from "@workspace/api-zod";
import {
  activityLogsTable,
  assistantHistoryTable,
  db,
  fraudAlertsTable,
  hasDatabase,
  learningProgressTable,
  notificationsTable,
  paymentsTable,
  qrHistoryTable,
  settingsTable,
  tutorialsTable,
} from "@workspace/db";

const router: IRouter = Router();
const DEMO_LABEL = "SIMULATED DEMO TRANSACTION";

const languages = [
  { code: "en", name: "English", nativeName: "English" },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी" },
  { code: "mr", name: "Marathi", nativeName: "मराठी" },
  { code: "ta", name: "Tamil", nativeName: "தமிழ்" },
  { code: "te", name: "Telugu", nativeName: "తెలుగు" },
  { code: "gu", name: "Gujarati", nativeName: "ગુજરાતી" },
  { code: "bn", name: "Bengali", nativeName: "বাংলা" },
  { code: "kn", name: "Kannada", nativeName: "ಕನ್ನಡ" },
  { code: "ml", name: "Malayalam", nativeName: "മലയാളം" },
  { code: "pa", name: "Punjabi", nativeName: "ਪੰਜਾਬੀ" },
  { code: "raj", name: "Rajasthani", nativeName: "राजस्थानी" },
];

const seedTutorials = [
  { title: "UPI basics", description: "Learn the simple steps behind a safe digital payment.", icon: "compass", difficulty: "Starter", minutes: 4, progress: 100, offline: true },
  { title: "QR codes explained", description: "Understand what to check before scanning any QR code.", icon: "scan", difficulty: "Starter", minutes: 6, progress: 68, offline: true },
  { title: "Protect your UPI PIN", description: "Your PIN is private. Learn the one rule that keeps it safe.", icon: "shield", difficulty: "Essential", minutes: 3, progress: 32, offline: true },
  { title: "Spot a fraud attempt", description: "Practice noticing urgency, pressure, and suspicious requests.", icon: "alert", difficulty: "Essential", minutes: 7, progress: 0, offline: true },
  { title: "Collect requests", description: "See how a collect request works and when to decline it.", icon: "inbox", difficulty: "Guided", minutes: 5, progress: 0, offline: true },
  { title: "Safe payment habits", description: "Build a repeatable safety check for everyday payments.", icon: "check", difficulty: "Guided", minutes: 8, progress: 0, offline: true },
];

async function seedIfEmpty() {
  const existing = await db.select({ id: tutorialsTable.id }).from(tutorialsTable).limit(1);
  if (existing.length === 0) {
    await db.insert(tutorialsTable).values(seedTutorials);
  }
  const setting = await db.select({ id: settingsTable.id }).from(settingsTable).limit(1);
  if (setting.length === 0) {
    await db.insert(settingsTable).values({});
  }
  const notification = await db.select({ id: notificationsTable.id }).from(notificationsTable).limit(1);
  if (notification.length === 0) {
    await db.insert(notificationsTable).values([
      { type: "safety", title: "Daily safety tip", message: "Never enter your UPI PIN to receive money." },
      { type: "learning", title: "Keep your learning streak", message: "Try one short Saathi lesson today." },
      { type: "accessibility", title: "Make reading easier", message: "Larger text and high contrast are available in Accessibility." },
    ]);
  }
}

function parseIntent(text: string) {
  const normalized = text.toLowerCase();
  const amountMatch = normalized.match(/(?:₹|rs\.?|rupees?|inr)?\s*([0-9][0-9,]*)/i);
  const amount = amountMatch ? Number(amountMatch[1].replaceAll(",", "")) : null;
  const knownNames: Record<string, string> = {
    mom: "Mom",
    maa: "Maa",
    mother: "Mother",
    meera: "Meera",
    rahul: "Rahul",
    dad: "Dad",
    father: "Father",
    sister: "Sister",
    brother: "Brother",
  };
  const recipient = Object.entries(knownNames).find(([name]) => normalized.includes(name))?.[1];
  if (normalized.includes("scan") || normalized.includes("qr")) {
    return {
      transcript: text,
      intent: "SCAN_QR",
      confidence: 0.96,
      entities: { recipient: "", amount: 0, currency: "INR" },
      response: "I can guide you through checking a QR code before any simulated payment.",
    };
  }
  if (normalized.includes("fraud") || normalized.includes("scam")) {
    return {
      transcript: text,
      intent: "FRAUD_HELP",
      confidence: 0.94,
      entities: { recipient: "", amount: 0, currency: "INR" },
      response: "I can help you spot common payment scams and decide what to do next.",
    };
  }
if (normalized.includes("cancel")) {
    return {
      transcript: text,
      intent: "CANCEL_PAYMENT",
      confidence: 0.97,
      entities: { recipient: "", amount: 0, currency: "INR" },
      response: "No problem. We will not create a simulated transaction.",
    };
  }
  if (normalized.includes("recharge")) {
    const rechargeAmount = amountMatch ? Number(amountMatch[1].replaceAll(",", "")) : 199;
    return {
      transcript: text,
      intent: "MOBILE_RECHARGE",
      confidence: 0.97,
      entities: { recipient: "Mobile Recharge", amount: rechargeAmount, currency: "INR" },
      response: `You want to recharge your mobile phone with ₹${rechargeAmount.toLocaleString("en-IN")}. Please confirm the details.`,
    };
  }
  const transferRecipient = recipient ?? "";
  const transferAmount = amount ?? 0;
  const hasTransferDetails = Boolean(recipient && amount);
  return {
    transcript: text,
    intent: hasTransferDetails ? "SEND_MONEY" : "NEEDS_DETAILS",
    confidence: hasTransferDetails ? 0.96 : 0.72,
    entities: { recipient: transferRecipient, amount: transferAmount, currency: "INR" },
    response: recipient && amount
      ? `You want to send ₹${transferAmount.toLocaleString("en-IN")} to ${transferRecipient}. Please confirm the details.`
      : recipient
        ? `I heard ${transferRecipient}, but I still need the amount before this can become a practice payment.`
        : amount
          ? `I found an amount of ₹${transferAmount.toLocaleString("en-IN")}, but I could not identify the recipient. Please review before continuing.`
          : "I still need the recipient and amount before this can become a practice payment.",
  };
}

function buildSafety(recipient: string, amount: number) {
  const warnings: string[] = [];
  if (amount > 10000) warnings.push("This is a high-value payment. Take a moment to verify the amount.");
  if (!["Mom", "Maa", "Mother", "Meera", "Rahul", "Dad", "Father", "Sister", "Brother", "Mobile Recharge"].includes(recipient)) {
    warnings.push("This recipient is not in your familiar demo contacts.");
  }
  if (/collect|request|receive/i.test(recipient)) {
    warnings.push("Never enter your UPI PIN to receive money.");
  }
  const checks = [
    { name: "recipient_verification", passed: recipient.length > 0, detail: "Recipient name is visible before confirmation." },
    { name: "amount_verification", passed: amount > 0, detail: "Amount is clearly shown in Indian rupees." },
    { name: "payment_type_verification", passed: true, detail: "This is marked as a personal demo transfer." },
    { name: "suspicious_pattern", passed: warnings.length === 0, detail: warnings.length === 0 ? "No suspicious pattern detected." : "Review the warning before continuing." },
    { name: "unknown_recipient", passed: !warnings.some((warning) => warning.includes("familiar")), detail: "Familiar demo contact check completed." },
    { name: "repeated_payment", passed: true, detail: "No repeated demo payment pattern detected." },
    { name: "collect_request_warning", passed: !warnings.some((warning) => warning.includes("receive")), detail: "Receiving money never requires a PIN." },
    { name: "otp_warning", passed: true, detail: "Saathi will never ask for a one-time password." },
    { name: "pin_protection", passed: true, detail: "UPI Saathi will never ask for a real UPI PIN." },
    { name: "screen_sharing_warning", passed: true, detail: "Never share your screen while entering payment credentials." },
  ];
  return {
    safe: warnings.length === 0,
    warnings,
    checks,
    summary: warnings.length === 0 ? "Ready for your review. This is a simulated demo only." : "Review the safety alert before deciding what to do.",
  };
}

function toPayment(payment: typeof paymentsTable.$inferSelect) {
  return {
    id: String(payment.id),
    recipient: payment.recipient,
    amount: Number(payment.amount),
    date: payment.date.toISOString(),
    status: payment.status,
    safetyStatus: payment.safetyStatus,
    source: payment.source,
    demoLabel: DEMO_LABEL,
    transactionId: payment.transactionId,
    paymentType: payment.paymentType,
    learningNote: payment.learningNote,
  };
}

function transactionId() {
  const date = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `UPI-DEMO-${date}-${suffix}`;
}

function assistantReply(message: string) {
  const normalized = message.toLowerCase();
  if (normalized.includes("qr")) return "To scan a QR code safely, check the person or shop name first, then check the amount. If anything feels unexpected, stop. A QR code cannot receive money from you without your approval.";
  if (normalized.includes("pin")) return "Your UPI PIN is private. It approves a payment, so never share it with anyone and never enter it to receive money.";
  if (normalized.includes("collect")) return "A collect request asks you to approve a payment. Read who sent it and the amount. Decline it if you did not expect it.";
  if (normalized.includes("scam") || normalized.includes("avoid")) return "Pause when someone creates urgency. Do not share OTPs, PINs, or your screen. Contact the official bank or app support using its own app.";
  if (normalized.includes("payment") || normalized.includes("send")) return "Saathi can help you check the recipient, amount, and safety warnings before a simulated demo payment. No real payment happens here.";
  return "I can explain QR codes, UPI PINs, collect requests, fraud warnings, accessibility, or the steps in a simulated payment.";
}

const translationSamples: Record<string, string> = {
  hi: "मैं भुगतान से पहले आपको नाम और राशि दिखाऊँगा।",
  mr: "मी पैसे पाठवण्यापूर्वी नाव आणि रक्कम दाखवेन.",
  bn: "আমি পেমেন্টের আগে নাম এবং পরিমাণ দেখাব।",
  ta: "பணம் செலுத்தும் முன் பெயர் மற்றும் தொகையை நான் காட்டுவேன்.",
  te: "చెల్లించే ముందు పేరు మరియు మొత్తాన్ని నేను చూపిస్తాను.",
  gu: "હું ચુકવણી પહેલાં નામ અને રકમ બતાવીશ.",
  kn: "ಪಾವತಿಸುವ ಮೊದಲು ನಾನು ಹೆಸರು ಮತ್ತು ಮೊತ್ತವನ್ನು ತೋರಿಸುತ್ತೇನೆ.",
  ml: "പണമടയ്ക്കുന്നതിന് മുമ്പ് ഞാൻ പേരും തുകയും കാണിക്കും.",
  pa: "ਮੈਂ ਭੁਗਤਾਨ ਤੋਂ ਪਹਿਲਾਂ ਨਾਮ ਅਤੇ ਰਕਮ ਦਿਖਾਵਾਂਗਾ।",
  raj: "मैं भुगतान सूं पहलां नाम अर रकम दिखाऊंगा।",
};

type MemoryPayment = ReturnType<typeof toPayment>;
type MemoryTutorial = (typeof seedTutorials)[number] & { id: string };
type MemoryNotification = {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
};
type MemoryQr = {
  id: string;
  merchant: string;
  amount: number;
  status: string;
  warning: string | null;
  createdAt: string;
};
type MemoryFraud = {
  id: string;
  category: string;
  result: string;
  createdAt: string;
};
type MemoryAssistant = {
  id: string;
  from: "you" | "saathi";
  message: string;
  createdAt: string;
};

const memorySettings = {
  id: 1,
  profileName: "Aarav",
  language: "en",
  voiceGuidance: true,
  voiceSelection: "default",
  speechSpeed: 1,
  largeText: false,
  highContrast: false,
  simplifiedMode: false,
  reducedMotion: false,
  dailySafetyReminders: true,
  learningReminders: true,
  practiceReminders: true,
};

const memory = {
  payments: [] as MemoryPayment[],
  tutorials: seedTutorials.map((tutorial, index) => ({
    ...tutorial,
    id: String(index + 1),
  })) satisfies MemoryTutorial[],
  notifications: [
    { type: "safety", title: "Daily safety tip", message: "Never enter your UPI PIN to receive money." },
    { type: "learning", title: "Keep your learning streak", message: "Try one short Saathi lesson today." },
    { type: "accessibility", title: "Make reading easier", message: "Larger text and high contrast are available in Accessibility." },
  ].map((notification, index) => ({
    ...notification,
    id: String(index + 1),
    read: false as boolean,
    createdAt: new Date(Date.now() - index * 60_000).toISOString(),
  })) satisfies MemoryNotification[],
  qrHistory: [] as MemoryQr[],
  fraudAlerts: [] as MemoryFraud[],
  assistantHistory: [] as MemoryAssistant[],
  activity: [] as { type: string; value: number; createdAt: Date; metadata?: Record<string, unknown> }[],
  settings: memorySettings,
};

let memoryId = 100;

function nextMemoryId() {
  memoryId += 1;
  return String(memoryId);
}

function logMemoryActivity(type: string, metadata?: Record<string, unknown>) {
  memory.activity.push({ type, value: 1, createdAt: new Date(), metadata });
}

function addMemoryNotification(type: string, title: string, message: string) {
  const notification = {
    id: nextMemoryId(),
    type,
    title,
    message,
    read: false as boolean,
    createdAt: new Date().toISOString(),
  };
  memory.notifications.unshift(notification);
  return notification;
}

function registerMemoryRoutes() {
  router.get("/dashboard", (_req, res) => {
    res.json(GetDashboardResponse.parse({
      userName: memory.settings.profileName,
      accessibilityScore: 86,
      offlineProgress: Math.round(memory.tutorials.reduce((sum, tutorial) => sum + tutorial.progress, 0) / memory.tutorials.length),
      safetyAlerts: memory.notifications.filter((notification) => notification.type === "safety" && !notification.read).length,
      recentPayments: memory.payments.slice(0, 4),
      weeklyActivity: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, index) => ({
        day,
        value: Math.max(1, memory.activity.filter((entry) => entry.createdAt.getDay() === (index + 1) % 7).length),
      })),
    }));
  });

  router.post("/voice/transcribe", (req, res, next) => {
    try {
      const input = TranscribeVoiceBody.parse(req.body);
      res.json(parseIntent(input.transcript));
    } catch (error) {
      next(error);
    }
  });

  router.post("/intent/detect", (req, res, next) => {
    try {
      const input = DetectIntentBody.parse(req.body);
      res.json(parseIntent(input.text));
    } catch (error) {
      next(error);
    }
  });

  router.post("/payment/guide", (req, res, next) => {
    try {
      const input = GuidePaymentBody.parse(req.body);
      res.json(buildSafety(input.recipient, input.amount));
    } catch (error) {
      next(error);
    }
  });

  router.post("/payment/confirm", (req, res, next) => {
    try {
      const input = ConfirmPaymentBody.parse(req.body);
      const safety = buildSafety(input.recipient, input.amount);
      const payment = {
        id: nextMemoryId(),
        recipient: input.recipient,
        amount: input.amount,
        date: new Date().toISOString(),
        status: "completed",
        safetyStatus: safety.safe ? "verified" : "review",
        source: input.source ?? "voice",
        demoLabel: DEMO_LABEL,
        transactionId: transactionId(),
        paymentType: input.source === "qr" ? "MERCHANT_PAYMENT" : "PERSONAL_TRANSFER",
        learningNote: safety.safe
          ? "You verified the recipient and amount before confirming."
          : "You noticed a warning and practiced pausing before a payment.",
      };
      memory.payments.unshift(payment);
      logMemoryActivity("payment_simulation", { source: input.source ?? "voice" });
      addMemoryNotification("payment", "Practice payment saved", `${input.recipient} was added to your simulated history.`);
      res.status(201).json(payment);
    } catch (error) {
      next(error);
    }
  });

  router.get("/history", (_req, res) => {
    res.json(GetHistoryResponse.parse(memory.payments));
  });

  router.get("/tutorials", (_req, res) => {
    res.json(GetTutorialsResponse.parse(memory.tutorials));
  });

  router.get("/languages", (_req, res) => {
    res.json(GetLanguagesResponse.parse(languages));
  });

  router.get("/settings", (_req, res) => {
    res.json(GetSettingsResponse.parse(memory.settings));
  });

  router.post("/settings", (req, res, next) => {
    try {
      Object.assign(memory.settings, SaveSettingsBody.parse(req.body));
      res.json(GetSettingsResponse.parse(memory.settings));
    } catch (error) {
      next(error);
    }
  });

  router.post("/qr/read", (req, res, next) => {
    try {
      const input = ReadQrBody.parse(req.body);
      const safety = buildSafety(input.merchant, input.amount);
      const result = ReadQrResponse.parse({
        detected: true,
        merchant: input.merchant,
        amount: input.amount,
        safe: safety.safe,
        warnings: safety.warnings,
        checks: [
          { name: "qr_detected", passed: true, detail: "A demo QR code was read successfully." },
          { name: "merchant_verified", passed: safety.checks[0].passed, detail: "The merchant name is visible for review." },
          { name: "amount_verified", passed: safety.checks[1].passed, detail: "The practice amount is clearly shown." },
          ...safety.checks.slice(2),
        ],
        summary: safety.safe ? "QR checked. Review the merchant and amount before continuing." : safety.summary,
      });
      memory.qrHistory.unshift({
        id: nextMemoryId(),
        merchant: input.merchant,
        amount: input.amount,
        status: safety.safe ? "verified" : "warning",
        warning: safety.warnings.join(" ") || null,
        createdAt: new Date().toISOString(),
      });
      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  router.get("/qr/history", (_req, res) => {
    res.json(GetQrHistoryResponse.parse(memory.qrHistory));
  });

  router.post("/tutorials/:id/progress", (req, res, next) => {
    try {
      const params = UpdateTutorialProgressParams.parse(req.params);
      const input = UpdateTutorialProgressBody.parse(req.body);
      const tutorial = memory.tutorials.find((item) => item.id === String(params.id));
      if (!tutorial) {
        res.status(404).json({ error: "Tutorial not found" });
        return;
      }
      tutorial.progress = input.progress;
      if (input.completed) {
        addMemoryNotification("learning", "Lesson completed", `${tutorial.title} is now part of your Saathi learning streak.`);
        logMemoryActivity("lesson_completed", { tutorialId: params.id });
      }
      res.json(UpdateTutorialProgressResponse.parse({
        tutorialId: String(params.id),
        progress: input.progress,
        completed: input.completed,
        quizScore: input.quizScore,
        bookmarked: input.bookmarked,
      }));
    } catch (error) {
      next(error);
    }
  });

  router.get("/fraud/alerts", (_req, res) => {
    res.json(GetFraudAlertsResponse.parse(memory.fraudAlerts));
  });

  router.post("/fraud/quiz", (req, res, next) => {
    try {
      const input = SubmitFraudQuizBody.parse(req.body);
      const alert = { id: nextMemoryId(), ...input, createdAt: new Date().toISOString() };
      memory.fraudAlerts.unshift(alert);
      logMemoryActivity("fraud_quiz", { category: input.category, result: input.result });
      res.status(201).json(SubmitFraudQuizResponse.parse(alert));
    } catch (error) {
      next(error);
    }
  });

  router.get("/assistant/history", (_req, res) => {
    res.json(GetAssistantHistoryResponse.parse(memory.assistantHistory));
  });

  router.post("/assistant/message", (req, res, next) => {
    try {
      const input = SendAssistantMessageBody.parse(req.body);
      memory.assistantHistory.push({ id: nextMemoryId(), from: "you", message: input.message, createdAt: new Date().toISOString() });
      const reply = { id: nextMemoryId(), from: "saathi" as const, message: assistantReply(input.message), createdAt: new Date().toISOString() };
      memory.assistantHistory.push(reply);
      logMemoryActivity("assistant_use", { language: input.language ?? "en" });
      res.json(reply);
    } catch (error) {
      next(error);
    }
  });

  router.get("/notifications", (_req, res) => {
    res.json(GetNotificationsResponse.parse(memory.notifications.slice(0, 40)));
  });

  router.patch("/notifications/:id/read", (req, res, next) => {
    try {
      const params = MarkNotificationReadParams.parse(req.params);
      const notification = memory.notifications.find((item) => item.id === String(params.id));
      if (!notification) {
        res.status(404).json({ error: "Notification not found" });
        return;
      }
      notification.read = true;
      res.json(MarkNotificationReadResponse.parse(notification));
    } catch (error) {
      next(error);
    }
  });

  router.patch("/notifications/read-all", (_req, res) => {
    memory.notifications.forEach((notification) => {
      notification.read = true;
    });
    res.status(204).send();
  });

  router.get("/analytics", (_req, res) => {
    const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const quizResults = memory.fraudAlerts.map((entry) => Number(entry.result.match(/\d+/)?.[0] ?? 0)).filter((score) => score > 0);
    res.json(GetAnalyticsResponse.parse({
      practiceSessions: dayLabels.map((day, index) => ({
        day,
        value: memory.activity.filter((entry) => entry.createdAt.getDay() === (index + 1) % 7).reduce((total, entry) => total + entry.value, 0),
      })),
      lessonsCompleted: memory.tutorials.filter((tutorial) => tutorial.progress >= 100).length,
      assistantUses: Math.floor(memory.assistantHistory.length / 2),
      fraudQuizScore: quizResults.length ? Math.round(quizResults.reduce((sum, score) => sum + score, 0) / quizResults.length) : 0,
      accessibilityUsage: [memory.settings.voiceGuidance, memory.settings.largeText, memory.settings.highContrast, memory.settings.simplifiedMode, memory.settings.reducedMotion].filter(Boolean).length,
      paymentSimulations: memory.payments.length,
      languageUsage: [{ language: memory.settings.language, value: 1 }],
    }));
  });

  router.post("/translate", (req, res, next) => {
    try {
      const input = TranslateTextBody.parse(req.body);
      res.json(TranslateTextResponse.parse({
        text: input.text,
        language: input.language,
        translatedText: translationSamples[input.language] ?? input.text,
      }));
    } catch (error) {
      next(error);
    }
  });

  router.post("/voice/speak", (req, res, next) => {
    try {
      const input = SpeakTextBody.parse(req.body);
      res.json(SpeakTextResponse.parse({ text: translationSamples[input.language] ?? input.text, language: input.language, supported: true }));
    } catch (error) {
      next(error);
    }
  });
}

if (!hasDatabase) {
  registerMemoryRoutes();
}

router.get("/dashboard", async (_req, res, next) => {
  try {
    await seedIfEmpty();
    const rows = await db.select().from(paymentsTable).orderBy(desc(paymentsTable.date)).limit(4);
    const data = {
      userName: "Aarav",
      accessibilityScore: 86,
      offlineProgress: 42,
      safetyAlerts: 2,
      recentPayments: rows.map(toPayment),
      weeklyActivity: [
        { day: "Mon", value: 2 },
        { day: "Tue", value: 4 },
        { day: "Wed", value: 3 },
        { day: "Thu", value: 6 },
        { day: "Fri", value: 5 },
        { day: "Sat", value: 7 },
        { day: "Sun", value: 4 },
      ],
    };
    res.json(GetDashboardResponse.parse(data));
  } catch (error) {
    next(error);
  }
});

router.post("/voice/transcribe", (req, res, next) => {
  try {
    const input = TranscribeVoiceBody.parse(req.body);
    res.json(parseIntent(input.transcript));
  } catch (error) {
    next(error);
  }
});

router.post("/intent/detect", (req, res, next) => {
  try {
    const input = DetectIntentBody.parse(req.body);
    res.json(parseIntent(input.text));
  } catch (error) {
    next(error);
  }
});

router.post("/payment/guide", (req, res, next) => {
  try {
    const input = GuidePaymentBody.parse(req.body);
    res.json(buildSafety(input.recipient, input.amount));
  } catch (error) {
    next(error);
  }
});

router.post("/payment/confirm", async (req, res, next) => {
  try {
    const input = ConfirmPaymentBody.parse(req.body);
    const safety = buildSafety(input.recipient, input.amount);
    const id = transactionId();
    const [created] = await db.insert(paymentsTable).values({
      recipient: input.recipient,
      amount: input.amount.toFixed(2),
      status: "completed",
      safetyStatus: safety.safe ? "verified" : "review",
      source: input.source ?? "voice",
      transactionId: id,
      paymentType: input.source === "qr" ? "MERCHANT_PAYMENT" : "PERSONAL_TRANSFER",
      learningNote: safety.safe
        ? "You verified the recipient and amount before confirming."
        : "You noticed a warning and practiced pausing before a payment.",
    }).returning();
    await db.insert(activityLogsTable).values({ activityType: "payment_simulation", value: 1, metadata: JSON.stringify({ source: input.source ?? "voice" }) });
    await db.insert(notificationsTable).values({ type: "payment", title: "Practice payment saved", message: `${input.recipient} was added to your simulated history.` });
    res.status(201).json(toPayment(created));
  } catch (error) {
    next(error);
  }
});

router.get("/history", async (_req, res, next) => {
  try {
    const rows = await db.select().from(paymentsTable).orderBy(desc(paymentsTable.date)).limit(20);
    res.json(GetHistoryResponse.parse(rows.map(toPayment)));
  } catch (error) {
    next(error);
  }
});

router.get("/tutorials", async (_req, res, next) => {
  try {
    await seedIfEmpty();
    const rows = await db.select().from(tutorialsTable).orderBy(tutorialsTable.id);
    res.json(GetTutorialsResponse.parse(rows.map((tutorial) => ({ ...tutorial, id: String(tutorial.id) }))));
  } catch (error) {
    next(error);
  }
});

router.get("/languages", (_req, res) => {
  res.json(GetLanguagesResponse.parse(languages));
});

router.get("/settings", async (_req, res, next) => {
  try {
    await seedIfEmpty();
    const [setting] = await db.select().from(settingsTable).orderBy(settingsTable.id).limit(1);
    res.json(GetSettingsResponse.parse({ ...setting, speechSpeed: Number(setting.speechSpeed) }));
  } catch (error) {
    next(error);
  }
});

router.post("/settings", async (req, res, next) => {
  try {
    const input = SaveSettingsBody.parse(req.body);
    await seedIfEmpty();
    const [setting] = await db.select({ id: settingsTable.id }).from(settingsTable).orderBy(settingsTable.id).limit(1);
    const [updated] = await db.update(settingsTable).set({
      ...input,
      speechSpeed: input.speechSpeed.toFixed(2),
    }).where(eq(settingsTable.id, setting.id)).returning();
    res.json(GetSettingsResponse.parse({ ...updated, speechSpeed: Number(updated.speechSpeed) }));
  } catch (error) {
    next(error);
  }
});

router.post("/qr/read", async (req, res, next) => {
  try {
    const input = ReadQrBody.parse(req.body);
    const safety = buildSafety(input.merchant, input.amount);
    const result = ReadQrResponse.parse({
      detected: true,
      merchant: input.merchant,
      amount: input.amount,
      safe: safety.safe,
      warnings: safety.warnings,
      checks: [
        { name: "qr_detected", passed: true, detail: "A demo QR code was read successfully." },
        { name: "merchant_verified", passed: safety.checks[0].passed, detail: "The merchant name is visible for review." },
        { name: "amount_verified", passed: safety.checks[1].passed, detail: "The practice amount is clearly shown." },
        ...safety.checks.slice(2),
      ],
      summary: safety.safe ? "QR checked. Review the merchant and amount before continuing." : safety.summary,
    });
    await db.insert(qrHistoryTable).values({
      merchant: input.merchant,
      amount: input.amount.toFixed(2),
      status: safety.safe ? "verified" : "warning",
      warning: safety.warnings.join(" ") || null,
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.get("/qr/history", async (_req, res, next) => {
  try {
    const rows = await db.select().from(qrHistoryTable).orderBy(desc(qrHistoryTable.createdAt)).limit(20);
    res.json(GetQrHistoryResponse.parse(rows.map((row) => ({
      id: String(row.id),
      merchant: row.merchant,
      amount: Number(row.amount),
      status: row.status,
      warning: row.warning,
      createdAt: row.createdAt.toISOString(),
    }))));
  } catch (error) {
    next(error);
  }
});

router.post("/tutorials/:id/progress", async (req, res, next) => {
  try {
    const params = UpdateTutorialProgressParams.parse(req.params);
    const input = UpdateTutorialProgressBody.parse(req.body);
    const [tutorial] = await db.select().from(tutorialsTable).where(eq(tutorialsTable.id, params.id)).limit(1);
    if (!tutorial) {
      res.status(404).json({ error: "Tutorial not found" });
      return;
    }
    await db.update(tutorialsTable).set({ progress: input.progress }).where(eq(tutorialsTable.id, params.id));
    await db.insert(learningProgressTable).values({
      tutorialId: params.id,
      completed: input.completed,
      quizScore: input.quizScore,
      bookmarked: input.bookmarked,
    });
    if (input.completed) {
      await db.insert(notificationsTable).values({ type: "learning", title: "Lesson completed", message: `${tutorial.title} is now part of your Saathi learning streak.` });
      await db.insert(activityLogsTable).values({ activityType: "lesson_completed", value: 1, metadata: JSON.stringify({ tutorialId: params.id }) });
    }
    res.json(UpdateTutorialProgressResponse.parse({
      tutorialId: String(params.id),
      progress: input.progress,
      completed: input.completed,
      quizScore: input.quizScore,
      bookmarked: input.bookmarked,
    }));
  } catch (error) {
    next(error);
  }
});

router.get("/fraud/alerts", async (_req, res, next) => {
  try {
    const rows = await db.select().from(fraudAlertsTable).orderBy(desc(fraudAlertsTable.createdAt)).limit(20);
    res.json(GetFraudAlertsResponse.parse(rows.map((row) => ({
      id: String(row.id),
      category: row.category,
      result: row.result,
      createdAt: row.createdAt.toISOString(),
    }))));
  } catch (error) {
    next(error);
  }
});

router.post("/fraud/quiz", async (req, res, next) => {
  try {
    const input = SubmitFraudQuizBody.parse(req.body);
    const [created] = await db.insert(fraudAlertsTable).values(input).returning();
    await db.insert(activityLogsTable).values({ activityType: "fraud_quiz", value: 1, metadata: JSON.stringify({ category: input.category, result: input.result }) });
    res.status(201).json(SubmitFraudQuizResponse.parse({
      id: String(created.id),
      category: created.category,
      result: created.result,
      createdAt: created.createdAt.toISOString(),
    }));
  } catch (error) {
    next(error);
  }
});

router.get("/assistant/history", async (_req, res, next) => {
  try {
    const rows = await db.select().from(assistantHistoryTable).orderBy(desc(assistantHistoryTable.createdAt), desc(assistantHistoryTable.id)).limit(60);
    res.json(GetAssistantHistoryResponse.parse(rows.reverse().map((row) => ({
      id: String(row.id),
      from: row.from === "you" ? "you" : "saathi",
      message: row.message,
      createdAt: row.createdAt.toISOString(),
    }))));
  } catch (error) {
    next(error);
  }
});

router.post("/assistant/message", async (req, res, next) => {
  try {
    const input = SendAssistantMessageBody.parse(req.body);
    const replyText = assistantReply(input.message);
    await db.insert(assistantHistoryTable).values({ from: "you", message: input.message });
    const [reply] = await db.insert(assistantHistoryTable).values({ from: "saathi", message: replyText }).returning();
    await db.insert(activityLogsTable).values({ activityType: "assistant_use", value: 1, metadata: JSON.stringify({ language: input.language ?? "en" }) });
    res.json({
      id: String(reply.id),
      from: "saathi",
      message: reply.message,
      createdAt: reply.createdAt.toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

router.get("/notifications", async (_req, res, next) => {
  try {
    await seedIfEmpty();
    const rows = await db.select().from(notificationsTable).orderBy(desc(notificationsTable.createdAt)).limit(40);
    res.json(GetNotificationsResponse.parse(rows.map((row) => ({
      id: String(row.id),
      type: row.type,
      title: row.title,
      message: row.message,
      read: row.read,
      createdAt: row.createdAt.toISOString(),
    }))));
  } catch (error) {
    next(error);
  }
});

router.patch("/notifications/:id/read", async (req, res, next) => {
  try {
    const params = MarkNotificationReadParams.parse(req.params);
    const [updated] = await db.update(notificationsTable).set({ read: true }).where(eq(notificationsTable.id, params.id)).returning();
    if (!updated) {
      res.status(404).json({ error: "Notification not found" });
      return;
    }
    res.json(MarkNotificationReadResponse.parse({
      id: String(updated.id),
      type: updated.type,
      title: updated.title,
      message: updated.message,
      read: updated.read,
      createdAt: updated.createdAt.toISOString(),
    }));
  } catch (error) {
    next(error);
  }
});

router.patch("/notifications/read-all", async (_req, res, next) => {
  try {
    await db.update(notificationsTable).set({ read: true });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

router.get("/analytics", async (_req, res, next) => {
  try {
    const [payments, lessons, assistant, fraud, activity, settings] = await Promise.all([
      db.select().from(paymentsTable),
      db.select().from(learningProgressTable),
      db.select().from(assistantHistoryTable),
      db.select().from(fraudAlertsTable),
      db.select().from(activityLogsTable),
      db.select().from(settingsTable).limit(1),
    ]);
    const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const practiceSessions = dayLabels.map((day, index) => ({
      day,
      value: activity.filter((entry) => entry.createdAt.getDay() === (index + 1) % 7).reduce((total, entry) => total + entry.value, 0),
    }));
    const quizResults = fraud.map((entry) => Number(entry.result.match(/\d+/)?.[0] ?? 0)).filter((score) => score > 0);
    res.json(GetAnalyticsResponse.parse({
      practiceSessions,
      lessonsCompleted: lessons.filter((lesson) => lesson.completed).length,
      assistantUses: Math.floor(assistant.length / 2),
      fraudQuizScore: quizResults.length ? Math.round(quizResults.reduce((sum, score) => sum + score, 0) / quizResults.length) : 0,
      accessibilityUsage: settings[0] ? [settings[0].voiceGuidance, settings[0].largeText, settings[0].highContrast, settings[0].simplifiedMode, settings[0].reducedMotion].filter(Boolean).length : 0,
      paymentSimulations: payments.length,
      languageUsage: [{ language: settings[0]?.language ?? "en", value: 1 }],
    }));
  } catch (error) {
    next(error);
  }
});

router.post("/translate", (req, res, next) => {
  try {
    const input = TranslateTextBody.parse(req.body);
    res.json(TranslateTextResponse.parse({
      text: input.text,
      language: input.language,
      translatedText: translationSamples[input.language] ?? input.text,
    }));
  } catch (error) {
    next(error);
  }
});

router.post("/voice/speak", (req, res, next) => {
  try {
    const input = SpeakTextBody.parse(req.body);
    res.json(SpeakTextResponse.parse({ text: translationSamples[input.language] ?? input.text, language: input.language, supported: true }));
  } catch (error) {
    next(error);
  }
});

export default router;
