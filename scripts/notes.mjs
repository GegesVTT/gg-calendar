/**
 * GG Calendar — Notes store.
 * Notes are stored in a hidden world setting as:
 * { "<year>-<month>-<day>": [ { id, title, text, gmOnly }, ... ] }
 */

import { MODULE_ID } from "./constants.mjs";
import { CalendarEngine } from "./engine.mjs";

export class NotesStore {
  static SETTING = "notesData";

  static register() {
    game.settings.register(MODULE_ID, this.SETTING, {
      scope: "world",
      config: false,
      type: Object,
      default: {}
    });
  }

  static #all() {
    return foundry.utils.deepClone(game.settings.get(MODULE_ID, this.SETTING) ?? {});
  }

  /** Notes visible to the current user for a date. */
  static get(year, month, day) {
    const key = CalendarEngine.dateKey(year, month, day);
    const notes = this.#all()[key] ?? [];
    return game.user.isGM ? notes : notes.filter(n => !n.gmOnly);
  }

  /** Does this date have any note visible to the current user? (no clone) */
  static has(year, month, day) {
    const key = CalendarEngine.dateKey(year, month, day);
    const notes = game.settings.get(MODULE_ID, this.SETTING)?.[key] ?? [];
    return game.user.isGM ? notes.length > 0 : notes.some(n => !n.gmOnly);
  }

  static async add(year, month, day, { title, text, gmOnly }) {
    if (!game.user.isGM) return;
    const data = this.#all();
    const key = CalendarEngine.dateKey(year, month, day);
    data[key] ??= [];
    data[key].push({
      id: foundry.utils.randomID(),
      title: title?.trim() || game.i18n.localize("GGCAL.Notes.Untitled"),
      text: text ?? "",
      gmOnly: !!gmOnly
    });
    await game.settings.set(MODULE_ID, this.SETTING, data);
  }

  static async delete(year, month, day, noteId) {
    if (!game.user.isGM) return;
    const data = this.#all();
    const key = CalendarEngine.dateKey(year, month, day);
    data[key] = (data[key] ?? []).filter(n => n.id !== noteId);
    if (!data[key].length) delete data[key];
    await game.settings.set(MODULE_ID, this.SETTING, data);
  }
}
