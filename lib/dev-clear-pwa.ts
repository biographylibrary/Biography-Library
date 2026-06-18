/** Inline script: unregister production PWA workers before React hydrates (useEffect is too late). */
export const DEV_CLEAR_PWA_SCRIPT = `(function(){try{var h=location.hostname;if(h!=='localhost'&&h!=='127.0.0.1')return;if(!('serviceWorker'in navigator))return;navigator.serviceWorker.getRegistrations().then(function(rs){return Promise.all(rs.map(function(r){return r.unregister()}))});if('caches'in window){caches.keys().then(function(ks){return Promise.all(ks.map(function(k){return caches.delete(k)}))})}}catch(e){}})();`;

export async function clearDevServiceWorkers(): Promise<void> {
  if (process.env.NODE_ENV !== 'development') return;
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(registrations.map((r) => r.unregister()));

  if ('caches' in window) {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
  }
}
