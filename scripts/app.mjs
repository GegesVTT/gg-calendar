/**
 * GG Calendar — Main application (ApplicationV2, works on v12 through v14).
 */

import { MODULE_ID } from "./constants.mjs";
import { NotesStore } from "./notes.mjs";
import { Weather } from "./weather.mjs";
import { TimeManager } from "./time.mjs";

const { ApplicationV2, HandlebarsApplicationMixin, DialogV2 } = foundry.applications.api;

export class GGCalendarApp extends HandlebarsApplicationMixin(ApplicationV2) {
  /** Month/year currently displayed (may differ from "today"). */
  #viewYear = null;
  #viewMonth = null;

  constructor(getEngine, options = {}) {
    super(options);
    this.getEngine = getEngine;
  }

  static DEFAULT_OPTIONS = {
    id: "gg-calendar-app",
    classes: ["gg-calendar"],
    window: {
      title: "GGCAL.Title",
      icon: "fa-solid fa-calendar-days",
      resizable: false
    },
    position: { width: 380, height: "auto" },
    actions: {
      prevMonth: GGCalendarApp.#onPrevMonth,
      nextMonth: GGCalendarApp.#onNextMonth,
      goToday: GGCalendarApp.#onGoToday,
      advance: GGCalendarApp.#onAdvance,
      openDay: GGCalendarApp.#onOpenDay,
      rollWeather: GGCalendarApp.#onRollWeather,
      setDate: GGCalendarApp.#onSetDate
    }
  };

  static PARTS = {
    main: { template: `modules/${MODULE_ID}/templates/calendar.hbs` }
  };

  /* -------------------------------------------- */

  async _prepareContext() {
    const engine = this.getEngine();
    const now = engine.fromSeconds(game.time.worldTime);

    if (this.#viewYear === null) {
      this.#viewYear = now.year;
      this.#viewMonth = now.month;
    }

    const monthDef = engine.config.months[this.#viewMonth];

    const grid = engine.monthGrid(this.#viewYear, this.#viewMonth).map(row => {
      if (row.type === "intercalary") {
        return {
          ...row,
          isIntercalary: true,
          label: row.day > 1 ? `${monthDef.name} (${row.day})` : monthDef.name,
          isToday: this.#isToday(now, row.day),
          hasNotes: NotesStore.has(this.#viewYear, this.#viewMonth, row.day)
        };
      }
      return {
        ...row,
        isIntercalary: false,
        cells: row.cells.map(c => ({
          ...c,
          isToday: c.day !== null && this.#isToday(now, c.day),
          hasNotes: c.day !== null && NotesStore.has(this.#viewYear, this.#viewMonth, c.day)
        }))
      };
    });

    const season = engine.seasonFor(this.#viewMonth);
    const weather = Weather.current();
    const unit = game.settings.get(MODULE_ID, "temperatureUnit");
    const shownTemp = weather
      ? (unit === "F" ? Math.round(weather.tempC * 9 / 5 + 32) : weather.tempC)
      : null;

    return {
      isGM: game.user.isGM,
      calendarName: engine.config.name,
      now,
      time: `${String(now.hour).padStart(2, "0")}:${String(now.minute).padStart(2, "0")}`,
      viewMonthName: monthDef.name,
      viewIsIntercalary: !!monthDef.intercalary,
      viewYearDisplay: `${engine.config.yearPrefix ?? ""}${this.#viewYear}${engine.config.yearSuffix ?? ""}`,
      weekdays: monthDef.intercalary ? [] : engine.config.weekdays,
      grid,
      season,
      weather: weather ? {
        icon: weather.icon,
        label: game.i18n.localize(`GGCAL.Weather.${weather.condition}`),
        temp: `${shownTemp}°${unit}`
      } : null
    };
  }

  #isToday(now, day) {
    return now.year === this.#viewYear && now.month === this.#viewMonth && now.day === day;
  }

  #shiftMonth(delta) {
    const months = this.getEngine().config.months.length;
    this.#viewMonth += delta;
    if (this.#viewMonth >= months) { this.#viewMonth = 0; this.#viewYear += 1; }
    if (this.#viewMonth < 0) { this.#viewMonth = months - 1; this.#viewYear -= 1; }
    this.render();
  }

  /* -------------------------------------------- */
  /*  Actions                                      */
  /* -------------------------------------------- */

  static #onPrevMonth() { this.#shiftMonth(-1); }
  static #onNextMonth() { this.#shiftMonth(1); }

  static #onGoToday() {
    const now = this.getEngine().fromSeconds(game.time.worldTime);
    this.#viewYear = now.year;
    this.#viewMonth = now.month;
    this.render();
  }

  static async #onAdvance(_event, target) {
    await TimeManager.advance(Number(target.dataset.seconds));
  }

  /**
   * ApplicationV2's data-action system only fires on left-click.
   * We attach a contextmenu listener so a right-click on the same buttons
   * rewinds instead of advancing — and disable the native browser menu there.
   */
  _onRender(context, options) {
    super._onRender?.(context, options);
    const root = this.element;
    if (!root) return;
    root.querySelectorAll('.ggc-controls button[data-seconds]').forEach((btn) => {
      btn.addEventListener('contextmenu', async (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        const seconds = Number(btn.dataset.seconds);
        if (!Number.isFinite(seconds)) return;
        await TimeManager.advance(-seconds);
      });
    });
  }

  static async #onRollWeather() {
    const now = this.getEngine().fromSeconds(game.time.worldTime);
    await Weather.roll(now);
    this.render();
  }

