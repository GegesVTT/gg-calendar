/**
 * GG Calendar — Simple Calendar compatibility bridge.
 *
 * Many modules call the global `SimpleCalendar.api`. When Simple Calendar is
 * NOT installed, we expose a minimal-but-faithful shim backed by GG Calendar,
 * so that dependent modules (weather, about-time-style helpers, etc.) keep
 * working without any change on their side.
 *
 * We only install the shim if SimpleCalendar is absent — we never override a
 * real Simple Calendar install.
 */

import { MODULE_ID } from "./constants.mjs";
import { DAY_SECONDS } from "./engine.mjs";

export function installSimpleCalendarBridge(getEngine, TimeManager) {
  if (globalThis.SimpleCalendar) {
    console.log(`${MODULE_ID} | Simple Calendar present — bridge not installed.`);
    return;
  }

  const toSCDate = (d) => ({
    year: d.year,
    month: d.month,            // 0-based, matches SC convention
    day: d.day - 1,            // SC days are 0-based
    dayOfTheWeek: d.weekday ?? 0,
    hour: d.hour,
    minute: d.minute,
    second: d.second,
    yearName: "",
    monthName: d.monthName,
    weekdays: getEngine().config.weekdays,
    showWeekdayHeadings: true,
    currentSeason: d.season ? { name: d.season.name, icon: d.season.icon } : {},
    isLeapYear: getEngine().isLeapYear(d.year),
    display: {
      date: `${d.day} ${d.monthName}, ${d.displayYear}`,
      time: `${String(d.hour).padStart(2, "0")}:${String(d.minute).padStart(2, "0")}`,
      year: String(d.year),
      yearName: "",
      yearPrefix: getEngine().config.yearPrefix ?? "",
      yearPostfix: getEngine().config.yearSuffix ?? "",
      monthName: d.monthName,
      weekday: d.weekdayName ?? "",
      day: String(d.day),
      daySuffix: ""
    }
  });

  const api = {
    /** Current world date/time as a Simple Calendar date object. */
    currentDateTime() {
      const d = getEngine().fromSeconds(game.time.worldTime);
      return toSCDate(d);
    },
    currentDateTimeDisplay() {
      return this.currentDateTime().display;
    },
    timestamp() {
      return game.time.worldTime;
    },
    timestampToDate(ts) {
      return toSCDate(getEngine().fromSeconds(ts));
    },
    dateToTimestamp(date) {
      return getEngine().toSeconds({
        year: date.year,
        month: date.month ?? 0,
        day: (date.day ?? 0) + 1,
        hour: date.hour ?? 0,
        minute: date.minute ?? 0,
        second: date.second ?? 0
      });
    },
    /** Advance helpers used by several weather/time modules. */
    async changeDate(interval = {}) {
      if (!game.user.isGM) return false;
      let seconds = 0;
      seconds += (interval.second ?? 0);
      seconds += (interval.minute ?? 0) * 60;
      seconds += (interval.hour ?? 0) * 3600;
      seconds += (interval.day ?? 0) * DAY_SECONDS;
      if (seconds) await TimeManager.advance(seconds);
      return true;
    },
    async setDate(date = {}) {
      if (!game.user.isGM) return false;
      await TimeManager.setDate(getEngine(), {
        year: date.year ?? getEngine().fromSeconds(game.time.worldTime).year,
        month: date.month ?? 0,
        day: (date.day ?? 0) + 1,
        hour: date.hour ?? 0,
        minute: date.minute ?? 0,
        second: date.second ?? 0
      });
      return true;
    },
    getCurrentSeason() {
      const d = getEngine().fromSeconds(game.time.worldTime);
      return d.season ? { name: d.season.name, icon: d.season.icon } : {};
    },
    getAllMoons() {
      return getEngine().moonPhases(game.time.worldTime);
    },
    /** Identifies this as the GG-backed shim, not real Simple Calendar. */
    isGGCalendarBridge: true
  };

  globalThis.SimpleCalendar = { api, Hooks: { DateTimeChange: "simple-calendar-date-time-change" } };

  // Emit SC's date-change hook so listeners relying on it keep firing.
  Hooks.on("updateWorldTime", () => {
    Hooks.callAll(globalThis.SimpleCalendar.Hooks.DateTimeChange, {
      date: api.currentDateTime()
    });
  });

  console.log(`${MODULE_ID} | Simple Calendar compatibility bridge installed.`);
}
