import type { Branch, Category, MenuItem, DailySpecial, Promotion, SeasonalMenu } from "@prisma/client";

export type ThemeConfig = {
  primaryColor?: string;
  accentColor?: string;
  font?: string;
  backgroundUrl?: string | null;
  coverUrl?: string | null;
};

export type HoursConfig = Record<
  string,
  { open: string; close: string; closed?: boolean }
>;

export type SocialsConfig = {
  instagram?: string;
  facebook?: string;
  twitter?: string;
  website?: string;
};

export type PublicMenuData = {
  branch: Branch;
  planShowBranding: boolean;
  categories: (Category & {
    items: MenuItem[];
    displayName?: string;
  })[];
  specials: (DailySpecial & { menuItem: MenuItem | null })[];
  promotions: Promotion[];
  activeSeasonal: SeasonalMenu | null;
  locale: string;
  locales: string[];
  tableNumber?: number | null;
};

const LOCALE_LABELS: Record<string, string> = {
  en: "English",
  hi: "हिन्दी",
  kn: "ಕನ್ನಡ",
  ta: "தமிழ்",
  te: "తెలుగు",
};

export function localeLabel(code: string) {
  return LOCALE_LABELS[code] || code;
}

export const SUPPORTED_LOCALES = ["en", "hi", "kn", "ta", "te"] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

/** Check if current time in timezone falls within promotion schedule */
export function isPromotionActiveNow(
  promo: Pick<Promotion, "daysOfWeek" | "startTime" | "endTime" | "isActive">,
  timezone: string
) {
  if (!promo.isActive) return false;
  try {
    const now = new Date();
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: timezone,
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(now);

    const weekday = parts.find((p) => p.type === "weekday")?.value || "Mon";
    const hour = parts.find((p) => p.type === "hour")?.value || "00";
    const minute = parts.find((p) => p.type === "minute")?.value || "00";
    const map: Record<string, number> = {
      Sun: 0,
      Mon: 1,
      Tue: 2,
      Wed: 3,
      Thu: 4,
      Fri: 5,
      Sat: 6,
    };
    const day = map[weekday] ?? 0;
    if (!promo.daysOfWeek.includes(day)) return false;
    const current = `${hour}:${minute}`;
    return current >= promo.startTime && current <= promo.endTime;
  } catch {
    return promo.isActive;
  }
}

export const DEFAULT_THEME: Required<Pick<ThemeConfig, "primaryColor" | "accentColor" | "font">> = {
  primaryColor: "#0F766E",
  accentColor: "#F59E0B",
  font: "geist",
};

export const FONT_OPTIONS = [
  { id: "geist", label: "Geist", css: "var(--font-geist-sans), system-ui, sans-serif" },
  { id: "serif", label: "Classic Serif", css: "Georgia, 'Times New Roman', serif" },
  { id: "rounded", label: "Rounded", css: "'Segoe UI', system-ui, sans-serif" },
  { id: "mono", label: "Modern Mono", css: "var(--font-geist-mono), ui-monospace, monospace" },
] as const;

export function resolveTheme(theme: unknown): ThemeConfig & {
  primaryColor: string;
  accentColor: string;
  fontCss: string;
} {
  const t = (theme || {}) as ThemeConfig;
  const font = FONT_OPTIONS.find((f) => f.id === t.font) || FONT_OPTIONS[0];
  return {
    primaryColor: t.primaryColor || DEFAULT_THEME.primaryColor,
    accentColor: t.accentColor || DEFAULT_THEME.accentColor,
    font: t.font || DEFAULT_THEME.font,
    backgroundUrl: t.backgroundUrl,
    coverUrl: t.coverUrl,
    fontCss: font.css,
  };
}
