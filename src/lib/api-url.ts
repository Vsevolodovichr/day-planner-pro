const WORKER_FALLBACK_URL = 'https://api.hatosfera-crm.pp.ua';
const WORKER_HOSTNAME = 'api.hatosfera-crm.pp.ua';

export function getApiUrl(): string {
  const configured = import.meta.env.VITE_API_URL;
  const normalizedConfigured = configured?.trim().replace(/\/$/, '') || '';

  if (normalizedConfigured) {
    try {
      const configuredUrl = new URL(normalizedConfigured);
      if (configuredUrl.hostname === WORKER_HOSTNAME) return normalizedConfigured;
    } catch {
      return WORKER_FALLBACK_URL;
    }
  }

  return WORKER_FALLBACK_URL;
}
