/**
 * GG Calendar — Calendar Engine
 * Pure date math. No Foundry dependencies, fully unit-testable.
 *
 * A calendar config looks like:
 * {
 *   name: "Calendar of Harptos",
 *   months: [{ name, days, intercalary?: boolean, leapDays?: number }],
 *   weekdays: ["Monday", ...],
 *   leap: { type: "none" | "simple" | "gregorian", interval?: number },
 *   epoch: { year, month, day },   // calendar date at worldTime = 0
 *   epochWeekday: 0,               // weekday index of the epoch day
 *   seasons: [{ name, monthStart, icon? }],  // sorted by monthStart
 *   yearPrefix: "", yearSuffix: " DR"
 * }
 *
 * Intercalary days (festivals) do NOT advance the weekday cycle.
 */

export const DAY_SECONDS = 86400;

export class CalendarEngine {
  constructor(config) {
    this.config = config;
  }

  /* -------------------------------------------- */
  /*  Leap years                                   */
  /* -------------------------------------------- */

  isLeapYear(year) {
    const leap = this.config.leap ?? { type: "none" };
    switch (leap.type) {
      case "gregorian":
        return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
      case "simple":
        return leap.interval > 0 && year % leap.interval === 0;
      default:
        return false;
    }
  }

  /** Days in a given month index for a given year (accounts for leap days). */
  daysInMonth(monthIndex, year) {
    const m = this.config.months[monthIndex];
    let days = m.days;
    if (this.isLeapYear(year) && m.leapDays) days += m.leapDays;
    return days;
  }

  daysInYear(year) {
    let total = 0;
    for (let i = 0; i < this.config.months.length; i++) total += this.daysInMonth(i, year);
    return total;
  }

  /** Days in a year that count toward the weekday cycle (non-intercalary). */
  weekdayDaysInYear(year) {
    let total = 0;
    for (let i = 0; i < this.config.months.length; i++) {
      if (!this.config.months[i].intercalary) total += this.daysInMonth(i, year);
    }
    return total;
  }

  /* -------------------------------------------- */
  /*  Core conversions                             */
  /* -------------------------------------------- */

  /**
   * Convert an absolute day offset from the epoch date into a calendar date.
   * Returns { year, month (idx), day (1-based), weekday (idx|null), dayOfYear }
   */
  dateFromDayOffset(offset) {
    const ep = this.config.epoch;
    let year = ep.year;

    // Day-of-year of the epoch date within its own year.
    let epochDoy = 0;
    for (let i = 0; i < ep.month; i++) epochDoy += this.daysInMonth(i, year);
    epochDoy += (ep.day - 1);

    let doy = epochDoy + offset;

    // Walk forward / backward across years.
    while (doy >= this.daysInYear(year)) {
      doy -= this.daysInYear(year);
      year += 1;
    }
    while (doy < 0) {
      year -= 1;
      doy += this.daysInYear(year);
    }

    // Resolve month/day from day-of-year.
    let month = 0;
    let remaining = doy;
    while (remaining >= this.daysInMonth(month, year)) {
      remaining -= this.daysInMonth(month, year);
      month += 1;
    }

    const monthDef = this.config.months[month];
    const weekday = monthDef.intercalary ? null : this.#weekdayFor(year, month, remaining + 1, epochDoy);

    return { year, month, day: remaining + 1, weekday, dayOfYear: doy };
  }

  /** Weekday index for a date, counting only non-intercalary days since the epoch. */
  #weekdayFor(year, month, day, _epochDoy) {
    const ep = this.config.epoch;
    const n = this.config.weekdays.length;

