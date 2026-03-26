const DEFAULT_TZ = "UTC";
const CACHE_TTL_MS = 60_000;
const REQUEST_TIMEOUT_MS = 8_000;
const API_TOKEN = process.env.API_TOKEN || "";
const POLL_TOKEN = process.env.POLL_TOKEN || "";
const RATE_LIMIT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000);
const RATE_LIMIT_MAX_REQUESTS = Number(process.env.RATE_LIMIT_MAX_REQUESTS || 120);
const PREFERENCES_FILE =
  process.env.PREFERENCES_FILE || "./data/preferences.json";
const ENABLE_NOTIFICATIONS = (process.env.ENABLE_NOTIFICATIONS || "true") !== "false";
const NOTIFICATION_POLL_INTERVAL_MS = Number(
  process.env.NOTIFICATION_POLL_INTERVAL_MS || 60_000
);
const REDIS_URL = process.env.REDIS_URL || "";
const OPENF1_BASE_URL = process.env.OPENF1_BASE_URL || "https://api.openf1.org/v1";
const OPENF1_ENABLED = (process.env.OPENF1_ENABLED || "true") !== "false";
const OPENF1_YEARS = (process.env.OPENF1_YEARS || "")
  .split(",")
  .map((x) => x.trim())
  .filter(Boolean)
  .map((x) => Number(x))
  .filter((x) => Number.isInteger(x));
const ICAL_ENABLED = (process.env.ICAL_ENABLED || "true") !== "false";
const MOCK_FALLBACK_ENABLED = (process.env.MOCK_FALLBACK_ENABLED || "true") !== "false";
const DEFAULT_ICAL_FEEDS = [
  {
    series: "WEC",
    url: "https://calendar.google.com/calendar/ical/61jccgg4rshh1temqk0dj4lens%40group.calendar.google.com/public/basic.ics",
  },
  {
    series: "IMSA",
    url: "https://calendar.google.com/calendar/ical/njulhksvo83qeoruc3nhend9js%40group.calendar.google.com/public/basic.ics",
  },
  {
    series: "GT3",
    url: "https://calendar.google.com/calendar/ical/drne83rrmn7m9baje25qh2248s%40group.calendar.google.com/public/basic.ics",
  },
  {
    series: "LEMANS",
    url: "https://calendar.google.com/calendar/ical/61jccgg4rshh1temqk0dj4lens%40group.calendar.google.com/public/basic.ics",
    keyword: "le mans",
  },
  {
    series: "MOTOGP",
    url: "https://calendar.google.com/calendar/ical/832vbii8pmrvma356b4vn3v42c%40group.calendar.google.com/public/basic.ics",
  },
  {
    series: "WRC",
    url: "https://calendar.google.com/calendar/ical/fei68gpe16c85ed3jjdtvrn8ns%40group.calendar.google.com/public/basic.ics",
  },
  {
    series: "FORMULAE",
    url: "https://calendar.google.com/calendar/ical/vno0ntshopq0nmob26db2pcen8%40group.calendar.google.com/public/basic.ics",
  },
  {
    series: "INDYCAR",
    url: "https://calendar.google.com/calendar/ical/hlskhf7l8ce7btind39bb9kf1o%40group.calendar.google.com/public/basic.ics",
  },
  {
    series: "NASCAR",
    url: "https://calendar.google.com/calendar/ical/db8c47ne2bt9qbld2mhdabm0u8%40group.calendar.google.com/public/basic.ics",
  },
  {
    series: "F2",
    url: "https://calendar.google.com/calendar/ical/rttoqh7u6m247f2ub6c05m4pe4%40group.calendar.google.com/public/basic.ics",
  },
  {
    series: "F3",
    url: "https://calendar.google.com/calendar/ical/sorhedtr7q5qmea6f0hvf20864%40group.calendar.google.com/public/basic.ics",
  },
];

const SESSION_PRIORITY = {
  race: 3,
  qualifying: 2,
  practice: 1,
};

const MAJOR_EVENTS = ["24 Hours of Le Mans", "Le Mans"];

module.exports = {
  DEFAULT_TZ,
  CACHE_TTL_MS,
  REQUEST_TIMEOUT_MS,
  API_TOKEN,
  POLL_TOKEN,
  RATE_LIMIT_WINDOW_MS,
  RATE_LIMIT_MAX_REQUESTS,
  PREFERENCES_FILE,
  ENABLE_NOTIFICATIONS,
  NOTIFICATION_POLL_INTERVAL_MS,
  REDIS_URL,
  OPENF1_BASE_URL,
  OPENF1_ENABLED,
  OPENF1_YEARS,
  ICAL_ENABLED,
  DEFAULT_ICAL_FEEDS,
  MOCK_FALLBACK_ENABLED,
  SESSION_PRIORITY,
  MAJOR_EVENTS,
};
