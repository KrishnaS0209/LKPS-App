/**
 * Resolve API origin for fetch calls.
 * CRA inlines REACT_APP_* at build time — if Vercel has localhost by mistake,
 * production still talks to Render by ignoring localhost when not on dev host.
 */
const PROD_API_ROOT = 'https://lkps-app.onrender.com';

function isDevBrowserHost() {
  if (typeof window === 'undefined') return false;
  const h = window.location.hostname;
  return h === 'localhost' || h === '127.0.0.1';
}

function looksLikeLocalhost(url) {
  return /localhost|127\.0\.0\.1/.test(url || '');
}

/** Raw server origin without trailing slash, no /api suffix (e.g. https://x.onrender.com) */
export function getApiRoot() {
  const envUrl = (process.env.REACT_APP_API_URL || process.env.REACT_APP_API || '').trim();
  const dev = isDevBrowserHost();

  if (envUrl && looksLikeLocalhost(envUrl) && !dev) {
    return PROD_API_ROOT.replace(/\/+$/, '');
  }
  if (envUrl) {
    let u = envUrl.replace(/\/+$/, '');
    if (u.endsWith('/api')) u = u.slice(0, -4);
    return u;
  }
  return dev ? 'http://localhost:5001' : PROD_API_ROOT.replace(/\/+$/, '');
}

/** Base URL for API paths like /notices/public — always ends with /api */
export function getApiBase() {
  const root = getApiRoot();
  return `${root}/api`;
}
