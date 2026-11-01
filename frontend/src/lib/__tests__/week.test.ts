import { afterEach, describe, expect, it, vi } from "vitest";
import {
  addDays,
  dayOfWeek,
  formatWeekRange,
  istMinutesNow,
  istToday,
  weekDates,
  weekMonday,
} from "@/lib/week";

afterEach(() => vi.useRealTimers());

describe("IST calendar", () => {
  it("uses the IST date even when UTC is still the previous day", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-01T20:00:00Z")); // 01:30 IST on Nov 2
    expect(istToday()).toBe("2026-11-02");
    expect(istMinutesNow()).toBe(90);
  });

  it("finds the Monday of the week, Sunday belonging to the previous week", () => {
    expect(weekMonday("2026-11-04")).toBe("2026-11-02"); // Wednesday
    expect(weekMonday("2026-11-02")).toBe("2026-11-02"); // Monday
    expect(weekMonday("2026-11-08")).toBe("2026-11-02"); // Sunday
  });

  it("handles month and year boundaries", () => {
    expect(addDays("2026-12-30", 3)).toBe("2027-01-02");
    expect(weekMonday("2027-01-01")).toBe("2026-12-28");
    expect(dayOfWeek("2027-01-01")).toBe("friday");
  });

  it("lists a Monday–Sunday week", () => {
    const week = weekDates("2026-11-02");
    expect(week).toHaveLength(7);
    expect(week[0]).toEqual({ day: "monday", date: "2026-11-02" });
    expect(week[6]).toEqual({ day: "sunday", date: "2026-11-08" });
    expect(formatWeekRange("2026-11-02", "2026-11-08")).toBe("2 Nov – 8 Nov");
  });
});
