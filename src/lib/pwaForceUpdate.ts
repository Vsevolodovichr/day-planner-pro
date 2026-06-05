import { authFetch, API_URL } from '@/integrations/cloudflare/client';

const PWA_FORCE_UPDATE_INTERVAL_MS = 60 * 60_000;
const PWA_FORCE_UPDATE_LAST_HANDLED_KEY = 'day-planner:pwa-force-update-last-handled';
const PWA_FORCE_UPDATE_LAST_CHECKED_KEY = 'day-planner:pwa-force-update-last-checked';
const CACHE_PREFIXES_TO_CLEAR = ['day-planner-', 'workbox-precache-'];

type PwaForceUpdateMarker = {
  id: string | null;
  target_agency_id: string | null;
  created_at: string | null;
};

export type PwaForceAgency = {
  id: string;
  name: string;
};

export type PwaForceUpdateRow = {
  id: string;
  target_agency_id: string | null;
  requested_by: string;
  created_at: string;
};

export type PwaForceAdminResponse = {
  agencies: PwaForceAgency[];
  recent: PwaForceUpdateRow[];
};

let pwaForceUpdateCheckInFlight = false;
let stopPwaForceUpdatePolling: (() => void) | null = null;

function getStoredValue(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function setStoredValue(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    undefined;
  }
}

function shouldSkipPwaForceUpdateCheck(): boolean {
  const lastChecked = Number(getStoredValue(PWA_FORCE_UPDATE_LAST_CHECKED_KEY) ?? 0);
  return Number.isFinite(lastChecked) && Date.now() - lastChecked < PWA_FORCE_UPDATE_INTERVAL_MS;
}

async function clearPwaCaches(): Promise<void> {
  if (typeof window === 'undefined' || !('caches' in window)) return;

  const cacheNames = await caches.keys();
  await Promise.all(
    cacheNames
      .filter((cacheName) => CACHE_PREFIXES_TO_CLEAR.some((prefix) => cacheName.startsWith(prefix)))
      .map((cacheName) => caches.delete(cacheName)),
  );
}

function reloadWithCacheBust(): void {
  const url = new URL(window.location.href);
  url.searchParams.set('_pwa_force_update', String(Date.now()));
  window.location.replace(url.toString());
}

async function forcePwaRefresh(): Promise<void> {
  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.getRegistration().catch(() => undefined);
    await registration?.update().catch(() => undefined);
    registration?.waiting?.postMessage({ type: 'SKIP_WAITING' });
  }

  await clearPwaCaches().catch(() => undefined);
  reloadWithCacheBust();
}

async function getCurrentPwaForceUpdateMarker(): Promise<PwaForceUpdateMarker | null> {
  const response = await authFetch(`${API_URL}/api/pwa-force-updates/current`, {
    cache: 'no-store',
  });

  if (!response.ok) return null;
  return (await response.json().catch(() => null)) as PwaForceUpdateMarker | null;
}

async function getResponseError(response: Response): Promise<Error> {
  const payload = await response
    .clone()
    .json()
    .catch(() => null);
  const message =
    payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string'
      ? payload.error
      : response.statusText;

  return new Error(`HTTP ${response.status}: ${message}`);
}

async function checkPwaForceUpdateMarker(): Promise<void> {
  if (typeof window === 'undefined') return;
  if (!navigator.onLine || document.visibilityState !== 'visible') return;
  if (pwaForceUpdateCheckInFlight || shouldSkipPwaForceUpdateCheck()) return;

  pwaForceUpdateCheckInFlight = true;
  setStoredValue(PWA_FORCE_UPDATE_LAST_CHECKED_KEY, String(Date.now()));

  try {
    const marker = await getCurrentPwaForceUpdateMarker();
    if (!marker?.id) return;

    const lastHandledMarkerId = getStoredValue(PWA_FORCE_UPDATE_LAST_HANDLED_KEY);
    if (!lastHandledMarkerId) {
      setStoredValue(PWA_FORCE_UPDATE_LAST_HANDLED_KEY, marker.id);
      return;
    }
    if (lastHandledMarkerId === marker.id) return;

    setStoredValue(PWA_FORCE_UPDATE_LAST_HANDLED_KEY, marker.id);
    await forcePwaRefresh();
  } finally {
    pwaForceUpdateCheckInFlight = false;
  }
}

export function startPwaForceUpdatePolling(): () => void {
  if (typeof window === 'undefined') return () => {};
  if (stopPwaForceUpdatePolling) return stopPwaForceUpdatePolling;

  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      void checkPwaForceUpdateMarker();
    }
  };
  const check = () => void checkPwaForceUpdateMarker();
  const intervalId = window.setInterval(check, PWA_FORCE_UPDATE_INTERVAL_MS);

  window.addEventListener('online', check);
  window.addEventListener('focus', check);
  document.addEventListener('visibilitychange', handleVisibilityChange);
  check();

  stopPwaForceUpdatePolling = () => {
    window.clearInterval(intervalId);
    window.removeEventListener('online', check);
    window.removeEventListener('focus', check);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    stopPwaForceUpdatePolling = null;
  };

  return stopPwaForceUpdatePolling;
}

export async function getPwaForceUpdateAdmin(): Promise<PwaForceAdminResponse> {
  const response = await authFetch(`${API_URL}/api/pwa-force-updates/admin`, {
    cache: 'no-store',
  });

  if (!response.ok) throw await getResponseError(response);
  return (await response.json()) as PwaForceAdminResponse;
}

export async function createPwaForceUpdate(
  targetAgencyId: string | null,
): Promise<PwaForceUpdateRow> {
  const response = await authFetch(`${API_URL}/api/pwa-force-updates`, {
    method: 'POST',
    cache: 'no-store',
    body: JSON.stringify({ target_agency_id: targetAgencyId }),
  });

  if (!response.ok) throw await getResponseError(response);
  return (await response.json()) as PwaForceUpdateRow;
}
