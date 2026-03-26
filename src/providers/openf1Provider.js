const { DateTime } = require("luxon");
const { OPENF1_BASE_URL, OPENF1_ENABLED, OPENF1_YEARS } = require("../config");
const { fetchJson } = require("../services/http");

function mapSessionType(sessionType, sessionName) {
  const type = String(sessionType || "").toLowerCase();
  const name = String(sessionName || "").toLowerCase();

  if (type.includes("race")) return "race";
  if (type.includes("qualifying")) return "qualifying";
  if (type.includes("practice")) return "practice";

  if (name.includes("sprint qualifying")) return "qualifying";
  if (name.includes("qualifying")) return "qualifying";
  if (name.includes("practice")) return "practice";
  if (name.includes("race") || name.includes("sprint")) return "race";

  return "practice";
}

function eventFromOpenF1Session(session, meetingNameByKey) {
  const meetingName =
    meetingNameByKey.get(session.meeting_key) ||
    `${session.country_name || ""} GP`.trim() ||
    `Meeting ${session.meeting_key}`;

  return {
    series: "F1",
    event_id: `f1_${session.year}_${session.meeting_key}`,
    event_name: meetingName,
    session_type: mapSessionType(session.session_type, session.session_name),
    start_time_utc: DateTime.fromISO(session.date_start).toUTC().toISO(),
    end_time_utc: DateTime.fromISO(session.date_end).toUTC().toISO(),
    circuit: session.circuit_short_name || session.location || null,
    country: session.country_name || null,
    pole: null,
    winner: null,
    is_major_event: false,
    source: "openf1",
    upstream_session_key: session.session_key,
  };
}

function latestLeader(positions) {
  if (!Array.isArray(positions) || positions.length === 0) return null;
  return [...positions].sort((a, b) => a.date.localeCompare(b.date)).at(-1);
}

async function resolveLeaderAcronym(sessionKey) {
  const [positions, drivers] = await Promise.all([
    fetchJson(`${OPENF1_BASE_URL}/position?session_key=${sessionKey}&position=1`),
    fetchJson(`${OPENF1_BASE_URL}/drivers?session_key=${sessionKey}`),
  ]);
  const leader = latestLeader(positions);
  if (!leader) return null;

  const byNumber = new Map(drivers.map((d) => [d.driver_number, d]));
  const leaderDriver = byNumber.get(leader.driver_number);
  return leaderDriver?.name_acronym || null;
}

async function enrichRecentResults(events) {
  const nowUtc = DateTime.utc();
  const candidates = events.filter((event) => {
    if (!event.upstream_session_key) return false;
    if (event.session_type !== "race" && event.session_type !== "qualifying") return false;
    const end = DateTime.fromISO(event.end_time_utc, { zone: "utc" });
    return end <= nowUtc && nowUtc.diff(end, "days").days <= 7;
  });

  await Promise.all(
    candidates.map(async (event) => {
      try {
        const leader = await resolveLeaderAcronym(event.upstream_session_key);
        if (!leader) return;
        if (event.session_type === "race") event.winner = leader;
        if (event.session_type === "qualifying") event.pole = leader;
      } catch (_) {
        // Non-blocking enrichment.
      }
    })
  );
}

async function fetchOpenF1Events() {
  if (!OPENF1_ENABLED) return [];

  const currentYear = DateTime.utc().year;
  const years = OPENF1_YEARS.length > 0 ? OPENF1_YEARS : [currentYear, currentYear - 1];

  const [sessionBuckets, meetingBuckets] = await Promise.all([
    Promise.all(
      years.map((year) =>
        fetchJson(`${OPENF1_BASE_URL}/sessions?year=${year}`).catch(() => [])
      )
    ),
    Promise.all(
      years.map((year) =>
        fetchJson(`${OPENF1_BASE_URL}/meetings?year=${year}`).catch(() => [])
      )
    ),
  ]);
  const sessions = sessionBuckets.flat();
  const meetings = meetingBuckets.flat();

  const meetingNameByKey = new Map(
    meetings.map((meeting) => [meeting.meeting_key, meeting.meeting_name])
  );

  const mapped = sessions
    .filter((session) => session.date_start && session.date_end)
    .map((session) => eventFromOpenF1Session(session, meetingNameByKey));

  await enrichRecentResults(mapped);
  return mapped;
}

module.exports = {
  fetchOpenF1Events,
};
