function log(level, message, details = {}) {
  const payload = {
    ts: new Date().toISOString(),
    level,
    message,
    ...details,
  };
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(payload));
}

module.exports = {
  log,
};
