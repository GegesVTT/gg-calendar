# GG Calendar

A modern, lightweight fantasy calendar for **Foundry VTT v12 – v14**. Built natively on ApplicationV2, with no dependencies. By **Geges**.

![Foundry v12](https://img.shields.io/badge/Foundry-v12-green) ![Foundry v13](https://img.shields.io/badge/Foundry-v13-green) ![Foundry v14](https://img.shields.io/badge/Foundry-v14-green)

## Features

- **Built-in calendars**: Gregorian, Calendar of Harptos (Forgotten Realms) and Greyhawk (Common Year) — with correct leap years, festivals and intercalary days that don't shift the weekday cycle.
- **Fully custom calendars** via a simple JSON definition: months, festivals, weekdays of any length, leap rules, seasons, epoch, year prefix/suffix.
- **Date notes**: click any day to read or add notes. GM-only notes are hidden from players.
- **Dynamic weather**: daily weather generated from world climate + current season, with a coherent day-to-day temperature drift, posted to chat.
- **Time advancement**: quick controls (+1m to +1d), exact date jumping, and automatic advancement on **D&D 5e rests** (short = 1h, long = 8h). Optional per-round advancement for systems without `CONFIG.time.roundTime`.
- **Live sync**: every client updates instantly when world time changes.
- **Localized** in English and Spanish.

## Installation

In Foundry: **Add-on Modules → Install Module** and search for `GG Calendar`, or paste the manifest URL:

```
https://github.com/GegesVTT/gg-calendar/releases/latest/download/module.json
```

## API (for macros & modules)

```js
const ggc = game.modules.get("gg-calendar").api;
ggc.open();                              // open the calendar
ggc.now();                               // current date object
ggc.advance(3600);                       // advance 1 hour
ggc.setDate({ year: 1492, month: 0, day: 1, hour: 8 });
ggc.rollWeather();                       // roll today's weather
Hooks.on("ggCalendar.dayChanged", date => { /* ... */ });
```

## Custom calendar JSON

Select **Custom** in settings and edit the JSON. Example:

```json
{
  "name": "Calendar of the Twin Moons",
  "months": [
    { "name": "Firstlight", "days": 32 },
    { "name": "Moonfall Festival", "days": 1, "intercalary": true },
    { "name": "Deepfrost", "days": 32, "leapDays": 1 }
  ],
  "weekdays": ["Solday", "Luneday", "Forgeday", "Restday"],
  "leap": { "type": "simple", "interval": 5 },
  "epoch": { "year": 1000, "month": 0, "day": 1 },
  "epochWeekday": 0,
  "seasons": [{ "name": "Frostwane", "monthStart": 0, "icon": "fa-snowflake" }],
  "yearSuffix": " AT"
}
```

- `intercalary: true` → festival days outside the weekday cycle, rendered as banners.
- `leapDays` → extra days added to that month on leap years.
- `leap.type` → `"none"`, `"simple"` (every `interval` years) or `"gregorian"`.

## License

MIT — © Geges
