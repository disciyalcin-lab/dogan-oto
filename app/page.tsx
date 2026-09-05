'use client';

import {
  Search,
  Bell,
  BellRing,
  Plus,
  Wallet,
  Wrench,
  Clock3,
  Car,
  ClipboardCheck,
  X,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CalendarCheck,
  Sun,
  Moon,
  ChevronLeft,
  ChevronRight,
  Phone,
  CheckCircle2,
  AlertTriangle,
  Info,
  Send,
  Timer,
  Check,
  Sparkles,
  Volume2
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { hasSupabaseConfig, supabase } from '@/lib/supabase';
import { Appointment } from '@/lib/types';

type Stage = 'Beklenen' | 'Liftte' | 'Parça Bekliyor' | 'Bitti' | 'Teslim Edildi';

type Vehicle = {
  id: number;
  plate: string;
  model: string;
  customer: string;
  phone?: string;
  note: string;
  eta: string; // e.g., '16:30' or 'Lift 2' or '2 gün'
  deliveryTime?: string; // e.g., '17:30'
  stage: Stage;
  partsCost: number;
  laborCost: number;
  deliveryNotified?: boolean;
};

const stageOrder: Stage[] = ['Beklenen', 'Liftte', 'Parça Bekliyor', 'Bitti', 'Teslim Edildi'];

const defaultVehicles: Vehicle[] = [
  { id: 1, plate: '34 ABC 123', model: 'Renault Clio 1.5 dCi', customer: 'Ahmet Yılmaz', phone: '0532 111 22 33', note: 'Yağ + filtre değişimi', eta: '14:30', deliveryTime: '15:30', stage: 'Beklenen', partsCost: 1300, laborCost: 800 },
  { id: 2, plate: '06 DEF 456', model: 'Ford Focus 1.6 TDCi', customer: 'Mehmet Kaya', phone: '0544 222 33 44', note: 'Ön fren balatası + disk', eta: '16:00', deliveryTime: '17:00', stage: 'Beklenen', partsCost: 1800, laborCost: 1200 },
  { id: 3, plate: '16 GHI 789', model: 'BMW 320i Sedan', customer: 'Cem Baran', phone: '0555 333 44 55', note: 'Alternatör & elektrik arızası', eta: 'Lift 2 (18:00)', deliveryTime: '18:30', stage: 'Liftte', partsCost: 2500, laborCost: 2000 },
  { id: 4, plate: '12 JKL 012', model: 'Volkswagen Passat 2.0', customer: 'Burak Torun', phone: '0533 444 55 66', note: 'Turbo hortumu bekleniyor', eta: 'Yarın 11:00', deliveryTime: '12:00', stage: 'Parça Bekliyor', partsCost: 2200, laborCost: 1400 },
  { id: 5, plate: '35 MNO 345', model: 'Toyota Corolla 1.8 Hybrid', customer: 'Deniz Aydın', phone: '0536 555 66 77', note: 'Triger seti değişimi tamam', eta: 'Teslime hazır', deliveryTime: '16:00', stage: 'Bitti', partsCost: 2100, laborCost: 1600 },
  { id: 6, plate: '18 PQR 678', model: 'Mercedes C180 AMG', customer: 'Ali Serin', phone: '0542 666 77 88', note: 'Ağır bakım teslim edildi', eta: 'Teslim edildi', deliveryTime: '12:00', stage: 'Teslim Edildi', partsCost: 4300, laborCost: 3000 },
];

const defaultAppointments: Appointment[] = [
  // Today (2026-09-05) - 3 cars (Yoğun)
  { id: 'apt-1', date: '2026-09-05', time: '09:30', deliveryTime: '14:30', plate: '34 ABC 123', model: 'Renault Clio 1.5 dCi', customer: 'Ahmet Yılmaz', phone: '0532 111 22 33', note: 'Periyodik bakım ve filtreler', estimatedCost: 2100, status: 'Onaylandı', notifyOneHourBefore: true },
  { id: 'apt-2', date: '2026-09-05', time: '11:00', deliveryTime: '16:00', plate: '06 DEF 456', model: 'Ford Focus 1.6 TDCi', customer: 'Mehmet Kaya', phone: '0544 222 33 44', note: 'Ön fren balata & disk değişimi', estimatedCost: 3000, status: 'Onaylandı', notifyOneHourBefore: true },
  { id: 'apt-3', date: '2026-09-05', time: '14:00', deliveryTime: '18:00', plate: '16 GHI 789', model: 'BMW 320i', customer: 'Cem Baran', phone: '0555 333 44 55', note: 'Şarj dinamosu ve akü kontrolü', estimatedCost: 4500, status: 'Atölyeye Alındı', notifyOneHourBefore: true },

  // Tomorrow (2026-09-06) - 1 car (Müsait)
  { id: 'apt-4', date: '2026-09-06', time: '10:00', deliveryTime: '15:00', plate: '35 MNO 345', model: 'Toyota Corolla Hybrid', customer: 'Deniz Aydın', phone: '0536 555 66 77', note: '100.000 km hibrit sistem kontrolü', estimatedCost: 3700, status: 'Onaylandı', notifyOneHourBefore: true },

  // Day after tomorrow (2026-09-07) - 5 cars (Tam Dolu)
  { id: 'apt-5', date: '2026-09-07', time: '08:30', deliveryTime: '12:30', plate: '41 KLL 990', model: 'Fiat Egea 1.3 MultiJet', customer: 'Hasan Aktaş', phone: '0530 123 45 67', note: 'Yağ bakımı ve rot ayarı', estimatedCost: 1900, status: 'Onaylandı', notifyOneHourBefore: true },
  { id: 'apt-6', date: '2026-09-07', time: '10:00', deliveryTime: '14:00', plate: '07 BRC 543', model: 'Hyundai Tucson', customer: 'Serkan Öztürk', phone: '0531 987 65 43', note: 'Klima gazı dolumu & polen filtresi', estimatedCost: 1500, status: 'Onaylandı', notifyOneHourBefore: true },
  { id: 'apt-7', date: '2026-09-07', time: '11:30', deliveryTime: '16:30', plate: '34 EEE 771', model: 'Audi A4 2.0 TDI', customer: 'Murat Dağ', phone: '0535 777 88 99', note: 'Ön takım ses tespiti & amortisörler', estimatedCost: 6200, status: 'Onaylandı', notifyOneHourBefore: true },
  { id: 'apt-8', date: '2026-09-07', time: '14:00', deliveryTime: '18:00', plate: '06 ZZZ 112', model: 'Opel Astra 1.4 Turbo', customer: 'Kemal Gül', phone: '0543 222 11 00', note: 'Termostat ve su kaçağı onarımı', estimatedCost: 3100, status: 'Onaylandı', notifyOneHourBefore: true },
  { id: 'apt-9', date: '2026-09-07', time: '15:30', deliveryTime: '19:30', plate: '10 TTT 334', model: 'Peugeot 3008', customer: 'Zeynep Bal', phone: '0552 444 33 22', note: 'Fren hidroliği ve buji değişimi', estimatedCost: 2400, status: 'Onaylandı', notifyOneHourBefore: true },

  // 2026-09-08 - 2 cars (Müsait)
  { id: 'apt-10', date: '2026-09-08', time: '09:00', deliveryTime: '13:00', plate: '12 JKL 012', model: 'Volkswagen Passat', customer: 'Burak Torun', phone: '0533 444 55 66', note: 'Parça montajı & test sürüşü', estimatedCost: 3600, status: 'Onaylandı', notifyOneHourBefore: true },
  { id: 'apt-11', date: '2026-09-08', time: '13:30', deliveryTime: '17:30', plate: '18 PQR 678', model: 'Mercedes C180', customer: 'Ali Serin', phone: '0542 666 77 88', note: 'Şanzıman yağı kontrolü', estimatedCost: 2800, status: 'Onaylandı', notifyOneHourBefore: true },

  // 2026-09-10 - 4 cars (Yoğun)
  { id: 'apt-12', date: '2026-09-10', time: '09:00', deliveryTime: '13:00', plate: '34 VVV 882', model: 'Seat Leon 1.2 TSI', customer: 'Onur Can', phone: '0532 999 88 77', note: 'Debriyaj baskı balata değişimi', estimatedCost: 5500, status: 'Onaylandı', notifyOneHourBefore: true },
  { id: 'apt-13', date: '2026-09-10', time: '11:00', deliveryTime: '15:00', plate: '06 YYY 441', model: 'Kia Sportage', customer: 'Fatih Koç', phone: '0541 333 22 11', note: 'Motor kulakları değişimi', estimatedCost: 3200, status: 'Onaylandı', notifyOneHourBefore: true },
  { id: 'apt-14', date: '2026-09-10', time: '14:00', deliveryTime: '17:30', plate: '16 RRR 999', model: 'Volvo XC60', customer: 'Bülent Arı', phone: '0555 111 00 22', note: 'Genel kontrol ve check-up', estimatedCost: 2000, status: 'Onaylandı', notifyOneHourBefore: true },
  { id: 'apt-15', date: '2026-09-10', time: '16:00', deliveryTime: '19:00', plate: '35 SSS 223', model: 'Dacia Duster 1.5 dCi', customer: 'Engin Er', phone: '0538 444 55 66', note: 'Egzoz partikül temizliği', estimatedCost: 2900, status: 'Onaylandı', notifyOneHourBefore: true },
];

const vehicleStorageKey = 'dogan-oto-vehicles-v2';
const appointmentStorageKey = 'dogan-oto-appointments-v2';
const themeStorageKey = 'dogan-oto-theme-v1';

const money = (value: number) =>
  new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    maximumFractionDigits: 0,
  }).format(value);

