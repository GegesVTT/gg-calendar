/**
 * GG Calendar — Time manager.
 * Wraps game.time advancement and wires automatic advancement:
 *  - dnd5e rests (short = 1h, long = 8h)
 *  - combat rounds for systems without CONFIG.time.roundTime
 *  - fires "ggCalendar.dayChanged" when the in-game day rolls over
 */

import { MODULE_ID, SETTINGS } from "./constants.mjs";
import { DAY_SECONDS } from "./engine.mjs";
import { Weather } from "./weather.mjs";

export class TimeManager {
  static #lastDay = null;

  static register() {
    game.settings.register(MODULE_ID, SETTINGS.REST_ADVANCE, {
      name: "GGCAL.Settings.RestAdvance.Name",
      hint: "GGCAL.Settings.RestAdvance.Hint",
      scope: "world",
      config: true,
      type: Boolean,
      default: true
    });
    game.settings.register(MODULE_ID, SETTINGS.COMBAT_ADVANCE, {
      name: "GGCAL.Settings.CombatAdvance.Name",
      hint: "GGCAL.Settings.CombatAdvance.Hint",
      scope: "world",
      config: true,
      type: Boolean,
      default: false
    });
    game.settings.register(MODULE_ID, SETTINGS.SECONDS_PER_ROUND, {
      name: "GGCAL.Settings.SecondsPerRound.Name",
      scope: "world",
      config: true,
      type: Number,
      default: 6
    });
  }

  static activateHooks(getEngine) {
    // Track day changes to trigger daily weather.
    Hooks.on("updateWorldTime", async (worldTime) => {
      const day = Math.floor(worldTime / DAY_SECONDS);
      if (this.#lastDay === null) { this.#lastDay = day; return; }
      if (day !== this.#lastDay) {
        this.#lastDay = day;
        const date = getEngine().fromSeconds(worldTime);
        Hooks.callAll("ggCalendar.dayChanged", date);
        if (game.user === game.users.activeGM && game.settings.get(MODULE_ID, SETTINGS.AUTO_WEATHER)) {
          await Weather.roll(date);
        }
      }
    });

    // dnd5e: advance time when a rest completes (the system itself does not).
    Hooks.on("dnd5e.restCompleted", async (actor, result) => {
      if (game.user !== game.users.activeGM) return;
      if (!game.settings.get(MODULE_ID, SETTINGS.REST_ADVANCE)) return;
      const isLong = result?.longRest ?? (result?.type === "long");
      await this.advance(isLong ? 8 * 3600 : 3600, { silent: true });
      ui.notifications.info(game.i18n.format("GGCAL.Time.RestAdvanced", {
        hours: isLong ? 8 : 1, name: actor?.name ?? "?"
      }));
    });

    // Combat rounds — only for systems that do NOT already advance time via
    // CONFIG.time.roundTime (dnd5e does; this setting defaults to off).
    Hooks.on("combatRound", async (combat, updateData) => {
      if (game.user !== game.users.activeGM) return;
      if (!game.settings.get(MODULE_ID, SETTINGS.COMBAT_ADVANCE)) return;
      if (CONFIG.time?.roundTime > 0) return; // core already handles it
      const secs = game.settings.get(MODULE_ID, SETTINGS.SECONDS_PER_ROUND);
      await this.advance(secs, { silent: true });
    });
  }

  /** Advance (or rewind, with negative seconds) the world clock. GM only. */
  static async advance(seconds, { silent = false } = {}) {
    if (!game.user.isGM) {
      ui.notifications.warn(game.i18n.localize("GGCAL.Errors.GMOnly"));
      return;
    }
    await game.time.advance(seconds);
    if (!silent) Hooks.callAll("ggCalendar.timeAdvanced", seconds);
  }

  /** Jump to an exact calendar date/time. GM only. */
  static async setDate(engine, parts) {
    if (!game.user.isGM) return;
    const target = engine.toSeconds(parts);
    await game.time.advance(target - game.time.worldTime);
  }
}
