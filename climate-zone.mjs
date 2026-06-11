/**
 * GG Calendar — Auto-Chronicle (v1.2).
 *
 * Listens to native Foundry events and records a timestamped log:
 *   - combat start / end (with round count)
 *   - D&D 5e rests
 *   - scene changes
 *   - GM-marked story beats (via API or a button)
 *
 * At any point the GM can compile the log into a JournalEntryPage titled with
 * the in-world date, then clear it for the next session. Everything is stored
 * in a world setting, so it survives reloads.
 */

import { MODULE_ID, SETTINGS } from "./constants.mjs";

export class Chronicle {
  static SETTING = "chronicleLog";

  static register() {
    game.settings.register(MODULE_ID, this.SETTING, {
      scope: "world",
      config: false,
      type: Array,
      default: []
    });
    game.settings.register(MODULE_ID, SETTINGS.CHRONICLE_ENABLED, {
      name: "GGCAL.Settings.Chronicle.Name",
      hint: "GGCAL.Settings.Chronicle.Hint",
      scope: "world",
      config: true,
      type: Boolean,
      default: true
    });
  }

  static #enabled() {
    return game.settings.get(MODULE_ID, SETTINGS.CHRONICLE_ENABLED);
  }

  static #log() {
    return foundry.utils.deepClone(game.settings.get(MODULE_ID, this.SETTING) ?? []);
  }

  /** Append an entry; only the active GM writes, to avoid duplicates. */
  static async record(type, text, getEngine) {
    if (!this.#enabled()) return;
    if (game.user !== game.users.activeGM) return;
    const date = getEngine().fromSeconds(game.time.worldTime);
    const log = this.#log();
    log.push({
      id: foundry.utils.randomID(),
      type,
      text,
      worldTime: game.time.worldTime,
      stamp: `${String(date.hour).padStart(2, "0")}:${String(date.minute).padStart(2, "0")}`,
      dateLabel: `${date.day} ${date.monthName}, ${date.displayYear}`
    });
    await game.settings.set(MODULE_ID, this.SETTING, log);
  }

  static activateHooks(getEngine) {
    const rec = (type, text) => this.record(type, text, getEngine);

    Hooks.on("combatStart", (combat) => {
      rec("combat", game.i18n.format("GGCAL.Chronicle.CombatStart", {
        n: combat.combatants?.size ?? 0
      }));
    });

    Hooks.on("deleteCombat", (combat) => {
      rec("combat", game.i18n.format("GGCAL.Chronicle.CombatEnd", {
        rounds: combat.round ?? 0
      }));
    });

    Hooks.on("dnd5e.restCompleted", (actor, result) => {
      const isLong = result?.longRest ?? (result?.type === "long");
      rec("rest", game.i18n.format(isLong ? "GGCAL.Chronicle.LongRest" : "GGCAL.Chronicle.ShortRest", {
        name: actor?.name ?? "?"
      }));
    });

    Hooks.on("canvasReady", () => {
      const name = canvas?.scene?.name;
      if (name) rec("scene", game.i18n.format("GGCAL.Chronicle.Scene", { name }));
    });
  }

  /** GM: add a free-form story beat. */
  static async mark(text, getEngine) {
    if (!game.user.isGM) return;
    await this.record("beat", text, getEngine);
    ui.notifications.info(game.i18n.localize("GGCAL.Chronicle.Marked"));
  }

  static getEntries() {
    return this.#log();
  }

  static async clear() {
    if (!game.user.isGM) return;
    await game.settings.set(MODULE_ID, this.SETTING, []);
  }

  /**
   * Compile the current log into a JournalEntryPage inside the Campaign
   * Chronicle journal, grouped by in-world day. Returns the created page.
   */
  static async compile(NotesStore) {
    if (!game.user.isGM) return null;
    const entries = this.#log();
    if (!entries.length) {
      ui.notifications.warn(game.i18n.localize("GGCAL.Chronicle.Empty"));
      return null;
    }

    const icons = { combat: "⚔️", rest: "🛌", scene: "🗺️", beat: "✦" };
    let lastDate = null;
    let html = "";
    for (const e of entries) {
      if (e.dateLabel !== lastDate) {
        if (lastDate !== null) html += "</ul>";
        html += `<h3>${e.dateLabel}</h3><ul>`;
        lastDate = e.dateLabel;
      }
      html += `<li><strong>${e.stamp}</strong> ${icons[e.type] ?? "•"} ${foundry.utils.escapeHTML(e.text)}</li>`;
    }
    html += "</ul>";

    const journal = await NotesStore.getJournal();
    if (!journal) return null;

    const first = entries[0].dateLabel;
    const last = entries[entries.length - 1].dateLabel;
    const title = first === last
      ? game.i18n.format("GGCAL.Chronicle.SessionTitle", { date: first })
      : game.i18n.format("GGCAL.Chronicle.SessionRange", { from: first, to: last });

    const [page] = await journal.createEmbeddedDocuments("JournalEntryPage", [{
      name: title,
      type: "text",
      text: { content: html, format: 1 },
      flags: { [MODULE_ID]: { chronicle: true } }
    }]);

    return page ?? null;
  }
}
