const { API_TOKEN } = require("../config");

const PUBLIC_PATHS = new Set(["/", "/health", "/privacy"]);

function authMiddleware(req, res, next) {
  if (PUBLIC_PATHS.has(req.path)) return next();
  if (!API_TOKEN) return next();

  const bearer = req.header("authorization") || "";
  const headerToken = bearer.toLowerCase().startsWith("bearer ")
    ? bearer.slice(7)
    : "";
  const queryToken = String(req.query.token || "");
  const provided = headerToken || queryToken;

  if (provided !== API_TOKEN) {
    return res.status(401).json({ error: "unauthorized" });
  }

  return next();
}

module.exports = {
  authMiddleware,
};
