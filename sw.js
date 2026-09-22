/* Service worker — فقط پوستهٔ برنامه را کش می‌کند، هیچ‌وقت پاسخ API را کش نمی‌کند. */
var CACHE = 'qr-sheet-scanner-v3.1.0';
var SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      return c.addAll(SHELL).then(function () {
        // تلاش برای کش اختیاری zxing.min.js محلی در صورت وجود
        return fetch('./zxing.min.js').then(function (r) { if (r.ok) return c.put('./zxing.min.js', r); }).catch(function () {});
      });
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (keys) { return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); })); })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;                       // POSTهای Apps Script هرگز کش نمی‌شوند
  var url = new URL(req.url);

  // کش کردن اسکریپت ZXing چه از مبدا محلی و چه از CDN برای استفاده آفلاین
  var isZxingCdn = (url.hostname === 'unpkg.com' || url.hostname === 'cdn.jsdelivr.net') && url.pathname.indexOf('zxing') !== -1;

  if (url.origin !== self.location.origin && !isZxingCdn) return; // فونت گوگل و سایر موارد مستقیم به شبکه

  e.respondWith(
    caches.match(req).then(function (hit) {
      return hit || fetch(req).then(function (res) {
        if (res.ok) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy); });
        }
        return res;
      }).catch(function () { return caches.match('./index.html'); });
    })
  );
});