const stageAccent: Record<Stage, string> = {
  Beklenen: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200 border-blue-300 dark:border-blue-700',
  Liftte: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200 border-amber-300 dark:border-amber-700',
  'Parça Bekliyor': 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200 border-red-300 dark:border-red-700',
  Bitti: 'bg-violet-100 text-violet-800 dark:bg-violet-900/50 dark:text-violet-200 border-violet-300 dark:border-violet-700',
  'Teslim Edildi': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700',
};

function StatCard({ label, value, tone }: { label: string; value: string; tone: string }) {
  const toneMap: Record<string, { badge: string; border: string }> = {
    blue: { badge: 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800', border: 'hover:border-blue-300 dark:hover:border-blue-700' },
    green: { badge: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800', border: 'hover:border-emerald-300 dark:hover:border-emerald-700' },
    amber: { badge: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800', border: 'hover:border-amber-300 dark:hover:border-amber-700' },
    rose: { badge: 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800', border: 'hover:border-rose-300 dark:hover:border-rose-700' },
  };

  const selectedTone = toneMap[tone] || toneMap.blue;

  return (
    <div className={`card p-3 transition-all ${selectedTone.border}`}>
      <div className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${selectedTone.badge}`}>{label}</div>
      <div className="mt-3 text-xl font-bold tracking-tight text-slate-900 dark:text-white">{value}</div>
    </div>
  );
}

function VehicleCard({
  vehicle,
  onMove,
  onTriggerOneHourAlert,
}: {
  vehicle: Vehicle;
  onMove: (id: number, direction: number) => void;
  onTriggerOneHourAlert: (vehicle: Vehicle) => void;
}) {
  const currentIndex = stageOrder.indexOf(vehicle.stage);

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 transition-colors dark:border-slate-800 dark:bg-slate-800/80">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="inline-flex items-center gap-1.5 font-mono text-xs font-bold text-slate-900 dark:text-white">
            <span className="rounded bg-blue-700 px-1 py-0.5 text-[9px] text-white">TR</span>
            {vehicle.plate}
          </div>
          <div className="text-xs text-slate-600 dark:text-slate-400">{vehicle.model}</div>
        </div>
        <span className="badge border border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
          {vehicle.eta}
        </span>
      </div>

      <div className="mt-2.5 rounded-lg bg-white/60 p-2 text-xs text-slate-700 dark:bg-slate-900/60 dark:text-slate-300">
        {vehicle.note}
      </div>

      <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400">
        <span className="font-medium">{vehicle.customer}</span>
        <span className="font-bold text-slate-900 dark:text-slate-200">{money(vehicle.partsCost + vehicle.laborCost)}</span>
      </div>

      {vehicle.deliveryTime && vehicle.stage !== 'Teslim Edildi' && (
        <div className="mt-2 flex items-center justify-between rounded-md bg-amber-50/80 px-2 py-1 text-[10px] text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/50">
          <span className="inline-flex items-center gap-1">
            <Timer size={11} /> Teslim: {vehicle.deliveryTime}
          </span>
          <button
            type="button"
            onClick={() => onTriggerOneHourAlert(vehicle)}
            className="font-semibold underline hover:text-amber-950 dark:hover:text-amber-100"
            title="Teslim öncesi 1 saat bildirimini test et"
          >
            1s Bildirimi Test Et
          </button>
        </div>
      )}

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => onMove(vehicle.id, -1)}
          disabled={currentIndex === 0}
          className="flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-semibold text-slate-700 shadow-sm transition-opacity hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <span className="inline-flex items-center gap-1">
            <ArrowLeft size={12} /> Geri
          </span>
        </button>
        <button
          type="button"
          onClick={() => onMove(vehicle.id, 1)}
          disabled={currentIndex === stageOrder.length - 1}
          className="flex-1 rounded-lg bg-slate-900 px-2 py-1.5 text-[11px] font-semibold text-white shadow-sm transition-opacity hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-blue-600 dark:hover:bg-blue-500"
        >
          <span className="inline-flex items-center gap-1">
            İlerle <ArrowRight size={12} />
          </span>
        </button>
      </div>
    </div>
  );
}

function KanbanColumn({
  title,
  items,
  onMove,
  onTriggerOneHourAlert,
}: {
  title: Stage;
  items: Vehicle[];
  onMove: (id: number, direction: number) => void;
  onTriggerOneHourAlert: (vehicle: Vehicle) => void;
}) {
  return (
    <div className="min-w-[240px] flex-1 rounded-2xl border border-slate-200 bg-white p-2.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-3 flex items-center justify-between px-2">
        <div className="text-sm font-bold text-slate-800 dark:text-slate-200">{title}</div>
        <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${stageAccent[title]}`}>
          {items.length}
        </span>
      </div>
      <div className="space-y-2.5">
        {items.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400 dark:border-slate-800 dark:text-slate-500">
            Araç yok
          </div>
        )}
        {items.map((item) => (
          <VehicleCard
            key={item.id}
            vehicle={item}
            onMove={onMove}
            onTriggerOneHourAlert={onTriggerOneHourAlert}
          />
        ))}
      </div>
    </div>
  );
}

export default function HomePage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [query, setQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [reminderOpen, setReminderOpen] = useState(true);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [notificationModalOpen, setNotificationModalOpen] = useState(false);
  const [activePanel, setActivePanel] = useState<'appointments' | 'reminders' | 'cash' | 'reports' | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [inAppToast, setInAppToast] = useState<{ id: string; title: string; body: string; type: 'info' | 'success' | 'alert' } | null>(null);

  // Calendar specific states
  const [currentCalendarDate, setCurrentCalendarDate] = useState(() => new Date(2026, 8, 5)); // Sep 2026
  const [selectedDateString, setSelectedDateString] = useState('2026-09-05');
  const [showNewAppointmentModal, setShowNewAppointmentModal] = useState(false);

  // New appointment form state
  const [appointmentForm, setAppointmentForm] = useState({
    date: '2026-09-05',
    time: '10:00',
    deliveryTime: '16:00',
    plate: '',
    model: '',
    customer: '',
    phone: '',
    note: '',
    estimatedCost: '3500',
    notifyOneHourBefore: true,
  });

  // New vehicle form state
  const [form, setForm] = useState({
    plate: '',
    model: '',
    customer: '',
    phone: '',
    note: '',
    stage: 'Beklenen' as Stage,
    eta: '16:00',
    deliveryTime: '17:30',
    partsCost: '2500',
    laborCost: '1800',
  });

  // Dark mode initialization
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const savedTheme = localStorage.getItem(themeStorageKey);
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const activeDark = savedTheme === 'dark' || (!savedTheme && prefersDark);
    setIsDarkMode(activeDark);
    if (activeDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleDarkMode = () => {
    const nextDark = !isDarkMode;
    setIsDarkMode(nextDark);
    if (nextDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem(themeStorageKey, 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem(themeStorageKey, 'light');
    }
  };

  // Toast trigger
  const showToast = useCallback((title: string, body: string, type: 'info' | 'success' | 'alert' = 'info') => {
    setInAppToast({ id: String(Date.now()), title, body, type });
    setTimeout(() => {
      setInAppToast((prev) => (prev?.title === title ? null : prev));
    }, 6000);
  }, []);

  // Sound and vibration helper
  const triggerAudioVibe = useCallback(() => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([200, 100, 200, 100, 300]);
      } catch {
        // vibration blocked or unsupported
      }
    }
  }, []);

  // Browser & Service Worker Notification sender
  const sendBrowserNotification = useCallback((title: string, body: string, tag = 'dogan-oto') => {
    showToast(title, body, 'alert');
    triggerAudioVibe();

    if (typeof window === 'undefined') return;

    // 1. Try sending via Service Worker controller
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'SHOW_NOTIFICATION',
        title,
        options: {
          body,
          icon: '/icon.svg',
          badge: '/icon.svg',
          tag,
          vibrate: [300, 150, 300],
        },
      });
      return;
    }

    // 2. Try Service Worker ready registration (Works in Mobile Chrome!)
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready
        .then((reg) => {
          (reg as unknown as { showNotification: (t: string, o: any) => Promise<void> }).showNotification(title, {
            body,
            icon: '/icon.svg',
            badge: '/icon.svg',
            tag,
            vibrate: [300, 150, 300],
          });
        })
        .catch(() => {
          // Fallback to desktop window Notification if allowed
          if ('Notification' in window && Notification.permission === 'granted') {
            try {
              new Notification(title, { body, icon: '/icon.svg', tag });
            } catch {
              // Notification constructor restricted in this context
            }
          }
        });
      return;
    }

    // 3. Direct Window Notification fallback
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, { body, icon: '/icon.svg', tag });
      } catch {
        // window constructor disabled on mobile
      }
    }
  }, [showToast, triggerAudioVibe]);

  // Schedule notification in Service Worker
  const scheduleNotificationInSW = (id: string, title: string, body: string, delayMs: number) => {
    if (typeof window === 'undefined' || delayMs <= 0) return;

    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'SCHEDULE_DELIVERY_NOTIFICATION',
        id,
        title,
        options: {
          body,
          icon: '/icon.svg',
          badge: '/icon.svg',
          tag: `delivery-${id}`,
        },
        delayMs,
      });
    }
  };

  // Request Notification Permission
  const requestNotificationPermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setNotificationPermission('unsupported');
      showToast('Bildirim Desteklenmiyor', 'Tarayıcınız veya önizleme çerçevesi Web Notification API desteklemiyor.', 'alert');
      return;
    }

    try {
      let permission: NotificationPermission;
      if (typeof Notification.requestPermission === 'function') {
        const promise = Notification.requestPermission();
        if (promise && typeof promise.then === 'function') {
          permission = await promise;
        } else {
          // Callback style for older Safari/WebKit
          permission = await new Promise((resolve) => {
            Notification.requestPermission(resolve);
          });
        }
      } else {
        permission = Notification.permission;
      }

      setNotificationPermission(permission);

      if (permission === 'granted') {
        sendBrowserNotification('DOĞAN OTO', 'Bildirim izni başarıyla aktif edildi! Teslim saatine 1 saat kala telefona bildirim gelecektir.');
      } else if (permission === 'denied') {
        showToast('Bildirim İzni Engellendi', 'Tarayıcı kilit simgesinden veya telefon ayarlarından bildirimlere izin verebilirsiniz.', 'alert');
      }
    } catch {
      // In sandbox/iframe without allow="notifications"
      showToast('Bildirim Çerçeve Uyarısı', 'Önizleme çerçevesinde bildirim izni kısıtlı olabilir. Uygulama içi bildirimler aktiftir.', 'info');
    }
  };

  // Initial Data Load
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const loadData = async () => {
      // 1. Load Vehicles
      const savedVehicles = window.localStorage.getItem(vehicleStorageKey);
      if (savedVehicles) {
        try {
          setVehicles(JSON.parse(savedVehicles));
        } catch {
          setVehicles(defaultVehicles);
        }
      } else {
        setVehicles(defaultVehicles);
      }

      // 2. Load Appointments
      const savedAppointments = window.localStorage.getItem(appointmentStorageKey);
      if (savedAppointments) {
        try {
          setAppointments(JSON.parse(savedAppointments));
        } catch {
          setAppointments(defaultAppointments);
        }
      } else {
        setAppointments(defaultAppointments);
      }
    };

    loadData();

    // Notification permission probe & Service Worker register
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    } else {
      setNotificationPermission('unsupported');
    }

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          // Registration successful
        })
        .catch(() => {
          // Ignore registration failures in constrained sandbox
        });
    }
  }, []);

  // Save vehicles on changes
  useEffect(() => {
    if (typeof window !== 'undefined' && vehicles.length > 0) {
      window.localStorage.setItem(vehicleStorageKey, JSON.stringify(vehicles));
    }
  }, [vehicles]);

  // Save appointments on changes
  useEffect(() => {
    if (typeof window !== 'undefined' && appointments.length > 0) {
      window.localStorage.setItem(appointmentStorageKey, JSON.stringify(appointments));
    }
  }, [appointments]);

  // 1-Hour Prior Delivery Alert Periodic Check (Client-side background loop)
  useEffect(() => {
    const checkDeliveryAlerts = () => {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const currentTimeInMinutes = currentHour * 60 + currentMinute;

      // Check vehicles with a delivery time
      vehicles.forEach((v) => {
        if (v.stage === 'Teslim Edildi' || v.deliveryNotified) return;

        // Parse deliveryTime e.g., '16:30' or '17:00'
        if (v.deliveryTime && v.deliveryTime.includes(':')) {
          const [h, m] = v.deliveryTime.split(':').map(Number);
          if (!isNaN(h) && !isNaN(m)) {
            const deliveryInMinutes = h * 60 + m;
            const diff = deliveryInMinutes - currentTimeInMinutes;

            // Trigger when exactly between 0 and 60 minutes remaining
            if (diff > 0 && diff <= 60) {
              sendBrowserNotification(
                'DOĞAN OTO - Teslim Saatine 1 Saat Kaldı!',
                `${v.plate} (${v.model}) aracın teslim saatine ${diff} dakika kaldı (Planlanan Teslim: ${v.deliveryTime}). Lütfen son kontrolleri tamamlayınız.`,
                `delivery-${v.id}`
              );

              setVehicles((prev) =>
                prev.map((item) => (item.id === v.id ? { ...item, deliveryNotified: true } : item))
              );
            }
          }
        }
      });

      // Check appointments for today
      const todayString = '2026-09-05'; // or dynamically now.toISOString().slice(0,10)
      appointments.forEach((apt) => {
        if (apt.date === todayString && apt.notifyOneHourBefore && !apt.notified && apt.status !== 'Tamamlandı') {
          if (apt.deliveryTime && apt.deliveryTime.includes(':')) {
            const [h, m] = apt.deliveryTime.split(':').map(Number);
            if (!isNaN(h) && !isNaN(m)) {
              const deliveryInMinutes = h * 60 + m;
              const diff = deliveryInMinutes - currentTimeInMinutes;

              if (diff > 0 && diff <= 60) {
                sendBrowserNotification(
                  'DOĞAN OTO - Randevulu Araç Teslimine 1 Saat Kaldı!',
                  `${apt.plate} (${apt.model}) aracın teslim saatine ${diff} dakika kaldı (Saat: ${apt.deliveryTime}). Müşteri: ${apt.customer}`,
                  `apt-${apt.id}`
                );

                setAppointments((prev) =>
                  prev.map((item) => (item.id === apt.id ? { ...item, notified: true } : item))
                );
              }
            }
          }
        }
      });
    };

    // Run check every 30 seconds
    const interval = setInterval(checkDeliveryAlerts, 30000);
    return () => clearInterval(interval);
  }, [vehicles, appointments, sendBrowserNotification]);

  // Trigger test for 1-hour warning on a specific vehicle
  const handleTriggerOneHourAlert = (vehicle: Vehicle) => {
    sendBrowserNotification(
      'DOĞAN OTO - Teslim Saatine 1 Saat Kaldı!',
      `${vehicle.plate} (${vehicle.model}) aracın teslim saatine 1 saat kaldı (Planlanan Teslim: ${vehicle.deliveryTime || vehicle.eta}). Müşteri: ${vehicle.customer}. Kontrolleri tamamlayınız.`,
      `test-alert-${vehicle.id}`
    );
  };

  const filteredVehicles = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return vehicles;
    return vehicles.filter((vehicle) =>
      `${vehicle.plate} ${vehicle.model} ${vehicle.customer} ${vehicle.note}`.toLowerCase().includes(term)
    );
  }, [vehicles, query]);

  const stageGroups = useMemo(() => {
    return stageOrder.reduce<Record<Stage, Vehicle[]>>(
      (acc, stage) => {
        acc[stage] = filteredVehicles.filter((vehicle) => vehicle.stage === stage);
        return acc;
      },
      { Beklenen: [], Liftte: [], 'Parça Bekliyor': [], Bitti: [], 'Teslim Edildi': [] }
    );
  }, [filteredVehicles]);

  const summary = useMemo(() => {
    const totalRevenue = vehicles.reduce((sum, vehicle) => sum + vehicle.partsCost + vehicle.laborCost, 0);
    const openBalance = vehicles
      .filter((vehicle) => vehicle.stage !== 'Teslim Edildi')
      .reduce((sum, vehicle) => sum + vehicle.partsCost + vehicle.laborCost, 0);
    const readyCount = vehicles.filter((vehicle) => vehicle.stage === 'Bitti').length;
    const waitingCount = vehicles.filter((vehicle) => vehicle.stage === 'Parça Bekliyor').length;

    return {
      totalRevenue,
      openBalance,
      readyCount,
      waitingCount,
    };
  }, [vehicles]);

  const cashSummary = useMemo(() => {
    const incoming = vehicles.reduce((sum, vehicle) => sum + vehicle.laborCost, 0);
    const outgoing = vehicles.reduce((sum, vehicle) => sum + vehicle.partsCost, 0);
    const balance = incoming - outgoing;
    return { incoming, outgoing, balance };
  }, [vehicles]);

  const reportRows = useMemo(() => {
    return stageOrder.map((stage) => ({
      stage,
      count: vehicles.filter((vehicle) => vehicle.stage === stage).length,
      amount: vehicles
        .filter((vehicle) => vehicle.stage === stage)
        .reduce((sum, vehicle) => sum + vehicle.partsCost + vehicle.laborCost, 0),
    }));
  }, [vehicles]);

  const reminderItems = useMemo(() => {
    return vehicles
      .filter((vehicle) => vehicle.stage === 'Parça Bekliyor' || vehicle.stage === 'Bitti' || vehicle.stage === 'Beklenen')
      .slice(0, 4)
      .map((vehicle) => ({
        id: vehicle.id,
        title: `${vehicle.plate} - ${vehicle.model}`,
        text: vehicle.note,
        due: vehicle.eta,
      }));
  }, [vehicles]);

  const highlightedVehicle = filteredVehicles[0] ?? vehicles[0] ?? null;

  // Move vehicle across Kanban stages
  const handleMoveVehicle = (id: number, direction: number) => {
    setVehicles((current) =>
      current.map((vehicle) => {
        if (vehicle.id !== id) return vehicle;

        const currentIndex = stageOrder.indexOf(vehicle.stage);
        const nextIndex = Math.min(stageOrder.length - 1, Math.max(0, currentIndex + direction));
        const nextStage = stageOrder[nextIndex];

        return {
          ...vehicle,
          stage: nextStage,
          eta: nextStage === 'Teslim Edildi' ? 'Teslim edildi' : vehicle.eta,
        };
      })
    );
  };

  // Add new vehicle from form
  const handleAddVehicle = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.plate.trim() || !form.model.trim()) return;

    const newVehicle: Vehicle = {
      id: Date.now(),
      plate: form.plate.trim().toUpperCase(),
      model: form.model.trim(),
      customer: form.customer.trim() || 'Müşteri',
      phone: form.phone.trim(),
      note: form.note.trim() || 'Yeni kayıt eklendi',
      eta: form.eta.trim() || '16:00',
      deliveryTime: form.deliveryTime.trim() || '17:30',
      stage: form.stage,
      partsCost: Number(form.partsCost || 0),
      laborCost: Number(form.laborCost || 0),
    };

    setVehicles((current) => [newVehicle, ...current]);
    setQuery(form.plate.trim());
    setShowForm(false);
    showToast('Araç Eklendi', `${newVehicle.plate} plakalı araç atölye akışına eklendi.`, 'success');

    setForm({
      plate: '',
      model: '',
      customer: '',
      phone: '',
      note: '',
      stage: 'Beklenen',
      eta: '16:00',
      deliveryTime: '17:30',
      partsCost: '2500',
      laborCost: '1800',
    });
  };

  // Add appointment from form
  const handleAddAppointment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!appointmentForm.plate.trim() || !appointmentForm.customer.trim()) return;

    const newApt: Appointment = {
      id: 'apt-' + Date.now(),
      date: appointmentForm.date,
      time: appointmentForm.time,
      deliveryTime: appointmentForm.deliveryTime,
      plate: appointmentForm.plate.trim().toUpperCase(),
      model: appointmentForm.model.trim() || 'Belirtilmedi',
      customer: appointmentForm.customer.trim(),
      phone: appointmentForm.phone.trim() || 'Telefon yok',
      note: appointmentForm.note.trim() || 'Periyodik bakım',
      estimatedCost: Number(appointmentForm.estimatedCost || 0),
      status: 'Onaylandı',
      notifyOneHourBefore: appointmentForm.notifyOneHourBefore,
    };

    setAppointments((prev) => [newApt, ...prev]);
    setShowNewAppointmentModal(false);
    showToast('Randevu Kaydedildi', `${newApt.date} tarihinde ${newApt.plate} için randevu oluşturuldu.`, 'success');

    // Also offer to schedule in Service Worker if 1 hour notification is on
    if (newApt.notifyOneHourBefore) {
      showToast(
        '1 Saat Önce Hatırlatma Aktif',
        `Teslim saati (${newApt.deliveryTime}) öncesinde telefona otomatik bildirim gönderilecektir.`,
        'info'
      );
    }

    setAppointmentForm({
      date: selectedDateString,
      time: '10:00',
      deliveryTime: '16:00',
      plate: '',
      model: '',
      customer: '',
      phone: '',
      note: '',
      estimatedCost: '3500',
      notifyOneHourBefore: true,
    });
  };

  // Transfer an appointment directly into the active Workshop Kanban
  const handleMoveAppointmentToWorkshop = (apt: Appointment) => {
    const existing = vehicles.find((v) => v.plate.toLowerCase() === apt.plate.toLowerCase());
    if (existing) {
      showToast('Araç Zaten Atölyede', `${apt.plate} plakalı araç zaten atölye akışında mevcut.`, 'info');
      return;
    }

    const newVehicle: Vehicle = {
      id: Date.now(),
      plate: apt.plate,
      model: apt.model,
      customer: apt.customer,
      phone: apt.phone,
      note: `[Randevudan Alındı] ${apt.note}`,
      eta: apt.deliveryTime || '16:00',
      deliveryTime: apt.deliveryTime || '17:00',
      stage: 'Liftte',
      partsCost: Math.round(apt.estimatedCost * 0.4),
      laborCost: Math.round(apt.estimatedCost * 0.6),
    };

    setVehicles((prev) => [newVehicle, ...prev]);
    setAppointments((prev) =>
      prev.map((item) => (item.id === apt.id ? { ...item, status: 'Atölyeye Alındı' } : item))
    );

    showToast(
      'Atölyeye Alındı',
      `${apt.plate} plakalı araç randevudan doğrudan Liftte aşamasına geçirildi.`,
      'success'
    );
  };

  // Delete an appointment
  const handleDeleteAppointment = (id: string) => {
    setAppointments((prev) => prev.filter((a) => a.id !== id));
    showToast('Randevu Silindi', 'Randevu kaydı başarıyla silindi.', 'info');
  };

  // Calendar Math and Generation
  const calendarDays = useMemo(() => {
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    // In JS, getDay(): 0 is Sunday, 1 is Monday...
    // We want Monday = 0, Sunday = 6
    let startDayOfWeek = firstDayOfMonth.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6;

    const totalDays = lastDayOfMonth.getDate();

    const days: {
      dayNumber: number;
      dateString: string;
      isCurrentMonth: boolean;
      appointmentCount: number;
      density: 'none' | 'light' | 'medium' | 'heavy';
    }[] = [];

    // Blank padding days
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push({
        dayNumber: 0,
        dateString: '',
        isCurrentMonth: false,
        appointmentCount: 0,
        density: 'none',
      });
    }

    // Days of current month
    for (let d = 1; d <= totalDays; d++) {
      const monthPadded = String(month + 1).padStart(2, '0');
      const dayPadded = String(d).padStart(2, '0');
      const dateStr = `${year}-${monthPadded}-${dayPadded}`;

      const count = appointments.filter((a) => a.date === dateStr).length;
      let density: 'none' | 'light' | 'medium' | 'heavy' = 'none';
      if (count >= 5) density = 'heavy'; // 5+ cars -> Tam Dolu (Red)
      else if (count >= 3) density = 'medium'; // 3-4 cars -> Yoğun (Amber)
      else if (count >= 1) density = 'light'; // 1-2 cars -> Müsait (Green)

      days.push({
        dayNumber: d,
        dateString: dateStr,
        isCurrentMonth: true,
        appointmentCount: count,
        density,
      });
    }

    return days;
  }, [currentCalendarDate, appointments]);

  const monthNamesTurkish = [
    'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
  ];

  const selectedDateAppointments = useMemo(() => {
    return appointments.filter((a) => a.date === selectedDateString);
  }, [appointments, selectedDateString]);

  const nextMonth = () => {
    setCurrentCalendarDate(new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() + 1, 1));
  };

  const prevMonth = () => {
    setCurrentCalendarDate(new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() - 1, 1));
  };

  const jumpToToday = () => {
    const today = new Date(2026, 8, 5); // Sep 5, 2026
    setCurrentCalendarDate(today);
    setSelectedDateString('2026-09-05');
  };

  return (
    <main className="shell">
      {/* IN-APP TOAST ALERT BANNER */}
      {inAppToast && (
        <div className="fixed top-4 left-1/2 z-50 flex w-[92%] max-w-md -translate-x-1/2 items-start gap-3 rounded-2xl border border-blue-200 bg-white p-3.5 shadow-2xl transition-all dark:border-blue-900/60 dark:bg-slate-900">
          <div className="rounded-xl bg-blue-100 p-2 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
            {inAppToast.type === 'alert' ? <BellRing size={20} className="animate-bounce" /> : <Info size={20} />}
          </div>
          <div className="flex-1">
            <div className="text-sm font-bold text-slate-900 dark:text-white">{inAppToast.title}</div>
            <div className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">{inAppToast.body}</div>
          </div>
          <button
            type="button"
            onClick={() => setInAppToast(null)}
            className="rounded-lg p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* HEADER SECTION - DOĞAN OTO */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400">
            <Wrench size={12} /> Oto Tamir & Servis
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">DOĞAN OTO</h1>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Dark Mode Toggle */}
          <button
            type="button"
            onClick={toggleDarkMode}
            title={isDarkMode ? 'Açık Moda Geç' : 'Koyu Moda Geç'}
            className="rounded-xl border border-slate-200 bg-white p-2 text-slate-700 shadow-sm transition-colors hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {isDarkMode ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} />}
          </button>

          {/* Quick Reminders Toggle */}
          <button
            type="button"
            onClick={() => setReminderOpen((value) => !value)}
            title="Hatırlatıcıları Göster/Gizle"
            className="relative rounded-xl border border-slate-200 bg-white p-2 text-slate-700 shadow-sm transition-colors hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <Bell size={18} />
            {reminderItems.length > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white">
                {reminderItems.length}
              </span>
            )}
          </button>

          {/* Top Row Notification Permission Box (FIXED) */}
          <button
            type="button"
            onClick={() => {
              if (notificationPermission === 'granted') {
                setNotificationModalOpen(true);
              } else {
                requestNotificationPermission();
              }
            }}
            title="Bildirim Ayarları & 1 Saat Kala Uyarısı"
            className={`flex items-center gap-1 rounded-xl border px-2.5 py-1.5 text-[11px] font-bold shadow-sm transition-colors ${
              notificationPermission === 'granted'
                ? 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                : notificationPermission === 'denied'
                ? 'border-rose-300 bg-rose-50 text-rose-800 hover:bg-rose-100 dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                : 'border-blue-300 bg-blue-50 text-blue-800 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
            }`}
          >
            <BellRing size={13} className={notificationPermission === 'granted' ? 'text-emerald-600' : ''} />
            <span>
              {notificationPermission === 'granted'
                ? 'Bildirim Açık'
                : notificationPermission === 'denied'
                ? 'Bildirim Kapalı'
                : 'Bildirim İzni'}
            </span>
          </button>

          {/* Randevu Butonu (Appointment Button) */}
          <button
            type="button"
            onClick={() => setActivePanel('appointments')}
            className="inline-flex items-center gap-1 rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white shadow-sm transition-colors hover:bg-blue-700"
          >
            <CalendarDays size={15} />
            <span>Randevu</span>
          </button>

          {/* New Vehicle Button */}
          <button
            type="button"
            onClick={() => setShowForm(true)}
            title="Yeni Araç Ekle"
            className="rounded-xl bg-slate-900 p-2 text-white shadow-sm transition-colors hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700"
          >
            <Plus size={18} />
          </button>
        </div>
      </div>

      {/* SEARCH BAR */}
      <div className="mb-4 rounded-2xl bg-slate-900 p-3 text-white shadow-soft dark:bg-slate-900 dark:border dark:border-slate-800">
        <div className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2">
          <Search size={16} className="text-slate-300" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="w-full bg-transparent text-sm text-white placeholder:text-slate-400 outline-none"
            placeholder="Plaka, müşteri veya model ara (örn: 34 ABC 123)"
          />
          {query && (
            <button type="button" onClick={() => setQuery('')} className="text-xs text-slate-400 hover:text-white">
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* QUICK STATUS BADGES */}
      <div className="mb-4 flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <span className="badge border border-amber-300 bg-amber-100 text-amber-900 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-200">
          Randevudan 30 dk
        </span>
        <span className="badge border border-red-300 bg-red-100 text-red-900 dark:border-red-800 dark:bg-red-950/60 dark:text-red-200">
          Parça bekliyor 4s
        </span>
        <span className="badge border border-violet-300 bg-violet-100 text-violet-900 dark:border-violet-800 dark:bg-violet-950/60 dark:text-violet-200">
          Teslim bekliyor 2s
        </span>
        <span className="badge border border-blue-300 bg-blue-100 text-blue-900 dark:border-blue-800 dark:bg-blue-950/60 dark:text-blue-200">
          1s Kala Bildirim: Aktif
        </span>
      </div>

      {/* ACTIVE REMINDER BANNER */}
      {reminderOpen && (
        <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 shadow-sm transition-colors dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 font-bold">
              <Clock3 size={16} className="text-amber-700 dark:text-amber-400" />
              <span>DOĞAN OTO Hatırlatıcı</span>
            </div>
            <button
              type="button"
              onClick={() => setReminderOpen(false)}
              className="rounded-full bg-white/80 p-1 text-amber-700 transition-colors hover:bg-white dark:bg-slate-900 dark:text-amber-400"
            >
              <X size={14} />
            </button>
          </div>
          <div className="mt-1.5 text-xs">
            {summary.waitingCount} araç parça bekliyor, {summary.readyCount} araç teslime hazır. Teslim saatine 1 saat kala telefona bildirim gider.
          </div>
        </div>
      )}

      {/* ITEM 1: SWAPPED PLACES - ATÖLYE AKIŞI (KANBAN) IS NOW FIRST! */}
      <div className="mb-5">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
            <ClipboardCheck size={18} className="text-blue-600 dark:text-blue-400" />
            <span>Atölye Akışı</span>
            <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              {filteredVehicles.length} Araç
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            + Araç Girişi
          </button>
        </div>

        {/* Scrollable Kanban Board */}
        <div className="overflow-x-auto pb-3">
          <div className="flex min-w-[960px] gap-3">
            {stageOrder.map((stage) => (
              <KanbanColumn
                key={stage}
                title={stage}
                items={stageGroups[stage]}
                onMove={handleMoveVehicle}
                onTriggerOneHourAlert={handleTriggerOneHourAlert}
              />
            ))}
          </div>
        </div>
      </div>

      {/* SELECTED / HIGHLIGHTED VEHICLE DETAILS */}
      {highlightedVehicle && (
        <div className="mb-5 card p-3.5">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
              <Car size={17} className="text-blue-600 dark:text-blue-400" />
              <span>Seçili Araç Özeti</span>
            </div>
            <button
              type="button"
              onClick={() => handleTriggerOneHourAlert(highlightedVehicle)}
              className="inline-flex items-center gap-1 rounded-lg bg-amber-100 px-2 py-1 text-[11px] font-semibold text-amber-900 transition-colors hover:bg-amber-200 dark:bg-amber-950/60 dark:text-amber-200"
            >
              <Volume2 size={12} /> 1 Saat Uyarısı Test Et
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2.5 text-sm sm:grid-cols-4">
            <div className="rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800/80">
              <div className="text-[11px] text-slate-500 dark:text-slate-400">Plaka / Model</div>
              <div className="mt-1 font-mono font-bold text-slate-900 dark:text-white">{highlightedVehicle.plate}</div>
              <div className="text-xs text-slate-600 dark:text-slate-300">{highlightedVehicle.model}</div>
            </div>
            <div className="rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800/80">
              <div className="text-[11px] text-slate-500 dark:text-slate-400">Müşteri</div>
              <div className="mt-1 font-bold text-slate-900 dark:text-white">{highlightedVehicle.customer}</div>
              <div className="text-xs text-slate-600 dark:text-slate-300">{highlightedVehicle.phone || '05xx xxx xx xx'}</div>
            </div>
            <div className="rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800/80">
              <div className="text-[11px] text-slate-500 dark:text-slate-400">Durum / ETA</div>
              <div className="mt-1 font-bold text-amber-600 dark:text-amber-400">{highlightedVehicle.stage}</div>
              <div className="text-xs text-slate-600 dark:text-slate-300">Teslim: {highlightedVehicle.deliveryTime || highlightedVehicle.eta}</div>
            </div>
            <div className="rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800/80">
              <div className="text-[11px] text-slate-500 dark:text-slate-400">Toplam Tutar</div>
              <div className="mt-1 text-base font-extrabold text-emerald-700 dark:text-emerald-400">
                {money(highlightedVehicle.partsCost + highlightedVehicle.laborCost)}
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">
                P: {money(highlightedVehicle.partsCost)} / İ: {money(highlightedVehicle.laborCost)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ITEM 1: SWAPPED PLACES - FINANCIAL STAT CARDS (TOPLAM GİRİŞ, NET İŞÇİLİK, PARÇA GİDERİ, AÇIK HESAP) ARE NOW HERE! */}
      <div className="mb-5">
        <div className="mb-2.5 flex items-center justify-between">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Mali Durum & Ciro Özeti
          </div>
          <button
            type="button"
            onClick={() => setActivePanel('cash')}
            className="text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400"
          >
            Kasa Detayı →
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Toplam Giriş" value={money(summary.totalRevenue)} tone="blue" />
          <StatCard label="Net İşçilik" value={money(summary.totalRevenue * 0.45)} tone="green" />
          <StatCard label="Parça Gideri" value={money(summary.totalRevenue * 0.35)} tone="amber" />
          <StatCard label="Açık Hesap" value={money(summary.openBalance)} tone="rose" />
        </div>
      </div>

      {/* ACTION BUTTONS GRID */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <button
          type="button"
          onClick={() => setActivePanel('appointments')}
          className="card flex flex-col items-center justify-center gap-1.5 p-3 font-semibold text-slate-800 transition-transform hover:-translate-y-0.5 dark:text-slate-100"
        >
          <div className="relative">
            <CalendarCheck size={20} className="text-blue-600 dark:text-blue-400" />
            <span className="absolute -top-1 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[9px] font-bold text-white">
              {appointments.length}
            </span>
          </div>
          <span className="text-xs">Randevular</span>
        </button>

        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="card flex flex-col items-center justify-center gap-1.5 p-3 font-semibold text-slate-800 transition-transform hover:-translate-y-0.5 dark:text-slate-100"
        >
          <Wrench size={20} className="text-amber-600 dark:text-amber-400" />
          <span className="text-xs">Yeni Araç</span>
        </button>

        <button
          type="button"
          onClick={() => setActivePanel('cash')}
          className="card flex flex-col items-center justify-center gap-1.5 p-3 font-semibold text-slate-800 transition-transform hover:-translate-y-0.5 dark:text-slate-100"
        >
          <Wallet size={20} className="text-emerald-600 dark:text-emerald-400" />
          <span className="text-xs">Kasa</span>
        </button>

        <button
          type="button"
          onClick={() => setActivePanel('reminders')}
          className="card flex flex-col items-center justify-center gap-1.5 p-3 font-semibold text-slate-800 transition-transform hover:-translate-y-0.5 dark:text-slate-100"
        >
          <Clock3 size={20} className="text-violet-600 dark:text-violet-400" />
          <span className="text-xs">Hatırlatıcı</span>
        </button>

        <button
          type="button"
          onClick={() => setActivePanel('reports')}
          className="card flex flex-col items-center justify-center gap-1.5 p-3 font-semibold text-slate-800 transition-transform hover:-translate-y-0.5 dark:text-slate-100 sm:col-span-1 col-span-2"
        >
          <ClipboardCheck size={20} className="text-indigo-600 dark:text-indigo-400" />
          <span className="text-xs">Raporlar</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* ITEM 5 & 6: RANDEVU TAKVİMİ MODAL & DOLULUK DETAYLARI                    */}
      {/* ========================================================================= */}
      {activePanel === 'appointments' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 backdrop-blur-sm">
          <div className="flex max-h-[92vh] w-full max-w-2xl flex-col rounded-3xl bg-white shadow-2xl transition-all dark:border dark:border-slate-800 dark:bg-slate-900">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="rounded-xl bg-blue-100 p-2 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                  <CalendarDays size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">DOĞAN OTO Randevu Takvimi</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Tarihlere göre araç doluluğu ve teslim öncesi 1 saat bildirimleri
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActivePanel(null)}
                className="rounded-full bg-slate-100 p-2 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Scrollable Content */}
            <div className="overflow-y-auto p-5 space-y-5">
              {/* Top Month Navigation Controls */}
              <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-3 dark:bg-slate-800/80">
                <div className="flex items-center gap-2">
                  <span className="text-base font-extrabold text-slate-900 dark:text-white">
                    {monthNamesTurkish[currentCalendarDate.getMonth()]} {currentCalendarDate.getFullYear()}
                  </span>
                  <button
                    type="button"
                    onClick={jumpToToday}
                    className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                  >
                    Bugün
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={prevMonth}
                    className="rounded-xl border border-slate-200 bg-white p-2 text-slate-700 shadow-sm hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                    title="Önceki Ay"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={nextMonth}
                    className="rounded-xl border border-slate-200 bg-white p-2 text-slate-700 shadow-sm hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                    title="Sonraki Ay"
                  >
                    <ChevronRight size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAppointmentForm((prev) => ({ ...prev, date: selectedDateString }));
                      setShowNewAppointmentModal(true);
                    }}
                    className="ml-2 inline-flex items-center gap-1 rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700"
                  >
                    <Plus size={14} /> Randevu Ver
                  </button>
                </div>
              </div>

              {/* DOLULUK RENK LEJANDI (Density Color Legend) */}
              <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] dark:border-slate-800 dark:bg-slate-950">
                <span className="font-bold text-slate-600 dark:text-slate-400">Doluluk Durumu:</span>
                <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-semibold">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500"></span> 1-2 Araç (Müsait)
                </span>
                <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400 font-semibold">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-500"></span> 3-4 Araç (Yoğun)
                </span>
                <span className="inline-flex items-center gap-1 text-rose-700 dark:text-rose-400 font-semibold">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-500"></span> 5+ Araç (Tam Dolu)
                </span>
              </div>

              {/* CALENDAR GRID */}
              <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                {/* Weekday headers */}
                <div className="mb-2 grid grid-cols-7 text-center text-xs font-bold text-slate-500 dark:text-slate-400">
                  <div>Pzt</div>
                  <div>Sal</div>
                  <div>Çar</div>
                  <div>Per</div>
                  <div>Cum</div>
                  <div className="text-blue-600 dark:text-blue-400">Cmt</div>
                  <div className="text-rose-600 dark:text-rose-400">Paz</div>
                </div>

                {/* Day cells */}
                <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                  {calendarDays.map((cell, idx) => {
                    if (!cell.isCurrentMonth) {
                      return <div key={`empty-${idx}`} className="h-16 rounded-xl bg-slate-50/50 dark:bg-slate-900/30"></div>;
                    }

                    const isSelected = cell.dateString === selectedDateString;
                    const isToday = cell.dateString === '2026-09-05';

                    return (
                      <button
                        key={cell.dateString}
                        type="button"
                        onClick={() => setSelectedDateString(cell.dateString)}
                        className={`flex h-20 flex-col justify-between rounded-xl p-1.5 text-left transition-all ${
                          isSelected
                            ? 'ring-2 ring-blue-600 bg-blue-50/60 dark:bg-blue-950/40 dark:ring-blue-400'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-900/80 border border-slate-100 dark:border-slate-800/60'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                              isToday
                                ? 'bg-blue-600 text-white'
                                : 'text-slate-800 dark:text-slate-200'
                            }`}
                          >
                            {cell.dayNumber}
                          </span>
                          {cell.appointmentCount > 0 && (
                            <span
                              className={`rounded-full px-1.5 py-0.5 text-[9px] font-extrabold ${
                                cell.density === 'heavy'
                                  ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200'
                                  : cell.density === 'medium'
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200'
                                  : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200'
                              }`}
                            >
                              {cell.appointmentCount}
                            </span>
                          )}
                        </div>

                        {/* Density badge / indicator */}
                        {cell.appointmentCount > 0 ? (
                          <div className="mt-1">
                            <span
                              className={`block truncate rounded-md px-1 py-0.5 text-[9px] font-bold text-center ${
                                cell.density === 'heavy'
                                  ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200/80 dark:border-rose-800'
                                  : cell.density === 'medium'
                                  ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800'
                                  : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800'
                              }`}
                            >
                              {cell.appointmentCount} Araç
                            </span>
                          </div>
                        ) : (
                          <span className="text-[9px] text-slate-400 dark:text-slate-600 text-center">Boş</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* DETAILED APPOINTMENTS LIST FOR SELECTED DATE */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/80">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3 dark:border-slate-700">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Seçili Tarih: {selectedDateString}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Bu tarihe kayıtlı toplam {selectedDateAppointments.length} araç randevusu bulunmaktadır.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setAppointmentForm((prev) => ({ ...prev, date: selectedDateString }));
                      setShowNewAppointmentModal(true);
                    }}
                    className="inline-flex items-center gap-1 rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-500"
                  >
                    <Plus size={13} /> Bu Güne Randevu Ekle
                  </button>
                </div>

                {selectedDateAppointments.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
                    Bu tarih için henüz kayıtlı randevu bulunmuyor. Yeni randevu oluşturmak için yukarıdaki butonu kullanabilirsiniz.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedDateAppointments.map((apt) => (
                      <div
                        key={apt.id}
                        className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm transition-all dark:border-slate-700 dark:bg-slate-900"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <div className="inline-flex items-center gap-2">
                              <span className="rounded bg-blue-700 px-1.5 py-0.5 font-mono text-[10px] font-bold text-white">
                                TR {apt.plate}
                              </span>
                              <span className="font-bold text-slate-900 dark:text-white">{apt.model}</span>
                            </div>
                            <div className="mt-1 flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                              <span>Müşteri: {apt.customer}</span>
                              {apt.phone && (
                                <a
                                  href={`tel:${apt.phone}`}
                                  className="inline-flex items-center gap-0.5 text-blue-600 hover:underline dark:text-blue-400"
                                >
                                  <Phone size={11} /> {apt.phone}
                                </a>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-1">
                            <span className="badge border border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
                              Randevu: {apt.time}
                            </span>
                            <span className="badge border border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                              Planlanan Teslim: {apt.deliveryTime}
                            </span>
                          </div>
                        </div>

                        <div className="mt-2.5 rounded-lg bg-slate-50 p-2 text-xs text-slate-700 dark:bg-slate-800/80 dark:text-slate-300">
                          <span className="font-bold">İşlem / Şikayet:</span> {apt.note}
                        </div>

                        {/* 1 Hour Before Notification Tag */}
                        {apt.notifyOneHourBefore && (
                          <div className="mt-2 flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50/70 px-2.5 py-1 text-[11px] text-emerald-800 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-300">
                            <span className="inline-flex items-center gap-1.5">
                              <BellRing size={12} className="text-emerald-600" />
                              Teslimden 1 saat önce telefona bildirim açık ({apt.deliveryTime})
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                sendBrowserNotification(
                                  'DOĞAN OTO - Randevulu Araç Teslim Saati Uyarısı!',
                                  `${apt.plate} (${apt.model}) aracın teslimine 1 saat kaldı (Saat: ${apt.deliveryTime}). Müşteri: ${apt.customer}`,
                                  `apt-test-${apt.id}`
                                );
                              }}
                              className="font-bold underline hover:text-emerald-950 dark:hover:text-emerald-100"
                            >
                              Test Bildirimi
                            </button>
                          </div>
                        )}

                        <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5 dark:border-slate-800">
                          <div className="text-xs">
                            <span className="text-slate-500 dark:text-slate-400">Tahmini Tutar: </span>
                            <span className="font-bold text-slate-900 dark:text-white">{money(apt.estimatedCost)}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            {apt.status !== 'Atölyeye Alındı' ? (
                              <button
                                type="button"
                                onClick={() => handleMoveAppointmentToWorkshop(apt)}
                                className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700"
                              >
                                <CheckCircle2 size={13} /> Atölyeye Al
                              </button>
                            ) : (
                              <span className="rounded-lg bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
                                Atölyede (Liftte)
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDeleteAppointment(apt.id)}
                              className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:border-slate-700 dark:text-rose-400 dark:hover:bg-rose-950/40"
                            >
                              Sil
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* FORM MODAL: YENİ RANDEVU VER                                             */}
      {/* ========================================================================= */}
      {showNewAppointmentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-5 shadow-2xl dark:border dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                <CalendarCheck size={18} className="text-blue-600 dark:text-blue-400" />
                <span>Yeni Araç Randevusu Ver</span>
              </div>
              <button
                type="button"
                onClick={() => setShowNewAppointmentModal(false)}
                className="rounded-full bg-slate-100 p-2 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddAppointment} className="space-y-3 text-sm">
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-1">
                  <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Tarih</label>
                  <input
                    type="date"
                    value={appointmentForm.date}
                    onChange={(e) => setAppointmentForm({ ...appointmentForm, date: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs font-bold outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Geliş Saati</label>
                  <input
                    type="time"
                    value={appointmentForm.time}
                    onChange={(e) => setAppointmentForm({ ...appointmentForm, time: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs font-bold outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Teslim Saati</label>
                  <input
                    type="time"
                    value={appointmentForm.deliveryTime}
                    onChange={(e) => setAppointmentForm({ ...appointmentForm, deliveryTime: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs font-bold outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Plaka</label>
                  <input
                    value={appointmentForm.plate}
                    onChange={(e) => setAppointmentForm({ ...appointmentForm, plate: e.target.value.toUpperCase() })}
                    placeholder="34 ABC 123"
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 font-mono font-bold uppercase outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Model</label>
                  <input
                    value={appointmentForm.model}
                    onChange={(e) => setAppointmentForm({ ...appointmentForm, model: e.target.value })}
                    placeholder="Renault Megane"
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Müşteri Adı</label>
                  <input
                    value={appointmentForm.customer}
                    onChange={(e) => setAppointmentForm({ ...appointmentForm, customer: e.target.value })}
                    placeholder="Ad Soyad"
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Telefon</label>
                  <input
                    value={appointmentForm.phone}
                    onChange={(e) => setAppointmentForm({ ...appointmentForm, phone: e.target.value })}
                    placeholder="05xx xxx xx xx"
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Yapılacak İşlem / Not</label>
                <input
                  value={appointmentForm.note}
                  onChange={(e) => setAppointmentForm({ ...appointmentForm, note: e.target.value })}
                  placeholder="Periyodik bakım, ön fren balatası vb."
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Tahmini Tutar (TL)</label>
                <input
                  type="number"
                  value={appointmentForm.estimatedCost}
                  onChange={(e) => setAppointmentForm({ ...appointmentForm, estimatedCost: e.target.value })}
                  placeholder="3500"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              {/* 1 Hour Before Notification Checkbox */}
              <label className="flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-xs text-emerald-900 cursor-pointer dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
                <input
                  type="checkbox"
                  checked={appointmentForm.notifyOneHourBefore}
                  onChange={(e) => setAppointmentForm({ ...appointmentForm, notifyOneHourBefore: e.target.checked })}
                  className="h-4 w-4 rounded text-blue-600"
                />
                <span>
                  <strong>Teslimden 1 saat önce bildirim gönderilsin</strong> (Uygulama kapalıyken bile telefonunuza bildirim gelir).
                </span>
              </label>

              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 font-bold text-white shadow-lg shadow-blue-600/30 transition-all hover:bg-blue-700"
              >
                <Plus size={16} /> Randevuyu Onayla ve Kaydet
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* NOTIFICATION PERMISSION & CONTROL MODAL                                  */}
      {/* ========================================================================= */}
      {notificationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-5 shadow-2xl dark:border dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                <BellRing size={18} className="text-emerald-600" />
                <span>DOĞAN OTO Bildirim Ayarları</span>
              </div>
              <button
                type="button"
                onClick={() => setNotificationModalOpen(false)}
                className="rounded-full bg-slate-100 p-2 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3.5 text-xs text-slate-600 dark:text-slate-300">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3.5 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200">
                <div className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 size={16} className="text-emerald-600" /> Bildirim İzni Aktif
                </div>
                <div className="mt-1 text-[11px]">
                  Cihazınız bildirimleri almaya hazır. Araçların teslim saatine 1 saat kala telefonunuza sesli ve titreşimli bildirim gönderilir.
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
                <div className="font-bold text-slate-900 dark:text-white">Uygulama Kapalıyken Bildirim Alma</div>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  Telefonunuzda tarayıcı menüsünden (üç nokta veya paylaş butonu) <strong>&quot;Ana Ekrana Ekle&quot;</strong> seçeneğiyle DOĞAN OTO uygulamasını yüklediğinizde, uygulama tamamen kapalıyken dahi Service Worker arka planda bildirim iletir.
                </p>
              </div>

              <div className="pt-2 space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    sendBrowserNotification(
                      'DOĞAN OTO Bildirim Testi',
                      'Tebrikler! Bildirim servisiniz kusursuz çalışıyor. Teslim saatine 1 saat kala uyarı alacaksınız.'
                    );
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 font-bold text-white shadow-sm hover:bg-emerald-700"
                >
                  <Send size={14} /> Hemen Test Bildirimi Gönder
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const sample = vehicles[0] || defaultVehicles[0];
                    handleTriggerOneHourAlert(sample);
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 font-bold text-amber-900 shadow-sm hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-200"
                >
                  <Timer size={14} /> 1 Saat Kala Teslim Uyarısını Simüle Et
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* OTHER PANELS: KASA, HATIRLATICI, RAPORLAR                                */}
      {/* ========================================================================= */}
      {activePanel && activePanel !== 'appointments' && (
        <div className="fixed inset-0 z-50 flex items-end bg-slate-900/60 p-4 backdrop-blur-sm md:items-center md:justify-center">
          <div className="w-full max-w-md rounded-3xl bg-white p-5 shadow-2xl dark:border dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {activePanel === 'reminders' && 'DOĞAN OTO Hatırlatıcılar'}
                {activePanel === 'cash' && 'Kasa Durumu'}
                {activePanel === 'reports' && 'İşletme Raporları'}
              </h2>
              <button
                type="button"
                onClick={() => setActivePanel(null)}
                className="rounded-full bg-slate-100 p-2 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
              >
                <X size={16} />
              </button>
            </div>

            <div className="mb-3 flex gap-2">
              {(['reminders', 'cash', 'reports'] as const).map((panelKey) => (
                <button
                  key={panelKey}
                  type="button"
                  onClick={() => setActivePanel(panelKey)}
                  className={`flex-1 rounded-xl px-2.5 py-2 text-xs font-bold transition-colors ${
                    activePanel === panelKey
                      ? 'bg-slate-900 text-white dark:bg-blue-600'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  {panelKey === 'reminders' && 'Hatırlatıcı'}
                  {panelKey === 'cash' && 'Kasa'}
                  {panelKey === 'reports' && 'Raporlar'}
                </button>
              ))}
            </div>

            {activePanel === 'reminders' && (
              <div className="space-y-2.5">
                {reminderItems.length === 0 && (
                  <div className="rounded-xl bg-slate-50 p-4 text-center text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                    Aktif hatırlatıcı bulunamadı.
                  </div>
                )}
                {reminderItems.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/60 dark:bg-amber-950/40"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-bold text-amber-900 dark:text-amber-200">{item.title}</div>
                      <span className="rounded bg-amber-200/80 px-1.5 py-0.5 text-[10px] font-bold text-amber-900 dark:bg-amber-900 dark:text-amber-200">
                        {item.due}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-amber-800 dark:text-amber-300">{item.text}</div>
                  </div>
                ))}
              </div>
            )}

            {activePanel === 'cash' && (
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3.5 dark:border-emerald-900/60 dark:bg-emerald-950/40">
                    <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">İşçilik Geliri</div>
                    <div className="mt-1 text-xl font-black text-emerald-900 dark:text-emerald-200">
                      {money(cashSummary.incoming)}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3.5 dark:border-rose-900/60 dark:bg-rose-950/40">
                    <div className="text-xs font-semibold text-rose-700 dark:text-rose-400">Parça Gideri</div>
                    <div className="mt-1 text-xl font-black text-rose-900 dark:text-rose-200">
                      {money(cashSummary.outgoing)}
                    </div>
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/80">
                  <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Net Kalan Bakiye</div>
                  <div className="mt-1 text-2xl font-black text-slate-900 dark:text-white">
                    {money(cashSummary.balance)}
                  </div>
                </div>
              </div>
            )}

            {activePanel === 'reports' && (
              <div className="space-y-2.5">
                {reportRows.map((row) => (
                  <div
                    key={row.stage}
                    className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-800 dark:bg-slate-800/60"
                  >
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">{row.stage}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{row.count} araç</div>
                    </div>
                    <div className="font-extrabold text-slate-900 dark:text-white">{money(row.amount)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* FORM MODAL: YENİ ARAÇ EKLE                                               */}
      {/* ========================================================================= */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-5 shadow-2xl dark:border dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Yeni Araç Girişi</h2>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-full bg-slate-100 p-2 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddVehicle} className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Plaka</label>
                  <input
                    value={form.plate}
                    onChange={(event) => setForm({ ...form, plate: event.target.value.toUpperCase() })}
                    placeholder="34 ABC 123"
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 font-mono font-bold uppercase outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Model</label>
                  <input
                    value={form.model}
                    onChange={(event) => setForm({ ...form, model: event.target.value })}
                    placeholder="Renault Clio"
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Müşteri</label>
                  <input
                    value={form.customer}
                    onChange={(event) => setForm({ ...form, customer: event.target.value })}
                    placeholder="Ahmet Yılmaz"
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Aşama</label>
                  <select
                    value={form.stage}
                    onChange={(event) => setForm({ ...form, stage: event.target.value as Stage })}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    {stageOrder.map((stage) => (
                      <option key={stage} value={stage}>
                        {stage}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">İşlem / Arıza Notu</label>
                <input
                  value={form.note}
                  onChange={(event) => setForm({ ...form, note: event.target.value })}
                  placeholder="Yağ bakımı, fren balatası vb."
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Teslim Saati (ETA)</label>
                  <input
                    value={form.deliveryTime}
                    onChange={(event) => setForm({ ...form, deliveryTime: event.target.value, eta: event.target.value })}
                    placeholder="17:30"
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Parça Tutarı (TL)</label>
                  <input
                    value={form.partsCost}
                    onChange={(event) => setForm({ ...form, partsCost: event.target.value })}
                    placeholder="2500"
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">İşçilik Tutarı (TL)</label>
                <input
                  value={form.laborCost}
                  onChange={(event) => setForm({ ...form, laborCost: event.target.value })}
                  placeholder="1800"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 font-bold text-white shadow-sm hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-500"
              >
                <Plus size={16} /> Aracı Atölyeye Ekle
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
