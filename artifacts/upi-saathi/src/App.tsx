import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import {
  Activity,
  ArrowRight,
  BarChart3,
  BadgeCheck,
  Bell,
  Bookmark,
  BookOpen,
  BrainCircuit,
  Check,
  CheckCheck,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  CircleAlert,
  Contrast,
  CreditCard,
  Eye,
  FileUp,
  Filter,
  History as HistoryIcon,
  House,
  Languages,
  LockKeyhole,
  Menu,
  MessageCircle,
  Mic,
  Pause,
  Play,
  QrCode,
  Search,
  ScanLine,
  Settings as SettingsIcon,
  ShieldCheck,
  ShieldQuestion,
  Siren,
  Sparkles,
  TextCursorInput,
  Type,
  Volume2,
  WalletCards,
  X,
} from 'lucide-react';
import {
  BrowserQRCodeReader,
  BrowserCodeReader,
} from "@zxing/browser";
import {
  getGetAnalyticsQueryKey,
  getGetAssistantHistoryQueryKey,
  getGetDashboardQueryKey,
  getGetHistoryQueryKey,
  getGetNotificationsQueryKey,
  getGetQrHistoryQueryKey,
  getGetSettingsQueryKey,
  getGetTutorialsQueryKey,
  useConfirmPayment,
  useDetectIntent,
  useGetAnalytics,
  useGetAssistantHistory,
  useGetDashboard,
  useGetFraudAlerts,
  useGetHistory,
  useGetLanguages,
  useGetNotifications,
  useGetQrHistory,
  useGetSettings,
  useGetTutorials,
  useGuidePayment,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useReadQr,
  useSaveSettings,
  useSendAssistantMessage,
  useSpeakText,
  useSubmitFraudQuiz,
  useTranscribeVoice,
  useTranslateText,
  useUpdateTutorialProgress,
  type Notification,
  type Payment,
  type Settings,
  setBaseUrl,
} from '@workspace/api-client-react';
import { Link, Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import '@/index.css';

setBaseUrl(import.meta.env.VITE_API_URL ?? null);

const queryClient = new QueryClient();

const navGroups = [
  {
    label: 'Your Saathi',
    items: [
      { href: '/dashboard', label: 'My day', icon: House },
      { href: '/voice-payment', label: 'Pay by voice', icon: Mic },
      { href: '/qr-guidance', label: 'Scan a QR', icon: QrCode },
      { href: '/history', label: 'Payment history', icon: HistoryIcon },
      { href: '/notifications', label: 'Notifications', icon: Bell },
    ],
  },
  {
    label: 'Learn & prepare',
    items: [
      { href: '/literacy-mode', label: 'Step-by-step', icon: BookOpen },
      { href: '/offline-learning', label: 'Learn offline', icon: DownloadIcon },
      { href: '/fraud-awareness', label: 'Spot a fraud', icon: ShieldQuestion },
      { href: '/fraud-quiz', label: 'Practice quiz', icon: CircleAlert },
      { href: '/safe-payment', label: 'Safety check', icon: ShieldCheck },
    ],
  },
  {
    label: 'Make it yours',
    items: [
      { href: '/accessibility', label: 'Accessibility', icon: AccessibilityIcon },
      { href: '/multilingual', label: 'Language', icon: Languages },
      { href: '/sign-language', label: 'Visual guidance', icon: Eye },
      { href: '/settings', label: 'Settings', icon: SettingsIcon },
      { href: '/analytics', label: 'Practice insights', icon: BarChart3 },
    ],
  },
];

function DownloadIcon({ size = 17 }: { size?: number }) {
  return <BookOpen size={size} />;
}

function AccessibilityIcon({ size = 17 }: { size?: number }) {
  return <Contrast size={size} />;
}

const fallbackSettings: Settings = {
  profileName: 'Aarav',
  language: 'en',
  voiceGuidance: true,
  voiceSelection: 'default',
  speechSpeed: 1,
  largeText: false,
  highContrast: false,
  simplifiedMode: false,
  reducedMotion: false,
  dailySafetyReminders: true,
  learningReminders: true,
  practiceReminders: true,
};

const fallbackPayments = [
  { id: 'p-1', recipient: 'Meera Kirana Store', amount: 245, date: 'Today, 10:42 AM', status: 'completed', safetyStatus: 'verified', source: 'voice', demoLabel: 'SIMULATED DEMO TRANSACTION', transactionId: 'UPI-DEMO-SAMPLE-01', paymentType: 'MERCHANT_PAYMENT', learningNote: 'You checked the shop name and amount.' },
  { id: 'p-2', recipient: 'Ravi Mobile Recharge', amount: 199, date: 'Yesterday, 4:18 PM', status: 'completed', safetyStatus: 'verified', source: 'qr', demoLabel: 'SIMULATED DEMO TRANSACTION', transactionId: 'UPI-DEMO-SAMPLE-02', paymentType: 'MERCHANT_PAYMENT', learningNote: 'You paused before confirming.' },
  { id: 'p-3', recipient: 'Anita Sharma', amount: 850, date: '12 Jun, 9:05 AM', status: 'pending', safetyStatus: 'review', source: 'manual', demoLabel: 'SIMULATED DEMO TRANSACTION', transactionId: 'UPI-DEMO-SAMPLE-03', paymentType: 'PERSONAL_TRANSFER', learningNote: 'Review the recipient before continuing.' },
] satisfies Payment[];

function getNotificationList(data: unknown): Notification[] {
  return Array.isArray(data) ? data : [];
}

const speechLang = {
  en: 'en-IN',
  hi: 'hi-IN',
  mr: 'mr-IN',
  ta: 'ta-IN',
  te: 'te-IN',
  gu: 'gu-IN',
  bn: 'bn-IN',
  kn: 'kn-IN',
  ml: 'ml-IN',
  pa: 'pa-IN',
  raj: 'hi-IN',
} as const;

type SpeechLanguage = keyof typeof speechLang;
type SpeechRecognitionInstance = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  onstart: (() => void) | null;
  onresult: ((event: { results: { [key: number]: { [key: number]: { transcript: string } } } }) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

function speakText(text: string, language: SpeechLanguage = 'en') {
  speakLocalized(text, language);
}

function speakLocalized(text: string, language: string) {
  if (!('speechSynthesis' in window)) return;
  const utterance = new SpeechSynthesisUtterance(text);
  const preferredLanguage = speechLang[language as SpeechLanguage] ?? 'hi-IN';
  utterance.lang = preferredLanguage;
  const voices = window.speechSynthesis.getVoices();
  const voice = voices.find((item) => item.lang === preferredLanguage) ?? voices.find((item) => item.lang.startsWith(language)) ?? voices.find((item) => item.lang.startsWith('hi'));
  if (voice) utterance.voice = voice;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

function speakWhenReady(text: string, language: SpeechLanguage = 'en') {
  if (!('speechSynthesis' in window)) return;
  if (window.speechSynthesis.getVoices().length > 0) {
    speakText(text, language);
    return;
  }
  window.speechSynthesis.onvoiceschanged = () => speakText(text, language);
}

function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-3" data-testid="link-brand-home">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[14px] bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))] shadow-[0_7px_18px_hsl(var(--accent)/.22)]">
        <span className="relative block h-5 w-5 rounded-full border-[3px] border-current">
          <span className="absolute -right-[5px] top-[4px] h-2 w-2 rounded-full bg-current" />
        </span>
      </span>
      {!compact && <span className="display-font text-xl font-bold tracking-tight text-[hsl(var(--sidebar-foreground))]">UPI Saathi</span>}
    </Link>
  );
}

function AppShell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { data: apiSettings } = useGetSettings();
  const { data: notifications } = useGetNotifications();
  const settings = apiSettings ?? fallbackSettings;
  const largeText = settings.largeText;
  const unreadNotifications = getNotificationList(notifications).filter((notification) => !notification.read).length;

  return (
    <div className={`noise saathi-shell flex min-h-[100dvh] ${largeText ? 'text-[17px]' : ''}`}>
      <aside className={`sidebar-grid fixed inset-y-0 left-0 z-30 flex w-[274px] flex-col bg-[hsl(var(--sidebar))] px-5 py-6 text-[hsl(var(--sidebar-foreground))] transition-transform duration-300 lg:static lg:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="mb-8 flex items-center justify-between">
          <BrandMark />
          <button className="rounded-lg p-2 text-[hsl(var(--sidebar-foreground)/.65)] lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Close menu" data-testid="button-close-menu"><X size={19} /></button>
        </div>
        <div className="mb-7 rounded-2xl border border-[hsl(var(--sidebar-border))] bg-[hsl(var(--sidebar-accent)/.62)] p-4">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[.16em] text-[hsl(var(--sidebar-foreground)/.62)]"><Sparkles size={13} className="text-[hsl(var(--sidebar-primary))]" /> Ready when you are</div>
          <p className="text-sm leading-5 text-[hsl(var(--sidebar-foreground)/.82)]">A calm guide for each payment, one step at a time.</p>
        </div>
        <nav className="flex-1 space-y-7 overflow-y-auto" aria-label="Main navigation">
          {navGroups.map((group) => (
            <div key={group.label}>
              <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[.18em] text-[hsl(var(--sidebar-foreground)/.48)]">{group.label}</p>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = location === item.href;
                  return <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)} className={`nav-link flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold ${active ? 'bg-[hsl(var(--sidebar-primary))] text-[hsl(var(--sidebar-primary-foreground))] shadow-[0_8px_20px_hsl(var(--sidebar-primary)/.2)]' : 'text-[hsl(var(--sidebar-foreground)/.72)] hover:bg-[hsl(var(--sidebar-accent))] hover:text-[hsl(var(--sidebar-foreground))]'}`} data-testid={`link-nav-${item.href.slice(1)}`}><Icon size={17} strokeWidth={active ? 2.5 : 2} /><span>{item.label}</span>{active && <ChevronRight size={15} className="ml-auto" />}</Link>;
                })}
              </div>
            </div>
          ))}
        </nav>
        <div className="mt-6 border-t border-[hsl(var(--sidebar-border))] pt-5">
          <Link href="/ai-assistant" className="flex items-center gap-3 rounded-xl bg-[hsl(var(--sidebar-primary)/.12)] px-3 py-3 text-sm font-semibold text-[hsl(var(--sidebar-primary))] hover:bg-[hsl(var(--sidebar-primary)/.18)]" data-testid="link-ai-assistant"><span className="grid h-8 w-8 place-items-center rounded-lg bg-[hsl(var(--sidebar-primary)/.18)]"><MessageCircle size={17} /></span><span>Ask Saathi</span><ArrowRight size={15} className="ml-auto" /></Link>
          <p className="mt-4 px-1 text-[11px] leading-4 text-[hsl(var(--sidebar-foreground)/.44)]">Payments here are practice only. No real money moves.</p>
        </div>
      </aside>
      {mobileOpen && <button className="fixed inset-0 z-20 bg-[hsl(211_44%_8%/.48)] lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Close navigation" data-testid="button-overlay-close" />}
      <main className="min-w-0 flex-1">
        <header className="sticky top-0 z-10 flex h-[76px] items-center justify-between border-b border-[hsl(var(--border)/.72)] bg-[hsl(204_45%_97%/.85)] px-5 backdrop-blur-xl lg:px-10">
          <div className="flex items-center gap-3">
            <button className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-2.5 text-[hsl(var(--primary))] lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open menu" data-testid="button-open-menu"><Menu size={20} /></button>
            <span className="hidden text-sm font-semibold text-[hsl(var(--muted-foreground))] sm:inline">A little help, exactly when it matters.</span>
          </div>
          <div className="flex items-center gap-2.5">
            <Link href="/accessibility" className="hidden items-center gap-2 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-2 text-xs font-bold text-[hsl(var(--primary))] sm:flex" data-testid="link-accessibility-quick"><Contrast size={15} /> Make it easier</Link>
            <Link href="/notifications" className="relative grid h-10 w-10 place-items-center rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--primary))]" aria-label={`${unreadNotifications} unread notifications`} data-testid="link-notifications"><Bell size={17} />{unreadNotifications > 0 && <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-[hsl(var(--accent))] px-1 text-[9px] font-extrabold text-[hsl(var(--accent-foreground))]">{unreadNotifications}</span>}</Link>
            <Link href="/settings" className="grid h-10 w-10 place-items-center rounded-full bg-[hsl(var(--primary))] text-sm font-bold text-[hsl(var(--primary-foreground))]" data-testid="link-profile-settings">AS</Link>
          </div>
        </header>
        <div className="mx-auto w-full max-w-[1440px] px-5 py-8 lg:px-10 lg:py-10">{children}</div>
      </main>
    </div>
  );
}

function PageIntro({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  const { data: settings } = useGetSettings();
  const language = (settings?.language ?? 'en') as SpeechLanguage;
  const listen = () => { if (!window.speechSynthesis) return; speakWhenReady(`${eyebrow}. ${title}. ${description}`, language); };
  return <div className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><div className="mb-3 flex items-center gap-3"><p className="text-xs font-bold uppercase tracking-[.2em] text-[hsl(var(--primary))]">{eyebrow}</p><button onClick={listen} aria-label="Speak this instruction" data-testid="button-speak-instruction" className="inline-flex items-center gap-1.5 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-1.5 text-xs font-bold text-[hsl(var(--primary))] transition-colors hover:bg-[hsl(var(--muted))]"><Volume2 size={13} /> Listen</button></div><h1 className="display-font max-w-3xl text-4xl font-extrabold leading-[1.05] tracking-[-.045em] text-[hsl(var(--foreground))] md:text-5xl">{title}</h1><p className="mt-4 max-w-2xl text-base leading-7 text-[hsl(var(--muted-foreground))]">{description}</p></div>{action}</div>;
}

function SimulatedNotice() {
  return <div className="flex items-center gap-2 rounded-xl border border-[hsl(191_72%_48%/.25)] bg-[hsl(191_72%_48%/.08)] px-3.5 py-3 text-xs font-semibold text-[hsl(var(--primary))]" data-testid="notice-simulated-only"><ShieldCheck size={16} /><span>SIMULATED DEMO TRANSACTION — NO REAL MONEY TRANSFERRED.</span></div>;
}

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-[hsl(var(--muted))] ${className}`} aria-label="Loading" data-testid="loading-skeleton" />;
}

function EmptyState({ title, detail, href, action }: { title: string; detail: string; href?: string; action?: string }) {
  return <div className="app-card flex min-h-[240px] flex-col items-center justify-center rounded-3xl p-8 text-center"><div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-[hsl(var(--secondary))] text-[hsl(var(--primary))]"><CircleHelp size={25} /></div><h3 className="display-font text-xl font-bold">{title}</h3><p className="mt-2 max-w-sm text-sm leading-6 text-[hsl(var(--muted-foreground))]">{detail}</p>{href && <Link href={href} className="mt-5 rounded-xl bg-[hsl(var(--primary))] px-4 py-2.5 text-sm font-bold text-[hsl(var(--primary-foreground))]" data-testid="link-empty-action">{action}</Link>}</div>;
}

function ErrorState({ retry }: { retry?: () => void }) {
  return <div className="app-card rounded-3xl border-[hsl(var(--destructive)/.2)] p-8 text-center"><Siren className="mx-auto text-[hsl(var(--destructive))]" size={28} /><h3 className="mt-3 font-bold">We could not load this just now</h3><p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">Your practice data is safe. Try again in a moment.</p>{retry && <button onClick={retry} className="mt-5 rounded-xl bg-[hsl(var(--primary))] px-4 py-2 text-sm font-bold text-[hsl(var(--primary-foreground))]" data-testid="button-retry">Try again</button>}</div>;
}

function PaymentRow({ payment }: { payment: Payment }) {
  const statusTone = payment.safetyStatus === 'verified' ? 'text-[hsl(153_42%_35%)] bg-[hsl(153_42%_42%/.1)]' : 'text-[hsl(36_70%_37%)] bg-[hsl(36_80%_54%/.13)]';
  return <div className="flex items-center gap-3 border-b border-[hsl(var(--border)/.7)] py-4 last:border-0" data-testid={`row-payment-${payment.id}`}><span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[hsl(var(--secondary))] text-[hsl(var(--primary))]"><WalletCards size={19} /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-[hsl(var(--foreground))]">{payment.recipient}</p><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{payment.date} · {payment.source === 'voice' ? 'Voice' : payment.source === 'qr' ? 'QR scan' : 'Entered'}</p></div><div className="text-right"><p className="text-sm font-bold">₹{payment.amount.toLocaleString('en-IN')}</p><span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${statusTone}`}>{payment.safetyStatus === 'verified' ? 'Checked' : 'Review'}</span></div></div>;
}

function Dashboard() {
  const { data, isLoading, isError, refetch } = useGetDashboard();
  const dashboard = data ?? { userName: 'Anita', accessibilityScore: 86, offlineProgress: 62, safetyAlerts: 1, recentPayments: fallbackPayments, weeklyActivity: [{ day: 'Mon', value: 2 }, { day: 'Tue', value: 1 }, { day: 'Wed', value: 3 }, { day: 'Thu', value: 2 }, { day: 'Fri', value: 4 }, { day: 'Sat', value: 1 }, { day: 'Sun', value: 2 }] };
  const max = Math.max(...dashboard.weeklyActivity.map((point) => point.value), 1);
  return <><PageIntro eyebrow={`Good morning, ${dashboard.userName}`} title="Let’s make today feel simple." description="Your Saathi is ready to guide you through a payment, a lesson, or anything you want to understand." action={<Link href="/voice-payment" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[hsl(var(--primary))] px-5 py-3.5 text-sm font-bold text-[hsl(var(--primary-foreground))] shadow-[0_10px_24px_hsl(var(--primary)/.18)] transition-transform hover:-translate-y-0.5" data-testid="link-start-payment"><Mic size={18} /> Start a practice payment <ArrowRight size={16} /></Link>} />
    <div className="mb-7"><SimulatedNotice /></div>
    {isError ? <ErrorState retry={() => refetch()} /> : <div className="space-y-7">
      <section className="grid gap-5 md:grid-cols-[1.35fr_.65fr]">
        <div className="app-card relative overflow-hidden rounded-3xl bg-[hsl(var(--primary))] p-6 text-[hsl(var(--primary-foreground))] md:p-8"><div className="absolute -right-10 -top-16 h-52 w-52 rounded-full border-[24px] border-[hsl(var(--accent)/.2)]" /><div className="absolute -bottom-24 right-24 h-48 w-48 rounded-full border-[18px] border-[hsl(var(--accent)/.12)]" /><div className="relative"><div className="flex items-center gap-2 text-sm font-semibold text-[hsl(var(--primary-foreground)/.72)]"><ShieldCheck size={17} className="text-[hsl(var(--accent))]" /> Saathi safety score</div>{isLoading ? <Skeleton className="mt-6 h-12 w-28 bg-[hsl(var(--primary-foreground)/.15)]" /> : <div className="mt-4 flex items-end gap-2"><span className="display-font text-6xl font-extrabold tracking-[-.06em]">{dashboard.accessibilityScore}</span><span className="mb-2 text-lg text-[hsl(var(--primary-foreground)/.66)]">/100</span></div>}<p className="mt-2 max-w-sm text-sm leading-6 text-[hsl(var(--primary-foreground)/.7)]">You are using the checks that make digital payments safer. Keep going at your own pace.</p><Link href="/safe-payment" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[hsl(var(--accent))] px-4 py-2.5 text-sm font-bold text-[hsl(var(--accent-foreground))]" data-testid="link-safety-score">Review your checks <ArrowRight size={15} /></Link></div></div>
        <div className="app-card rounded-3xl p-6"><div className="flex items-start justify-between"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-[hsl(var(--muted-foreground))]">Learn offline</p><p className="mt-3 display-font text-3xl font-bold">{dashboard.offlineProgress}%</p></div><span className="grid h-11 w-11 place-items-center rounded-2xl bg-[hsl(36_80%_54%/.14)] text-[hsl(36_70%_37%)]"><BookOpen size={20} /></span></div><div className="mt-7 h-2 rounded-full bg-[hsl(var(--muted))]"><div className="h-full rounded-full bg-[hsl(36_80%_54%)] transition-[width] duration-700" style={{ width: `${dashboard.offlineProgress}%` }} /></div><p className="mt-4 text-sm leading-6 text-[hsl(var(--muted-foreground))]">Small lessons stay on your phone, even when the signal does not.</p><Link href="/offline-learning" className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-[hsl(var(--primary))]" data-testid="link-offline-progress">Continue learning <ArrowRight size={15} /></Link></div>
      </section>
      <section className="grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
        <div className="app-card rounded-3xl p-6"><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-[hsl(var(--muted-foreground))]">This week</p><h2 className="display-font mt-2 text-2xl font-bold">Your practice rhythm</h2></div><span className="rounded-full bg-[hsl(var(--secondary))] px-3 py-1.5 text-xs font-bold text-[hsl(var(--primary))]"><Activity size={13} className="mr-1 inline" /> 15 actions</span></div><div className="mt-8 flex h-44 items-end justify-between gap-2">{dashboard.weeklyActivity.map((point) => <div className="flex h-full flex-1 flex-col items-center justify-end gap-2" key={point.day} data-testid={`chart-day-${point.day}`}><div className="w-full max-w-8 rounded-t-lg bg-[hsl(var(--accent))] transition-[height] duration-700" style={{ height: `${Math.max(16, (point.value / max) * 100)}%` }} /><span className="text-[11px] font-semibold text-[hsl(var(--muted-foreground))]">{point.day}</span></div>)}</div></div>
        <div className="app-card rounded-3xl p-6"><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-[hsl(var(--muted-foreground))]">Recent payments</p><h2 className="display-font mt-2 text-2xl font-bold">You are in control</h2></div><Link href="/history" className="text-xs font-bold text-[hsl(var(--primary))]" data-testid="link-see-history">See all</Link></div><div className="mt-3">{(dashboard.recentPayments?.length ? dashboard.recentPayments : fallbackPayments).slice(0, 3).map((payment) => <PaymentRow key={payment.id} payment={payment} />)}</div></div>
      </section>
    </div>}
  </>;
}

function Home() {
  return <div className="noise min-h-[100dvh] overflow-hidden bg-[hsl(204_45%_97%)] text-[hsl(var(--foreground))]"><header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-6 lg:px-10"><BrandMark compact={false} /><div className="flex items-center gap-3"><Link href="/login" className="hidden px-3 py-2 text-sm font-bold text-[hsl(var(--primary))] sm:block" data-testid="link-login">Sign in</Link><Link href="/dashboard" className="rounded-xl bg-[hsl(var(--primary))] px-4 py-2.5 text-sm font-bold text-[hsl(var(--primary-foreground))]" data-testid="link-demo-dashboard">Try the demo</Link></div></header><main><section className="soft-grid relative mx-auto grid max-w-7xl items-center gap-12 px-5 pb-20 pt-12 lg:grid-cols-[1.05fr_.95fr] lg:px-10 lg:pb-28 lg:pt-20"><div><div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card)/.72)] px-3 py-1.5 text-xs font-bold text-[hsl(var(--primary))]"><span className="h-2 w-2 rounded-full bg-[hsl(var(--accent))]" /> A kinder way to pay</div><h1 className="display-font max-w-3xl text-[clamp(3.5rem,8vw,7rem)] font-extrabold leading-[.9] tracking-[-.075em]">Take your time.<br /><span className="text-[hsl(var(--primary))]">Saathi is here.</span></h1><p className="mt-8 max-w-xl text-lg leading-8 text-[hsl(var(--muted-foreground))]">UPI Saathi turns confusing payment moments into clear, spoken steps — built for elders, first-time users, and every pace of learning.</p><div className="mt-9 flex flex-col gap-3 sm:flex-row"><Link href="/voice-payment" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[hsl(var(--primary))] px-6 py-4 text-sm font-bold text-[hsl(var(--primary-foreground))] shadow-[0_12px_25px_hsl(var(--primary)/.2)]" data-testid="link-hero-voice"><Mic size={19} /> Try voice guidance <ArrowRight size={16} /></Link><Link href="/literacy-mode" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-6 py-4 text-sm font-bold text-[hsl(var(--primary))]" data-testid="link-hero-literacy"><BookOpen size={18} /> Learn the basics</Link></div><p className="mt-6 text-xs font-semibold text-[hsl(var(--muted-foreground))]"><ShieldCheck size={14} className="mr-1 inline text-[hsl(153_42%_42%)]" /> Practice only · no real money moves</p></div><div className="relative"><div className="absolute -inset-5 rounded-[3rem] bg-[hsl(var(--accent)/.15)] blur-2xl" /><div className="relative mx-auto max-w-[480px] rotate-1 rounded-[2.2rem] border border-[hsl(var(--border))] bg-[hsl(var(--card)/.9)] p-4 shadow-[0_30px_80px_hsl(205_42%_25%/.14)]"><div className="rounded-[1.7rem] bg-[hsl(var(--primary))] p-7 text-[hsl(var(--primary-foreground))]"><div className="flex items-center justify-between text-xs font-bold text-[hsl(var(--primary-foreground)/.65)]"><span>GOOD MORNING</span><span>9:41</span></div><div className="mt-14"><span className="grid h-16 w-16 place-items-center rounded-2xl bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]"><Volume2 size={29} /></span><h2 className="display-font mt-7 text-4xl font-bold leading-none">“Pay Meera<br />₹245”</h2><p className="mt-4 max-w-xs text-sm leading-6 text-[hsl(var(--primary-foreground)/.7)]">I heard Meera Kirana Store. Let’s check everything before you continue.</p></div><div className="mt-16 flex items-center justify-between border-t border-[hsl(var(--primary-foreground)/.14)] pt-4 text-xs font-bold"><span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[hsl(var(--accent))]" /> Listening</span><span>Step 1 of 3</span></div></div></div><div className="absolute -bottom-5 -left-5 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 shadow-[0_14px_30px_hsl(205_42%_25%/.1)]"><p className="text-[10px] font-bold uppercase tracking-[.16em] text-[hsl(var(--muted-foreground))]">Saathi checked</p><p className="mt-1 flex items-center gap-1 text-sm font-bold text-[hsl(153_42%_35%)]"><CheckCircle2 size={16} /> Recipient matched</p></div></div></section><section className="mx-auto max-w-7xl px-5 py-16 lg:px-10 lg:py-24"><div className="grid gap-5 md:grid-cols-3"><FeatureCard icon={Volume2} number="01" title="Say it your way" text="Speak naturally in the language you know. Saathi listens for the important details." href="/multilingual" /><FeatureCard icon={ShieldCheck} number="02" title="Check before you pay" text="See the recipient, amount, and safety checks in plain language before anything happens." href="/safe-payment" /><FeatureCard icon={BookOpen} number="03" title="Learn without pressure" text="Short, offline lessons help you build confidence one familiar step at a time." href="/offline-learning" /></div></section><section className="border-y border-[hsl(var(--border))] bg-[hsl(var(--primary))] px-5 py-16 text-[hsl(var(--primary-foreground))] lg:px-10 lg:py-20"><div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-[.8fr_1.2fr] md:items-end"><p className="text-xs font-bold uppercase tracking-[.2em] text-[hsl(var(--accent))]">Designed for real life</p><h2 className="display-font max-w-3xl text-4xl font-extrabold leading-[1.03] tracking-[-.045em] md:text-6xl">No hurry. No jargon.<br />Just a safer next step.</h2><p className="max-w-xl text-base leading-7 text-[hsl(var(--primary-foreground)/.7)] md:col-start-2">Whether the network is weak, the text is small, or the payment feels unfamiliar, UPI Saathi gives you more ways to understand what is happening.</p></div></section></main><footer className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-8 text-sm text-[hsl(var(--muted-foreground))] sm:flex-row sm:items-center sm:justify-between lg:px-10"><p className="font-bold text-[hsl(var(--primary))]">UPI Saathi</p><p>Practice payments, made human.</p><Link href="/dashboard" className="font-bold text-[hsl(var(--primary))]" data-testid="link-footer-dashboard">Open the demo <ArrowRight size={14} className="ml-1 inline" /></Link></footer></div>;
}

function FeatureCard({ icon: Icon, number, title, text, href }: { icon: typeof ShieldCheck; number: string; title: string; text: string; href: string }) {
  return <Link href={href} className="app-card group rounded-3xl p-6 transition-transform hover:-translate-y-1" data-testid={`link-feature-${number}`}><div className="flex items-start justify-between"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-[hsl(var(--secondary))] text-[hsl(var(--primary))]"><Icon size={22} /></span><span className="display-font text-4xl font-bold text-[hsl(var(--border))]">{number}</span></div><h3 className="display-font mt-10 text-2xl font-bold">{title}</h3><p className="mt-3 text-sm leading-6 text-[hsl(var(--muted-foreground))]">{text}</p><span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-[hsl(var(--primary))]">Explore <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" /></span></Link>;
}

function VoicePayment() {
  const transcribe = useTranscribeVoice();
  const detect = useDetectIntent();
  const guide = useGuidePayment();
  const confirm = useConfirmPayment();
  const client = useQueryClient();
  const [phrase, setPhrase] = useState('Recharge my phone');
  const [result, setResult] = useState<{ transcript: string; intent: string; confidence: number; entities: { recipient: string; amount: number; currency: string }; response: string } | null>(null);
  const [safety, setSafety] = useState<{ safe: boolean; warnings: string[]; checks: { name: string; passed: boolean; detail: string }[]; summary: string } | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [payment, setPayment] = useState<Payment | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState('');
  const busy = transcribe.isPending || detect.isPending || guide.isPending;
  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
    }
  };
  const runPhrase = (text: string) => {
    setError(''); setConfirmed(false); setSafety(null);
    transcribe.mutate({ data: { transcript: text } }, { onSuccess: (voiceResult) => { setResult(voiceResult); detect.mutate({ data: { text: voiceResult.transcript, language: 'en' } }, { onSuccess: setResult }); }, onError: () => setError('The demo phrase could not be understood. Try the example once more.') });
  };
  const startListening = async () => {
    setError('');
    setConfirmed(false);
    setSafety(null);
    setResult(null);
    setIsListening(true);

    const speechWindow = window as Window & {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
    const SpeechRecognitionApi = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
    if (!SpeechRecognitionApi) {
      setIsListening(false);
      setError('This browser does not support speech recognition. Please type the phrase and tap Try it.');
      return;
    }

    if (!window.isSecureContext) {
      setIsListening(false);
      setError('Microphone access needs a secure page. Use localhost or HTTPS.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
    } catch {
      setIsListening(false);
      setError('Microphone permission is blocked. Allow microphone access in the address bar, then tap again.');
      return;
    }

    const recognition = new SpeechRecognitionApi();
    let heardSpeech = false;
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event) => {
      heardSpeech = true;
      const text = event.results[0][0].transcript;
      setPhrase(text);
      setIsListening(false);
      runPhrase(text);
    };
    recognition.onend = () => setIsListening(false);
    recognition.onerror = (event) => {
      setIsListening(false);
      if (heardSpeech) return;
      const message = event.error === 'not-allowed' || event.error === 'service-not-allowed'
        ? 'Microphone permission is blocked. Allow microphone access in the address bar, then tap again.'
        : 'I did not hear speech. Speak right after tapping the mic, check your Windows input microphone, or type the phrase below.';
      setError(message);
    };
    try {
      recognition.start();
    } catch {
      setIsListening(false);
      setError('The microphone is already starting. Wait a moment, then tap again.');
    }
  };
  const guideIt = () => { if (!result) return; guide.mutate({ data: { recipient: result.entities.recipient, amount: result.entities.amount, source: 'voice' } }, { onSuccess: setSafety, onError: () => setError('We could not complete the safety check.') }); };
  const confirmIt = () => { if (!result) return; confirm.mutate({ data: { recipient: result.entities.recipient, amount: result.entities.amount, source: 'voice' } }, { onSuccess: (saved) => { setPayment(saved); setConfirmed(true); speak(`Your simulated payment of ${result.entities.amount} rupees to ${result.entities.recipient} has been completed successfully.`); client.invalidateQueries({ queryKey: getGetDashboardQueryKey() }); client.invalidateQueries({ queryKey: getGetHistoryQueryKey() }); client.invalidateQueries({ queryKey: getGetNotificationsQueryKey() }); } }); };
  return <><PageIntro eyebrow="Voice payment" title="Say what you need. We’ll slow it down." description="Try a natural phrase. Saathi will repeat the important parts, check them, and wait for your say-so." /><div className="grid gap-6 lg:grid-cols-[.85fr_1.15fr]"><section className="app-card rounded-3xl p-6 md:p-8"><SimulatedNotice /><div className="mt-10 text-center"><button onClick={startListening} className={`pulse-ring mx-auto grid h-36 w-36 place-items-center rounded-full bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] transition-transform hover:scale-[1.03] ${isListening ? 'bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]' : ''}`} aria-label="Start listening" data-testid="button-start-listening">{isListening ? <Volume2 size={43} /> : <Mic size={43} />}</button><p className="mt-7 text-sm font-bold text-[hsl(var(--primary))]">{isListening ? 'I am listening…' : 'Tap to try the voice demo'}</p><p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-[hsl(var(--muted-foreground))]">You can also type the sentence below. Both ways use the same safe practice flow.</p></div><label className="mt-9 block text-xs font-bold uppercase tracking-[.14em] text-[hsl(var(--muted-foreground))]" htmlFor="voice-phrase">Your phrase</label><div className="mt-2 flex gap-2"><input id="voice-phrase" value={phrase} onChange={(event) => setPhrase(event.target.value)} className="min-w-0 flex-1 rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]" data-testid="input-voice-phrase" /><button onClick={() => runPhrase(phrase)} className="rounded-xl bg-[hsl(var(--secondary))] px-4 text-sm font-bold text-[hsl(var(--primary))]" data-testid="button-submit-voice">Try it</button></div><div className="mt-4 flex flex-wrap gap-2">{['Recharge my phone', 'Pay Meera ₹245', 'Pay Rahul ₹150'].map((sample) => <button key={sample} onClick={() => { setPhrase(sample); runPhrase(sample); }} className="rounded-full border border-[hsl(var(--border))] px-3 py-1.5 text-xs font-semibold text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--primary))] hover:text-[hsl(var(--primary))]" data-testid={`button-sample-${sample.replaceAll(' ', '-').replace('₹', 'rs')}`}>{sample}</button>)}</div>{error && <p className="mt-4 rounded-xl bg-[hsl(var(--destructive)/.09)] p-3 text-sm font-semibold text-[hsl(var(--destructive))]" data-testid="status-voice-error">{error}</p>}</section><section className="app-card rounded-3xl p-6 md:p-8"><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-[hsl(var(--muted-foreground))]">Your guided preview</p><h2 className="display-font mt-2 text-2xl font-bold">Nothing happens without you</h2></div><span className="rounded-full bg-[hsl(var(--secondary))] px-3 py-1.5 text-xs font-bold text-[hsl(var(--primary))]">{confirmed ? 'Complete' : safety ? 'Ready to review' : result ? 'Understood' : 'Waiting'}</span></div>{busy && <div className="mt-8 space-y-3"><Skeleton className="h-16" /><Skeleton className="h-24" /></div>}{!busy && !result && !confirmed && <EmptyState title="Your words will appear here" detail="Tap the microphone or try the example phrase. Saathi will show you every important detail." />}{result && !confirmed && <div className="mt-8 space-y-5"><div className="rounded-2xl bg-[hsl(var(--secondary))] p-5"><p className="text-xs font-bold uppercase tracking-[.14em] text-[hsl(var(--primary))]">I heard</p><p className="mt-2 text-lg font-bold">“{result.transcript}”</p><p className="mt-3 text-sm leading-6 text-[hsl(var(--muted-foreground))]">{result.response}</p></div><div className="grid gap-3 sm:grid-cols-3"><Entity label="To" value={result.entities.recipient || 'Needed'} /><Entity label="Amount" value={result.entities.amount > 0 ? `₹${result.entities.amount}` : 'Needed'} /><Entity label="Confidence" value={`${Math.round(result.confidence * 100)}%`} /></div>{!safety ? <button onClick={guideIt} disabled={guide.isPending || result.entities.amount <= 0 || !result.entities.recipient} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-5 py-3.5 text-sm font-bold text-[hsl(var(--primary-foreground))] disabled:opacity-60" data-testid="button-run-safety">{guide.isPending ? 'Checking…' : 'Check these details' } <ArrowRight size={16} /></button> : <div className={`rounded-2xl border p-5 ${safety.safe ? 'border-[hsl(153_42%_42%/.25)] bg-[hsl(153_42%_42%/.08)]' : 'border-[hsl(36_80%_54%/.35)] bg-[hsl(36_80%_54%/.1)]'}`}><div className={`flex items-center gap-2 font-bold ${safety.safe ? 'text-[hsl(153_42%_35%)]' : 'text-[hsl(36_70%_37%)]'}`}>{safety.safe ? <CheckCircle2 size={19} /> : <ShieldQuestion size={19} />} {safety.safe ? safety.summary : 'Safety alert — review before continuing'}</div>{safety.warnings.length > 0 && <div className="mt-3 rounded-xl bg-[hsl(36_80%_54%/.15)] p-3 text-sm font-semibold text-[hsl(36_70%_37%)]">{safety.warnings.join(' ')}</div>}<div className="mt-4 space-y-2">{safety.checks.map((check) => <div key={check.name} className="flex gap-2 text-sm"><Check size={15} className={`mt-0.5 ${check.passed ? 'text-[hsl(153_42%_42%)]' : 'text-[hsl(36_70%_37%)]'}`} /><span><b>{check.name}:</b> {check.detail}</span></div>)}</div><button onClick={confirmIt} disabled={confirm.isPending} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-5 py-3.5 text-sm font-bold text-[hsl(var(--primary-foreground))] disabled:opacity-60" data-testid="button-confirm-payment">{confirm.isPending ? 'Saving practice result…' : 'Confirm practice payment'} <Check size={16} /></button></div>}</div>}{confirmed && <div className="flex min-h-[320px] flex-col items-center justify-center text-center"><span className="grid h-16 w-16 place-items-center rounded-full bg-[hsl(153_42%_42%/.12)] text-[hsl(153_42%_35%)]"><CheckCircle2 size={32} /></span><h3 className="display-font mt-5 text-2xl font-bold">Practice payment complete</h3><p className="mt-2 max-w-sm text-sm leading-6 text-[hsl(var(--muted-foreground))]">You checked the recipient and amount before confirming. That is the habit that keeps payments safer.</p><Link href="/dashboard" className="mt-6 rounded-xl bg-[hsl(var(--primary))] px-5 py-3 text-sm font-bold text-[hsl(var(--primary-foreground))]" data-testid="link-back-dashboard">Back to my day</Link></div>}</section></div></>;
}

function Entity({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-[hsl(var(--border))] p-4"><p className="text-xs font-bold uppercase tracking-[.12em] text-[hsl(var(--muted-foreground))]">{label}</p><p className="mt-2 truncate text-sm font-bold">{value}</p></div>;
}

const sampleQrPayload = 'upi://pay?pa=meera.kirana@upi&pn=Meera%20Kirana%20Store&am=245&cu=INR&tn=UPI%20Saathi%20practice';
const sampleQrMerchant = 'Meera Kirana Store';
const sampleQrAmount = 245;
const sampleQrMatrix = [
  '11111110101100011100100010110110101111111',
  '10000010110010110011011011101011001000001',
  '10111010111111011001101101111011101011101',
  '10111010001001110010000111010100101011101',
  '10111010110001100000000001100001001011101',
  '10000010000011011000010100101110101000001',
  '11111110101010101010101010101010101111111',
  '00000000001100011011100011010001000000000',
  '10011111100111100101000010111111110010111',
  '10101100111010011011011110110001010011100',
  '01000011100001101010001100111100011011100',
  '11011000110111010100001110000100011001011',
  '01101110110101000001100101001001011100011',
  '11111001111001001001010010111000001111101',
  '00101011001111011110010000111101000011001',
  '10101000000101101011000010100010110011100',
  '10100011100100111011111110010000010100010',
  '00001000110011011001000000100111000111010',
  '01100111010110000001011110110011100100101',
  '01011001000001010111101001001011001001110',
  '00100110111000110000111010100101011001101',
  '00101001000010101011110100111111010110110',
  '11011110011100110110100110011000001111100',
  '10010100111101010101000010100100111101001',
  '11110011001111010101100110010000111100011',
  '10011001100110100010000100110000011111101',
  '00000110100010011001011010010111001111001',
  '01000100000110111011100110001010111011110',
  '10000110010110011000000111011000010000010',
  '11001001100110011110001100010111010010110',
  '11000010000100110111010010110011100100101',
  '11000001001000111011101101110000111111111',
  '11101010000010010001010100010101111111100',
  '00000000100011110000010100111001100011110',
  '11111110101001001110101110011111101010000',
  '10000010111110100100011000100100100011001',
  '10111010111110111111010101111001111111011',
  '10111010111100100100110101110011010100101',
  '10111010001110111001111001110011000011001',
  '10000010011000110000000010001010110111101',
  '11111110111101101000001001010001100100000',
];

function SampleUpiQr() {
  const quietZone = 4;
  const size = sampleQrMatrix.length + quietZone * 2;
  return (
    <svg
      role="img"
      aria-label={`${sampleQrMerchant} UPI QR for Rs ${sampleQrAmount}`}
      viewBox={`0 0 ${size} ${size}`}
      className="h-full w-full"
      shapeRendering="crispEdges"
    >
      <rect width={size} height={size} fill="white" />
      {sampleQrMatrix.map((row, rowIndex) =>
        Array.from(row).map((cell, columnIndex) =>
          cell === '1' ? (
            <rect
              key={`${rowIndex}-${columnIndex}`}
              x={columnIndex + quietZone}
              y={rowIndex + quietZone}
              width="1"
              height="1"
              fill="currentColor"
            />
          ) : null,
        ),
      )}
    </svg>
  );
}
function RealQrScanner({
  onScan,
  onClose,
}: {
  onScan: (decodedText: string) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const readerRef = useRef<BrowserQRCodeReader | null>(null);
  const onScanRef = useRef(onScan);

  const [status, setStatus] = useState("Starting camera...");
  const [cameraName, setCameraName] = useState("");

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    let mounted = true;

    const startScanner = async () => {
      try {
        setStatus("Finding camera...");

        const devices =
          await BrowserCodeReader.listVideoInputDevices();

        console.log("AVAILABLE CAMERAS:", devices);

        if (!devices.length) {
          throw new Error("No camera found");
        }

        // Prefer a rear/environment camera when available.
        const selectedCamera =
          devices.find((device) =>
            /back|rear|environment/i.test(device.label)
          ) ?? devices[devices.length - 1];

        console.log("USING CAMERA:", selectedCamera);

        if (!mounted) return;

        setCameraName(
          selectedCamera.label || "Camera"
        );

        const reader = new BrowserQRCodeReader();

        readerRef.current = reader;

        setStatus("Point the camera at the QR code");

        if (!videoRef.current) {
          throw new Error("Video element not available");
        }

        const controls =
          await reader.decodeFromVideoDevice(
            selectedCamera.deviceId,
            videoRef.current,
            (result, error) => {
              if (!mounted) return;

              if (result) {
                const decodedText =
                  result.getText();

                console.log(
                  "================================="
                );
                console.log(
                  "QR CODE DETECTED!"
                );
                console.log(
                  "DECODED TEXT:",
                  decodedText
                );
                console.log("DECODED TEXT LENGTH:", decodedText.length);
console.log("DECODED TEXT JSON:", JSON.stringify(decodedText));
console.log("IS UPI:", decodedText.toLowerCase().startsWith("upi://pay"));
                console.log(
                  "================================="
                );

                setStatus("QR code detected!");

                controls.stop();
                controlsRef.current = null;

                onScanRef.current(
                  decodedText
                );

                return;
              }

              // NotFoundException is normal
              // while looking through frames.
              if (error) {
                console.debug(
                  "QR frame not decoded:",
                  error
                );
              }
            }
          );

        controlsRef.current = controls;

        console.log(
          "ZXING QR CAMERA STARTED SUCCESSFULLY"
        );
      } catch (error) {
        console.error(
          "ZXING QR SCANNER ERROR:",
          error
        );

        if (mounted) {
          setStatus(
            `Camera scanner error: ${
              error instanceof Error
                ? error.message
                : String(error)
            }`
          );
        }
      }
    };

    startScanner();

    return () => {
      mounted = false;

      if (controlsRef.current) {
        try {
          controlsRef.current.stop();
        } catch (error) {
          console.log(
            "Scanner cleanup:",
            error
          );
        }

        controlsRef.current = null;
      }

      readerRef.current = null;
    };
  }, []);

  const handleImageScan = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (!file) return;

    try {
      setStatus("Reading QR image...");

      console.log(
        "QR IMAGE SELECTED:",
        file.name
      );

      const reader =
        new BrowserQRCodeReader();

      const imageUrl =
        URL.createObjectURL(file);

      try {
        const result =
          await reader.decodeFromImageUrl(
            imageUrl
          );

        const decodedText =
          result.getText();

        console.log(
          "================================="
        );
        console.log(
          "QR IMAGE DETECTED!"
        );
        console.log(
          "DECODED TEXT:",
          decodedText
        );
        console.log(
          "================================="
        );

        setStatus("QR code detected!");

        onScanRef.current(
          decodedText
        );
      } finally {
        URL.revokeObjectURL(imageUrl);
      }
    } catch (error) {
      console.error(
        "QR IMAGE SCAN ERROR:",
        error
      );

      setStatus(
        "Could not read this QR image. Please upload a clearer image."
      );
    }

    event.target.value = "";
  };

  const handleClose = () => {
    if (controlsRef.current) {
      try {
        controlsRef.current.stop();
      } catch (error) {
        console.log(
          "Scanner stop:",
          error
        );
      }

      controlsRef.current = null;
    }

    readerRef.current = null;

    onClose();
  };

  return (
    <div className="space-y-4">

      {/* CAMERA */}
      <div
        className="w-full overflow-hidden rounded-2xl bg-black"
        style={{
          minHeight: "420px",
        }}
      >
        <video
          ref={videoRef}
          className="h-full w-full object-cover"
          autoPlay
          muted
          playsInline
        />
      </div>

      {/* STATUS */}
      <div className="rounded-2xl bg-sky-50 px-5 py-4 text-center">

        <div className="mb-2 text-2xl">
          ⌗
        </div>

        <p className="font-semibold text-slate-800">
          {status}
        </p>

        {cameraName && (
          <p className="mt-1 text-xs text-slate-500">
            Camera: {cameraName}
          </p>
        )}

        <p className="mt-2 text-sm text-slate-500">
          Keep the complete QR code visible
          and hold the camera steady.
        </p>

      </div>

      {/* IMAGE FALLBACK */}
      <div className="space-y-3">

        <p className="text-center text-sm text-slate-500">
          Camera not detecting the QR?
        </p>

        <label className="block cursor-pointer rounded-full border border-slate-200 bg-white py-3 text-center font-semibold text-slate-700">

          🖼️ Upload QR Image

          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageScan}
          />

        </label>

      </div>

      {/* CANCEL */}
      <button
        type="button"
        onClick={handleClose}
        className="w-full rounded-full border border-slate-200 bg-white py-3 font-semibold text-slate-700"
      >
        Cancel
      </button>

    </div>
  );
}

function analyzeRealQr(decodedText: string) {
  console.log("ANALYZING QR:", decodedText);

  const result = {
    raw: decodedText,
    isUpi: false,
    merchant: "",
    upiId: "",
    amount: null as number | null,
    currency: "INR",
    warnings: [] as string[],
    risk: "LOW" as "LOW" | "MEDIUM" | "HIGH",
  };

  // Check whether this is a UPI payment URI
  if (!decodedText.toLowerCase().startsWith("upi://pay")) {
    result.warnings.push(
      "This QR does not contain a standard UPI payment URI."
    );

    result.risk = "MEDIUM";

    return result;
  }

  result.isUpi = true;

  try {
    const url = new URL(decodedText);

    const pa = url.searchParams.get("pa");
    const pn = url.searchParams.get("pn");
    const am = url.searchParams.get("am");
    const cu = url.searchParams.get("cu");

    result.upiId = pa ?? "";
    result.merchant = pn
      ? decodeURIComponent(pn)
      : "";
    result.amount = am ? Number(am) : null;
    result.currency = cu ?? "INR";

    // Basic validation
    if (!pa) {
      result.warnings.push(
        "The QR does not contain a UPI ID."
      );
      result.risk = "HIGH";
    }

    if (pa && !pa.includes("@")) {
      result.warnings.push(
        "The UPI ID format looks unusual."
      );
      result.risk = "MEDIUM";
    }

    if (result.amount !== null && result.amount <= 0) {
      result.warnings.push(
        "The payment amount is invalid."
      );
      result.risk = "HIGH";
    }

    if (result.amount !== null && result.amount > 10000) {
      result.warnings.push(
        "This QR requests a relatively large payment amount."
      );

      if (result.risk === "LOW") {
        result.risk = "MEDIUM";
      }
    }

    if (!pn) {
      result.warnings.push(
        "The QR does not provide a merchant name."
      );

      if (result.risk === "LOW") {
        result.risk = "MEDIUM";
      }
    }

    console.log("UPI QR ANALYSIS:", result);

    return result;
  } catch (error) {
    console.error(
      "UPI QR PARSE ERROR:",
      error
    );

    result.warnings.push(
      "The QR data could not be parsed safely."
    );

    result.risk = "HIGH";

    return result;
  }
}

function QrGuidance() {
  const readQr = useReadQr();
  const confirm = useConfirmPayment();

  const [scannerOpen, setScannerOpen] = useState(false);
  const [analysis, setAnalysis] =
  useState<ReturnType<typeof analyzeRealQr> | null>(null);
  const [safety, setSafety] = useState<{
    summary: string;
    checks: { name: string; passed: boolean; detail: string }[];
  } | null>(null);
  const [done, setDone] = useState(false);

  const handleRealQrScan = (decodedText: string) => {
    console.log('REAL QR DECODED:', decodedText);

    setScannerOpen(false);
    setDone(false);
    setSafety(null);

    const result = analyzeRealQr(decodedText);

    setAnalysis(result);

    /*
     * Send the decoded recipient/amount to your existing backend
     * safety-check endpoint when enough information is available.
     */
    if (result.isUpi && result.merchant && result.amount !== null) {
      readQr.mutate(
        {
          data: {
            merchant: result.merchant,
            amount: result.amount,
            source: 'camera',
          },
        },
        {
          onSuccess: setSafety,
        },
      );
    }
  };

  const scanAgain = () => {
    setAnalysis(null);
    setSafety(null);
    setDone(false);
    setScannerOpen(true);
  };

  const riskClasses = {
    LOW: {
      box: 'border-[hsl(153_42%_42%/.3)] bg-[hsl(153_42%_42%/.08)]',
      text: 'text-[hsl(153_42%_35%)]',
      icon: CheckCircle2,
    },
    MEDIUM: {
      box: 'border-[hsl(36_80%_54%/.35)] bg-[hsl(36_80%_54%/.1)]',
      text: 'text-[hsl(36_70%_37%)]',
      icon: ShieldQuestion,
    },
    HIGH: {
      box: 'border-[hsl(var(--destructive)/.3)] bg-[hsl(var(--destructive)/.08)]',
      text: 'text-[hsl(var(--destructive))]',
      icon: Siren,
    },
  };

  return (
    <>
      <PageIntro
        eyebrow="QR guidance"
        title="Check a QR before you pay."
        description="Scan a real payment QR with your camera. Saathi reads the payment details and highlights structural warning signs before you continue."
      />

      <div className="grid gap-6 lg:grid-cols-[.9fr_1.1fr]">

        {/* LEFT SIDE */}
        <section className="app-card rounded-3xl p-6 md:p-8">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[hsl(var(--secondary))] text-[hsl(var(--primary))]">
              <ShieldCheck />
            </span>

            <div>
              <h2 className="display-font text-2xl font-bold">
                Before you pay
              </h2>

              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                Three things to check
              </p>
            </div>
          </div>

          <div className="mt-8 space-y-5">
            <GuideNumber
              n="01"
              title="Check the recipient"
              detail="Make sure the displayed name and UPI ID belong to the person or shop you intended to pay."
            />

            <GuideNumber
              n="02"
              title="Check the amount"
              detail="Never confirm a payment until the amount shown by Saathi matches what you expect."
            />

            <GuideNumber
              n="03"
              title="Look at warnings"
              detail="A QR can be technically valid but still belong to someone you do not intend to pay."
            />
          </div>

          <Link
            href="/fraud-awareness"
            className="mt-8 inline-flex items-center gap-2 text-sm font-bold text-[hsl(var(--primary))]"
            data-testid="link-qr-fraud"
          >
            Learn more about suspicious requests
            <ArrowRight size={15} />
          </Link>
        </section>

        {/* RIGHT SIDE */}
        <section className="app-card rounded-3xl p-6 md:p-8">
          <SimulatedNotice />

          {!analysis && !scannerOpen && (
            <div className="mt-8 rounded-3xl border-2 border-dashed border-[hsl(var(--border))] bg-[hsl(var(--muted)/.42)] p-8 text-center">

              <div className="mx-auto grid h-44 w-44 place-items-center rounded-2xl border-8 border-[hsl(var(--primary))] bg-white">
                <ScanLine
                  size={90}
                  strokeWidth={1.5}
                  className="text-[hsl(var(--primary))]"
                />
              </div>

              <h3 className="display-font mt-7 text-2xl font-bold">
                Ready to scan?
              </h3>

              <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                Point your camera at any UPI QR code. Saathi will decode it
                and show you the payment details.
              </p>

              <button
                onClick={() => setScannerOpen(true)}
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-5 py-3 text-sm font-bold text-[hsl(var(--primary-foreground))]"
                data-testid="button-scan-qr"
              >
                <ScanLine size={17} />
                Scan real QR
              </button>
            </div>
          )}

          {scannerOpen && (
            <RealQrScanner
              onScan={handleRealQrScan}
              onClose={() => setScannerOpen(false)}
            />
          )}

          {analysis && !done && (
            <div className="mt-8 space-y-5">

              {/* Risk result */}
              <div
                className={`rounded-2xl border p-5 ${
                  riskClasses[analysis.risk].box
                }`}
              >
                <div
                  className={`flex items-center gap-2 font-bold ${
                    riskClasses[analysis.risk].text
                  }`}
                >
                  {(() => {
                    const Icon = riskClasses[analysis.risk].icon;
                    return <Icon size={21} />;
                  })()}

                  {analysis.risk === 'LOW' &&
                    'No obvious structural warning'}

                  {analysis.risk === 'MEDIUM' &&
                    'Review this QR carefully'}

                  {analysis.risk === 'HIGH' &&
                    'High-risk QR structure detected'}
                </div>

                <p
                  className={`mt-2 text-sm ${
                    riskClasses[analysis.risk].text
                  }`}
                >
                  Risk score: {analysis.risk}/100
                </p>
              </div>

              {/* Payment details */}
              <div>
                <p className="text-xs font-bold uppercase tracking-[.14em] text-[hsl(var(--muted-foreground))]">
                  Payment details
                </p>

                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <Entity
                    label="Recipient"
                    value={analysis.merchant || 'Not provided'}
                  />

                  <Entity
                    label="UPI ID"
                    value={analysis.upiId || 'Not found'}
                  />

                  <Entity
                    label="Amount"
                    value={
                      analysis.amount !== null
                        ? `₹${analysis.amount.toLocaleString('en-IN')}`
                        : 'Not specified'
                    }
                  />

                  <Entity
                    label="Currency"
                    value={analysis.currency}
                  />
                </div>
              </div>

              {/* Warnings */}
              <div className="rounded-2xl bg-[hsl(var(--secondary))] p-5">
                <p className="font-bold">
                  Saathi's checks
                </p>

                <div className="mt-3 space-y-3">
                  {analysis.warnings.map((warning, index) => (
                    <div
                      key={`${warning}-${index}`}
                      className="flex gap-2 text-sm leading-6"
                    >
                      <CircleAlert
                        size={17}
                        className="mt-1 shrink-0 text-[hsl(36_70%_37%)]"
                      />

                      <span>{warning}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Existing backend safety result */}
              {readQr.isPending && (
                <p className="text-sm font-semibold text-[hsl(var(--muted-foreground))]">
                  Checking recipient safety…
                </p>
              )}

              {safety && (
                <div className="rounded-2xl border border-[hsl(var(--border))] p-5">
                  <p className="font-bold">
                    Safety check
                  </p>

                  <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                    {safety.summary}
                  </p>

                  <div className="mt-4 space-y-2">
                    {safety.checks.map((check) => (
                      <div
                        key={check.name}
                        className="flex gap-2 text-sm"
                      >
                        {check.passed ? (
                          <CheckCircle2
                            size={16}
                            className="mt-0.5 shrink-0 text-[hsl(153_42%_42%)]"
                          />
                        ) : (
                          <CircleAlert
                            size={16}
                            className="mt-0.5 shrink-0 text-[hsl(36_70%_37%)]"
                          />
                        )}

                        <span>
                          <b>{check.name}:</b> {check.detail}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  onClick={scanAgain}
                  className="rounded-xl border border-[hsl(var(--border))] px-5 py-3.5 text-sm font-bold text-[hsl(var(--primary))]"
                  data-testid="button-scan-another"
                >
                  Scan another QR
                </button>

                {analysis.isUpi &&
                  analysis.merchant &&
                  analysis.amount !== null && (
                    <button
                      onClick={() =>
                        confirm.mutate(
                          {
                            data: {
                              recipient: analysis.merchant,
                              amount: analysis.amount!,
                              source: 'qr',
                            },
                          },
                          {
                            onSuccess: () => setDone(true),
                          },
                        )
                      }
                      disabled={confirm.isPending}
                      className="rounded-xl bg-[hsl(var(--primary))] px-5 py-3.5 text-sm font-bold text-[hsl(var(--primary-foreground))] disabled:opacity-60"
                      data-testid="button-confirm-qr"
                    >
                      {confirm.isPending
                        ? 'Saving practice result…'
                        : 'Confirm practice step'}
                    </button>
                  )}
              </div>

              <p className="text-xs leading-5 text-[hsl(var(--muted-foreground))]">
                These checks identify QR/payment data that deserves attention.
                They do not prove that a recipient is legitimate or fraudulent.
                Always verify the recipient before paying.
              </p>
            </div>
          )}

          {done && (
            <div className="mt-8 flex min-h-[320px] flex-col items-center justify-center text-center">
              <CheckCircle2
                className="text-[hsl(153_42%_42%)]"
                size={42}
              />

              <h3 className="display-font mt-4 text-2xl font-bold">
                QR checked successfully
              </h3>

              <p className="mt-2 max-w-sm text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                You checked the recipient and amount before continuing.
              </p>

              <button
                onClick={scanAgain}
                className="mt-6 rounded-xl bg-[hsl(var(--primary))] px-5 py-3 text-sm font-bold text-[hsl(var(--primary-foreground))]"
              >
                Scan another QR
              </button>
            </div>
          )}
        </section>
      </div>
    </>
  );
}

function GuideNumber({ n, title, detail }: { n: string; title: string; detail: string }) {
  return <div className="flex gap-4"><span className="display-font text-2xl font-bold text-[hsl(var(--accent))]">{n}</span><div><p className="font-bold">{title}</p><p className="mt-1 text-sm leading-6 text-[hsl(var(--muted-foreground))]">{detail}</p></div></div>;
}

function Accessibility() {
  return <SettingsPage focus="accessibility" />;
}

function SettingsPage({ focus }: { focus?: 'accessibility' }) {
  const { data } = useGetSettings();
  const save = useSaveSettings();
  const client = useQueryClient();
  const [settings, setSettings] = useState(data ?? fallbackSettings);
  useEffect(() => { if (data) setSettings(data); }, [data]);
  const update = (key: keyof typeof fallbackSettings, value: boolean | string) => {
    const next = { ...settings, [key]: value };
    setSettings(next);
    save.mutate({ data: next }, { onSuccess: (saved) => client.setQueryData(getGetSettingsQueryKey(), saved) });
  };
  const toggles = [
    { key: 'voiceGuidance' as const, icon: Volume2, title: 'Voice guidance', detail: 'Hear important details read aloud as you move through Saathi.' },
    { key: 'largeText' as const, icon: Type, title: 'Larger text', detail: 'Give words more room to breathe across the whole experience.' },
    { key: 'highContrast' as const, icon: Contrast, title: 'High contrast', detail: 'Strengthen the difference between text, controls, and their background.' },
    { key: 'simplifiedMode' as const, icon: TextCursorInput, title: 'Simplified mode', detail: 'Show fewer choices and one focused step at a time.' },
    { key: 'reducedMotion' as const, icon: Pause, title: 'Reduce motion', detail: 'Keep transitions quiet and remove non-essential movement.' },
  ];
  return <><PageIntro eyebrow={focus ? 'Accessibility' : 'Your settings'} title={focus ? 'Set the pace that feels right.' : 'Make Saathi feel like yours.'} description="These preferences stay with you. Change anything at any time — there is no wrong setting." /><div className="grid gap-6 lg:grid-cols-[1fr_.62fr]"><section className="app-card rounded-3xl p-6 md:p-8"><div className="flex items-center justify-between border-b border-[hsl(var(--border))] pb-5"><div><h2 className="display-font text-2xl font-bold">Ways to make it easier</h2><p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">Tap a row to turn it on or off.</p></div><span className="grid h-11 w-11 place-items-center rounded-2xl bg-[hsl(var(--secondary))] text-[hsl(var(--primary))]"><AccessibilityIcon size={20} /></span></div><div className="divide-y divide-[hsl(var(--border))]">{toggles.map(({ key, icon: Icon, title, detail }) => <button key={key} onClick={() => update(key, !settings[key])} className="flex w-full items-center gap-4 py-5 text-left" data-testid={`button-toggle-${key}`}><span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${settings[key] ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]' : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]'}`}><Icon size={19} /></span><span className="min-w-0 flex-1"><span className="block font-bold">{title}</span><span className="mt-1 block text-sm leading-5 text-[hsl(var(--muted-foreground))]">{detail}</span></span><span className={`relative h-7 w-12 shrink-0 rounded-full p-1 transition-colors ${settings[key] ? 'bg-[hsl(var(--accent))]' : 'bg-[hsl(var(--border))]'}`}><span className={`block h-5 w-5 rounded-full bg-[hsl(var(--card))] shadow-sm transition-transform ${settings[key] ? 'translate-x-5' : ''}`} /></span></button>)}</div></section><section className="space-y-5"><div className="app-card rounded-3xl p-6"><p className="text-xs font-bold uppercase tracking-[.16em] text-[hsl(var(--muted-foreground))]">Language</p><h2 className="display-font mt-2 text-2xl font-bold">How should Saathi speak?</h2><p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">Choose the language you are most comfortable hearing.</p><Link href="/multilingual" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[hsl(var(--secondary))] px-4 py-2.5 text-sm font-bold text-[hsl(var(--primary))]" data-testid="link-change-language"><Languages size={16} /> Explore languages</Link></div><div className="app-card rounded-3xl bg-[hsl(var(--primary))] p-6 text-[hsl(var(--primary-foreground))]"><ShieldCheck className="text-[hsl(var(--accent))]" size={23} /><h2 className="display-font mt-5 text-2xl font-bold">Your choices are safe</h2><p className="mt-2 text-sm leading-6 text-[hsl(var(--primary-foreground)/.7)]">Saathi only uses these settings to make your practice experience more comfortable.</p></div></section></div>{save.isPending && <p className="mt-4 text-xs font-semibold text-[hsl(var(--muted-foreground))]" data-testid="status-saving-settings">Saving your preference…</p>}</>;
}

