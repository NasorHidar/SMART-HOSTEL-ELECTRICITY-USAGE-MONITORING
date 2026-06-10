import { createContext, useContext, useState, useCallback, useEffect } from 'react';

const LanguageContext = createContext(null);

const STORAGE_LANG = 'sm_language';

const translations = {
  en: {
    // Auth / Login
    smartMeter: 'Smart Meter',
    hostelElectricityMonitor: 'Hostel Electricity Monitor',
    deviceId: 'Device ID',
    enterIdPlaceholder: 'e.g. ESP-2049',
    enterIdHelp: 'Enter the ID printed on your meter device',
    signingIn: 'Signing in...',
    viewDashboardBtn: 'View My Dashboard →',
    noAccountHelp: "Don't have an account? Contact your hostel admin to register your device.",
    loginFailed: 'Login failed. Please try again.',
    
    // Header & Navigation
    live: 'Live',
    offline: 'Offline',
    signOut: 'Sign out',
    room: 'Room',
    device: 'Device',
    welcomeBack: 'Welcome back,',
    lastUpdated: 'Last updated',
    refreshesEvery5s: 'Refreshes every 5 s',

    // Metrics
    voltage: 'Voltage',
    current: 'Current',
    power: 'Power',
    todaysEnergy: "Today's Energy",

    // Daily budget
    dailyEnergyBudget: 'Daily Energy Budget',
    usedBudgetWarning: "You've used {percent}% of your daily budget.",

    // Alerts
    aiAnomalyAlerts: 'AI Anomaly Alerts',
    noActiveAlerts: 'No active alerts',
    monitoringDescription: 'Gemini AI is continuously monitoring for prohibited high-wattage appliances.',
    dismiss: 'Dismiss',
    critical: 'Critical',
    anomaly: 'Anomaly',
    info: 'Info',
    analyzedEvery5m: 'Analysed every 5 min by Gemini AI',
    avgPower: 'avg {power} W',
    unknownTime: 'Unknown time',

    // Power Chart
    powerConsumption: 'Power Consumption',
    last24HoursAverage: 'Last 24 hours — hourly average',
    chartLegendPower: 'Power (W)',
    chartLegendVoltage: 'Voltage (V)',
    noChartData: 'No chart data yet.',
    readingsAppearSoon: 'Readings will appear once data is collected.',
    thresholdLabel: '⚠ 800W threshold',

    // Latest Reading Details
    latestReadingDetails: 'Latest Reading Details',
    timestamp: 'Timestamp',
    cumulativeEnergy: 'Cumulative Energy',

    // Billing / Cost
    billingDetails: 'Electricity Bill Details',
    billingDetailsSub: 'Calculated according to Bangladesh LT-A tariff rates',
    todaysCost: "Today's Cost",
    cumulativeCost: 'Cumulative Bill',
    billingBreakdown: 'Slab-wise Bill Breakdown',
    slabName: 'Slab (kWh)',
    slabRate: 'Unit Price (Tk)',
    slabConsumed: 'Consumed (kWh)',
    slabCharge: 'Charge (Tk)',
    totalCharge: 'Total Energy Charge',
    demandChargeLabel: 'Demand Charge (Tk/month)',
    estimatedTotal: 'Estimated Total Bill',
    demandChargeText: '৳42.00 (Flat)',
    lifelineAppliedText: 'Lifeline Rate Applied (0-50 units)',
    standardSlabsAppliedText: 'Standard Step Tariff Applied (>50 units)',
  },
  bn: {
    // Auth / Login
    smartMeter: 'স্মার্ট মিটার',
    hostelElectricityMonitor: 'হোস্টেল বিদ্যুৎ ব্যবহার পর্যবেক্ষণ',
    deviceId: 'ডিভাইস আইডি',
    enterIdPlaceholder: 'যেমন: ESP-2049',
    enterIdHelp: 'আপনার মিটারে প্রিন্ট করা আইডিটি প্রবেশ করান',
    signingIn: 'প্রবেশ করা হচ্ছে...',
    viewDashboardBtn: 'ড্যাশবোর্ড দেখুন →',
    noAccountHelp: 'অ্যাকাউন্ট নেই? আপনার ডিভাইসটি নিবন্ধন করতে হোস্টেল অ্যাডমিনের সাথে যোগাযোগ করুন।',
    loginFailed: 'লগইন ব্যর্থ হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।',
    
    // Header & Navigation
    live: 'সচল (লাইভ)',
    offline: 'অচল (অফলাইন)',
    signOut: 'লগ আউট',
    room: 'কক্ষ',
    device: 'ডিভাইস',
    welcomeBack: 'স্বাগতম,',
    lastUpdated: 'সর্বশেষ আপডেট',
    refreshesEvery5s: 'প্রতি ৫ সেকেন্ডে রিফ্রেশ হয়',

    // Metrics
    voltage: 'ভোল্টেজ',
    current: 'কারেন্ট',
    power: 'পাওয়ার',
    todaysEnergy: 'আজকের বিদ্যুৎ ব্যবহার',

    // Daily budget
    dailyEnergyBudget: 'দৈনিক বিদ্যুৎ ব্যবহারের বাজেট',
    usedBudgetWarning: 'আপনি আপনার দৈনিক বাজেটের {percent}% ব্যবহার করেছেন।',

    // Alerts
    aiAnomalyAlerts: 'এআই অস্বাভাবিকতা সতর্কতা',
    noActiveAlerts: 'কোনো সতর্কবার্তা নেই',
    monitoringDescription: 'নিষিদ্ধ উচ্চ-ওয়াটের যন্ত্র সনাক্ত করতে জেমিনি এআই নিয়মিত মনিটর করছে।',
    dismiss: 'বাতিল করুন',
    critical: 'গুরুতর',
    anomaly: 'অস্বাভাবিকতা',
    info: 'তথ্য',
    analyzedEvery5m: 'জেমিনি এআই দ্বারা প্রতি ৫ মিনিটে বিশ্লেষণ করা হয়',
    avgPower: 'গড় {power} ওয়াট',
    unknownTime: 'অজানা সময়',

    // Power Chart
    powerConsumption: 'বিদ্যুৎ ব্যবহার চিত্র',
    last24HoursAverage: 'গত ২৪ ঘণ্টা — ঘণ্টাপ্রতি গড়',
    chartLegendPower: 'পাওয়ার (ওয়াট)',
    chartLegendVoltage: 'ভোল্টেজ (ভোল্ট)',
    noChartData: 'কোনো চার্ট ডেটা নেই।',
    readingsAppearSoon: 'ডেটা সংগ্রহ করা হলে রিডিংস প্রদর্শিত হবে।',
    thresholdLabel: '⚠ ৮০০ ওয়াট সীমা',

    // Latest Reading Details
    latestReadingDetails: 'সর্বশেষ রিডিং-এর বিবরণ',
    timestamp: 'সময়',
    cumulativeEnergy: 'মোট বিদ্যুৎ ব্যবহার',

    // Billing / Cost
    billingDetails: 'বিদ্যুৎ বিল বিবরণী',
    billingDetailsSub: 'বাংলাদেশ এলটি-এ (LT-A) আবাসিক ট্যারিফ রেট অনুযায়ী হিসাবকৃত',
    todaysCost: 'আজকের আনুমানিক বিল',
    cumulativeCost: 'সর্বমোট আনুমানিক বিল',
    billingBreakdown: 'ধাপ-ভিত্তিক বিল বিবরণী',
    slabName: 'ধাপ (কিলোওয়াট-ঘণ্টা/ইউনিট)',
    slabRate: 'ইউনিট প্রতি মূল্য (টাকা)',
    slabConsumed: 'ব্যবহৃত ইউনিট (kWh)',
    slabCharge: 'বিল চার্জ (টাকা)',
    totalCharge: 'মোট এনার্জি চার্জ',
    demandChargeLabel: 'ডিমান্ড চার্জ (টাকা/মাস)',
    estimatedTotal: 'সর্বমোট আনুমানিক বিল',
    demandChargeText: '৳৪২.০০ (স্থির)',
    lifelineAppliedText: 'লাইফ লাইন রেট প্রযোজ্য (০-৫০ ইউনিট)',
    standardSlabsAppliedText: 'সাধারণ ধাপ ট্যারিফ প্রযোজ্য (>৫০ ইউনিট)',
  }
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem(STORAGE_LANG) || 'en';
  });

  const toggleLanguage = useCallback(() => {
    setLanguage((prev) => {
      const next = prev === 'en' ? 'bn' : 'en';
      localStorage.setItem(STORAGE_LANG, next);
      return next;
    });
  }, []);

  const t = useCallback((key, replacements = {}) => {
    const translationSet = translations[language] || translations.en;
    let text = translationSet[key] || translations.en[key] || key;
    
    Object.keys(replacements).forEach((replaceKey) => {
      text = text.replace(`{${replaceKey}}`, replacements[replaceKey]);
    });
    
    return text;
  }, [language]);

  // Helper to format numbers dynamically based on active language
  const formatNumber = useCallback((num, decimals = null) => {
    if (num == null || isNaN(num)) return '—';
    let val = typeof num === 'number' ? num : parseFloat(num);
    if (decimals !== null) {
      val = val.toFixed(decimals);
    }
    const valStr = String(val);
    if (language === 'bn') {
      const banglaDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
      return valStr.replace(/[0-9]/g, (digit) => banglaDigits[parseInt(digit, 10)]);
    }
    return valStr;
  }, [language]);

  // Helper to format local date dynamically
  const formatDate = useCallback((dateStr) => {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    try {
      if (language === 'bn') {
        return date.toLocaleString('bn-BD', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        });
      }
      return date.toLocaleString('en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    } catch (e) {
      return dateStr;
    }
  }, [language]);

  // Helper to calculate energy billing according to progressive tariff rates
  const calculateBill = useCallback((units) => {
    if (units == null || isNaN(units) || units <= 0) {
      return {
        total: 0,
        breakdown: [],
        type: 'none'
      };
    }

    let total = 0;
    const breakdown = [];
    let isLifeline = false;

    if (units <= 50) {
      // Lifeline slab
      const cost = units * 4.63;
      isLifeline = true;
      breakdown.push({
        slabName: 'Lifeline (0-50)',
        slabNameBn: 'লাইফ লাইন (০-৫০)',
        units: units,
        rate: 4.63,
        cost: cost
      });
      total = cost;
    } else {
      // Slabs for non-lifeline
      const slabs = [
        { name: 'Step 1 (0-75)', nameBn: '১ম ধাপ (০-৭৫)', limit: 75, rate: 5.26 },
        { name: 'Step 2 (76-200)', nameBn: '২য় ধাপ (৭৬-২০০)', limit: 125, rate: 8.50 },
        { name: 'Step 3 (201-300)', nameBn: '৩য় ধাপ (২০১-৩০০)', limit: 100, rate: 9.10 },
        { name: 'Step 4 (301-400)', nameBn: '৪র্থ ধাপ (৩০১-৪০০)', limit: 100, rate: 9.62 },
        { name: 'Step 5 (401-600)', nameBn: '৫ম ধাপ (৪০১-৬০০)', limit: 200, rate: 15.01 },
        { name: 'Step 6 (601+)', nameBn: '৬ষ্ঠ ধাপ (৬০১+)', limit: Infinity, rate: 17.35 }
      ];

      let remaining = units;
      for (const slab of slabs) {
        if (remaining <= 0) break;
        const slabUnits = Math.min(remaining, slab.limit);
        const cost = slabUnits * slab.rate;
        breakdown.push({
          slabName: slab.name,
          slabNameBn: slab.nameBn,
          units: slabUnits,
          rate: slab.rate,
          cost: cost
        });
        total += cost;
        remaining -= slabUnits;
      }
    }

    return {
      total: parseFloat(total.toFixed(2)),
      breakdown,
      type: isLifeline ? 'lifeline' : 'standard'
    };
  }, []);

  return (
    <LanguageContext.Provider value={{ language, toggleLanguage, t, formatNumber, formatDate, calculateBill }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
};
