/* Service Worker — Mi Reset Saludable (BIELA)
   Estrategia: stale-while-revalidate para el HTML — la app abre AL INSTANTE
   desde caché (clave en el gimnasio, donde la cobertura es mala) y a la vez
   descarga la versión nueva en segundo plano; si hay una, el banner
   "Nueva versión disponible" de la app avisa para actualizar.
   Sube CACHE en cada despliegue para forzar actualización. */
const CACHE = "mireset-v23";
const ASSETS = ["./", "./index.html", "./manifest.webmanifest", "./icon-180.png", "./icon-192.png", "./icon-512.png"];

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
  // HTML/navegación → caché al instante + revalidación en segundo plano
  if(req.mode==="navigate" || accept.includes("text/html")){
    e.respondWith(
      caches.match("./index.html").then(cached=>{
        const fresh = fetch(req).then(res=>{
          if(res && res.ok){
            const copy=res.clone();
            caches.open(CACHE).then(c=>c.put("./index.html", copy));
          }
          return res;
        }).catch(()=>null);
        // Si hay caché la servimos ya; si no (primera visita), esperamos a la red
        return cached || fresh.then(r=>r || caches.match("./"));
      })
    );
    return;
  }
  // Resto → caché primero, red como respaldo (y se guarda para la próxima)
  e.respondWith(
    caches.match(req).then(r=> r || fetch(req).then(res=>{
      if(res && res.ok){ const copy=res.clone(); caches.open(CACHE).then(c=>c.put(req, copy)); }
      return res;
    }))
  );
});
