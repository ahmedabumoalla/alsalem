export const SAUDI_TIME_ZONE = "Asia/Riyadh";

export type QuickDatePreset =
  | "today"
  | "yesterday"
  | "last7Days"
  | "thisMonth"
  | "lastMonth"
  | "allTime"
  | "custom";

export interface ReportDateRange {
  dateFrom: string;
  dateTo: string;
}

export const QUICK_DATE_PRESETS: ReadonlyArray<{
  value: QuickDatePreset;
  label: string;
}> = [
  { value: "today", label: "اليوم" },
  { value: "yesterday", label: "أمس" },
  { value: "last7Days", label: "آخر 7 أيام" },
  { value: "thisMonth", label: "هذا الشهر" },
  { value: "lastMonth", label: "الشهر الماضي" },
  { value: "allTime", label: "كل الفترات" },
  { value: "custom", label: "نطاق مخصص" },
];

interface CalendarDate {
  year: number;
  month: number;
  day: number;
}

const saudiDateFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: SAUDI_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function getSaudiCalendarDate(reference: Date): CalendarDate {
  const parts = saudiDateFormatter.formatToParts(reference);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);
  return { year: value("year"), month: value("month"), day: value("day") };
}

function shiftCalendarDays(date: CalendarDate, amount: number): CalendarDate {
  const shifted = new Date(Date.UTC(date.year, date.month - 1, date.day + amount));
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  };
}

function formatCalendarDate(date: CalendarDate): string {
  return `${String(date.year).padStart(4, "0")}-${String(date.month).padStart(2, "0")}-${String(date.day).padStart(2, "0")}`;
}

export function getReportDateRange(
  preset: Exclude<QuickDatePreset, "custom">,
  reference = new Date(),
): ReportDateRange {
  if (preset === "allTime") return { dateFrom: "", dateTo: "" };

  const today = getSaudiCalendarDate(reference);
  const todayValue = formatCalendarDate(today);
  if (preset === "today") return { dateFrom: todayValue, dateTo: todayValue };

  if (preset === "yesterday") {
    const yesterday = formatCalendarDate(shiftCalendarDays(today, -1));
    return { dateFrom: yesterday, dateTo: yesterday };
  }

  if (preset === "last7Days") {
    return {
      dateFrom: formatCalendarDate(shiftCalendarDays(today, -6)),
      dateTo: todayValue,
    };
  }

  if (preset === "thisMonth") {
    return {
      dateFrom: formatCalendarDate({ ...today, day: 1 }),
      dateTo: todayValue,
    };
  }

  const previousMonth = today.month === 1
    ? { year: today.year - 1, month: 12 }
    : { year: today.year, month: today.month - 1 };
  const lastDay = new Date(
    Date.UTC(previousMonth.year, previousMonth.month, 0),
  ).getUTCDate();
  return {
    dateFrom: formatCalendarDate({ ...previousMonth, day: 1 }),
    dateTo: formatCalendarDate({ ...previousMonth, day: lastDay }),
  };
}

export function detectReportDatePreset(
  range: ReportDateRange,
  reference = new Date(),
): QuickDatePreset {
  const presets: Array<Exclude<QuickDatePreset, "custom">> = [
    "today",
    "yesterday",
    "last7Days",
    "thisMonth",
    "lastMonth",
    "allTime",
  ];
  return presets.find((preset) => {
    const expected = getReportDateRange(preset, reference);
    return expected.dateFrom === range.dateFrom && expected.dateTo === range.dateTo;
  }) ?? "custom";
}

export function isValidReportDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() + 1 === month
    && date.getUTCDate() === day;
}
