const { DateTime } = require("luxon");

function buildUtc(plus) {
  return DateTime.utc().plus(plus).toISO();
}

async function fetchRawEvents() {
  return [
    {
      series: "F1",
      event_id: "f1_2026_aus",
      event_name: "Australian GP",
      session_type: "qualifying",
      start_time_utc: buildUtc({ hours: 1, minutes: 15 }),
      end_time_utc: buildUtc({ hours: 2, minutes: 15 }),
      circuit: "Albert Park",
      country: "Australia",
      pole: null,
      winner: null,
      is_major_event: false,
      source: "mock-f1",
    },
    {
      series: "F1",
      event_id: "f1_2026_aus",
      event_name: "Australian GP",
      session_type: "race",
      start_time_utc: buildUtc({ hours: 23 }),
      end_time_utc: buildUtc({ hours: 25 }),
      circuit: "Albert Park",
      country: "Australia",
      pole: null,
      winner: null,
      is_major_event: false,
      source: "mock-f1",
    },
    {
      series: "WEC",
      event_id: "wec_2026_spa",
      event_name: "6 Hours of Spa",
      session_type: "race",
      start_time_utc: buildUtc({ hours: 3 }),
      end_time_utc: buildUtc({ hours: 9 }),
      circuit: "Spa-Francorchamps",
      country: "Belgium",
      pole: null,
      winner: null,
      is_major_event: false,
      source: "mock-wec",
    },
    {
      series: "LEMANS",
      event_id: "lemans_2026",
      event_name: "24 Hours of Le Mans",
      session_type: "race",
      start_time_utc: buildUtc({ days: 80 }),
      end_time_utc: buildUtc({ days: 81 }),
      circuit: "Circuit de la Sarthe",
      country: "France",
      pole: null,
      winner: null,
      is_major_event: true,
      source: "mock-endurance",
    },
  ];
}

module.exports = {
  fetchRawEvents,
};
