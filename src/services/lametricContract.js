const MAX_FRAMES = 3;
const MAX_TEXT_LENGTH = 16;
const DEFAULT_ICON = "i43558";

function cleanText(value) {
  const text = String(value || "")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return "NO DATA";
  return text.slice(0, MAX_TEXT_LENGTH);
}

function cleanIcon(value) {
  const icon = String(value || "");
  return /^i\d+$/.test(icon) ? icon : DEFAULT_ICON;
}

function normalizeFrames(inputFrames) {
  const frames = Array.isArray(inputFrames) ? inputFrames : [];
  if (frames.length === 0) {
    return [
      { text: "NO DATA", icon: DEFAULT_ICON },
      { text: "CHECK API", icon: DEFAULT_ICON },
    ];
  }

  return frames.slice(0, MAX_FRAMES).map((frame) => {
    const normalized = {
      text: cleanText(frame.text),
      icon: cleanIcon(frame.icon),
    };
    if (frame.iconAnimation === "blink") {
      normalized.iconAnimation = "blink";
    }
    return normalized;
  });
}

function makePollPayload(frames) {
  return { frames: normalizeFrames(frames) };
}

module.exports = {
  makePollPayload,
  normalizeFrames,
  MAX_FRAMES,
  MAX_TEXT_LENGTH,
};