function Multilingual() {
  const { data, isLoading } = useGetLanguages();
  const save = useSaveSettings();
  const speakDemo = useSpeakText();
  const translate = useTranslateText();
  const languages = data ?? [{ code: 'en', name: 'English', nativeName: 'English' }, { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' }, { code: 'mr', name: 'Marathi', nativeName: 'मराठी' }, { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' }, { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' }];
  const [selected, setSelected] = useState('en');
  const [playing, setPlaying] = useState(false);
  const [translated, setTranslated] = useState('I will show you before you pay.');
  const [spokenText, setSpokenText] = useState('I will show you before you pay.');
  const speak = (language: string) => { setSelected(language); setPlaying(true); save.mutate({ data: { ...fallbackSettings, language } }); const phrase = 'I will show you before you pay.'; setTranslated(phrase); setSpokenText(phrase); translate.mutate({ data: { text: phrase, language } }, { onSuccess: (result) => { const text = result.translatedText?.trim() || phrase; setTranslated(text); setSpokenText(text); }, onError: () => { setTranslated(phrase); setSpokenText(phrase); } }); speakDemo.mutate({ data: { text: phrase, language } }, { onSuccess: (result) => { const text = result.text?.trim() || translated || phrase; setSpokenText(text); speakLocalized(text, language); }, onError: () => speakLocalized(spokenText || phrase, language) }); window.setTimeout(() => setPlaying(false), 1400); };
  return <><PageIntro eyebrow="Language demo" title="Understanding should sound familiar." description="Saathi can guide you in the language you use at home. Choose one to hear the same reassurance in a different voice." /><div className="grid gap-6 lg:grid-cols-[1.08fr_.92fr]"><section className="app-card rounded-3xl p-6 md:p-8"><div className="grid gap-3 sm:grid-cols-2">{isLoading ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20" />) : languages.map((language) => <button key={language.code} onClick={() => speak(language.code)} className={`flex items-center gap-4 rounded-2xl border p-4 text-left transition-transform hover:-translate-y-0.5 ${selected === language.code ? 'border-[hsl(var(--accent))] bg-[hsl(var(--accent)/.08)]' : 'border-[hsl(var(--border))] bg-[hsl(var(--card))]'}`} data-testid={`button-language-${language.code}`}><span className="grid h-10 w-10 place-items-center rounded-xl bg-[hsl(var(--secondary))] text-xs font-bold text-[hsl(var(--primary))]">{language.code.toUpperCase()}</span><span><b className="block">{language.name}</b><span className="mt-1 block text-sm text-[hsl(var(--muted-foreground))]">{language.nativeName}</span></span>{selected === language.code && <CheckCircle2 className="ml-auto text-[hsl(var(--accent))]" size={19} />}</button>)}</div></section><section className="app-card flex min-h-[380px] flex-col justify-between rounded-3xl p-7 text-[hsl(var(--foreground))]"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-[hsl(var(--muted-foreground))]">Saathi says</p><span className="mt-8 grid h-14 w-14 place-items-center rounded-2xl bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]"><Volume2 size={25} /></span><h2 className="display-font mt-6 text-3xl font-bold leading-tight text-[hsl(var(--foreground))]">“{spokenText || translated}”</h2><div className="mt-5 rounded-2xl bg-[hsl(var(--secondary))] p-4 text-sm leading-6 text-[hsl(var(--foreground))]"><p className="text-xs font-bold uppercase tracking-[.14em] text-[hsl(var(--primary))]">Text being spoken</p><p className="mt-2 font-semibold">{spokenText || translated}</p><p className="mt-3 text-xs font-bold uppercase tracking-[.14em] text-[hsl(var(--primary))]">English meaning</p><p className="mt-2 text-[hsl(var(--muted-foreground))]">I will show you before you pay.</p></div><p className="mt-4 text-sm text-[hsl(var(--muted-foreground))]">{languages.find((language) => language.code === selected)?.nativeName ?? 'English'} guidance preview</p></div><button onClick={() => speak(selected)} className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-[hsl(var(--accent))] px-4 py-3 text-sm font-bold text-[hsl(var(--accent-foreground))]" data-testid="button-play-language">{playing ? <Pause size={16} /> : <Play size={16} />}{playing ? 'Playing preview…' : 'Play this preview'}</button></section></div></>;
}

function LiteracyMode() {
  const steps = [{ title: 'Recognise the UPI sign', text: 'The UPI logo means a shop can accept a digital payment.', icon: WalletCards }, { title: 'Look for the name', text: 'Before you pay, check that the name matches the person or shop you know.', icon: Eye }, { title: 'Pause at the final screen', text: 'Read the amount one more time. You are always allowed to stop.', icon: Pause }];
  const [step, setStep] = useState(0);
  return <><PageIntro eyebrow="Step-by-step mode" title="One small lesson at a time." description="No tests. No pressure. Follow along with three ideas you can use the next time you pay." /><div className="mx-auto max-w-4xl"><div className="mb-8 flex items-center gap-2">{steps.map((item, index) => <div key={item.title} className="flex flex-1 items-center gap-2"><span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-bold ${index <= step ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]' : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]'}`}>{index < step ? <Check size={16} /> : index + 1}</span>{index < steps.length - 1 && <span className={`h-1 flex-1 rounded-full ${index < step ? 'bg-[hsl(var(--accent))]' : 'bg-[hsl(var(--border))]'}`} />}</div>)}</div><section className="app-card rounded-[2rem] p-7 md:p-12"><div className="grid gap-8 md:grid-cols-[.45fr_1fr] md:items-center"><div className="grid h-48 place-items-center rounded-3xl bg-[hsl(var(--secondary))] text-[hsl(var(--primary))] md:h-64"><span className="grid h-28 w-28 place-items-center rounded-full border-[10px] border-[hsl(var(--accent))]"><>{(() => { const Icon = steps[step].icon; return <Icon size={50} />; })()}</></span></div><div><p className="text-xs font-bold uppercase tracking-[.16em] text-[hsl(var(--primary))]">Lesson {step + 1} of {steps.length}</p><h2 className="display-font mt-4 text-4xl font-bold leading-tight">{steps[step].title}</h2><p className="mt-4 max-w-lg text-base leading-7 text-[hsl(var(--muted-foreground))]">{steps[step].text}</p><div className="mt-8 flex gap-3"><button disabled={step === 0} onClick={() => setStep((current) => current - 1)} className="rounded-xl border border-[hsl(var(--border))] px-4 py-3 text-sm font-bold disabled:opacity-40" data-testid="button-previous-lesson"><ArrowRight className="rotate-180" size={16} /></button><button onClick={() => setStep((current) => Math.min(current + 1, steps.length - 1))} className="flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-5 py-3 text-sm font-bold text-[hsl(var(--primary-foreground))]" data-testid="button-next-lesson">{step === steps.length - 1 ? 'Review again' : 'Next lesson'} <ArrowRight size={16} /></button></div></div></div></section><p className="mt-5 text-center text-sm font-semibold text-[hsl(var(--muted-foreground))]">You are doing well. Confidence grows with practice, not speed.</p></div></>;
}

function SignLanguage() {
  const cards = [{ title: 'Check the name', label: 'Look for the person or shop name before continuing.', symbol: '01' }, { title: 'Check the amount', label: 'Compare the amount on screen with what you agreed.', symbol: '02' }, { title: 'Choose to stop', label: 'If something feels wrong, close the screen and ask someone you trust.', symbol: '03' }];
  return <><PageIntro eyebrow="Visual guidance" title="Clear signs. No spoken instructions needed." description="These labeled visual cards explain the three most important moments in a payment. Share this page with a trusted helper, too." /><div className="grid gap-5 md:grid-cols-3">{cards.map((card, index) => <article key={card.title} className="app-card overflow-hidden rounded-3xl"><div className={`grid h-48 place-items-center ${index === 0 ? 'bg-[hsl(var(--primary))]' : index === 1 ? 'bg-[hsl(var(--accent))]' : 'bg-[hsl(36_80%_54%)]'} text-white`}><span className="display-font text-8xl font-extrabold tracking-[-.08em]">{card.symbol}</span></div><div className="p-6"><h2 className="display-font text-2xl font-bold">{card.title}</h2><p className="mt-3 text-sm leading-6 text-[hsl(var(--muted-foreground))]">{card.label}</p><div className="mt-5 flex items-center gap-2 text-xs font-bold text-[hsl(var(--primary))]"><span className="h-2 w-2 rounded-full bg-[hsl(var(--accent))]" /> Visual cue {index + 1}</div></div></article>)}</div><div className="app-card mt-6 flex flex-col gap-5 rounded-3xl p-6 md:flex-row md:items-center md:justify-between"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-[hsl(var(--muted-foreground))]">Need another way?</p><h2 className="display-font mt-2 text-2xl font-bold">Turn on larger text or voice guidance.</h2></div><Link href="/accessibility" className="inline-flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-5 py-3 text-sm font-bold text-[hsl(var(--primary-foreground))]" data-testid="link-visual-accessibility">Open accessibility <ArrowRight size={16} /></Link></div></>;
}

const offlineLessonDetails = {
  basics: {
    match: ['upi basics', 'first upi', 'first payment'],
    title: 'UPI basics',
    keyIdea: 'A UPI payment has three parts: who you are paying, how much you are paying, and your final approval.',
    steps: ['Choose the person, shop, or QR code.', 'Read the name shown on the screen.', 'Check the amount in rupees.', 'Approve only when everything looks expected.'],
    practice: 'Say this aloud before confirming: I am paying this person, this amount, for this reason.',
    reminder: 'Receiving money never needs your UPI PIN.',
    quickCheck: 'What are the two details to read before approving?',
    answer: 'The recipient name and the amount.',
  },
  qr: {
    match: ['qr'],
    title: 'QR codes explained',
    keyIdea: 'A QR code is like a payment address. It should lead to the right person or shop before you continue.',
    steps: ['Scan only when you trust where the QR came from.', 'Look for the merchant or person name after scanning.', 'Check if the amount is blank or already filled.', 'Stop if a stranger says a QR scan is needed for a refund.'],
    practice: 'Imagine scanning a shop QR. The name should match the shop board or receipt.',
    reminder: 'A QR code can be used to ask you to pay. It is not needed to receive a refund.',
    quickCheck: 'If the QR shows a different shop name, what should you do?',
    answer: 'Pause and ask the shopkeeper to confirm before paying.',
  },
  pin: {
    match: ['pin'],
    title: 'Protect your UPI PIN',
    keyIdea: 'Your UPI PIN is your approval. Anyone who knows it can try to move money from your account.',
    steps: ['Enter your PIN only inside your trusted payment app.', 'Cover the screen if someone is nearby.', 'Never say the PIN on a call or message.', 'Change the PIN if you think someone saw it.'],
    practice: 'Repeat the rule: PIN is only for paying, never for receiving.',
    reminder: 'Bank staff, police, delivery agents, and support callers do not need your PIN.',
    quickCheck: 'Should you enter your PIN to receive money?',
    answer: 'No. Entering a PIN approves money going out.',
  },
  fraud: {
    match: ['fraud', 'scam'],
    title: 'Spot a fraud attempt',
    keyIdea: 'Fraud often creates hurry, fear, or excitement so you act before checking.',
    steps: ['Notice urgent words like now, last chance, blocked, refund, or prize.', 'Do not share OTPs, PINs, or screen access.', 'Close the call or chat if you feel pressured.', 'Use the official app or trusted number to check.'],
    practice: 'When a message feels urgent, wait one minute and read it again slowly.',
    reminder: 'A real support person will let you pause and verify.',
    quickCheck: 'What is the safest first move when someone pressures you?',
    answer: 'Stop, do not share details, and verify through an official source.',
  },
  collect: {
    match: ['collect'],
    title: 'Collect requests',
    keyIdea: 'A collect request asks you to approve paying someone. It is not the same as receiving money.',
    steps: ['Read who sent the request.', 'Read the amount carefully.', 'Ask yourself if you expected this request.', 'Decline unknown or surprising requests.'],
    practice: 'If the request says Pay Rs 999, treat it like money leaving your account.',
    reminder: 'To receive money, you should not need to approve a collect request with your PIN.',
    quickCheck: 'What should you do with an unexpected collect request?',
    answer: 'Decline it and verify with the person through a trusted channel.',
  },
  habits: {
    match: ['safe payment', 'safe payment habits', 'habits'],
    title: 'Safe payment habits',
    keyIdea: 'A safe payment habit is a repeatable pause: name, amount, reason, then approve.',
    steps: ['Check the recipient name.', 'Check the amount digit by digit.', 'Check why you are paying.', 'Keep proof such as the success screen or transaction ID.'],
    practice: 'Use the same sentence each time: name, amount, reason, approve.',
    reminder: 'Speed is not safety. Taking time is part of paying well.',
    quickCheck: 'What are the three words to remember before approval?',
    answer: 'Name, amount, reason.',
  },
} satisfies Record<string, { match: string[]; title: string; keyIdea: string; steps: string[]; practice: string; reminder: string; quickCheck: string; answer: string }>;

function getOfflineLessonDetail(title: string) {
  const normalized = title.toLowerCase();
  return Object.values(offlineLessonDetails).find((lesson) => lesson.match.some((part) => normalized.includes(part))) ?? offlineLessonDetails.habits;
}

function OfflineLearningDetailed() {
  const { data, isLoading, isError, refetch } = useGetTutorials();
  const fallbackTutorials = [{ id: 't1', title: 'Your first UPI payment', description: 'Understand the path from choosing a person to confirming safely.', icon: '01', difficulty: 'Gentle start', minutes: 5, progress: 78, offline: true }, { id: 't2', title: 'How to read a QR code', description: 'Learn the small checks that make a scan feel less mysterious.', icon: '02', difficulty: 'Beginner', minutes: 4, progress: 35, offline: true }, { id: 't3', title: 'Pause before you pay', description: 'Build a simple safety habit you can use anywhere.', icon: '03', difficulty: 'Beginner', minutes: 6, progress: 0, offline: true }];
  const tutorials = data ?? fallbackTutorials;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = tutorials.find((tutorial) => tutorial.id === (selectedId ?? tutorials[0]?.id)) ?? tutorials[0];
  const detail = selected ? getOfflineLessonDetail(selected.title) : offlineLessonDetails.basics;
  return <><PageIntro eyebrow="Offline learning" title="Keep learning when the signal disappears." description="Each offline lesson has its own notes, practice, reminder, and quick check so you can learn one idea at a time." action={<span className="inline-flex items-center gap-2 rounded-full bg-[hsl(153_42%_42%/.11)] px-3 py-2 text-xs font-bold text-[hsl(153_42%_35%)]"><CheckCircle2 size={15} /> Available offline</span>} />{isError ? <ErrorState retry={() => refetch()} /> : isLoading ? <div className="grid gap-5 md:grid-cols-3">{[1, 2, 3].map((i) => <Skeleton className="h-72" key={i} />)}</div> : <div className="grid gap-6 xl:grid-cols-[.9fr_1.1fr]"><section className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">{tutorials.map((tutorial) => { const lesson = getOfflineLessonDetail(tutorial.title); const active = selected?.id === tutorial.id; return <button key={tutorial.id} onClick={() => setSelectedId(tutorial.id)} className={`app-card rounded-3xl p-5 text-left transition-transform hover:-translate-y-0.5 ${active ? 'border-[hsl(var(--primary))] ring-2 ring-[hsl(var(--primary)/.14)]' : ''}`} data-testid={`button-offline-lesson-${tutorial.id}`}><div className="flex items-start justify-between gap-3"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[hsl(var(--secondary))] text-lg font-bold text-[hsl(var(--primary))]">{tutorial.icon}</span><span className="rounded-full bg-[hsl(153_42%_42%/.1)] px-2.5 py-1 text-[10px] font-bold text-[hsl(153_42%_35%)]">Offline</span></div><h2 className="display-font mt-5 text-2xl font-bold">{tutorial.title}</h2><p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">{tutorial.description}</p><p className="mt-4 rounded-2xl bg-[hsl(var(--muted)/.45)] p-3 text-sm leading-6 text-[hsl(var(--foreground))]">{lesson.keyIdea}</p><div className="mt-5 flex items-center justify-between text-xs font-semibold text-[hsl(var(--muted-foreground))]"><span>{tutorial.difficulty}</span><span>{tutorial.minutes} min</span></div><div className="mt-3 h-2 rounded-full bg-[hsl(var(--muted))]"><div className="h-full rounded-full bg-[hsl(var(--accent))]" style={{ width: `${tutorial.progress}%` }} /></div></button>; })}</section>{selected && <section className="app-card rounded-3xl p-6 md:p-8"><div className="flex flex-col gap-4 border-b border-[hsl(var(--border))] pb-6 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-[hsl(var(--primary))]">{selected.difficulty} · {selected.minutes} min</p><h2 className="display-font mt-2 text-3xl font-bold">{detail.title}</h2><p className="mt-3 text-sm leading-6 text-[hsl(var(--muted-foreground))]">{detail.keyIdea}</p></div><span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[hsl(var(--secondary))] text-xl font-bold text-[hsl(var(--primary))]">{selected.icon}</span></div><div className="mt-7 grid gap-5 lg:grid-cols-[1fr_.72fr]"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-[hsl(var(--muted-foreground))]">Lesson steps</p><div className="mt-4 space-y-3">{detail.steps.map((step, index) => <div key={step} className="flex gap-3 rounded-2xl border border-[hsl(var(--border))] p-4"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[hsl(var(--primary))] text-xs font-bold text-[hsl(var(--primary-foreground))]">{index + 1}</span><p className="text-sm leading-6">{step}</p></div>)}</div></div><aside className="space-y-4"><div className="rounded-2xl bg-[hsl(var(--secondary))] p-5"><p className="text-xs font-bold uppercase tracking-[.14em] text-[hsl(var(--primary))]">Try this</p><p className="mt-2 text-sm leading-6">{detail.practice}</p></div><div className="rounded-2xl bg-[hsl(36_80%_54%/.12)] p-5"><p className="flex items-center gap-2 font-bold text-[hsl(36_70%_37%)]"><ShieldQuestion size={17} /> Safety reminder</p><p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">{detail.reminder}</p></div><div className="rounded-2xl border border-[hsl(var(--border))] p-5"><p className="text-xs font-bold uppercase tracking-[.14em] text-[hsl(var(--muted-foreground))]">Quick check</p><p className="mt-2 text-sm font-bold leading-6">{detail.quickCheck}</p><p className="mt-3 rounded-xl bg-[hsl(153_42%_42%/.1)] p-3 text-sm leading-6 text-[hsl(153_42%_35%)]">{detail.answer}</p></div></aside></div></section>}</div>}</>;
}

function OfflineLearning() {
  const { data, isLoading, isError, refetch } = useGetTutorials();
  const tutorials = data ?? [{ id: 't1', title: 'Your first UPI payment', description: 'Understand the path from choosing a person to confirming safely.', icon: '01', difficulty: 'Gentle start', minutes: 5, progress: 78, offline: true }, { id: 't2', title: 'How to read a QR code', description: 'Learn the small checks that make a scan feel less mysterious.', icon: '02', difficulty: 'Beginner', minutes: 4, progress: 35, offline: true }, { id: 't3', title: 'Pause before you pay', description: 'Build a simple safety habit you can use anywhere.', icon: '03', difficulty: 'Beginner', minutes: 6, progress: 0, offline: true }];
  return <><PageIntro eyebrow="Offline learning" title="Keep learning when the signal disappears." description="Save a little confidence for later. These short lessons are designed for quiet moments and patchy connections." action={<span className="inline-flex items-center gap-2 rounded-full bg-[hsl(153_42%_42%/.11)] px-3 py-2 text-xs font-bold text-[hsl(153_42%_35%)]"><CheckCircle2 size={15} /> Available offline</span>} />{isError ? <ErrorState retry={() => refetch()} /> : isLoading ? <div className="grid gap-5 md:grid-cols-3">{[1, 2, 3].map((i) => <Skeleton className="h-72" key={i} />)}</div> : <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{tutorials.map((tutorial) => <article key={tutorial.id} className="app-card rounded-3xl p-6"><div className="flex items-start justify-between"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-[hsl(var(--secondary))] text-lg font-bold text-[hsl(var(--primary))]">{tutorial.icon}</span><span className="rounded-full bg-[hsl(153_42%_42%/.1)] px-2.5 py-1 text-[10px] font-bold text-[hsl(153_42%_35%)]">Offline</span></div><h2 className="display-font mt-8 text-2xl font-bold">{tutorial.title}</h2><p className="mt-2 min-h-12 text-sm leading-6 text-[hsl(var(--muted-foreground))]">{tutorial.description}</p><div className="mt-6 flex items-center justify-between text-xs font-semibold text-[hsl(var(--muted-foreground))]"><span>{tutorial.difficulty}</span><span>{tutorial.minutes} min</span></div><div className="mt-3 h-2 rounded-full bg-[hsl(var(--muted))]"><div className="h-full rounded-full bg-[hsl(var(--accent))]" style={{ width: `${tutorial.progress}%` }} /></div><Link href="/literacy-mode" className="mt-6 flex items-center justify-center gap-2 rounded-xl border border-[hsl(var(--border))] px-4 py-3 text-sm font-bold text-[hsl(var(--primary))]" data-testid={`link-tutorial-${tutorial.id}`}>{tutorial.progress ? 'Continue lesson' : 'Start lesson'} <ArrowRight size={15} /></Link></article>)}</div>}</>;
}

function SafetyPage({ fraud = false }: { fraud?: boolean }) {
  const checks = fraud ? [{ icon: MessageCircle, title: 'Urgency is a warning sign', detail: 'A stranger may pressure you to act now. Real support will let you pause.' }, { icon: LockKeyhole, title: 'Never share your PIN', detail: 'Your UPI PIN approves a payment. No genuine helper needs to know it.' }, { icon: ShieldCheck, title: 'Refunds do not need a QR scan', detail: 'To receive money, you do not enter a PIN or scan a code sent by someone else.' }] : [{ icon: BadgeCheck, title: 'The recipient matches', detail: 'Saathi checks that the name you said is the name in the payment request.' }, { icon: CreditCard, title: 'The amount is visible', detail: 'You get a clear moment to look at the amount before confirming.' }, { icon: LockKeyhole, title: 'Your PIN stays private', detail: 'Saathi will never ask for your PIN, password, or one-time code.' }];
  return <><PageIntro eyebrow={fraud ? 'Fraud awareness' : 'Safety checks'} title={fraud ? 'The safest answer can be “not yet.”' : 'A pause is part of the payment.'} description={fraud ? 'Scams often feel urgent and confusing. Knowing the common patterns gives you room to choose carefully.' : 'Saathi quietly checks the details that matter. You see what passed, what needs attention, and what to do next.'} /><div className="grid gap-5 md:grid-cols-3">{checks.map(({ icon: Icon, title, detail }, index) => <article key={title} className="app-card rounded-3xl p-6"><div className={`grid h-12 w-12 place-items-center rounded-2xl ${fraud ? 'bg-[hsl(36_80%_54%/.14)] text-[hsl(36_70%_37%)]' : 'bg-[hsl(153_42%_42%/.1)] text-[hsl(153_42%_35%)]'}`}><Icon size={22} /></div><span className="mt-8 block text-xs font-bold uppercase tracking-[.16em] text-[hsl(var(--muted-foreground))]">Check {index + 1}</span><h2 className="display-font mt-2 text-2xl font-bold">{title}</h2><p className="mt-3 text-sm leading-6 text-[hsl(var(--muted-foreground))]">{detail}</p></article>)}</div><section className="app-card mt-6 flex flex-col gap-5 rounded-3xl bg-[hsl(var(--primary))] p-7 text-[hsl(var(--primary-foreground))] md:flex-row md:items-center md:justify-between"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-[hsl(var(--accent))]">Remember</p><h2 className="display-font mt-2 max-w-xl text-3xl font-bold">{fraud ? 'Stop. Check. Ask someone you trust.' : 'You are allowed to take as long as you need.'}</h2></div><Link href={fraud ? '/safe-payment' : '/voice-payment'} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[hsl(var(--accent))] px-5 py-3 text-sm font-bold text-[hsl(var(--accent-foreground))]" data-testid={`link-${fraud ? 'safety-check' : 'practice-payment'}`}>{fraud ? 'Practice a safety check' : 'Practice with Saathi'} <ArrowRight size={16} /></Link></section></>;
}

function AiAssistant() {
  const { data: history } = useGetAssistantHistory();
  const send = useSendAssistantMessage();
  const speak = useSpeakText();
  const client = useQueryClient();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([{ from: 'saathi', text: 'Hello. I can explain payments in simple words. What would you like to understand?' }]);
  useEffect(() => { if (history?.length) setMessages(history.map((message) => ({ from: message.from, text: message.message }))); }, [history]);
  const ask = (text: string) => { if (!text.trim()) return; setMessages((current) => [...current, { from: 'you', text }]); setInput(''); send.mutate({ data: { message: text, language: 'en' } }, { onSuccess: (result) => { setMessages((current) => [...current, { from: 'saathi', text: result.message }]); client.invalidateQueries({ queryKey: getGetAssistantHistoryQueryKey() }); speak.mutate({ data: { text: result.message, language: 'en' } }, { onSuccess: (speech) => { if ('speechSynthesis' in window) window.speechSynthesis.speak(new SpeechSynthesisUtterance(speech.text)); } }); }, onError: () => setMessages((current) => [...current, { from: 'saathi', text: 'I am still learning that question. You can ask me about a QR code, a UPI PIN, or how to check a recipient.' }]) }); };
  return <><PageIntro eyebrow="Ask Saathi" title="No question is too small." description="Type it the way you would ask a trusted person. I’ll keep the answer short, clear, and free of jargon." /><div className="app-card mx-auto max-w-3xl overflow-hidden rounded-3xl"><div className="flex items-center gap-3 border-b border-[hsl(var(--border))] p-5"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]"><BrainCircuit size={20} /></span><div><p className="font-bold">Saathi assistant</p><p className="text-xs text-[hsl(var(--muted-foreground))]">Beginner-friendly guidance · history saved for this demo</p></div><span className="ml-auto flex items-center gap-1.5 text-xs font-bold text-[hsl(153_42%_35%)]"><span className="h-2 w-2 rounded-full bg-[hsl(153_42%_42%)]" /> Available</span></div><div className="min-h-[340px] space-y-4 bg-[hsl(var(--muted)/.32)] p-5">{messages.map((message, index) => <div key={`${message.from}-${index}`} className={`flex ${message.from === 'you' ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 ${message.from === 'you' ? 'rounded-br-md bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]' : 'rounded-bl-md bg-[hsl(var(--card))] text-[hsl(var(--foreground))] shadow-sm'}`} data-testid={`message-chat-${index}`}>{message.text}</div></div>)}{send.isPending && <div className="flex"><Skeleton className="h-10 w-40" /> </div>}</div><div className="border-t border-[hsl(var(--border))] p-4"><div className="mb-3 flex flex-wrap gap-2">{['What is a UPI PIN?', 'Is this QR safe?', 'How do I stop?'].map((prompt) => <button key={prompt} onClick={() => ask(prompt)} className="rounded-full border border-[hsl(var(--border))] px-3 py-1.5 text-xs font-semibold text-[hsl(var(--primary))]" data-testid={`button-prompt-${prompt.slice(0, 5)}`}>{prompt}</button>)}</div><div className="flex gap-2"><input value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') ask(input); }} placeholder="Ask in your own words…" className="min-w-0 flex-1 rounded-xl border border-[hsl(var(--input))] px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]" data-testid="input-assistant" /><button onClick={() => ask(input)} className="rounded-xl bg-[hsl(var(--primary))] px-4 text-sm font-bold text-[hsl(var(--primary-foreground))]" data-testid="button-send-assistant">Send</button></div></div></div></>;
}

function History() {
  const { data, isLoading, isError, refetch } = useGetHistory();
  const payments = data ?? fallbackPayments;
  return <><PageIntro eyebrow="Payment history" title="A clear record of your practice." description="Every item here is simulated. Use the list to remember what you checked and how you chose to pay." action={<Link href="/voice-payment" className="inline-flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-4 py-3 text-sm font-bold text-[hsl(var(--primary-foreground))]" data-testid="link-history-new-payment"><Mic size={16} /> New practice</Link>} /><div className="mb-6"><SimulatedNotice /></div>{isError ? <ErrorState retry={() => refetch()} /> : <div className="app-card overflow-hidden rounded-3xl"><div className="hidden grid-cols-[1.4fr_.7fr_.8fr_.7fr] gap-4 border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/.5)] px-6 py-4 text-[10px] font-bold uppercase tracking-[.16em] text-[hsl(var(--muted-foreground))] md:grid"><span>Recipient</span><span>When</span><span>Source</span><span className="text-right">Amount</span></div><div className="divide-y divide-[hsl(var(--border))]">{isLoading ? [1, 2, 3].map((i) => <Skeleton className="mx-6 my-5 h-12" key={i} />) : payments.map((payment) => <div key={payment.id} className="grid gap-3 px-5 py-5 md:grid-cols-[1.4fr_.7fr_.8fr_.7fr] md:items-center md:gap-4 md:px-6" data-testid={`row-history-${payment.id}`}><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[hsl(var(--secondary))] text-[hsl(var(--primary))]"><WalletCards size={17} /></span><div><p className="text-sm font-bold">{payment.recipient}</p><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{payment.demoLabel}</p></div></div><span className="text-xs text-[hsl(var(--muted-foreground))]">{payment.date}</span><span className="text-xs font-semibold text-[hsl(var(--muted-foreground))]">{payment.source === 'voice' ? 'Voice guidance' : payment.source === 'qr' ? 'QR guidance' : 'Manual entry'}</span><span className="text-sm font-bold md:text-right">₹{payment.amount.toLocaleString('en-IN')}</span></div>)}</div></div>}</>;
}

function NotificationsPage() {
  const { data, isLoading, refetch } = useGetNotifications();
  const read = useMarkNotificationRead();
  const readAll = useMarkAllNotificationsRead();
  const client = useQueryClient();
  const notifications = getNotificationList(data);
  const markRead = (id: string) => read.mutate({ id: Number(id) }, { onSuccess: (updated) => client.setQueryData(getGetNotificationsQueryKey(), notifications.map((item) => item.id === updated.id ? updated : item)) });
  const markEverythingRead = () => readAll.mutate(undefined, { onSuccess: () => { client.invalidateQueries({ queryKey: getGetNotificationsQueryKey() }); refetch(); } });
  return <><PageIntro eyebrow="Notifications" title="Helpful reminders, when you want them." description="Saathi keeps safety tips, learning nudges, and practice receipts here. Nothing here asks for a PIN, OTP, or bank credential." action={<button onClick={markEverythingRead} className="inline-flex items-center gap-2 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-3 text-sm font-bold text-[hsl(var(--primary))]" data-testid="button-read-all"><CheckCheck size={16} /> Mark all read</button>} /><div className="app-card overflow-hidden rounded-3xl"><div className="divide-y divide-[hsl(var(--border))]">{isLoading ? [1, 2, 3].map((item) => <Skeleton key={item} className="mx-6 my-5 h-16" />) : notifications.length === 0 ? <EmptyState title="No reminders yet" detail="Your new safety and learning activity will appear here." /> : notifications.map((notification) => <button key={notification.id} onClick={() => markRead(notification.id)} className={`flex w-full items-start gap-4 p-5 text-left transition-colors hover:bg-[hsl(var(--muted)/.35)] ${notification.read ? 'opacity-60' : ''}`} data-testid={`notification-${notification.id}`}><span className={`mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl ${notification.type === 'safety' ? 'bg-[hsl(36_80%_54%/.14)] text-[hsl(36_70%_37%)]' : 'bg-[hsl(var(--secondary))] text-[hsl(var(--primary))]'}`}><Bell size={17} /></span><span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-2"><b>{notification.title}</b>{!notification.read && <span className="rounded-full bg-[hsl(var(--accent)/.18)] px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-[.12em] text-[hsl(var(--primary))]">New</span>}</span><span className="mt-1 block text-sm leading-6 text-[hsl(var(--muted-foreground))]">{notification.message}</span></span><span className="text-xs text-[hsl(var(--muted-foreground))]">{new Date(notification.createdAt).toLocaleDateString('en-IN')}</span></button>)}</div></div></>;
}

function AnalyticsPage() {
  const { data, isLoading, isError, refetch } = useGetAnalytics();
  const analytics = data ?? { practiceSessions: [], lessonsCompleted: 0, assistantUses: 0, fraudQuizScore: 0, accessibilityUsage: 0, paymentSimulations: 0, languageUsage: [] };
  const max = Math.max(...analytics.practiceSessions.map((point) => point.value), 1);
  return <><PageIntro eyebrow="Practice insights" title="See how confidence is growing." description="These numbers describe your demo activity only. They never connect to a bank or payment provider." /><SimulatedNotice />{isError ? <div className="mt-6"><ErrorState retry={() => refetch()} /></div> : <div className="mt-6 space-y-6"><section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[{ label: 'Practice payments', value: analytics.paymentSimulations, icon: WalletCards }, { label: 'Lessons completed', value: analytics.lessonsCompleted, icon: BookOpen }, { label: 'Assistant uses', value: analytics.assistantUses, icon: MessageCircle }, { label: 'Quiz average', value: `${analytics.fraudQuizScore}%`, icon: ShieldCheck }].map(({ label, value, icon: Icon }) => <div className="app-card rounded-3xl p-5" key={label}>{isLoading ? <Skeleton className="h-20" /> : <><span className="grid h-10 w-10 place-items-center rounded-xl bg-[hsl(var(--secondary))] text-[hsl(var(--primary))]"><Icon size={18} /></span><p className="mt-5 text-xs font-bold uppercase tracking-[.14em] text-[hsl(var(--muted-foreground))]">{label}</p><p className="display-font mt-1 text-3xl font-extrabold">{value}</p></>}</div>)}</section><section className="app-card rounded-3xl p-6 md:p-8"><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-[hsl(var(--muted-foreground))]">Last seven days</p><h2 className="display-font mt-2 text-2xl font-bold">Practice rhythm</h2></div><BarChart3 className="text-[hsl(var(--accent))]" /></div><div className="mt-8 flex h-48 items-end justify-between gap-3">{analytics.practiceSessions.map((point) => <div className="flex h-full flex-1 flex-col items-center justify-end gap-2" key={point.day}><div className="w-full max-w-10 rounded-t-xl bg-[hsl(var(--primary))] transition-[height]" style={{ height: `${Math.max(10, (point.value / max) * 100)}%` }} /><span className="text-xs font-semibold text-[hsl(var(--muted-foreground))]">{point.day}</span></div>)}</div></section><section className="app-card rounded-3xl p-6"><div className="flex items-start gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[hsl(var(--accent)/.18)] text-[hsl(var(--primary))]"><CircleAlert size={18} /></span><div><h2 className="font-bold">Keep the meaning clear</h2><p className="mt-1 text-sm leading-6 text-[hsl(var(--muted-foreground))]">A higher number means more practice activity, not more money moved. Every payment shown here is a saved learning simulation.</p></div></div></section></div>}</>;
}

const fraudPracticeQuestions = [
  {
    id: 'refund-qr',
    prompt: 'Someone says you must scan a QR code to receive a refund. What should you do?',
    riskyLabel: 'Scan it quickly',
    safeLabel: 'Stop and verify through the official app',
    answer: false,
    correctText: 'Correct: receiving money does not require a QR scan or PIN.',
    reviewText: 'Review: stop when a stranger creates urgency.',
    explanation: 'Never share OTPs, PINs, or screen access. Use a trusted official support path.',
  },
  {
    id: 'pin-request',
    prompt: 'A caller says they are from your bank and asks for your UPI PIN to fix a failed payment.',
    riskyLabel: 'Share the PIN so they can help',
    safeLabel: 'Refuse and contact the bank yourself',
    answer: false,
    correctText: 'Correct: no bank or support person should ask for your UPI PIN.',
    reviewText: 'Review: your UPI PIN approves payments and must stay private.',
    explanation: 'End the call and use the official app, card, or website to contact support.',
  },
  {
    id: 'collect-request',
    prompt: 'You receive a collect request from an unknown person for Rs 1,999. What is safer?',
    riskyLabel: 'Approve it because it says urgent',
    safeLabel: 'Decline it and check with a trusted contact',
    answer: false,
    correctText: 'Correct: unexpected collect requests should be declined.',
    reviewText: 'Review: a collect request can take money from you if you approve it.',
    explanation: 'Pause whenever a request is unexpected, urgent, or from someone you do not know.',
  },
  {
    id: 'screen-share',
    prompt: 'Someone asks you to install a screen-sharing app while you open your payment app.',
    riskyLabel: 'Install it and follow their steps',
    safeLabel: 'Do not share your screen during payments',
    answer: false,
    correctText: 'Correct: screen sharing can expose OTPs, balances, and payment approvals.',
    reviewText: 'Review: never let another person watch or control your payment app.',
    explanation: 'Close the call and remove any unfamiliar remote-access app before using payments.',
  },
  {
    id: 'merchant-name',
    prompt: 'At a shop, the QR code shows a different merchant name than the shop board.',
    riskyLabel: 'Pay anyway because the amount is small',
    safeLabel: 'Ask the shopkeeper to confirm before paying',
    answer: false,
    correctText: 'Correct: the recipient name should match what you expect.',
    reviewText: 'Review: always check the recipient before confirming.',
    explanation: 'A small pause can prevent sending money to the wrong account.',
  },
] satisfies {
  id: string;
  prompt: string;
  riskyLabel: string;
  safeLabel: string;
  answer: boolean;
  correctText: string;
  reviewText: string;
  explanation: string;
}[];

function FraudQuizPracticePage() {
  const submit = useSubmitFraudQuiz();
  const { data: activity } = useGetFraudAlerts();
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selected, setSelected] = useState<boolean | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const question = fraudPracticeQuestions[questionIndex];
  const isCorrect = selected === question.answer;
  const choose = (value: boolean) => {
    if (submitted) return;
    setSelected(value);
  };
  const goToQuestion = (index: number) => {
    setQuestionIndex(index);
    setSelected(null);
    setSubmitted(false);
  };
  const check = () => {
    if (selected === null || submitted) return;
    setSubmitted(true);
    submit.mutate({ data: { category: question.id, result: isCorrect ? '100% correct' : 'Review again' } });
  };
  return <><PageIntro eyebrow="Fraud practice quiz" title="Practice spotting pressure." description="This is a learning exercise. Choose the safer response, then read the explanation." /><section className="app-card mx-auto max-w-3xl rounded-3xl p-6 md:p-8"><div className="flex items-start gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-[hsl(36_80%_54%/.14)] text-[hsl(36_70%_37%)]"><ShieldQuestion size={20} /></span><div><p className="text-xs font-bold uppercase tracking-[.14em] text-[hsl(var(--muted-foreground))]">Question {questionIndex + 1} of {fraudPracticeQuestions.length}</p><h2 className="display-font mt-2 text-2xl font-bold">{question.prompt}</h2></div></div><div className="mt-7 grid gap-3 sm:grid-cols-2"><button onClick={() => choose(true)} className={`rounded-2xl border p-4 text-left text-sm font-bold ${selected === true ? 'border-[hsl(var(--destructive))] bg-[hsl(var(--destructive)/.08)]' : 'border-[hsl(var(--border))]'}`} data-testid="button-quiz-risky">{question.riskyLabel}</button><button onClick={() => choose(false)} className={`rounded-2xl border p-4 text-left text-sm font-bold ${selected === false ? 'border-[hsl(var(--accent))] bg-[hsl(var(--accent)/.12)]' : 'border-[hsl(var(--border))]'}`} data-testid="button-quiz-safe">{question.safeLabel}</button></div><div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><button onClick={check} disabled={selected === null || submitted || submit.isPending} className="rounded-xl bg-[hsl(var(--primary))] px-5 py-3 text-sm font-bold text-[hsl(var(--primary-foreground))] disabled:opacity-50" data-testid="button-submit-fraud-quiz">{submit.isPending ? 'Saving result...' : submitted ? 'Answer saved' : 'Check my answer'}</button><div className="flex gap-2"><button onClick={() => goToQuestion(Math.max(0, questionIndex - 1))} disabled={questionIndex === 0} className="rounded-xl border border-[hsl(var(--border))] px-4 py-3 text-sm font-bold text-[hsl(var(--primary))] disabled:opacity-45" data-testid="button-quiz-prev">Previous</button><button onClick={() => goToQuestion((questionIndex + 1) % fraudPracticeQuestions.length)} className="rounded-xl border border-[hsl(var(--border))] px-4 py-3 text-sm font-bold text-[hsl(var(--primary))]" data-testid="button-quiz-next">Next</button></div></div>{submitted && <div className={`mt-6 rounded-2xl p-5 ${isCorrect ? 'bg-[hsl(153_42%_42%/.1)]' : 'bg-[hsl(36_80%_54%/.12)]'}`}><p className={`flex items-center gap-2 font-bold ${isCorrect ? 'text-[hsl(153_42%_35%)]' : 'text-[hsl(36_70%_37%)]'}`}><CheckCircle2 size={18} /> {isCorrect ? question.correctText : question.reviewText}</p><p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">{question.explanation}</p></div>}<div className="mt-7 flex flex-wrap gap-2">{fraudPracticeQuestions.map((item, index) => <button key={item.id} onClick={() => goToQuestion(index)} className={`h-9 min-w-9 rounded-full border px-3 text-xs font-extrabold ${index === questionIndex ? 'border-[hsl(var(--primary))] bg-[hsl(var(--secondary))] text-[hsl(var(--primary))]' : 'border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))]'}`} aria-label={`Open question ${index + 1}`} data-testid={`button-quiz-dot-${index + 1}`}>{index + 1}</button>)}</div></section><section className="app-card mx-auto mt-6 max-w-3xl rounded-3xl p-6"><div className="flex items-center justify-between"><h2 className="display-font text-2xl font-bold">Your saved practice</h2><span className="text-sm font-bold text-[hsl(var(--muted-foreground))]">{activity?.length ?? 0} attempts</span></div>{activity?.slice(0, 6).map((item) => <div key={item.id} className="mt-4 flex items-center justify-between border-t border-[hsl(var(--border))] pt-4 text-sm"><span>{item.category}</span><b className="text-[hsl(var(--primary))]">{item.result}</b></div>)}</section></>;
}

function FraudQuizPage() {
  const submit = useSubmitFraudQuiz();
  const { data: activity } = useGetFraudAlerts();
  const [selected, setSelected] = useState<boolean | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const question = 'Someone says you must scan a QR code to receive a refund. What should you do?';
  const answer = false;
  const check = () => { if (selected === null) return; setSubmitted(true); submit.mutate({ data: { category: 'refund-qr', result: selected === answer ? '100% correct' : 'Review again' } }); };
  return <><PageIntro eyebrow="Fraud practice quiz" title="Practice spotting pressure." description="This is a learning exercise. Choose the safer response, then read the explanation." /><section className="app-card mx-auto max-w-3xl rounded-3xl p-6 md:p-8"><div className="flex items-start gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-[hsl(36_80%_54%/.14)] text-[hsl(36_70%_37%)]"><ShieldQuestion size={20} /></span><div><p className="text-xs font-bold uppercase tracking-[.14em] text-[hsl(var(--muted-foreground))]">Question 1</p><h2 className="display-font mt-2 text-2xl font-bold">{question}</h2></div></div><div className="mt-7 grid gap-3 sm:grid-cols-2"><button onClick={() => setSelected(true)} className={`rounded-2xl border p-4 text-left text-sm font-bold ${selected === true ? 'border-[hsl(var(--destructive))] bg-[hsl(var(--destructive)/.08)]' : 'border-[hsl(var(--border))]'}`}>Scan it quickly</button><button onClick={() => setSelected(false)} className={`rounded-2xl border p-4 text-left text-sm font-bold ${selected === false ? 'border-[hsl(var(--accent))] bg-[hsl(var(--accent)/.12)]' : 'border-[hsl(var(--border))]'}`}>Stop and verify through the official app</button></div><button onClick={check} disabled={selected === null || submit.isPending} className="mt-6 rounded-xl bg-[hsl(var(--primary))] px-5 py-3 text-sm font-bold text-[hsl(var(--primary-foreground))] disabled:opacity-50" data-testid="button-submit-fraud-quiz">{submit.isPending ? 'Saving result…' : 'Check my answer'}</button>{submitted && <div className="mt-6 rounded-2xl bg-[hsl(153_42%_42%/.1)] p-5"><p className="flex items-center gap-2 font-bold text-[hsl(153_42%_35%)]"><CheckCircle2 size={18} /> {selected === answer ? 'Correct: receiving money does not require a QR scan or PIN.' : 'Review: stop when a stranger creates urgency.'}</p><p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">Never share OTPs, PINs, or screen access. Use a trusted official support path.</p></div>}</section><section className="app-card mx-auto mt-6 max-w-3xl rounded-3xl p-6"><div className="flex items-center justify-between"><h2 className="display-font text-2xl font-bold">Your saved practice</h2><span className="text-sm font-bold text-[hsl(var(--muted-foreground))]">{activity?.length ?? 0} attempts</span></div>{activity?.slice(0, 4).map((item) => <div key={item.id} className="mt-4 flex items-center justify-between border-t border-[hsl(var(--border))] pt-4 text-sm"><span>{item.category}</span><b className="text-[hsl(var(--primary))]">{item.result}</b></div>)}</section></>;
}

function AuthPage({ type }: { type: 'login' | 'signup' | 'forgot' }) {
  const [, setLocation] = useLocation();
  const copy = type === 'login' ? { eyebrow: 'Welcome back', title: 'Your calm place to practice payments.', button: 'Sign in', footer: 'New to Saathi?', link: 'Create an account', href: '/signup' } : type === 'signup' ? { eyebrow: 'Start gently', title: 'Build payment confidence at your pace.', button: 'Create account', footer: 'Already practicing?', link: 'Sign in', href: '/login' } : { eyebrow: 'No rush', title: 'We will help you get back in.', button: 'Send reset link', footer: 'Remembered it?', link: 'Sign in', href: '/login' };
  return <div className="noise grid min-h-[100dvh] bg-[hsl(204_45%_97%)] lg:grid-cols-[.85fr_1.15fr]"><div className="flex flex-col justify-between bg-[hsl(var(--primary))] p-7 text-[hsl(var(--primary-foreground))] lg:p-12"><BrandMark /><div className="max-w-md py-10"><p className="text-xs font-bold uppercase tracking-[.2em] text-[hsl(var(--accent))]">UPI Saathi</p><h1 className="display-font mt-5 text-5xl font-extrabold leading-[.98] tracking-[-.05em]">Payment confidence is a practice.</h1><p className="mt-6 text-base leading-7 text-[hsl(var(--primary-foreground)/.68)]">A reassuring guide for the everyday moments that matter.</p></div><p className="text-xs text-[hsl(var(--primary-foreground)/.48)]">Simulated learning environment · no real payments</p></div><div className="flex items-center justify-center p-6 md:p-12"><div className="w-full max-w-md"><p className="text-xs font-bold uppercase tracking-[.2em] text-[hsl(var(--primary))]">{copy.eyebrow}</p><h2 className="display-font mt-4 text-4xl font-extrabold leading-tight tracking-[-.045em]">{copy.title}</h2><p className="mt-3 text-sm leading-6 text-[hsl(var(--muted-foreground))]">For this demo, any details will take you into the guided experience.</p><form onSubmit={(event) => { event.preventDefault(); setLocation('/dashboard'); }} className="mt-9 space-y-4"><label className="block text-sm font-bold" htmlFor="auth-name">{type === 'signup' ? 'Your name' : 'Email or phone'}</label><input id="auth-name" className="w-full rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-4 py-3.5 outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]" placeholder={type === 'signup' ? 'Anita Sharma' : 'you@example.com'} data-testid="input-auth-primary" /><label className="block text-sm font-bold" htmlFor="auth-password">{type === 'forgot' ? ' ' : 'Password'}</label>{type !== 'forgot' && <input id="auth-password" type="password" className="w-full rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-4 py-3.5 outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]" placeholder="At least 6 characters" data-testid="input-auth-password" />}<button className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-5 py-3.5 text-sm font-bold text-[hsl(var(--primary-foreground))]" data-testid="button-auth-submit">{copy.button} <ArrowRight size={16} /></button></form><p className="mt-7 text-center text-sm text-[hsl(var(--muted-foreground))]">{copy.footer} <Link href={copy.href} className="font-bold text-[hsl(var(--primary))]" data-testid="link-auth-switch">{copy.link}</Link></p>{type === 'login' && <Link href="/forgot-password" className="mt-3 block text-center text-xs font-bold text-[hsl(var(--muted-foreground))]" data-testid="link-forgot-password">Forgot password?</Link>}</div></div></div>;
}

function AccessibilityRoute() {
  return <SettingsPage focus="accessibility" />;
}

function SettingsRoute() {
  return <SettingsPage />;
}

function ShellRoute({ path, Component }: { path: string; Component: () => ReactNode }) {
  return <Route path={path}><AppShell><Component /></AppShell></Route>;
}

function Router() {
  const shellRoutes = [
    { path: '/dashboard', Component: Dashboard },
    { path: '/voice-payment', Component: VoicePayment },
    { path: '/qr-guidance', Component: QrGuidance },
    { path: '/accessibility', Component: AccessibilityRoute },
    { path: '/multilingual', Component: Multilingual },
    { path: '/literacy-mode', Component: LiteracyMode },
    { path: '/sign-language', Component: SignLanguage },
    { path: '/offline-learning', Component: OfflineLearningDetailed },
    { path: '/safe-payment', Component: () => <SafetyPage /> },
    { path: '/fraud-awareness', Component: () => <SafetyPage fraud /> },
    { path: '/fraud-quiz', Component: FraudQuizPracticePage },
    { path: '/ai-assistant', Component: AiAssistant },
    { path: '/history', Component: History },
    { path: '/notifications', Component: NotificationsPage },
    { path: '/analytics', Component: AnalyticsPage },
    { path: '/settings', Component: SettingsRoute },
  ];
  return <Switch><Route path="/" component={Home} /><Route path="/login" component={() => <AuthPage type="login" />} /><Route path="/signup" component={() => <AuthPage type="signup" />} /><Route path="/forgot-password" component={() => <AuthPage type="forgot" />} />{shellRoutes.map(({ path, Component }) => <ShellRoute key={path} path={path} Component={Component} />)}<Route component={NotFound} /></Switch>;
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><RoutedErrorBoundary><Router /></RoutedErrorBoundary><Toaster /></WouterRouter></TooltipProvider></QueryClientProvider>;
}

export default App;
