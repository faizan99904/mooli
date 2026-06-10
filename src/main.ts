import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));

if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void warmMooliCaches();
    navigator.serviceWorker.register('/service-worker.js').catch((error) => {
      console.error('Mooli service worker registration failed', error);
    });
  });
}

async function warmMooliCaches(): Promise<void> {
  if (typeof window === 'undefined' || !('caches' in window)) {
    return;
  }

  const cache = await caches.open('mooli-offline-shell-v2');
  const assetUrls = new Set<string>([
    `${window.location.origin}/`,
    `${window.location.origin}/index.html`,
    `${window.location.origin}/manifest.webmanifest`,
    `${window.location.origin}/favicon.png`,
    `${window.location.origin}/assets/hisar1.png`,
  ]);

  document.querySelectorAll<HTMLScriptElement>('script[src]').forEach((script) => {
    assetUrls.add(new URL(script.src, window.location.origin).toString());
  });

  document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"], link[rel="manifest"]').forEach((link) => {
    if (link.href) {
      assetUrls.add(new URL(link.href, window.location.origin).toString());
    }
  });

  await Promise.all(
    Array.from(assetUrls).map(async (url) => {
      try {
        const response = await fetch(url, { cache: 'no-cache' });
        if (response.ok || response.type === 'opaque') {
          await cache.put(url, response.clone());
        }
      } catch {
        // Offline cache warming is best-effort; runtime caching still handles future requests.
      }
    }),
  );
}
