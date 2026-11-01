import { DAYS_OF_WEEK, type DayOfWeek } from "@/lib/constants";

// Mess weeks run Monday–Sunday in IST, regardless of where the code runs
// (Vercel servers are UTC). Dates are passed around as "YYYY-MM-DD" strings.

const IST = "Asia/Kolkata";

export function istToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: IST }).format(new Date());
}

/** Minutes since midnight in IST. */
export function istMinutesNow(): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: IST,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);
  return get("hour") * 60 + get("minute");
}

function toUTCDate(iso: string): Date {
  return new Date(`${iso}T00:00:00Z`);
}

export function addDays(iso: string, days: number): string {
  const d = toUTCDate(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function dayOfWeek(iso: string): DayOfWeek {
  // getUTCDay: 0 = Sunday
  return DAYS_OF_WEEK[(toUTCDate(iso).getUTCDay() + 6) % 7];
}

export function weekMonday(iso: string): string {
  return addDays(iso, -DAYS_OF_WEEK.indexOf(dayOfWeek(iso)));
}

export function weekDates(mondayIso: string): { day: DayOfWeek; date: string }[] {
  return DAYS_OF_WEEK.map((day, i) => ({ day, date: addDays(mondayIso, i) }));
}

export function formatShortDate(iso: string): string {
  return toUTCDate(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

export function formatWeekRange(startIso: string, endIso: string): string {
  return `${formatShortDate(startIso)} – ${formatShortDate(endIso)}`;
}
