import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from '@tanstack/react-router';
import { registerSW } from 'virtual:pwa-register';
import { getRouter } from './router';
import './styles.css';
import './fornastya.css';

const router = getRouter();
const root = document.getElementById('root');
let updateServiceWorker: ReturnType<typeof registerSW> | null = null;
let pwaUpdateListenersAttached = false;

function syncKeyboardOffset() {
  const visualViewport = window.visualViewport;
  const tracksMobileKeyboard = window.matchMedia('(max-width: 1023px)').matches;
  const offset = visualViewport && tracksMobileKeyboard
    ? Math.max(0, window.innerHeight - visualViewport.height - visualViewport.offsetTop)
    : 0;

  document.documentElement.style.setProperty('--kb-offset', `${Math.round(offset)}px`);
}

function attachKeyboardOffsetSync() {
  const visualViewport = window.visualViewport;

  syncKeyboardOffset();
  window.addEventListener('resize', syncKeyboardOffset);

  if (!visualViewport) return;

  visualViewport.addEventListener('resize', syncKeyboardOffset);
  visualViewport.addEventListener('scroll', syncKeyboardOffset);
}

function registerPwa() {
  if (updateServiceWorker) return;

  updateServiceWorker = registerSW({
    immediate: true,
    onNeedRefresh() {
      if (!updateServiceWorker) return;
      window.dispatchEvent(
        new CustomEvent('pwa:update-ready', { detail: { updateServiceWorker } }),
      );
    },
    onRegisteredSW(_swUrl, registration) {
      if (!registration || pwaUpdateListenersAttached) return;

      pwaUpdateListenersAttached = true;

      let updateCheckInFlight = false;
      const checkForUpdate = () => {
        if (updateCheckInFlight) return;
        if (!navigator.onLine || document.visibilityState !== 'visible') return;

        updateCheckInFlight = true;
        void registration.update().finally(() => {
          updateCheckInFlight = false;
        });
      };

      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          checkForUpdate();
        }
      };

      window.addEventListener('online', checkForUpdate);
      window.addEventListener('focus', checkForUpdate);
      document.addEventListener('visibilitychange', handleVisibilityChange);

      checkForUpdate();
    },
  });
}

if (!root) {
  throw new Error('Root element not found');
}

attachKeyboardOffsetSync();

if (document.readyState === 'complete') {
  registerPwa();
} else {
  window.addEventListener('load', registerPwa, { once: true });
}

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);
