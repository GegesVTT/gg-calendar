/**
 * GG Calendar — Dynamic weather.
 * Generates daily weather from climate (world setting) + current season.
 * Uses a light random walk on temperature so consecutive days feel coherent.
 */

import { MODULE_ID, SETTINGS } from "./constants.mjs";

const CLIMATES = {
  temperate: { Winter: [-5, 8], Spring: [8, 18], Summer: [18, 32], Autumn: [6, 16], default: [10, 20] },
  cold:      { Winter: [-25, -5], Spring: [-5, 8], Summer: [5, 18], Autumn: [-5, 6], default: [-5, 5] },
  arid:      { Winter: [5, 18], Spring: [15, 30], Summer: [28, 45], Autumn: [15, 28], default: [20, 35] },
  tropical:  { Winter: [20, 28], Spring: [22, 30], Summer: [24, 34], Autumn: [22, 30], default: [24, 30] }
};

const CONDITIONS = {
  temperate: [
    { key: "clear", w: 30, icon: "fa-sun" },
    { key: "cloudy", w: 30, icon: "fa-cloud" },
    { key: "rain", w: 20, icon: "fa-cloud-rain" },
    { key: "storm", w: 8, icon: "fa-cloud-bolt" },
    { key: "fog", w: 7, icon: "fa-smog" },
    { key: "snow", w: 5, icon: "fa-snowflake", onlyBelow: 2 }
  ],
  cold: [
    { key: "clear", w: 25, icon: "fa-sun" },
    { key: "cloudy", w: 25, icon: "fa-cloud" },
    { key: "snow", w: 30, icon: "fa-snowflake", onlyBelow: 3 },
    { key: "blizzard", w: 10, icon: "fa-wind", onlyBelow: 0 },
    { key: "fog", w: 10, icon: "fa-smog" }
  ],
  arid: [
    { key: "clear", w: 55, icon: "fa-sun" },
    { key: "scorching", w: 20, icon: "fa-temperature-full" },
    { key: "cloudy", w: 10, icon: "fa-cloud" },
    { key: "sandstorm", w: 10, icon: "fa-wind" },
    { key: "rain", w: 5, icon: "fa-cloud-rain" }
  ],
  tropical: [
    { key: "clear", w: 25, icon: "fa-sun" },
    { key: "humid", w: 20, icon: "fa-droplet" },
    { key: "rain", w: 25, icon: "fa-cloud-rain" },
    { key: "storm", w: 20, icon: "fa-cloud-bolt" },
    { key: "cloudy", w: 10, icon: "fa-cloud" }
  ]
};

export class Weather {
  static register() {
    game.settings.register(MODULE_ID, SETTINGS.CLIMATE, {
      name: "GGCAL.Settings.Climate.Name",
      hint: "GGCAL.Settings.Climate.Hint",
      scope: "world",
      config: true,
      type: String,
      default: "temperate",
      choices: {
        temperate: "GGCAL.Climate.temperate",
        cold: "GGCAL.Climate.cold",
        arid: "GGCAL.Climate.arid",
        tropical: "GGCAL.Climate.tropical"
      }
    });
    game.settings.register(MODULE_ID, SETTINGS.AUTO_WEATHER, {
      name: "GGCAL.Settings.AutoWeather.Name",
      hint: "GGCAL.Settings.AutoWeather.Hint",
      scope: "world",
      config: true,
      type: Boolean,
      default: true
    });
    game.settings.register(MODULE_ID, SETTINGS.TEMP_UNIT, {
      name: "GGCAL.Settings.TempUnit.Name",
      scope: "world",
      config: true,
      type: String,
      default: "C",
      choices: { C: "°C", F: "°F" }
    });
    game.settings.register(MODULE_ID, SETTINGS.LAST_WEATHER, {
      scope: "world",
      config: false,
      type: Object,
      default: null
    });
  }

  /** Generate (and persist) weather for the given date object from the engine. */
  static async roll(date, { toChat = true } = {}) {
    if (!game.user.isGM) return null;

    const climate = game.settings.get(MODULE_ID, SETTINGS.CLIMATE);
    const seasonName = date.season?.name ?? "default";
    const range = CLIMATES[climate]?.[seasonName] ?? CLIMATES[climate]?.default ?? [10, 20];

    // Random walk: bias today's temperature toward yesterday's.
    const last = game.settings.get(MODULE_ID, SETTINGS.LAST_WEATHER);
    const mid = (range[0] + range[1]) / 2;
    const spread = (range[1] - range[0]) / 2;
    let temp = mid + (Math.random() * 2 - 1) * spread;
    if (typeof last?.tempC === "number") temp = (temp + last.tempC * 2) / 3;
    temp = Math.round(Math.max(range[0] - 5, Math.min(range[1] + 5, temp)));

    // Weighted condition pick, filtered by temperature constraints.
    const pool = (CONDITIONS[climate] ?? CONDITIONS.temperate)
      .filter(c => c.onlyBelow === undefined || temp <= c.onlyBelow);
    const totalW = pool.reduce((s, c) => s + c.w, 0);
    let r = Math.random() * totalW;
    let picked = pool[0];
    for (const c of pool) {
      r -= c.w;
      if (r <= 0) { picked = c; break; }
    }

    const weather = {
      tempC: temp,
      condition: picked.key,
      icon: picked.icon,
      dateKey: `${date.year}-${date.month}-${date.day}`
    };
    await game.settings.set(MODULE_ID, SETTINGS.LAST_WEATHER, weather);

    if (toChat) {
      const unit = game.settings.get(MODULE_ID, SETTINGS.TEMP_UNIT);
      const shown = unit === "F" ? Math.round(temp * 9 / 5 + 32) : temp;
      const condLabel = game.i18n.localize(`GGCAL.Weather.${picked.key}`);
      await ChatMessage.create({
        speaker: { alias: "GG Calendar" },
        content: `
          <div class="gg-calendar-chat-weather">
            <i class="fa-solid ${picked.icon}"></i>
            <strong>${condLabel}</strong> — ${shown}°${unit}
            <div class="ggc-chat-date">${date.day} ${date.monthName}, ${date.displayYear}</div>
          </div>`
      });
    }
    return weather;
  }

  static current() {
    return game.settings.get(MODULE_ID, SETTINGS.LAST_WEATHER);
  }
}
