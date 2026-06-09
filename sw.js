/* Service Worker — Mi Reset Saludable (BIELA)
   Estrategia: network-first para el HTML (siempre fresco si hay red),
   con respaldo en caché para funcionar sin internet.
   Sube CACHE en cada despliegue para forzar actualización. */
const CACHE = "mireset-v8";
const ASSETS = ["./", "./index.html", "./manifest.webmanifest"];

self.addEventListener("install", e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).catch(()=>{}));
  // No saltamos automáticamente: esperamos a que el usuario pulse "Actualizar".
});

self.addEventListener("activate", e=>{
  e.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener("message", e=>{
  if(e.data==="skipWaiting") self.skipWaiting();
});

self.addEventListener("fetch", e=>{
  const req=e.request;
  if(req.method!=="GET") return;
  const accept=req.headers.get("accept")||"";
  // HTML/navegación → red primero, caché como respaldo (offline)
  if(req.mode==="navigate" || accept.includes("text/html")){
    e.respondWith(
      fetch(req).then(res=>{
        const copy=res.clone();
        caches.open(CACHE).then(c=>c.put("./index.html", copy));
        return res;
      }).catch(()=>caches.match("./index.html").then(r=>r||caches.match("./")))
    );
    return;
  }
  // Resto → caché primero, red como respaldo
  e.respondWith(caches.match(req).then(r=>r||fetch(req)));
});
