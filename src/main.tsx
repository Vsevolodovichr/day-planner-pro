import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from '@tanstack/react-router';
import { registerSW } from 'virtual:pwa-register';
import { getRouter } from './router';
import './styles.css';
import './fornastya.css';

const PWA_UPDATE_CHECK_INTERVAL_MS = 60_000;

const router = getRouter();
const root = document.getElementById('root');

if (!root) {
  throw new Error('Root element not found');
}

const updateServiceWorker = registerSW({
  immediate: true,
  onNeedRefresh() {
    window.dispatchEvent(
      new CustomEvent('pwa:update-ready', { detail: { updateServiceWorker } }),
    );
  },
  onRegisteredSW(_swUrl, registration) {
    if (!registration) return;

    window.setInterval(() => {
      if (!navigator.onLine) return;
      void registration.update();
    }, PWA_UPDATE_CHECK_INTERVAL_MS);
  },
});

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);
