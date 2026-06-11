/**
 * GG Calendar — Entry point.
 * A modern, lightweight fantasy calendar by Geges.
 */

import { MODULE_ID, SETTINGS } from "./constants.mjs";
import { CalendarEngine } from "./engine.mjs";
import { PRESETS, CUSTOM_TEMPLATE } from "./presets.mjs";
import { NotesStore } from "./notes.mjs";
import { Weather } from "./weather.mjs";
import { TimeManager } from "./time.mjs";
import { GGCalendarApp } from "./app.mjs";

let engine = null;
let app = null;

/** Rebuild the engine from current settings. */
function buildEngine() {
  const preset = game.settings.get(MODULE_ID, SETTINGS.PRESET);
  let config;
  if (preset === "custom") {
    try {
      config = JSON.parse(game.settings.get(MODULE_ID, SETTINGS.CUSTOM_CONFIG));
    } catch (err) {
      console.error(`${MODULE_ID} | Invalid custom calendar JSON, falling back to Gregorian.`, err);
      ui.notifications?.error(game.i18n.localize("GGCAL.Errors.BadCustomJSON"));
      config = PRESETS.gregorian;
    }
  } else {
    config = PRESETS[preset] ?? PRESETS.gregorian;
  }
  engine = new CalendarEngine(config);
  return engine;
}

const getEngine = () => engine ?? buildEngine();

/* -------------------------------------------- */
/*  Init                                         */
/* -------------------------------------------- */

Hooks.once("init", () => {
  game.settings.register(MODULE_ID, SETTINGS.PRESET, {
    name: "GGCAL.Settings.Preset.Name",
    hint: "GGCAL.Settings.Preset.Hint",
    scope: "world",
    config: true,
    type: String,
    default: "gregorian",
    choices: {
      gregorian: "GGCAL.Preset.gregorian",
      harptos: "GGCAL.Preset.harptos",
      greyhawk: "GGCAL.Preset.greyhawk",
      custom: "GGCAL.Preset.custom"
    },
    onChange: () => { buildEngine(); app?.render(); }
  });

  game.settings.register(MODULE_ID, SETTINGS.CUSTOM_CONFIG, {
    name: "GGCAL.Settings.CustomConfig.Name",
    hint: "GGCAL.Settings.CustomConfig.Hint",
    scope: "world",
    config: true,
    type: String,
    default: JSON.stringify(CUSTOM_TEMPLATE, null, 2),
    onChange: () => { buildEngine(); app?.render(); }
  });

  NotesStore.register();
  Weather.register();
  TimeManager.register();
});

/* -------------------------------------------- */
/*  Ready                                        */
/* -------------------------------------------- */

Hooks.once("ready", () => {
  buildEngine();
  app = new GGCalendarApp(getEngine);
  TimeManager.activateHooks(getEngine);

  // Live refresh whenever world time moves.
  Hooks.on("updateWorldTime", () => app?.rendered && app.render());

  // Public API for macros and other modules.
  const mod = game.modules.get(MODULE_ID);
  mod.api = {
    open: () => app.render({ force: true }),
    now: () => getEngine().fromSeconds(game.time.worldTime),
    engine: getEngine,
    advance: (seconds) => TimeManager.advance(seconds),
    setDate: (parts) => TimeManager.setDate(getEngine(), parts),
    rollWeather: () => Weather.roll(getEngine().fromSeconds(game.time.worldTime)),
    notes: NotesStore
  };

  console.log(`${MODULE_ID} | GG Calendar ready — ${getEngine().config.name}`);
});

/* -------------------------------------------- */
/*  Scene controls button (v12 array / v13+ record) */
/* -------------------------------------------- */

Hooks.on("getSceneControlButtons", (controls) => {
  const open = () => game.modules.get(MODULE_ID)?.api?.open();
  const tool = {
    name: "gg-calendar",
    title: "GGCAL.OpenCalendar",
    icon: "fa-solid fa-calendar-days",
    button: true,
    order: 100,
    onClick: open,   // v12
    onChange: open   // v13+
  };

  if (Array.isArray(controls)) {
    // Foundry v12: controls is an array of control groups.
    const group = controls.find(c => c.name === "notes") ?? controls[0];
    group?.tools?.push(tool);
  } else {
    // Foundry v13/v14: controls is a record keyed by group name.
    const group = controls.notes ?? controls.tokens ?? Object.values(controls)[0];
    if (group?.tools) group.tools[tool.name] = tool;
  }
});
