const CACHE_NAME="ting-offline-20260901-1";
const CORE_ASSETS=[
  "./",
  "./index.html",
  "./style.css?v=4",
  "./state.js?v=4",
  "./app.js?v=4",
  "./data/questions-2026.json?v=20260901",
  "./manifest.webmanifest",
  "./icons/app-icon.svg"
];

self.addEventListener("install",event=>{
  event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(CORE_ASSETS)).then(()=>self.skipWaiting()));
});

self.addEventListener("activate",event=>{
  event.waitUntil(
    caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith("ting-offline-")&&key!==CACHE_NAME).map(key=>caches.delete(key)))).then(()=>self.clients.claim())
  );
});

async function cachedWithRefresh(request){
  const cache=await caches.open(CACHE_NAME);
  const cached=await cache.match(request);
  const refresh=fetch(request).then(response=>{
    if(response.ok||response.type==="opaque")cache.put(request,response.clone());
    return response;
  });
  if(cached){
    refresh.catch(()=>{});
    return cached;
  }
  return refresh;
}

self.addEventListener("fetch",event=>{
  if(event.request.method!=="GET")return;
  const url=new URL(event.request.url);
  if(url.protocol!=="http:"&&url.protocol!=="https:")return;
  event.respondWith(
    cachedWithRefresh(event.request).catch(async()=>{
      if(event.request.mode==="navigate")return caches.match("./index.html");
      return Response.error();
    })
  );
});
