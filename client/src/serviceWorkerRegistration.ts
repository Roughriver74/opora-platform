// Service Worker registration for PWA offline support.
// The service worker file lives at /public/service-worker.js and is served
// at the root path so it has the broadest possible scope.

const SW_URL = `${process.env.PUBLIC_URL}/service-worker.js`;

export function register(): void {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register(SW_URL)
        .then((registration) => {
          console.log('[PWA] Service worker registered, scope:', registration.scope);
        })
        .catch((error) => {
          console.error('[PWA] Service worker registration failed:', error);
        });
    });
  }
}

export function unregister(): void {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then((registration) => registration.unregister())
      .catch((error) => console.error(error));
  }
}
