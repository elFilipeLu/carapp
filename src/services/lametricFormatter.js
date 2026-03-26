const { DateTime } = require("luxon");
const { formatCountdownOrSchedule } = require("./countdown");

function toSeriesIcon(series) {
  const icons = {
    F1: "i41186",
    WEC: "i34230",
    GT3: "i34230",
    IMSA: "i34230",
    LEMANS: "i34230",
    LIVE: "i25731",
    WARN: "i43558",
  };
  return icons[series] || "i43558";
}

function toSessionIcon(sessionType) {
  const icons = {
    race: "i25731",
    qualifying: "i41186",
    practice: "i43558",
  };
  return icons[sessionType] || "i43558";
}

function resolvePrimaryIcon(event, prefs) {
  if (prefs.showSessionIcon) return toSessionIcon(event.session_type);
  if (prefs.showSeriesLogo) return toSeriesIcon(event.series);
  return toSeriesIcon(event.series);
}

function shortName(full) {
  return full
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();
}

function seriesLabel(series) {
  if (series === "LEMANS") return "LM24";
  return series;
}

function sessionLabel(sessionType) {
  const map = {
    race: "R",
    qualifying: "Q",
    practice: "P",
  };
  return map[sessionType] || "S";
}

function compactTrackLabel(circuit, eventName) {
  const event = String(eventName || "");
  const c = String(circuit || "");
  if (/le mans/i.test(event) || /sarthe/i.test(c) || /sarthe/i.test(event)) return "LE MANS";

  const eventTail = event.split("|").at(-1)?.trim() || "";
  const source = (eventTail || c || event)
    .split(",")[0]
    .replace(/GRAND PRIX|FIA WEC|IMSA WEATHERTECH CHAMPIONSHIP/gi, "")
    .trim();
  if (!source) return "RACE WKND";
  return source.toUpperCase().slice(0, 16);
}

function favoriteFrame(event, favorites) {
  const upperFavorites = favorites.map((x) => x.toUpperCase());
  if (event.winner && upperFavorites.includes(event.winner.toUpperCase())) {
    return { text: `${shortName(event.winner)} WIN`, icon: toSeriesIcon(event.series) };
  }
  if (event.pole && upperFavorites.includes(event.pole.toUpperCase())) {
    return { text: `${shortName(event.pole)} P1`, icon: toSeriesIcon(event.series) };
  }
  return null;
}

function freshnessFrame(context = {}) {
  if (!context.isStale) return null;
  const age = Math.max(1, Math.round((context.dataAgeSec || 0) / 60));
  return { text: `STALE ${age}M`, icon: toSeriesIcon("WARN") };
}

function formatFrames(event, prefs, context = {}) {
  if (!event) {
    return {
      frames: [
        { text: "NO DATA", icon: toSeriesIcon("WARN") },
        { text: "CHECK API", icon: toSeriesIcon("WARN") },
      ],
    };
  }

  const frames = [];
  const sLabel = seriesLabel(event.series);
  const sess = sessionLabel(event.session_type);
  const countOrSchedule = formatCountdownOrSchedule(event.start_time_utc, prefs.tz);
  const mode = prefs.displayMode || "balanced";
  const primaryIcon = resolvePrimaryIcon(event, prefs);

  if (event.status === "live") {
    const liveFrame = {
      text: `LIVE ${sLabel} ${sess}`,
      icon: primaryIcon,
    };
    if (prefs.liveBlink) liveFrame.iconAnimation = "blink";
    frames.push(liveFrame);
  } else if (event.status === "finished" && prefs.results && event.winner) {
    frames.push({
      text: `WIN: ${shortName(event.winner)}`,
      icon: primaryIcon,
    });
  } else if (event.status === "finished") {
    frames.push({
      text: `${sLabel} ${sess} DONE`,
      icon: primaryIcon,
    });
  } else {
    frames.push({
      text:
        mode === "ultra"
          ? `${sLabel}${sess} ${countOrSchedule}`
          : `${sLabel} ${sess} ${countOrSchedule}`,
      icon: primaryIcon,
    });
  }

  if (mode === "ultra") {
    const stale = freshnessFrame(context);
    if (stale) frames.push(stale);
  } else if (context.isStale) {
    frames.push(freshnessFrame(context));
  } else if (!/^[A-Z]{3}\s\d{2}:\d{2}$/.test(countOrSchedule)) {
    const localStart = DateTime.fromISO(event.start_time_utc, { zone: "utc" })
      .setZone(prefs.tz)
      .toFormat("ccc HH:mm")
      .toUpperCase();
    frames.push({
      text: localStart,
      icon: primaryIcon,
    });
  } else {
    frames.push({
      text: compactTrackLabel(event.circuit, event.event_name),
      icon: primaryIcon,
    });
  }

  if (mode === "detailed") {
    const confidencePct = Math.round((event.confidence || 0) * 100);
    frames.push({
      text: `C${confidencePct}%`,
      icon: primaryIcon,
    });
  }

  const favFrame = favoriteFrame(event, prefs.favorites);
  if (favFrame) {
    frames.push(favFrame);
  } else if (event.status === "finished" && prefs.results && event.pole) {
    frames.push({
      text: `POLE: ${shortName(event.pole)}`,
      icon: toSeriesIcon(event.series),
    });
  }

  return { frames: frames.slice(0, mode === "ultra" ? 2 : 3) };
}

module.exports = {
  formatFrames,
};
