const { API_TOKEN, POLL_TOKEN } = require("../config");

const PUBLIC_PATHS = new Set(["/", "/health", "/privacy"]);

function authMiddleware(req, res, next) {
  if (PUBLIC_PATHS.has(req.path)) return next();

  const bearer = req.header("authorization") || "";
  const headerToken = bearer.toLowerCase().startsWith("bearer ")
    ? bearer.slice(7)
    : "";
  const queryToken = String(req.query.token || "");
  const provided = headerToken || queryToken;

  if (req.path === "/lametric/poll") {
    if (POLL_TOKEN) {
      if (provided !== POLL_TOKEN) {
        return res.status(401).json({ error: "unauthorized" });
      }
      return next();
    }
    if (API_TOKEN) {
      if (provided !== API_TOKEN) {
        return res.status(401).json({ error: "unauthorized" });
      }
      return next();
    }
    return next();
  }

  if (API_TOKEN) {
    if (provided !== API_TOKEN) {
      return res.status(401).json({ error: "unauthorized" });
    }
    return next();
  }

  // If a dedicated poll token is configured, protect non-public admin routes
  // unless an API token is explicitly set.
  if (POLL_TOKEN) {
    return res.status(401).json({ error: "unauthorized" });
  }

  return next();
}

module.exports = {
  authMiddleware,
};
