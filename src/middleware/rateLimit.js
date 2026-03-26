const {
  RATE_LIMIT_WINDOW_MS,
  RATE_LIMIT_MAX_REQUESTS,
} = require("../config");
const { incrWithWindow } = require("../services/stateStore");

async function rateLimitMiddleware(req, res, next) {
  try {
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    const route = req.path || "all";
    const windowSec = Math.max(1, Math.floor(RATE_LIMIT_WINDOW_MS / 1000));
    const key = `rl:${route}:${ip}`;
    const count = await incrWithWindow(key, windowSec);

    const remaining = Math.max(0, RATE_LIMIT_MAX_REQUESTS - count);
    res.setHeader("x-ratelimit-limit", String(RATE_LIMIT_MAX_REQUESTS));
    res.setHeader("x-ratelimit-remaining", String(remaining));

    if (count > RATE_LIMIT_MAX_REQUESTS) {
      return res.status(429).json({ error: "rate_limited" });
    }

    return next();
  } catch (_) {
    // Fail open on limiter errors.
    return next();
  }
}

module.exports = {
  rateLimitMiddleware,
};
