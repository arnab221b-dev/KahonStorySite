import { localizeDigits, type Language } from '../i18n/translations';

export function formatTime(totalSeconds: number, lang: Language = 'en'): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) {
    return localizeDigits('0:00', lang);
  }
  const secs = Math.floor(totalSeconds);
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  const raw =
    h > 0
      ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
      : `${m}:${String(s).padStart(2, '0')}`;
  return localizeDigits(raw, lang);
}

export function formatDurationLong(totalSeconds: number, lang: Language = 'en'): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) {
    return lang === 'bn' ? '০ মি.' : '0m';
  }
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.round((totalSeconds % 3600) / 60);
  if (lang === 'bn') {
    if (h > 0 && m > 0) return `${localizeDigits(h, 'bn')} ঘণ্টা ${localizeDigits(m, 'bn')} মি.`;
    if (h > 0) return `${localizeDigits(h, 'bn')} ঘণ্টা`;
    return `${localizeDigits(Math.max(1, m), 'bn')} মি.`;
  }
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${Math.max(1, m)}m`;
}

export function getTimeGreeting(lang: Language = 'en'): {
  primary: string;
  secondary: string;
  subtext: string;
} {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) {
    return lang === 'bn'
      ? {
          primary: 'শুভ সকাল',
          secondary: '',
          subtext: 'ক্লাসিক বাংলা গল্প দিয়ে সুন্দর সকাল শুরু করুন',
        }
      : {
          primary: 'শুভ সকাল',
          secondary: 'Good Morning',
          subtext: 'Begin your morning with timeless Bengali storytelling',
        };
  }
  if (hour >= 12 && hour < 17) {
    return lang === 'bn'
      ? {
          primary: 'শুভ দুপুর',
          secondary: 'ম্যাটিনি আসর',
          subtext: 'ভাতঘুম, সাথে গল্পের আসর',
        }
      : {
          primary: 'শুভ দুপুর',
          secondary: 'Afternoon Sanctuary',
          subtext: 'Unwind with dramatic audio classics & mysteries',
        };
  }
  if (hour >= 17 && hour < 21) {
    return lang === 'bn'
      ? {
          primary: 'শুভ সন্ধ্যা',
          secondary: 'সন্ধ্যার গল্পের আসর',
          subtext: 'উপভোগ করুন কাহনের মনোমুগ্ধকর গল্প',
        }
      : {
          primary: 'শুভ সন্ধ্যা',
          secondary: 'Evening Reverie',
          subtext: 'Dim the lights and sink into a Kahon story',
        };
  }
  return lang === 'bn'
    ? {
        primary: 'শুভ রাত্রি',
        secondary: 'নিশুতি গল্পের আসর',
        subtext: 'নিস্তব্ধ রাতের কণ্ঠস্বর ও গা ছমছমে সাসপেন্স',
      }
    : {
        primary: 'শুভ রাত্রি',
        secondary: 'Midnight Story Hour',
        subtext: 'Soft voices, glowing embers, and lingering suspense',
      };
}