  /** Open the notes panel for a day; GM can also jump the date from here. */
  static async #onOpenDay(_event, target) {
    const day = Number(target.dataset.day);
    if (!day) return;
    const y = this.#viewYear, m = this.#viewMonth;
    const engine = this.getEngine();
    const notes = NotesStore.get(y, m, day);

    const list = notes.length
      ? notes.map(n => `
          <div class="ggc-note ${n.gmOnly ? "ggc-note-gm" : ""}">
            <div class="ggc-note-head">
              <strong>${foundry.utils.escapeHTML(n.title)}</strong>
              ${n.gmOnly ? `<span class="ggc-tag">${game.i18n.localize("GGCAL.Notes.GMOnly")}</span>` : ""}
              ${game.user.isGM ? `<a class="ggc-del" data-note-id="${n.id}"><i class="fa-solid fa-trash"></i></a>` : ""}
            </div>
            <div class="ggc-note-body">${foundry.utils.escapeHTML(n.text)}</div>
          </div>`).join("")
      : `<p class="ggc-empty">${game.i18n.localize("GGCAL.Notes.Empty")}</p>`;

    const addForm = game.user.isGM ? `
      <hr>
      <div class="form-group"><label>${game.i18n.localize("GGCAL.Notes.NewTitle")}</label>
        <input type="text" name="title" placeholder="${game.i18n.localize("GGCAL.Notes.TitlePh")}"></div>
      <div class="form-group"><label>${game.i18n.localize("GGCAL.Notes.NewText")}</label>
        <textarea name="text" rows="3"></textarea></div>
      <div class="form-group"><label class="checkbox">
        <input type="checkbox" name="gmOnly"> ${game.i18n.localize("GGCAL.Notes.GMOnly")}</label></div>` : "";

    const app = this;
    const monthName = engine.config.months[m].name;

    await DialogV2.wait({
      window: { title: `${day} ${monthName} — ${game.i18n.localize("GGCAL.Notes.Title")}` },
      position: { width: 420 },
      content: `<div class="gg-calendar-notes">${list}${addForm}</div>`,
      render: (_ev, dialog) => {
        const root = dialog.element ?? dialog;
        root.querySelectorAll(".ggc-del").forEach(el => el.addEventListener("click", async () => {
          await NotesStore.delete(y, m, day, el.dataset.noteId);
          app.render();
          dialog.close();
        }));
      },
      buttons: [
        ...(game.user.isGM ? [{
          action: "save",
          label: game.i18n.localize("GGCAL.Notes.Add"),
          icon: "fa-solid fa-plus",
          default: true,
          callback: async (_ev, button) => {
            const form = button.form;
            const title = form.elements.title?.value ?? "";
            const text = form.elements.text?.value ?? "";
            const gmOnly = form.elements.gmOnly?.checked ?? false;
            if (title.trim() || text.trim()) await NotesStore.add(y, m, day, { title, text, gmOnly });
            app.render();
          }
        }] : []),
        { action: "close", label: game.i18n.localize("Close") }
      ]
    });
  }

  /** GM: jump the world clock to an exact date/time. */
  static async #onSetDate() {
    if (!game.user.isGM) return;
    const engine = this.getEngine();
    const now = engine.fromSeconds(game.time.worldTime);
    const monthOptions = engine.config.months
      .map((m, i) => `<option value="${i}" ${i === now.month ? "selected" : ""}>${m.name}</option>`)
      .join("");

    const result = await DialogV2.prompt({
      window: { title: game.i18n.localize("GGCAL.SetDate.Title") },
      content: `
        <div class="form-group"><label>${game.i18n.localize("GGCAL.SetDate.Year")}</label>
          <input type="number" name="year" value="${now.year}"></div>
        <div class="form-group"><label>${game.i18n.localize("GGCAL.SetDate.Month")}</label>
          <select name="month">${monthOptions}</select></div>
        <div class="form-group"><label>${game.i18n.localize("GGCAL.SetDate.Day")}</label>
          <input type="number" name="day" value="${now.day}" min="1"></div>
        <div class="form-group"><label>${game.i18n.localize("GGCAL.SetDate.Time")}</label>
          <input type="number" name="hour" value="${now.hour}" min="0" max="23" style="width:60px">
          :
          <input type="number" name="minute" value="${now.minute}" min="0" max="59" style="width:60px"></div>`,
      ok: {
        label: game.i18n.localize("GGCAL.SetDate.Confirm"),
        callback: (_ev, button) => {
          const f = button.form.elements;
          return {
            year: Number(f.year.value),
            month: Number(f.month.value),
            day: Number(f.day.value),
            hour: Number(f.hour.value),
            minute: Number(f.minute.value)
          };
        }
      }
    });

    if (result) {
      await TimeManager.setDate(engine, result);
      GGCalendarApp.#onGoToday.call(this);
    }
  }
}
