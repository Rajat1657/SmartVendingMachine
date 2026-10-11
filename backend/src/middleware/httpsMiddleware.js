export function enforceHttps(req, res, next) {
  // Enforce HTTPS in production environments behind reverse proxies (Nginx, Heroku, AWS ELB, Cloudflare)
  if (process.env.NODE_ENV === 'production') {
    const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
    if (!isHttps) {
      const httpsUrl = `https://${req.headers.host}${req.url}`;
      return res.redirect(301, httpsUrl);
    }
  }
  next();
}
