/**
 * GG Calendar — Native world calendar integration (Foundry v13+).
 *
 * Since v13, Foundry exposes CONFIG.time.worldCalendarClass / worldCalendarConfig,
 * letting a module BECOME the canonical world calendar (game.time.calendar).
 * Other modules and systems that call game.time.calendar.timeToComponents(),
 * componentsToTime() or format() then see GG Calendar's months, weekdays and years.
 *
 * This integration is defensive by design:
 *  - It feature-detects foundry.data.CalendarData (absent on v12 → silently skipped).
 *  - Registration is wrapped in try/catch; on any schema mismatch we log a warning
 *    and GG Calendar keeps working as a standalone window, exactly as before.
 */

import { MODULE_ID } from "./constants.mjs";

/**
 * Build a core-shaped CalendarConfig from a GG engine config.
 * Core months cannot express "intercalary, weekday-skipping" days, so this
 * config is approximate for display purposes — the conversion methods below
 * are overridden to delegate to the GG engine for exact math.
 */
function coreConfigFor(cfg) {
  return {
    name: cfg.name,
    description: "GG Calendar world calendar",
    years: {
      yearZero: cfg.epoch?.year ?? 0,
      firstWeekday: cfg.epochWeekday ?? 0,
      leapYear: { leapStart: 0, leapInterval: cfg.leap?.type === "simple" ? cfg.leap.interval : (cfg.leap?.type === "gregorian" ? 4 : 0) }
    },
    months: {
      values: cfg.months.map((m, i) => ({
        name: m.name,
        abbreviation: m.name.slice(0, 3),
        ordinal: i + 1,
        days: m.days,
        leapDays: (m.days ?? 0) + (m.leapDays ?? 0)
      }))
    },
    days: {
      values: cfg.weekdays.map((w, i) => ({ name: w, abbreviation: w.slice(0, 2), ordinal: i + 1 })),
      daysPerYear: cfg.months.reduce((s, m) => s + m.days, 0),
      hoursPerDay: 24,
      minutesPerHour: 60,
      secondsPerMinute: 60
    },
    seasons: {
      values: (cfg.seasons ?? []).map(s => ({ name: s.name, monthStart: s.monthStart + 1, monthEnd: s.monthStart + 1 }))
    }
  };
}

/**
 * Attempt to register the GG engine as Foundry's world calendar.
 * Call during the "init" hook. Returns true if registered.
 */
export function registerWorldCalendar(getEngine) {
  const CalendarData = foundry.data?.CalendarData;
  if (!CalendarData) return false; // v12 — core API not available

  try {
    class GGWorldCalendar extends CalendarData {
      /** Exact conversion via the GG engine (handles intercalary days & leap rules). */
      timeToComponents(time = 0) {
        const e = getEngine();
        const d = e.fromSeconds(time);
        return {
          year: d.year,
          month: d.month,                 // 0-based month index
          day: d.dayOfYear,               // 0-based day of the year (core convention)
          dayOfMonth: d.day - 1,          // 0-based day of the month
          dayOfWeek: d.weekday ?? 0,
          hour: d.hour,
          minute: d.minute,
          second: d.second,
          leapYear: e.isLeapYear(d.year)
        };
      }

      componentsToTime(components = {}) {
        const e = getEngine();
        // Accept either dayOfMonth (preferred) or day-of-year style input.
        let month = components.month ?? 0;
        let dayOfMonth = components.dayOfMonth;
        if (dayOfMonth === undefined && components.day !== undefined) {
          // Interpret "day" as day-of-year (core convention) and resolve month.
          let remaining = components.day;
          const year = components.year ?? e.config.epoch.year;
          month = 0;
          while (remaining >= e.daysInMonth(month, year)) {
            remaining -= e.daysInMonth(month, year);
            month += 1;
            if (month >= e.config.months.length) { month = e.config.months.length - 1; break; }
          }
          dayOfMonth = remaining;
        }
        return e.toSeconds({
          year: components.year ?? e.config.epoch.year,
          month,
          day: (dayOfMonth ?? 0) + 1,
          hour: components.hour ?? 0,
          minute: components.minute ?? 0,
          second: components.second ?? 0
        });
      }

      format(time = 0, formatter = undefined, options = {}) {
        // Honor custom formatters registered in CONFIG.time.formatters.
        const fn = formatter && CONFIG.time?.formatters?.[formatter];
        if (typeof fn === "function") {
          try { return fn(this, this.timeToComponents(typeof time === "number" ? time : 0), options); }
          catch (err) { console.warn(`${MODULE_ID} | custom formatter failed`, err); }
        }
        const e = getEngine();
        const d = e.fromSeconds(typeof time === "number" ? time : 0);
        const wd = d.weekdayName ? `${d.weekdayName}, ` : "";
        const hh = String(d.hour).padStart(2, "0");
        const mm = String(d.minute).padStart(2, "0");
        return `${wd}${d.day} ${d.monthName}, ${d.displayYear} ${hh}:${mm}`;
      }
    }

    const cfg = getEngine().config;
    CONFIG.time.worldCalendarClass = GGWorldCalendar;
    CONFIG.time.worldCalendarConfig = coreConfigFor(cfg);
    console.log(`${MODULE_ID} | Registered as world calendar: ${cfg.name}`);
    return true;
  } catch (err) {
    console.warn(`${MODULE_ID} | Could not register as world calendar — continuing in standalone mode.`, err);
    return false;
  }
}

/** Re-initialize game.time's calendar after CONFIG changes (call on ready / config change). */
export function refreshWorldCalendar() {
  try {
    game.time?.initializeCalendar?.();
  } catch (err) {
    console.warn(`${MODULE_ID} | initializeCalendar failed`, err);
  }
}
