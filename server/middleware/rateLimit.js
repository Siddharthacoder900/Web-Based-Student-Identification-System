const requests = new Map();
let lastCleanup = Date.now();

export const rateLimit = ({ windowMs, max, message }) => (req, res, next) => {
  const now = Date.now();

  if (now - lastCleanup > windowMs) {
    for (const [key, entry] of requests) {
      if (entry.resetAt <= now) requests.delete(key);
    }
    lastCleanup = now;
  }

  const key = `${req.baseUrl}${req.path}:${req.ip}`;
  const current = requests.get(key);
  const entry = !current || current.resetAt <= now
    ? { count: 0, resetAt: now + windowMs }
    : current;

  entry.count += 1;
  requests.set(key, entry);
  res.set('RateLimit-Limit', String(max));
  res.set('RateLimit-Remaining', String(Math.max(0, max - entry.count)));

  if (entry.count > max) {
    res.set('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)));
    return res.status(429).json({ message });
  }

  return next();
};
