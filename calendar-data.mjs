/**
 * GG Calendar — Built-in calendar presets.
 * Each preset is a full CalendarEngine config.
 */

export const PRESETS = {
  /* ------------------------------------------- */
  gregorian: {
    name: "Gregorian",
    months: [
      { name: "January", days: 31 },
      { name: "February", days: 28, leapDays: 1 },
      { name: "March", days: 31 },
      { name: "April", days: 30 },
      { name: "May", days: 31 },
      { name: "June", days: 30 },
      { name: "July", days: 31 },
      { name: "August", days: 31 },
      { name: "September", days: 30 },
      { name: "October", days: 31 },
      { name: "November", days: 30 },
      { name: "December", days: 31 }
    ],
    weekdays: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    leap: { type: "gregorian" },
    epoch: { year: 2026, month: 0, day: 1 },
    epochWeekday: 4, // Jan 1, 2026 is a Thursday
    seasons: [
      { name: "Winter", monthStart: 0, icon: "fa-snowflake" },
      { name: "Spring", monthStart: 2, icon: "fa-seedling" },
      { name: "Summer", monthStart: 5, icon: "fa-sun" },
      { name: "Autumn", monthStart: 8, icon: "fa-leaf" },
      { name: "Winter", monthStart: 11, icon: "fa-snowflake" }
    ],
    moons: [{ name: "Luna", cycleDays: 29.53059, offset: 18 }],
    yearPrefix: "",
    yearSuffix: ""
  },

  /* ------------------------------------------- */
  /* Forgotten Realms — Calendar of Harptos.
     12 months of 30 days + 5 festivals (intercalary).
     Shieldmeet: leap day every 4 years, follows Midsummer. */
  harptos: {
    name: "Calendar of Harptos",
    months: [
      { name: "Hammer (Deepwinter)", days: 30 },
      { name: "Midwinter", days: 1, intercalary: true },
      { name: "Alturiak (The Claw of Winter)", days: 30 },
      { name: "Ches (The Claw of the Sunsets)", days: 30 },
      { name: "Tarsakh (The Claw of the Storms)", days: 30 },
      { name: "Greengrass", days: 1, intercalary: true },
      { name: "Mirtul (The Melting)", days: 30 },
      { name: "Kythorn (The Time of Flowers)", days: 30 },
      { name: "Flamerule (Summertide)", days: 30 },
      { name: "Midsummer", days: 1, intercalary: true, leapDays: 1 }, // +Shieldmeet on leap years
      { name: "Eleasis (Highsun)", days: 30 },
      { name: "Eleint (The Fading)", days: 30 },
      { name: "Highharvestide", days: 1, intercalary: true },
      { name: "Marpenoth (Leaffall)", days: 30 },
      { name: "Uktar (The Rotting)", days: 30 },
      { name: "Feast of the Moon", days: 1, intercalary: true },
      { name: "Nightal (The Drawing Down)", days: 30 }
    ],
    weekdays: ["1st day", "2nd day", "3rd day", "4th day", "5th day", "6th day", "7th day", "8th day", "9th day", "10th day"],
    leap: { type: "simple", interval: 4 },
    epoch: { year: 1492, month: 0, day: 1 },
    epochWeekday: 0,
    seasons: [
      { name: "Winter", monthStart: 0, icon: "fa-snowflake" },
      { name: "Spring", monthStart: 3, icon: "fa-seedling" },
      { name: "Summer", monthStart: 7, icon: "fa-sun" },
      { name: "Autumn", monthStart: 11, icon: "fa-leaf" },
      { name: "Winter", monthStart: 15, icon: "fa-snowflake" }
    ],
    moons: [{ name: "Selûne", cycleDays: 30.4375, offset: 15 }],
    yearPrefix: "",
    yearSuffix: " DR"
  },

  /* ------------------------------------------- */
  /* Greyhawk — Common Year calendar.
     12 months of 28 days + 4 festival weeks of 7 days. 364 days, no leap.
     Every month and festival starts on Starday, so weekdays stay aligned. */
  greyhawk: {
    name: "Greyhawk (Common Year)",
    months: [
      { name: "Needfest", days: 7 },
      { name: "Fireseek", days: 28 },
      { name: "Readying", days: 28 },
      { name: "Coldeven", days: 28 },
      { name: "Growfest", days: 7 },
      { name: "Planting", days: 28 },
      { name: "Flocktime", days: 28 },
      { name: "Wealsun", days: 28 },
      { name: "Richfest", days: 7 },
      { name: "Reaping", days: 28 },
      { name: "Goodmonth", days: 28 },
      { name: "Harvester", days: 28 },
      { name: "Brewfest", days: 7 },
      { name: "Patchwall", days: 28 },
      { name: "Ready'reat", days: 28 },
      { name: "Sunsebb", days: 28 }
    ],
    weekdays: ["Starday", "Sunday", "Moonday", "Godsday", "Waterday", "Earthday", "Freeday"],
    leap: { type: "none" },
    epoch: { year: 591, month: 0, day: 1 },
    epochWeekday: 0,
    seasons: [
      { name: "Winter", monthStart: 0, icon: "fa-snowflake" },
      { name: "Spring", monthStart: 4, icon: "fa-seedling" },
      { name: "Summer", monthStart: 8, icon: "fa-sun" },
      { name: "Autumn", monthStart: 12, icon: "fa-leaf" }
    ],
    moons: [
      { name: "Luna", cycleDays: 28, offset: 0 },
      { name: "Celene", cycleDays: 91, offset: 0 }
    ],
    yearPrefix: "",
    yearSuffix: " CY"
  }
};

/** A starting point for users building a custom calendar in settings. */
export const CUSTOM_TEMPLATE = {
  name: "My Custom Calendar",
  months: [
    { name: "First Month", days: 30 },
    { name: "Festival of Example", days: 1, intercalary: true },
    { name: "Second Month", days: 30 }
  ],
  weekdays: ["One", "Two", "Three", "Four", "Five", "Six", "Seven"],
  leap: { type: "none" },
  epoch: { year: 1, month: 0, day: 1 },
  epochWeekday: 0,
  seasons: [{ name: "Always Spring", monthStart: 0, icon: "fa-seedling" }],
  yearPrefix: "",
  yearSuffix: ""
};
