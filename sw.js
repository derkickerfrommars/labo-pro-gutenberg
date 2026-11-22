/* Labo Pro Gutenberg : fonctionnement hors ligne.
   Stratégie « réseau d'abord » pour les pages et les questions (toujours la dernière version si connecté),
   cache en secours sans connexion ; « cache d'abord » pour les polices et les icônes. */
const CACHE = 'labo-pro-v8';
const ESSENTIELS = [
  './',
  'index.html',
  'manifest.webmanifest',
  'commun/theme.css',
  'commun/bandeau.js',
  'commun/polices/atkinson-400.woff2',
  'commun/polices/atkinson-700.woff2',
  'commun/polices/fredoka.woff2',
  'commun/icones/icone.svg',
  'commun/icones/icone-192.png',
  'jeu/index.html',
  'jeu/app.js',
  'jeu/moteur.js',
  'jeu/sons.js',
  'jeu/jeu.css',
  'contenu/assp.json',
  'contenu/aepa.json',
  'laboassp/index.html',
  'laboassp/biologie.html',
  'laboassp/biologie.js',
  'laboaepa/index.html',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ESSENTIELS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(cles => Promise.all(cles.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  const statique = /\.(woff2|png|svg|webp)$/.test(new URL(req.url).pathname);
  if (statique) {
    e.respondWith(caches.match(req).then(r => r || fetch(req).then(rep => { const copie = rep.clone(); caches.open(CACHE).then(c => c.put(req, copie)); return rep; })));
    return;
  }
  e.respondWith(
    fetch(req)
      .then(rep => {
        if (rep.ok) { const copie = rep.clone(); caches.open(CACHE).then(c => c.put(req, copie)); }
        return rep;
      })
      .catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match('index.html')))
  );
});
