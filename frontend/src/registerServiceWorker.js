export function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then((reg) => {
          console.log('[SW] ServiceWorker registered successfully with scope:', reg.scope);
        })
        .catch((err) => {
          console.error('[SW] ServiceWorker registration failed:', err);
        });
    });
  }
}