    // Count weekday-days between epoch date and target date (signed).
    let count = 0;
    const [from, to, sign] = (year > ep.year || (year === ep.year && this.#doy(year, month, day) >= this.#doy(ep.year, ep.month, ep.day)))
      ? [{ y: ep.year, m: ep.month, d: ep.day }, { y: year, m: month, d: day }, 1]
      : [{ y: year, m: month, d: day }, { y: ep.year, m: ep.month, d: ep.day }, -1];

    // Whole years between.
    for (let y = from.y; y < to.y; y++) count += this.weekdayDaysInYear(y);
    // Adjust partial years.
    count -= this.#weekdayDoy(from.y, from.m, from.d);
    count += this.#weekdayDoy(to.y, to.m, to.d);

    const base = this.config.epochWeekday ?? 0;
    return ((base + sign * count) % n + n) % n;
  }

  /** Day-of-year (0-based). */
  #doy(year, month, day) {
    let doy = 0;
    for (let i = 0; i < month; i++) doy += this.daysInMonth(i, year);
    return doy + (day - 1);
  }

  /** Count of weekday-counting days before this date within its year. */
  #weekdayDoy(year, month, day) {
    let count = 0;
    for (let i = 0; i < month; i++) {
      if (!this.config.months[i].intercalary) count += this.daysInMonth(i, year);
    }
    if (!this.config.months[month].intercalary) count += (day - 1);
    return count;
  }

  /** worldTime (seconds) -> full date+time object. */
  fromSeconds(t) {
    const offset = Math.floor(t / DAY_SECONDS);
    const sod = ((t % DAY_SECONDS) + DAY_SECONDS) % DAY_SECONDS; // seconds-of-day, safe for negatives
    const date = this.dateFromDayOffset(offset);
    return {
      ...date,
      hour: Math.floor(sod / 3600),
      minute: Math.floor((sod % 3600) / 60),
      second: sod % 60,
      monthName: this.config.months[date.month].name,
      intercalary: !!this.config.months[date.month].intercalary,
      weekdayName: date.weekday === null ? null : this.config.weekdays[date.weekday],
      season: this.seasonFor(date.month),
      displayYear: `${this.config.yearPrefix ?? ""}${date.year}${this.config.yearSuffix ?? ""}`
    };
  }

  /** Calendar date -> worldTime seconds. */
  toSeconds({ year, month, day, hour = 0, minute = 0, second = 0 }) {
    const ep = this.config.epoch;
    let offset = 0;
    if (year >= ep.year) {
      for (let y = ep.year; y < year; y++) offset += this.daysInYear(y);
    } else {
      for (let y = year; y < ep.year; y++) offset -= this.daysInYear(y);
    }
    offset += this.#doy(year, month, day) - this.#doy(ep.year, ep.month, ep.day);
    return offset * DAY_SECONDS + hour * 3600 + minute * 60 + second;
  }

  /* -------------------------------------------- */
  /*  Seasons & display helpers                    */
  /* -------------------------------------------- */

  seasonFor(monthIndex) {
    const seasons = this.config.seasons ?? [];
    if (!seasons.length) return null;
    let current = seasons[seasons.length - 1];
    for (const s of seasons) {
      if (monthIndex >= s.monthStart) current = s;
    }
    return current;
  }

  /**
   * Build a renderable grid for a month.
   * Returns rows: { type: "week", cells: [{day|null, weekday}] } | { type: "intercalary", day }
   * Intercalary months render every day as a banner row.
   */
  monthGrid(year, monthIndex) {
    const monthDef = this.config.months[monthIndex];
    const days = this.daysInMonth(monthIndex, year);
    const rows = [];

    if (monthDef.intercalary) {
      for (let d = 1; d <= days; d++) rows.push({ type: "intercalary", day: d });
      return rows;
    }

    const n = this.config.weekdays.length;
    const firstSeconds = this.toSeconds({ year, month: monthIndex, day: 1 });
    const firstWeekday = this.fromSeconds(firstSeconds).weekday ?? 0;

    let cells = [];
    for (let i = 0; i < firstWeekday; i++) cells.push({ day: null });
    for (let d = 1; d <= days; d++) {
      cells.push({ day: d });
      if (cells.length === n) {
        rows.push({ type: "week", cells });
        cells = [];
      }
    }
    if (cells.length) {
      while (cells.length < n) cells.push({ day: null });
      rows.push({ type: "week", cells });
    }
    return rows;
  }

  /** Stable string key for a date, used to index notes. */
  static dateKey(year, month, day) {
    return `${year}-${month}-${day}`;
  }
}
