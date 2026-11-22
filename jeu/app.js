/* Labo Pro Gutenberg : « La Ville des Pros », interface du mode jeu.
   Toutes les règles sont dans moteur.js ; ce fichier affiche, anime et enregistre. */
import * as M from './moteur.js';
import { sons, vibrer } from './sons.js';

const FILIERES = {
  assp: { nom: 'Bac Pro ASSP', ville: 'Quartier des Petits Pas', couleur: '#0b7a75', labo: '../laboassp/' },
  aepa: { nom: 'Bac Pro AEPA', ville: 'Quartier Animé', couleur: '#c2410c', labo: '../laboaepa/' },
};
const AVATARS = ['🦊', '🐼', '🐯', '🦁', '🐸', '🐙', '🦄', '🐝', '🦉', '🐬', '🐢', '🦋', '🐨', '🐧', '🦖', '🐳', '🌻', '🌈', '⚡', '🎧', '🎨', '⚽', '🚀', '💎'];
const ICONES_BACS = [[/physique/i, '🦺'], [/affective/i, '💗'], [/morale/i, '🤝'], [/^fait/i, '👁️'], [/hypoth/i, '🤔'], [/jugement/i, '⚖️']];

const params = new URLSearchParams(location.search);
const filiere = FILIERES[params.get('f')] ? params.get('f') : null;
const $app = document.getElementById('app');
// Réglages de l'appareil (confort de lecture, voix, animations, mode arcade) : aucune donnée de santé, juste des préférences
const CLE_REGLAGES = 'lp-jeu-reglages';
const reglages = (() => { try { return { texte: 'standard', voix: false, animations: true, arcade: false, ...JSON.parse(localStorage.getItem(CLE_REGLAGES) || '{}') }; } catch (e) { return { texte: 'standard', voix: false, animations: true, arcade: false }; } })();
function appliquerReglages() {
  const html = document.documentElement;
  html.dataset.texte = reglages.texte;
  html.toggleAttribute('data-calme', !reglages.animations);
  try { localStorage.setItem(CLE_REGLAGES, JSON.stringify(reglages)); } catch (e) {}
}
appliquerReglages();
const mouvementReduit = () => !reglages.animations || matchMedia('(prefers-reduced-motion: reduce)').matches;

// Lecture à voix haute (synthèse vocale du navigateur, si une voix française est disponible)
const voixDispo = () => 'speechSynthesis' in window && typeof SpeechSynthesisUtterance === 'function';
const PRONONCER = [[/O₂/g, 'oxygène'], [/CO₂/g, 'dioxyde de carbone'], [/SpO₂/g, 'saturation en oxygène'], [/VIH/g, 'V I H'], [/\bIAS\b/g, 'I A S'], [/g\/L/g, 'grammes par litre'], [/n° ?/g, 'numéro '], [/≠/g, 'différent de'], [/→/g, ', puis '], [/\p{Extended_Pictographic}/gu, '']];
function lire(texte) {
  if (!voixDispo()) return toast('Lecture vocale indisponible sur cet appareil');
  speechSynthesis.cancel();
  let t = String(texte);
  for (const [re, v] of PRONONCER) t = t.replace(re, v);
  const u = new SpeechSynthesisUtterance(t);
  u.lang = 'fr-FR';
  u.rate = 0.95;
  const fr = speechSynthesis.getVoices().find(v => /^fr/i.test(v.lang));
  if (fr) u.voice = fr;
  speechSynthesis.speak(u);
}
function texteALire(q) {
  const it = q.item;
  const opts = (it.type === 'qcm' && !it.pave) || it.type === 'multi' ? q.presentation.ordre.filter(i => !q.masquees?.includes(i)).map((i, k) => `Réponse ${k + 1} : ${it.options[i]}.`) : [];
  return [personnage(it, null).texte, it.enonce, ...opts].filter(Boolean).join(' ');
}
const attendre = ms => new Promise(r => setTimeout(r, mouvementReduit() ? 0 : ms));

// ------------------------------------------------------------------ outils d'affichage

const echapper = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const h = (strings, ...vals) => strings.reduce((acc, s, i) => acc + s + (i < vals.length ? (vals[i]?.__brut ? vals[i].v : Array.isArray(vals[i]) ? vals[i].join('') : echapper(vals[i])) : ''), '');
const brut = v => ({ __brut: true, v });
const pct = x => Math.round(x * 100);

function afficher(html, { focus = true } = {}) {
  $app.innerHTML = html;
  window.scrollTo(0, 0);
  if (focus) ($app.querySelector('[data-focus]') || $app.querySelector('h1') || $app).focus({ preventScroll: true });
}
function annoncer(t) { const a = document.getElementById('annonces'); a.textContent = ''; setTimeout(() => (a.textContent = t), 50); }
function toast(texte) {
  document.querySelector('.toast')?.remove();
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = texte;
  t.setAttribute('role', 'status');
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2600);
}
function particules(el, emojis = ['✨', '⭐', '💫'], nombre = 12) {
  if (mouvementReduit() || !el) return;
  const r = el.getBoundingClientRect();
  for (let i = 0; i < nombre; i++) {
    const p = document.createElement('span');
    p.className = 'particule';
    p.setAttribute('aria-hidden', 'true');
    p.textContent = emojis[i % emojis.length];
    p.style.left = r.left + r.width / 2 + 'px';
    p.style.top = r.top + r.height / 2 + 'px';
    const angle = Math.random() * Math.PI * 2, dist = 60 + Math.random() * 90;
    p.style.setProperty('--dx', Math.cos(angle) * dist + 'px');
    p.style.setProperty('--dy', Math.sin(angle) * dist - 40 + 'px');
    document.body.appendChild(p);
    setTimeout(() => p.remove(), 1000);
  }
}
function flotter(el, texte, classe = '') {
  if (!el || mouvementReduit()) return;
  const r = el.getBoundingClientRect();
  const f = document.createElement('div');
  f.className = 'flottant ' + classe;
  f.setAttribute('aria-hidden', 'true');
  f.textContent = texte;
  f.style.left = r.left + r.width / 2 + 'px';
  f.style.top = r.top + 'px';
  document.body.appendChild(f);
  setTimeout(() => f.remove(), 1300);
}
function secouer(el) {
  if (mouvementReduit() || !el) return;
  el.classList.remove('secousse'); void el.offsetWidth; el.classList.add('secousse');
}
function confettis() {
  if (mouvementReduit()) return;
  const couleurs = ['#f59e0b', '#10b981', '#6366f1', '#ef4444', '#06b6d4', '#ec4899'];
  for (let i = 0; i < 60; i++) {
    const c = document.createElement('span');
    c.className = 'confetti';
    c.setAttribute('aria-hidden', 'true');
    c.style.left = Math.random() * 100 + 'vw';
    c.style.background = couleurs[i % couleurs.length];
    c.style.animationDelay = Math.random() * 0.6 + 's';
    c.style.animationDuration = 1.8 + Math.random() + 's';
    document.body.appendChild(c);
    setTimeout(() => c.remove(), 3200);
  }
}

// ------------------------------------------------------------------ stockage

const CLE = 'lp-jeu';
let stock = (() => { try { const s = JSON.parse(localStorage.getItem(CLE)); if (s && s.profils) return s; } catch (e) {} return { profils: {}, actif: {} }; })();
let stockageOk = (() => { try { localStorage.setItem('lp-test', '1'); localStorage.removeItem('lp-test'); return true; } catch (e) { return false; } })();
function sauver() { try { localStorage.setItem(CLE, JSON.stringify(stock)); } catch (e) { stockageOk = false; } }
const profilsFiliere = () => Object.values(stock.profils).filter(p => p.filiere === filiere).sort((a, b) => b.xp - a.xp);
function profilActif() {
  const id = stock.actif[filiere];
  if (!id || !stock.profils[id]) return null;
  if (valides.has(stock.profils[id])) return stock.profils[id];
  try { const p = (stock.profils[id] = M.valider(stock.profils[id])); valides.add(p); return p; } catch (e) { return null; }
}
const valides = new WeakSet();

// ------------------------------------------------------------------ personnages

const EMOJI_DEBUT = /^(\p{Extended_Pictographic}(?:\p{Emoji_Modifier}|️|‍\p{Extended_Pictographic})*)\s*/u;
function personnage(item, lieu) {
  let texte = item.contexte || '';
  let visage = null;
  const e = texte.match(EMOJI_DEBUT);
  if (e) { visage = e[1]; texte = texte.slice(e[0].length); }
  const nom = texte.match(/((?:Mme|M\.)\s?[A-ZÉ][\p{L}-]*\.?|[A-ZÉ][\p{Ll}-]{2,}),\s*(\d+)\s*(ans|mois)/u);
  if (!visage) {
    const age = texte.match(/(\d+)\s*(ans|mois)/);
    const n = age ? Number(age[1]) : null;
    if (age && age[2] === 'mois') visage = '👶';
    else if (/\bMme\b/.test(texte) && (!n || n >= 55)) visage = '👵';
    else if (/\bM\.\s/.test(texte) && (!n || n >= 55)) visage = '👴';
    else if (n != null) visage = n < 3 ? '👶' : n < 11 ? '🧒' : n < 60 ? '🧑' : '🧓';
    else visage = lieu?.icone === '📚' ? '🧑‍🏫' : '🧑‍💼';
  }
  return { visage, nom: nom ? `${nom[1]} · ${nom[2]} ${nom[3]}` : null, texte };
}

// ------------------------------------------------------------------ démarrage et navigation

let banque = null;
async function demarrer() {
  if (!filiere) return ecranChoixFiliere();
  document.querySelector('meta[name="theme-color"]').setAttribute('content', FILIERES[filiere].couleur);
  try {
    const rep = await fetch(`../contenu/${filiere}.json`);
    if (!rep.ok) throw new Error(rep.status);
    banque = await rep.json();
  } catch (e) {
    return afficher(h`<main class="ecran-centre"><div class="panneau"><p class="gros-emoji">📡</p><h1>Pas de connexion</h1><button class="btn btn-principal" onclick="location.reload()">Réessayer</button></div></main>`);
  }
  window.addEventListener('hashchange', router);
  let attente;
  window.addEventListener('resize', () => { clearTimeout(attente); attente = setTimeout(() => { if ((location.hash.slice(1) || '/') === '/' && !partie) router(); }, 200); });
  router();
}
function aller(route) { if (location.hash === '#' + route) router(); else location.hash = route; }
function router() {
  const route = location.hash.slice(1) || '/';
  const profil = profilActif();
  fermerMenu();
  if (!profil && !['/profils', '/nouveau', '/sauvegarde'].includes(route)) return ecranProfils();
  if (partie && route !== '/partie') partie = null;
  if (casPartie && route !== '/cas-jeu') casPartie = null;
  switch (route) {
    case '/profils': return ecranProfils();
    case '/nouveau': return ecranNouveauProfil();
    case '/partie': return partie ? ecranQuestion() : aller(routeQuartier());
    case '/quetes': return ecranQuetes(profil);
    case '/cas': return banque.cas?.length ? ecranListeCas(profil) : aller(routeQuartier());
    case '/cas-jeu': return ecranCas();
    case '/album': return ecranAlbum(profil);
    case '/trophees': return ecranTrophees(profil);
    case '/sauvegarde': return ecranSauvegarde(profil);
    case '/aide': return ecranAide();
    case '/sante': return ecranVille(profil, 'sante');
    default: return ecranVille(profil);
  }
}

// ------------------------------------------------------------------ HUD, barre du bas, menu

function hud(profil) {
  const n = M.niveauDe(profil.xp);
  return h`<header class="hud">
    <button class="hud-joueur" type="button" data-menu aria-label="Menu : ${profil.pseudo}, ${n.nom}">
      <span class="anneau" style="--p:${pct(n.progression)}"><span class="avatar">${profil.avatar}</span></span>
      <span class="hud-niveau">${n.rang + 1}</span>
    </button>
    <div class="hud-pilule" title="Points d’expérience"><span aria-hidden="true">⭐</span> ${profil.xp}</div>
    ${brut((() => { const n = M.joursActifs(profil); const ok = n >= M.OBJECTIF_SEMAINE; return h`<div class="hud-pilule ${ok ? 'objectif-ok' : ''}" title="Jours joués cette semaine (objectif : ${M.OBJECTIF_SEMAINE})" aria-label="${n} jour${n > 1 ? 's' : ''} joué${n > 1 ? 's' : ''} sur les 7 derniers, objectif ${M.OBJECTIF_SEMAINE}"><span aria-hidden="true">${ok ? '✅' : '📅'}</span> ${Math.min(n, M.OBJECTIF_SEMAINE)}/${M.OBJECTIF_SEMAINE}</div>`; })())}
    <span class="hud-espace"></span>
    <button class="hud-bouton" type="button" data-son aria-pressed="${sons.actif}" aria-label="Son">${sons.actif ? '🔊' : '🔇'}</button>
    <button class="hud-bouton" type="button" data-menu aria-label="Menu">☰</button>
  </header>`;
}
function dock(actif) {
  if (actif === '/') actif = routeQuartier();
  const p = profilActif();
  const fiches = p ? M.collection(p, banque).filter(f => f.rarete).length : 0;
  const lien = (route, icone, label, extra = '') => h`<a href="#${route}" class="${actif === route ? 'actif' : ''}" ${actif === route ? brut('aria-current="page"') : ''}><span class="dock-icone" aria-hidden="true">${icone}</span><span>${label}</span>${brut(extra)}</a>`;
  return h`<nav class="dock" aria-label="Navigation du jeu">
    ${brut(lien(routeQuartier(), '🗺️', 'Carte'))}
    ${brut(lien('/album', '🃏', 'Album', fiches ? h`<span class="pastille">${fiches}</span>` : ''))}
    ${brut(lien('/trophees', '🏆', 'Trophées'))}
    ${brut(lien('/quetes', '📜', 'Quêtes'))}
  </nav>`;
}
function ouvrirMenu() {
  const p = profilActif();
  fermerMenu();
  const m = document.createElement('div');
  m.className = 'voile';
  m.innerHTML = h`<div class="feuille" role="dialog" aria-modal="true" aria-labelledby="menu-titre">
    <div class="feuille-poignee" aria-hidden="true"></div>
    <div class="menu-joueur"><span class="avatar grand">${p.avatar}</span><div><h2 id="menu-titre">${p.pseudo}</h2><p>${M.niveauDe(p.xp).icone} ${M.niveauDe(p.xp).nom}</p></div></div>
    <div class="menu-grille">
      <button type="button" class="tuile-menu" data-son aria-pressed="${sons.actif}"><span>${sons.actif ? '🔊' : '🔇'}</span>Son</button>
      <button type="button" class="tuile-menu" data-dys aria-pressed="${document.documentElement.hasAttribute('data-dys')}"><span>Aa</span>Police lisible</button>
      <button type="button" class="tuile-menu" data-reglage="texte" aria-label="Taille du texte : ${({ standard: 'standard', confort: 'confort', grand: 'grand' })[reglages.texte]}"><span>${({ standard: 'A', confort: 'A+', grand: 'A++' })[reglages.texte]}</span>Texte ${({ standard: 'standard', confort: 'confort', grand: 'grand' })[reglages.texte]}</button>
      <button type="button" class="tuile-menu" data-reglage="voix" aria-pressed="${reglages.voix}"><span>🗣️</span>Lecture audio</button>
      <button type="button" class="tuile-menu" data-reglage="animations" aria-pressed="${reglages.animations}"><span>${reglages.animations ? '🎉' : '🍃'}</span>Animations</button>
      <button type="button" class="tuile-menu" data-reglage="arcade" aria-pressed="${reglages.arcade}"><span>${reglages.arcade ? '❤️' : '🤍'}</span>Mode cœurs</button>
      <a class="tuile-menu" href="#/sauvegarde"><span>💾</span>Sauvegarde</a>
      <a class="tuile-menu" href="#/profils"><span>👥</span>Joueurs</a>
      <a class="tuile-menu" href="#/aide"><span>❓</span>Comment jouer</a>
      <a class="tuile-menu" href="${FILIERES[filiere].labo}"><span>🧪</span>Le labo</a>
    </div>
    <button type="button" class="btn btn-large" data-fermer>Fermer</button>
  </div>`;
  m.addEventListener('click', e => { if (e.target === m || e.target.closest('[data-fermer]') || e.target.closest('a')) fermerMenu(); });
  document.body.appendChild(m);
  m.querySelector('[data-fermer]').focus();
}
function fermerMenu() { document.querySelector('.voile')?.remove(); }
document.addEventListener('click', e => {
  const son = e.target.closest('[data-son]');
  if (son) {
    const actif = sons.basculer();
    document.querySelectorAll('[data-son]').forEach(b => { b.setAttribute('aria-pressed', String(actif)); const s = b.querySelector('span') || b; s.textContent = actif ? '🔊' : '🔇'; });
    return;
  }
  if (e.target.closest('[data-dys]')) {
    window.LaboPro.basculerDys();
    document.querySelectorAll('[data-dys]').forEach(b => b.setAttribute('aria-pressed', String(document.documentElement.hasAttribute('data-dys'))));
    return;
  }
  const r = e.target.closest('[data-reglage]');
  if (r) {
    const k = r.dataset.reglage;
    if (k === 'texte') reglages.texte = { standard: 'confort', confort: 'grand', grand: 'standard' }[reglages.texte];
    else reglages[k] = !reglages[k];
    appliquerReglages();
    sons.clic();
    toast({ texte: `Texte ${reglages.texte}`, voix: reglages.voix ? '🗣️ Un bouton « Écouter » apparaît sur chaque défi' : 'Lecture audio désactivée', animations: reglages.animations ? 'Animations activées' : 'Animations réduites', arcade: reglages.arcade ? '❤️ Mode cœurs : 3 cœurs par partie, une erreur coûte un cœur' : 'Mode normal : tu vas toujours au bout de la partie' }[k]);
    ouvrirMenu();
    document.querySelector(`[data-reglage="${k}"]`)?.focus();
    return;
  }
  if (e.target.closest('[data-menu]')) { sons.clic(); ouvrirMenu(); }
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') fermerMenu(); });

// ------------------------------------------------------------------ choix de filière, profils

function ecranChoixFiliere() {
  afficher(h`<main class="ecran-centre"><div class="panneau">
    <p class="gros-emoji">🎮</p><h1 tabindex="-1" data-focus>Choisis ton quartier</h1>
    <div class="pile">${Object.entries(FILIERES).map(([id, f]) => h`<a class="btn btn-large filiere-${id}" style="background:${f.couleur};color:#fff" href="?f=${id}">${f.nom}</a>`)}</div>
  </div></main>`);
}

function ecranProfils() {
  const liste = profilsFiliere();
  afficher(h`<main class="ecran-centre fond-ville">
    <div class="panneau">
      <p class="titre-jeu">${FILIERES[filiere].ville}</p>
      <h1 tabindex="-1" data-focus>Qui joue ?</h1>
      ${brut(!stockageOk ? h`<p class="alerte">⚠️ Progression non enregistrée sur ce navigateur : utilise le code de sauvegarde.</p>` : '')}
      <div class="grille-profils">
        ${liste.map(p => h`<button class="carte-profil" type="button" data-profil="${p.id}"><span class="avatar geant">${p.avatar}</span><strong>${p.pseudo}</strong><span class="mini">${M.niveauDe(p.xp).icone} ${p.xp} ⭐</span></button>`)}
        <a class="carte-profil nouveau" href="#/nouveau"><span class="avatar geant">＋</span><strong>Nouveau</strong></a>
      </div>
      <p class="lien-discret"><a href="#/sauvegarde">💾 J’ai un code</a> · <a href="../">⌂ Portail</a></p>
    </div>
  </main>`);
  $app.querySelectorAll('[data-profil]').forEach(b => b.addEventListener('click', () => { sons.clic(); stock.actif[filiere] = b.dataset.profil; sauver(); aller('/'); }));
}

function ecranNouveauProfil() {
  let avatar = AVATARS[Math.floor(Math.random() * AVATARS.length)];
  afficher(h`<main class="ecran-centre fond-ville">
    <form class="panneau" id="form-profil" novalidate>
      <h1 tabindex="-1">Ton personnage</h1>
      <div class="apercu-avatar avatar geant" id="apercu" aria-hidden="true">${avatar}</div>
      <label class="champ"><span class="visuellement-cache">Pseudo</span>
        <input id="pseudo" maxlength="24" autocomplete="off" required placeholder="Ton pseudo (pas ton nom)">
      </label>
      <div class="grille-avatars" role="radiogroup" aria-label="Avatar">
        ${AVATARS.map(a => h`<button type="button" class="avatar-choix" role="radio" aria-checked="${a === avatar}" data-avatar="${a}">${a}</button>`)}
      </div>
      <p class="erreur" id="erreur" hidden>Écris un pseudo 🙂</p>
      <button class="btn btn-principal btn-large" type="submit">Jouer ▶</button>
      <a class="lien-discret" href="#/profils">Annuler</a>
    </form>
  </main>`, { focus: false });
  const input = $app.querySelector('#pseudo');
  input.focus();
  $app.querySelectorAll('[data-avatar]').forEach(b => b.addEventListener('click', () => {
    sons.clic();
    avatar = b.dataset.avatar;
    $app.querySelector('#apercu').textContent = avatar;
    $app.querySelectorAll('[data-avatar]').forEach(x => x.setAttribute('aria-checked', String(x === b)));
  }));
  $app.querySelector('#form-profil').addEventListener('submit', e => {
    e.preventDefault();
    const pseudo = input.value.trim();
    if (!pseudo) { $app.querySelector('#erreur').hidden = false; secouer(input); input.focus(); return; }
    const p = M.nouveauProfil({ pseudo, avatar, filiere });
    stock.profils[p.id] = p; stock.actif[filiere] = p.id; sauver();
    sons.victoire();
    aller('/');
  });
}

// ------------------------------------------------------------------ la ville

// Emplacements sur la carte (en % de la scène) : portrait (téléphone) et paysage (tablette, ordinateur).
// Un quartier = une carte. « ville » : le quartier de départ ; les autres (ex. « sante ») s'ouvrent en bus.
const CARTES = {
  ville: {
    portrait: {
      lieux: [[25, 17], [75, 15], [24, 47], [76, 45], [50, 80]],
      place: [50, 61], boss: [50, 31], quetes: [13, 80], surprise: [87, 80], bus: [11, 64],
      pnj: [77, 64],
      deco: { fleurs: [[8, 26], [92, 30], [36, 92]], arbres: [[94, 62], [6, 37], [8, 8]], banc: [[64, 56]], fontaine: [[50, 51]], ballons: [[92, 8]], kiosque: [[36, 33]], manege: [[66, 32]], feu: [[50, 6]], arcenciel: [[22, 6]] },
    },
    paysage: {
      lieux: [[13, 28], [36, 18], [64, 18], [87, 28], [78, 76]],
      place: [52, 60], boss: [50, 40], quetes: [14, 74], surprise: [33, 80], bus: [93, 86],
      pnj: [51, 78],
      deco: { fleurs: [[25, 46], [75, 48], [62, 90]], arbres: [[4, 52], [96, 56], [48, 8]], banc: [[64, 62]], fontaine: [[52, 50]], ballons: [[93, 8]], kiosque: [[24, 62]], manege: [[90, 52]], feu: [[72, 6]], arcenciel: [[26, 8]] },
    },
  },
  sante: {
    portrait: {
      lieux: [[17, 20], [83, 20], [20, 40], [80, 40], [22, 64], [78, 64], [50, 84], [50, 11]],
      place: [50, 53], bus: [50, 29], quetes: [87, 87], surprise: [13, 87],
      pnj: [50, 66],
      decor: [['🌳', 6, 52], ['🌳', 94, 52], ['🧑‍⚕️', 30, 95], ['🌷', 70, 95], ['⛲', 50, 44]],
    },
    paysage: {
      lieux: [[11, 27], [31, 17], [69, 17], [89, 27], [14, 74], [86, 74], [50, 85], [50, 14]],
      place: [50, 54], bus: [50, 33], quetes: [68, 86], surprise: [32, 86],
      pnj: [30, 52],
      decor: [['🌳', 4, 50], ['🌳', 96, 50], ['🧑‍⚕️', 70, 52], ['⛲', 50, 50], ['🌷', 50, 96]],
    },
  },
};
let positionAvatar = null; // [x, y] gardé entre deux affichages de la ville
let quartierCourant = 'ville';
const routeQuartier = () => (quartierCourant === 'ville' ? '/' : '/' + quartierCourant);
const quartiers = () => (banque.quartiers || [{ id: 'ville' }]).filter(q => banque.lieux.some(l => M.quartierDe(l) === q.id));
const infoQuartier = id => (banque.quartiers || []).find(q => q.id === id) || { id, nom: FILIERES[filiere].ville, icone: '🏙️' };

function ecranVille(profil, quartier = 'ville') {
  if (!CARTES[quartier] || !banque.lieux.some(l => M.quartierDe(l) === quartier)) quartier = 'ville';
  quartierCourant = quartier;
  const enVille = quartier === 'ville';
  const format = window.innerWidth >= 760 && window.innerWidth / window.innerHeight > 1 ? 'paysage' : 'portrait';
  const C = CARTES[quartier][format];
  const jour = M.jourDe();
  const lieux = banque.lieux.filter(l => M.quartierDe(l) === quartier);
  const fiches = M.collection(profil, banque).filter(f => f.rarete).length;
  const decos = enVille ? M.decorations(fiches) : [];
  const prochaine = M.prochaineDecoration(fiches);
  const revisions = M.aRevoirAujourdhui(profil, banque, jour, quartier);
  const defiFait = profil.defis[jour] != null;
  const autre = quartiers().find(q => q.id !== quartier);
  const cle = format + quartier;
  if (!positionAvatar || positionAvatar.cle !== cle) positionAvatar = { cle, xy: C.place };
  const pos = ([x, y]) => `left:${x}%;top:${y}%`;
  const cibles = [...C.lieux.slice(0, lieux.length), C.quetes, C.surprise, ...(enVille ? [C.boss] : []), ...(autre ? [C.bus] : [])];
  const routes = cibles.map(([x, y]) => {
    const [px, py] = C.place;
    return `M${px} ${py} Q ${(px + x) / 2 + (y - py) * 0.15} ${(py + y) / 2 - (x - px) * 0.15} ${x} ${y}`;
  });
  const visagesPnj = revisions.slice(0, 3).map(it => personnage(it, null).visage);
  const info = enVille ? { nom: FILIERES[filiere].ville } : infoQuartier(quartier);

  afficher(h`${brut(hud(profil))}
  <main class="ville-ecran">
    <h1 class="visuellement-cache" tabindex="-1" data-focus>${info.nom}</h1>
    ${brut(!enVille ? h`<p class="panneau-quartier"><span aria-hidden="true">${info.icone}</span> ${info.nom}</p>` : '')}
    <div class="ville ${format} q-${quartier}" id="ville">
      <div class="ciel" aria-hidden="true"><span class="nuage n1">☁️</span><span class="nuage n2">☁️</span><span class="astre">🌙</span></div>
      <svg class="routes" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${routes.map(d => h`<path d="${d}"/>`)}</svg>
      <div class="place" style="${pos(C.place)}" aria-hidden="true"></div>
      ${decos.flatMap(d => (C.deco[d.id] || []).map((xy, i) => h`<span class="deco" style="${pos(xy)};--i:${i}" aria-hidden="true">${d.icone}</span>`))}
      ${(C.decor || []).map(([e, x, y], i) => h`<span class="deco" style="${pos([x, y])};--i:${i}" aria-hidden="true">${e}</span>`)}

      ${lieux.map((l, i) => {
        const m = M.maitriseLieu(profil, banque, l.id);
        return h`<button type="button" class="lieu" data-lieu="${l.id}" style="${pos(C.lieux[i])};--c:${l.couleur}" aria-label="${l.nom}, ${m.etoiles} étoile${m.etoiles > 1 ? 's' : ''} sur 3${m.aRevoir ? `, ${m.aRevoir} à revoir` : ''}">
          ${brut(m.aRevoir ? h`<span class="bulle-alerte" aria-hidden="true">❗</span>` : m.vus < m.total ? h`<span class="bulle-alerte nouveau" aria-hidden="true">✨</span>` : '')}
          <span class="lieu-socle" aria-hidden="true"></span>
          <span class="lieu-icone" aria-hidden="true">${l.icone}</span>
          <span class="lieu-nom">${l.nom}</span>
          <span class="etoiles" aria-hidden="true">${[0, 1, 2].map(k => h`<span class="${k < m.etoiles ? 'pleine' : ''}">★</span>`)}</span>
        </button>`;
      })}

      ${brut(enVille ? h`<button type="button" class="lieu special boss ${defiFait ? 'fait' : ''}" data-mode="defi" style="${pos(C.boss)}" aria-label="${defiFait ? 'Journée chargée : réussie aujourd’hui' : 'Boss du jour : Journée chargée'}">
        <span class="lieu-icone" aria-hidden="true">${defiFait ? '😴' : '⏰'}</span><span class="lieu-nom">${defiFait ? 'À demain !' : 'Boss du jour'}</span>
      </button>` : '')}
      <a class="lieu special" href="#/quetes" style="${pos(C.quetes)}" aria-label="Tableau des quêtes"><span class="lieu-icone" aria-hidden="true">📜</span><span class="lieu-nom">Quêtes</span></a>
      <button type="button" class="lieu special surprise" data-mode="surprise" style="${pos(C.surprise)}" aria-label="Partie surprise"><span class="lieu-icone" aria-hidden="true">🎁</span><span class="lieu-nom">Surprise</span></button>
      ${brut(autre ? h`<button type="button" class="lieu special bus" data-bus="${autre.id}" style="${pos(C.bus)}" aria-label="Prendre le bus pour : ${infoQuartier(autre.id).nom}">
        <span class="lieu-icone" aria-hidden="true">🚌</span><span class="lieu-nom">${autre.id === 'ville' ? 'Retour en ville' : infoQuartier(autre.id).nom}</span>
      </button>` : '')}

      ${brut(revisions.length ? h`<button type="button" class="groupe-pnj" data-mode="erreurs" style="${pos(C.pnj)}" aria-label="${revisions.length} personne${revisions.length > 1 ? 's' : ''} ont encore besoin de toi : réviser">
        ${visagesPnj.map((v, i) => h`<span class="pnj-marche" style="--i:${i}" aria-hidden="true">${v}</span>`)}
        <span class="pastille">${revisions.length}</span>
      </button>` : '')}

      <span class="avatar-ville" id="avatar-ville" style="${pos(positionAvatar.xy)}" aria-hidden="true">${profil.avatar}</span>
    </div>
    <button type="button" class="btn btn-principal btn-large cta-tournee" id="ma-tournee"><span aria-hidden="true">▶</span> Ma tournée <small>6 défis · révisions + découvertes</small></button>
    ${brut(banque.vraiFaux?.length >= M.TAILLE_VRAI_FAUX ? h`<button type="button" class="btn btn-large cta-vf" id="vrai-faux"><span aria-hidden="true">⚡</span> Vrai ou faux éclair <small>4 affirmations · 1 minute</small></button>` : '')}
    ${brut(banque.cas?.length ? h`<a class="btn btn-large cta-vf cta-cas" href="#/cas"><span aria-hidden="true">🎬</span> Cas pro <small>Une situation de stage · 3 décisions</small></a>` : '')}
    ${brut(prochaine ? h`<p class="prochaine-deco" aria-label="Prochaine décoration de la ville : ${prochaine.nom} à ${prochaine.fiches} cartes"><span aria-hidden="true">${prochaine.icone}</span><span class="barre-mini"><span style="width:${pct(fiches / prochaine.fiches)}%"></span></span><span>${fiches}/${prochaine.fiches} 🃏</span></p>` : '')}
  </main>
  ${brut(dock('/'))}`);

  $app.querySelectorAll('[data-lieu]').forEach(b => b.addEventListener('click', () => entrerLieu(b, () => lancer({ mode: 'lieu', lieu: b.dataset.lieu }))));
  $app.querySelectorAll('[data-mode]').forEach(b => b.addEventListener('click', () => {
    if (b.dataset.mode === 'defi' && defiFait) { sons.clic(); return toast('Boss vaincu aujourd’hui 💪 Reviens demain !'); }
    entrerLieu(b, () => lancer({ mode: b.dataset.mode, quartier }));
  }));
  $app.querySelector('[data-bus]')?.addEventListener('click', e => prendreBus(e.currentTarget));
  document.getElementById('ma-tournee').addEventListener('click', () => { sons.clic(); lancer({ mode: 'tournee', quartier }); });
  document.getElementById('vrai-faux')?.addEventListener('click', () => { sons.clic(); lancer({ mode: 'vraifaux', quartier }); });
  if (!profil.vu?.intro) introduction(profil);
  else if (!enVille && !profil.vu?.[quartier]) bienvenueQuartier(profil, quartier);
}

async function prendreBus(bouton) {
  const dest = bouton.dataset.bus;
  const route = dest === 'ville' ? '/' : '/' + dest;
  if (mouvementReduit()) return aller(route);
  await entrerLieu(bouton, () => {}, { zoom: false });
  document.getElementById('avatar-ville')?.classList.add('cache');
  bouton.classList.add('part');
  sons.combo(3);
  await attendre(650);
  aller(route);
}

function bienvenueQuartier(profil, quartier) {
  const info = infoQuartier(quartier);
  const v = document.createElement('div');
  v.className = 'voile intro';
  v.innerHTML = h`<div class="bulle-intro" role="dialog" aria-modal="true" aria-labelledby="bq-t"><span class="avatar geant">${info.icone}</span><div><h2 id="bq-t">${info.nom}</h2><p>${quartier === 'sante' ? 'Biologie et microbiologie : tout le programme t’attend dans ces 7 bâtiments 🔬' : ''}</p></div><button class="btn btn-principal" type="button">C’est parti !</button></div>`;
  document.body.appendChild(v);
  const b = v.querySelector('button');
  b.focus();
  b.addEventListener('click', () => { sons.clic(); profil.vu = { ...(profil.vu || {}), [quartier]: true }; sauver(); v.remove(); });
}

async function entrerLieu(bouton, suite, { zoom = true } = {}) {
  const av = document.getElementById('avatar-ville');
  const ville = document.getElementById('ville');
  if (!av || mouvementReduit()) return suite();
  sons.pas();
  const rv = ville.getBoundingClientRect(), rb = bouton.getBoundingClientRect();
  const x = ((rb.left + rb.width / 2 - rv.left) / rv.width) * 100, y = ((rb.top + rb.height * 0.75 - rv.top) / rv.height) * 100;
  positionAvatar.xy = [x, y];
  av.classList.add('marche');
  av.style.left = x + '%';
  av.style.top = y + '%';
  const pas = setInterval(() => sons.pas(), 160);
  await attendre(560);
  clearInterval(pas);
  av.classList.remove('marche');
  if (!zoom) return suite();
  bouton.classList.add('entree');
  ville.classList.add('zoom');
  ville.style.transformOrigin = `${x}% ${y}%`;
  await attendre(380);
  suite();
}

function introduction(profil) {
  const etapes = [
    { t: `Salut ${profil.pseudo} ! 👋`, s: 'Bienvenue en stage dans le quartier.' },
    { t: 'Touche un bâtiment 🏠', s: 'Ses habitants ont besoin de toi.' },
    { t: 'Gagne des ⭐ et des 🃏', s: 'Le quartier s’embellit quand tu progresses !' },
  ];
  let i = 0;
  const v = document.createElement('div');
  v.className = 'voile intro';
  const montrer = () => {
    v.innerHTML = h`<div class="bulle-intro" role="dialog" aria-modal="true" aria-labelledby="intro-t"><span class="avatar geant">${profil.avatar}</span><div><h2 id="intro-t">${etapes[i].t}</h2><p>${etapes[i].s}</p></div><button class="btn btn-principal" type="button">${i < etapes.length - 1 ? 'Suite ▶' : 'C’est parti !'}</button></div>`;
    const b = v.querySelector('button');
    b.focus();
    b.addEventListener('click', () => {
      sons.clic();
      if (++i < etapes.length) return montrer();
      profil.vu = { ...(profil.vu || {}), intro: true }; sauver(); v.remove();
    });
  };
  document.body.appendChild(v);
  montrer();
}

// ------------------------------------------------------------------ quêtes

const quartierMission = m => M.quartierDe(lieuDe({ atelier: m.etapes[0].atelier }));
const quartiersTries = () => { const q = quartiers(); return [...q.filter(x => x.id === quartierCourant), ...q.filter(x => x.id !== quartierCourant)]; };

function ecranQuetes(profil) {
  const jour = M.jourDe();
  afficher(h`${brut(hud(profil))}<main class="ecran-liste">
    <h1 tabindex="-1" data-focus>📜 Quêtes</h1>
    ${quartiersTries().map(q => {
      const liste = banque.missions.filter(m => quartierMission(m) === q.id);
      if (!liste.length) return '';
      return h`${brut(quartiers().length > 1 ? h`<h2 class="titre-quartier"><span aria-hidden="true">${q.id === 'ville' ? '🏙️' : infoQuartier(q.id).icone}</span> ${q.id === 'ville' ? FILIERES[filiere].ville : infoQuartier(q.id).nom}</h2>` : '')}
    <div class="pile">${liste.map(m => {
      const faite = profil.missions[m.id];
      const nb = m.etapes.reduce((s, e) => s + e.nombre, 0);
      return h`<button type="button" class="carte-quete ${faite === jour ? 'faite' : ''}" data-mission="${m.id}">
        <span class="quete-icone" aria-hidden="true">${m.icone}</span>
        <span class="quete-corps"><strong>${m.titre}</strong>
          <span class="quete-etapes" aria-label="${m.etapes.length} étapes, ${nb} défis">${m.etapes.map(e => h`<span>${banque.ateliers.find(a => a.id === e.atelier)?.icone}</span>`)}</span></span>
        <span class="quete-recompense">${faite === jour ? '✅' : `+${M.POINTS.missionTerminee}⭐`}</span>
      </button>`;
    })}</div>`;
    })}
  </main>${brut(dock('/quetes'))}`);
  $app.querySelectorAll('[data-mission]').forEach(b => b.addEventListener('click', () => { sons.clic(); lancer({ mode: 'mission', mission: b.dataset.mission }); }));
}

// ------------------------------------------------------------------ cas professionnels à décisions
// Règles dans moteur.js (demarrerCas, choisirCas, enregistrerCas). Ici : affichage seulement.

let casPartie = null; // { cas, etat, retour, ordre, bilan }

function ecranListeCas(profil) {
  afficher(h`${brut(hud(profil))}<main class="ecran-liste etroit">
    <h1 tabindex="-1" data-focus>🎬 Cas pro</h1>
    <p class="astuce">Une situation de stage, trois décisions. Tes choix changent la suite de l’histoire.</p>
    <div class="pile">${banque.cas.map(c => {
      const e = M.etatCas(profil, c.id), total = M.finsDuCas(c).length;
      return h`<button type="button" class="carte-quete carte-cas ${e.fois ? 'joue' : ''}" data-cas="${c.id}">
        <span class="quete-icone" aria-hidden="true">${c.icone}</span>
        <span class="quete-corps"><strong>${c.titre}</strong><span class="cas-lieu">${c.lieu} · 3 décisions</span>
          ${brut(e.fois ? h`<span class="cas-fins" aria-label="${e.fins.length} fin${e.fins.length > 1 ? 's' : ''} découverte${e.fins.length > 1 ? 's' : ''} sur ${total}">🎭 ${e.fins.length}/${total} fins</span>` : '')}</span>
        <span class="quete-recompense">${e.fois ? (e.meilleur >= M.CAS_DECISIONS * M.POINTS_CAS.juste ? '🏅' : '↻') : `+${M.CAS_DECISIONS * M.POINTS_CAS.juste + M.CAS_BONUS_FIN}⭐`}</span>
      </button>`;
    })}</div>
  </main>${brut(dock('/'))}`);
  $app.querySelectorAll('[data-cas]').forEach(b => b.addEventListener('click', () => { sons.clic(); lancerCas(b.dataset.cas); }));
}

function lancerCas(id) {
  const cas = banque.cas.find(c => c.id === id);
  if (!cas) return aller('/cas');
  const ordre = {};
  for (const [nid, n] of Object.entries(cas.noeuds)) if (n.type === 'decision') ordre[nid] = M.melanger(n.choix.map(c => c.id));
  casPartie = { cas, etat: M.demarrerCas(cas), retour: null, ordre, bilan: null };
  aller('/cas-jeu');
}

function ecranCas() {
  if (!casPartie) return aller('/cas');
  const { cas, etat, retour } = casPartie;
  const n = cas.noeuds[etat.noeud];
  if (n.type === 'fin' && !retour) return ecranFinCas();
  const fait = etat.decisions.length;
  const enCours = n.type === 'decision' && !retour ? 1 : 0;
  afficher(h`<header class="hud hud-partie">
    <button class="hud-bouton" type="button" id="quitter" aria-label="Quitter le cas">✕</button>
    <span class="hud-vf" aria-hidden="true">${cas.icone} Cas pro</span>
    <div class="pips" aria-label="Décision ${Math.min(fait + enCours, M.CAS_DECISIONS)} sur ${M.CAS_DECISIONS}">${Array.from({ length: M.CAS_DECISIONS }, (_, i) => h`<span class="${i < fait ? 'ok' : i === fait && enCours ? 'courant' : ''}"></span>`)}</div>
  </header>
  <main class="partie cas-partie">${brut(retour ? rendreRetourCas() : n.type === 'decision' ? rendreDecisionCas(n, fait) : rendreSceneCas(n))}</main>`);
  brancherCas();
}

function pnjCas(humeur) {
  const { cas } = casPartie;
  return h`<div class="pnj ${humeur === 'ok' ? 'content' : ''}"><span class="pnj-visage" aria-hidden="true">${cas.personnage || cas.icone}</span><span class="pnj-humeur" aria-hidden="true">${humeur === 'ok' ? '😊' : humeur === 'aide' ? '🤝' : '💭'}</span></div>`;
}

function rendreSceneCas(n) {
  const { cas, etat } = casPartie;
  const debut = etat.noeud === cas.depart;
  return h`<section class="scene" aria-label="Situation">${brut(pnjCas())}
    <div class="dialogue">
      <p class="etiquette-atelier">${debut ? cas.lieu : 'Et maintenant…'}</p>
      <h1 class="question" tabindex="-1" data-focus>${n.titre}</h1>
      <p class="bulle-pnj cas-texte">${n.texte}</p>
    </div></section>
    <div class="zone-jeu">
      ${brut(debut ? h`<div class="panneau-clair cas-mission"><p><strong>🎭 Ton rôle :</strong> ${cas.role}</p><p><strong>🎯 Objectif :</strong> ${cas.objectif}</p>${brut(cas.avertissement ? h`<p class="cas-avert">⚠️ ${cas.avertissement}</p>` : '')}</div>` : '')}
      <button type="button" class="btn btn-principal btn-large" id="cas-suite">${debut ? 'C’est parti ▶' : 'Continuer ▶'}</button>
    </div>`;
}

function rendreDecisionCas(n, fait) {
  const { etat, ordre } = casPartie;
  const aide = etat.indices.includes(etat.noeud);
  return h`<section class="scene" aria-label="Situation">${brut(pnjCas())}
    <div class="dialogue">
      <p class="etiquette-atelier">Décision ${fait + 1}/${M.CAS_DECISIONS} · ${n.titre}</p>
      <p class="bulle-pnj cas-texte">${n.texte}</p>
      <h1 class="question" tabindex="-1" data-focus>${n.question}</h1>
      ${brut(reglages.voix ? h`<button type="button" class="ecouter" id="ecouter" aria-label="Écouter la situation et les choix"><span aria-hidden="true">🔊</span> Écouter</button>` : '')}
    </div></section>
    <section class="zone-jeu" aria-label="Choix">
      <div class="outils-question">${brut(aide ? '' : h`<button type="button" class="indice-btn" id="indice" title="Un conseil pour réfléchir (la décision rapporte alors 7 ⭐ au plus)">💡 Indice</button>`)}</div>
      ${brut(aide ? h`<p class="cas-indice" role="status">💡 ${n.indice}</p>` : '')}
      <div class="repliques">${ordre[etat.noeud].map((id, k) => {
        const c = n.choix.find(x => x.id === id);
        return h`<button type="button" class="replique" data-cas-choix="${c.id}" style="--k:${k}"><span class="touche" aria-hidden="true">${k + 1}</span><span>${c.texte}</span></button>`;
      })}</div>
    </section>`;
}

function rendreRetourCas() {
  const { cas, retour } = casPartie;
  const n = cas.noeuds[retour.decision.noeud];
  const c = n.choix.find(x => x.id === retour.decision.choix);
  // Pas d'étiquette « bon / mauvais » : le retour pédagogique parle de lui-même, la couleur reste discrète
  const ton = { juste: 'ok', partiel: 'moyen', 'a-revoir': 'aide' }[c.qualite];
  return h`<section class="scene" aria-label="Ce qui se passe">${brut(pnjCas(ton))}
    <div class="dialogue">
      <p class="etiquette-atelier">Ton choix</p>
      <p class="cas-mon-choix">« ${c.texte} »</p>
    </div></section>
    <div class="zone-jeu">
      <div class="panneau-clair cas-retour ton-${ton}" role="status">
        <h1 tabindex="-1" data-focus class="cas-retour-titre">${ton === 'ok' ? '✅ Bon réflexe' : ton === 'moyen' ? '👍 C’est un début' : '🛟 L’équipe t’aide'}</h1>
        <p>${c.retour}</p>
        <p class="cas-consequence"><span aria-hidden="true">➡️</span> ${c.consequence}</p>
        ${brut(retour.decision.aide ? '<p class="astuce">💡 Indice utilisé : 7 ⭐ au plus pour cette décision.</p>' : '')}
      </div>
      <button type="button" class="btn btn-principal btn-large" id="cas-suite">Continuer ▶</button>
    </div>`;
}

function brancherCas() {
  const { cas } = casPartie;
  document.getElementById('quitter')?.addEventListener('click', () => { sons.clic(); casPartie = null; aller('/cas'); });
  document.getElementById('cas-suite')?.addEventListener('click', () => {
    sons.clic();
    if (casPartie.retour) casPartie.retour = null;
    else casPartie.etat = M.avancerCas(cas, casPartie.etat);
    ecranCas();
  });
  document.getElementById('indice')?.addEventListener('click', () => { sons.clic(); casPartie.etat = M.indiceCas(casPartie.etat); ecranCas(); });
  document.getElementById('ecouter')?.addEventListener('click', () => {
    const n = cas.noeuds[casPartie.etat.noeud];
    lire([n.texte, n.question, ...casPartie.ordre[casPartie.etat.noeud].map((id, k) => `Choix ${k + 1} : ${n.choix.find(x => x.id === id).texte}`)].join(' '));
  });
  $app.querySelectorAll('[data-cas-choix]').forEach(b => b.addEventListener('click', () => {
    const { etat, decision } = M.choisirCas(cas, casPartie.etat, b.dataset.casChoix);
    casPartie.etat = etat;
    casPartie.retour = { decision };
    if (decision.qualite === 'juste') { sons.juste(); vibrer(30); } else sons.pose();
    ecranCas();
  }));
}

async function ecranFinCas() {
  const profil = profilActif();
  const { cas, etat } = casPartie;
  if (!casPartie.bilan) { casPartie.bilan = M.enregistrerCas(profil, cas, etat); sauver(); }
  const b = casPartie.bilan;
  const fin = cas.noeuds[b.fin];
  const id = cas.id;
  afficher(h`<main class="ecran-liste etroit cas-fin">
    <div class="panneau fin">
      <p class="gros-emoji rebond" aria-hidden="true">${fin.icone || '🏁'}</p>
      <h1 tabindex="-1" data-focus>${fin.titre}</h1>
      <p class="sous-titre">${fin.texte}</p>
      <div class="score-fin"><span><strong>${b.indicateurs.filter(i => i.ok).length}<small>/${b.indicateurs.length}</small></strong><small>compétences</small></span><span><strong>${b.xp}</strong> <small>⭐ gagnées</small></span></div>
      ${brut(b.nouvelleFin && !b.premiereFois ? '<p class="annonce">🎭 Nouvelle fin découverte !</p>' : '')}
      ${brut(b.record ? '<p class="annonce">📈 Meilleur score sur ce cas !</p>' : '')}
      ${brut(!b.premiereFois && !b.xp ? '<p class="astuce">Les ⭐ se gagnent en faisant mieux que ton meilleur score.</p>' : '')}
      ${brut(b.niveauMonte ? h`<p class="annonce niveau">${b.niveauMonte.icone} Niveau ${b.niveauMonte.rang + 1} : <strong>${b.niveauMonte.nom}</strong> !</p>` : '')}
      <p class="cas-fins-vues">🎭 Fins découvertes : ${b.finsVues}/${b.finsTotal}</p>
    </div>
    <section class="panneau-clair pile" aria-labelledby="t-comp">
      <h2 id="t-comp">Compétences travaillées</h2>
      <ul class="cas-competences">${b.indicateurs.map(i => h`<li class="${i.ok ? 'ok' : ''}"><span aria-hidden="true">${i.ok ? '✅' : '🔁'}</span> <span class="sr-only">${i.ok ? 'Réussi :' : 'À retravailler :'}</span> ${i.label}</li>`)}</ul>
    </section>
    <section class="pile" aria-labelledby="t-dec">
      <h2 id="t-dec">Tes décisions</h2>
      ${etat.decisions.map((d, k) => {
        const n = cas.noeuds[d.noeud], c = n.choix.find(x => x.id === d.choix);
        const juste = n.choix.find(x => x.qualite === 'juste');
        return h`<article class="panneau-clair cas-debrief ton-${{ juste: 'ok', partiel: 'moyen', 'a-revoir': 'aide' }[d.qualite]}">
          <h3>${k + 1}. ${n.titre}</h3>
          <p><strong>Ton choix :</strong> ${c.texte}</p>
          <p>${c.retour}</p>
          ${brut(d.qualite !== 'juste' ? h`<p><strong>Le meilleur réflexe :</strong> ${juste.texte}</p>` : '')}
          <p class="cas-retenir">📌 ${n.aRetenir}</p>
          <p class="cas-refs">${(c.refs || []).map(r => h`<span class="cas-ref" title="${cas.refs[r]}">${r}</span>`)}</p>
        </article>`;
      })}
    </section>
    <p class="res-fiche cas-a-retenir"><strong>À retenir</strong><br>${cas.aRetenir}</p>
    <div class="actions-fin">
      <button type="button" class="btn btn-principal btn-large" id="cas-rejouer">${b.finsVues < b.finsTotal ? 'Rejouer autrement ↻' : 'Rejouer ↻'}</button>
      <a class="btn btn-large" href="#/cas">Autres cas 🎬</a>
      <a class="btn btn-large" href="#${routeQuartier()}">Carte 🗺️</a>
    </div>
  </main>`);
  sons.victoire();
  document.getElementById('cas-rejouer').addEventListener('click', () => { sons.clic(); lancerCas(id); });
  if (b.parfait || b.niveauMonte) { await attendre(500); confettis(); if (b.niveauMonte) sons.niveau(); }
}

// ------------------------------------------------------------------ partie

let partie = null;

function lancer(options) {
  const profil = profilActif();
  const vraiFaux = options.mode === 'vraifaux';
  const { questions, mission, lieu } = vraiFaux
    ? { questions: M.composerVraiFaux(profil, banque).map(v => ({ item: M.itemVraiFaux(v), vf: v })) }
    : M.composerPartie(profil, banque, options);
  if (!questions.length) {
    sons.clic();
    toast('Tout le monde va bien 🎉 Rien à revoir !');
    return aller(routeQuartier());
  }
  partie = {
    ...options, mission, lieu,
    file: questions.map(q => ({ ...q, deuxiemeChance: false })),
    index: 0, arcade: reglages.arcade && !vraiFaux, vies: M.VIES, serie: 0, bonnes: 0, total: questions.length, xp: 0,
    fiches: [], badges: [], niveau: null, rejouees: new Set(), pari: false, jetons: M.JETONS_AUDACE, serieBonus: false, revanches: 0,
    fichesAvant: M.collection(profil, banque).filter(f => f.rarete).length,
  };
  preparerQuestion();
  if (options.mode === 'mission' || options.mode === 'defi') return ecranIntro();
  aller('/partie');
}

function ecranIntro() {
  const boss = partie.mode === 'defi';
  const m = partie.mission;
  afficher(h`<main class="ecran-centre ${boss ? 'fond-boss' : 'fond-quete'}"><div class="panneau intro-partie">
    <p class="gros-emoji rebond" aria-hidden="true">${boss ? '⏰' : m.icone}</p>
    <p class="titre-jeu">${boss ? 'Boss du jour' : 'Quête'}</p>
    <h1 tabindex="-1" data-focus>${boss ? 'Journée chargée !' : m.titre}</h1>
    <p class="sous-titre">${boss ? 'Les mêmes défis pour toute la classe.' : m.intro}</p>
    <p class="regles" aria-label="${partie.file.length} défis${partie.arcade ? ', 3 cœurs' : ''}"><span>🎯 ${partie.file.length}</span>${brut(partie.arcade ? '<span>❤️❤️❤️</span>' : `<span>${'⚡'.repeat(M.JETONS_AUDACE)}</span>`)}<span>⭐ +${boss ? M.POINTS.defiDuJour : M.POINTS.missionTerminee}</span></p>
    <button class="btn btn-principal btn-large" type="button" id="go">${boss ? 'Affronter ⚔️' : 'Partir ▶'}</button>
    <a class="lien-discret" href="#${routeQuartier()}">Plus tard</a>
  </div></main>`);
  $app.querySelector('#go').addEventListener('click', () => { sons.clic(); aller('/partie'); });
}

function preparerQuestion() {
  const q = partie.file[partie.index];
  q.presentation = M.presenter(q.item);
  q.choix = q.item.type === 'multi' ? [] : null;
  q.places = [];        // ordre : index placés
  q.tries = {};         // tri : index d'élément -> catégorie posée
  q.erreurs = 0;
  q.resultat = null;
  q.aide = false;
  q.masquees = [];
}

const lieuDe = it => banque.lieux.find(l => l.ateliers.includes(it.atelier));

function ecranQuestion() {
  const q = partie.file[partie.index];
  const it = q.item;
  const lieu = lieuDe(it);
  const atelier = banque.ateliers.find(a => a.id === it.atelier);
  const pnj = personnage(it, lieu);
  afficher(h`<header class="hud hud-partie">
    <button class="hud-bouton" type="button" id="quitter" aria-label="Quitter la partie">✕</button>
    ${brut(partie.mode === 'vraifaux' ? '<span class="hud-vf" aria-hidden="true">⚡ Vrai ou faux</span>' : partie.arcade ? h`<div class="coeurs" aria-label="${partie.vies} cœur${partie.vies > 1 ? 's' : ''}">${Array.from({ length: M.VIES }, (_, i) => h`<span class="${i < partie.vies ? '' : 'perdu'}" aria-hidden="true">${i < partie.vies ? '❤️' : '🖤'}</span>`)}</div>` : h`<div class="jetons" aria-label="${partie.jetons} jeton${partie.jetons > 1 ? 's' : ''} d’audace">${Array.from({ length: M.JETONS_AUDACE }, (_, i) => h`<span class="${i < partie.jetons ? '' : 'utilise'}" aria-hidden="true">⚡</span>`)}</div>`)}
    <div class="pips" aria-label="Défi ${Math.min(partie.index + 1, partie.file.length)} sur ${partie.file.length}">${partie.file.map((x, i) => h`<span class="${i < partie.index ? (x.resultat?.correct ? 'ok' : 'ko') : i === partie.index ? 'courant' : ''}"></span>`)}</div>
    <div class="combo ${partie.serie >= 2 ? 'visible' : ''} ${partie.serie >= 5 ? 'feu' : ''}" aria-label="Combo ${partie.serie}">🔥×${partie.serie}</div>
  </header>
  <main class="partie" style="--c:${lieu?.couleur || 'var(--filiere)'}">
    ${brut(q.etape ? h`<p class="bandeau-etape">📍 ${q.etape}</p>` : '')}
    <section class="scene" aria-label="Situation">
      <div class="pnj ${q.resultat ? (q.resultat.correct ? 'content' : 'triste') : ''}" id="pnj">
        <span class="pnj-visage" aria-hidden="true">${pnj.visage}</span>
        <span class="pnj-humeur" aria-hidden="true">${q.resultat ? (q.resultat.correct ? '😊' : '😟') : '💭'}</span>
        ${brut(pnj.nom ? h`<span class="pnj-nom">${pnj.nom}</span>` : '')}
      </div>
      <div class="dialogue">
        <p class="etiquette-atelier"><span aria-hidden="true">${atelier.icone}</span> ${atelier.titre}${brut(q.deuxiemeChance ? ' · 🔁 2ᵉ chance' : '')}</p>
        ${brut(pnj.texte ? h`<p class="bulle-pnj" id="narration">${pnj.texte}</p>` : '')}
        <h1 class="question" tabindex="-1" data-focus>${it.enonce}</h1>
        ${brut(reglages.voix ? h`<button type="button" class="ecouter" id="ecouter" aria-label="Écouter la question et les réponses"><span aria-hidden="true">🔊</span> Écouter</button>` : '')}
      </div>
    </section>
    ${brut(it.image ? h`<figure class="schema-q"><button type="button" class="schema-zoom" data-zoom aria-label="Agrandir le schéma"><img src="../contenu/${it.image.src}" alt="${it.image.alt}" loading="eager" decoding="async"></button><figcaption>Touche le schéma pour l’agrandir</figcaption></figure>` : '')}
    <section class="zone-jeu" id="zone-jeu" aria-label="Réponse">${brut(rendreJeu(q))}</section>
  </main>
  <div id="resultat"></div>`);
  if (q.resultat) afficherResultat(q, false);
  brancherQuestion(q);
  ecrireNarration();
}

function ecrireNarration() {
  const el = document.getElementById('narration');
  if (!el || mouvementReduit()) return;
  const texte = el.textContent;
  el.setAttribute('aria-label', texte);
  el.textContent = '';
  const pas = Math.max(1, Math.ceil(texte.length / 60));
  let i = 0;
  const finir = () => { clearInterval(t); el.textContent = texte; el.classList.remove('frappe'); };
  el.classList.add('frappe');
  const t = setInterval(() => { i += pas; el.textContent = texte.slice(0, i); if (i >= texte.length) finir(); }, 16);
  el.addEventListener('click', finir, { once: true });
}

// --- rendu des mini-jeux

function libellePari() { return partie.pari ? '⚡ Audace engagée : +5 si juste' : `⚡ Je suis sûr·e (${partie.jetons})`; }
function boutonPari() {
  const q = partie.file[partie.index];
  if (partie.mode === 'vraifaux') return ''; // le hasard donne déjà une chance sur deux : ni audace ni indice
  const audace = (partie.jetons > 0 || partie.pari) && !q?.aide ? h`<button type="button" class="pari ${partie.pari ? 'arme' : ''}" id="pari" aria-pressed="${partie.pari}" title="Jeton d’audace : +5 ⭐ si c’est juste, rien de perdu si c’est faux">${libellePari()}</button>` : '';
  const indice = q && q.item.type === 'qcm' && q.item.options.length >= 3 && !q.aide && !q.resultat ? h`<button type="button" class="indice-btn" id="indice" title="Retire des mauvaises réponses (la question rapporte alors 7 ⭐ au lieu de 10)">💡 Indice</button>` : '';
  return audace || indice ? h`<div class="outils-question">${brut(indice)}${brut(audace)}</div>` : '';
}

function rendreJeu(q) {
  const it = q.item;
  if (it.vf) return h`<div class="vf-choix" role="group" aria-label="Vrai ou faux ?">
    <button type="button" class="vf-bouton vf-vrai" data-choix="0"><span aria-hidden="true">✔</span> Vrai</button>
    <button type="button" class="vf-bouton vf-faux" data-choix="1"><span aria-hidden="true">✘</span> Faux</button></div>`;
  if (it.type === 'qcm') {
    const tampons = it.ordreFixe && it.options.length <= 4 && it.options.every(o => o.length < 40);
    if (it.pave) return h`${brut(boutonPari())}<div class="pave" role="group" aria-label="Touche le numéro">${q.presentation.ordre.map((i, k) =>
      h`<button type="button" class="tampon touche-pave ${q.masquees.includes(i) ? 'masquee' : ''}" data-choix="${i}" style="--k:${Math.min(k, 4) / 2}" aria-label="Numéro ${it.options[i]}" ${q.masquees.includes(i) ? brut('disabled') : ''}>${it.options[i]}</button>`)}</div>`;
    return h`${brut(boutonPari())}<div class="${tampons ? 'tampons' : 'repliques'}" role="group" aria-label="Choisis ta réponse">${q.presentation.ordre.map((i, k) =>
      h`<button type="button" class="${tampons ? 'tampon' : 'replique'} ${q.masquees.includes(i) ? 'masquee' : ''}" data-choix="${i}" style="--k:${k}" ${q.masquees.includes(i) ? brut('disabled aria-hidden="true"') : ''}><span class="touche" aria-hidden="true">${k + 1}</span><span>${it.options[i]}</span></button>`)}</div>`;
  }
  if (it.type === 'multi') {
    const n = it.bonnes.length;
    return h`${brut(boutonPari())}
    <div class="objets" role="group" aria-label="Mets dans le panier">${q.presentation.ordre.map((i, k) => {
      const dedans = q.choix.includes(i);
      const e = it.options[i].match(EMOJI_DEBUT);
      return h`<button type="button" class="objet ${dedans ? 'dedans' : ''}" data-objet="${i}" aria-pressed="${dedans}" style="--k:${k}">
        <span class="objet-icone" aria-hidden="true">${e ? e[1] : '📦'}</span><span>${e ? it.options[i].slice(e[0].length) : it.options[i]}</span></button>`;
    })}</div>
    <div class="panier"><span class="panier-icone" aria-hidden="true">🧺</span>
      <span class="emplacements" aria-label="${q.choix.length} choisi${q.choix.length > 1 ? 's' : ''} sur ${n} attendu${n > 1 ? 's' : ''}">${Array.from({ length: Math.max(n, q.choix.length) }, (_, k) => h`<span class="${k < q.choix.length ? 'plein' : ''}"></span>`)}</span>
      <button type="button" class="btn btn-principal" id="valider" ${q.choix.length ? '' : 'disabled'}>Valider ✔</button>
    </div>`;
  }
  if (it.type === 'tri') {
    const restants = q.presentation.ordre.filter(i => !(i in q.tries));
    const courant = restants[0];
    return h`${brut(Object.keys(q.tries).length === 0 ? boutonPari() : '')}
    <div class="table-tri">
      <div class="pile-cartes" aria-live="polite">
        ${restants.slice(1, 3).reverse().map((_, k) => h`<span class="carte-dos" style="--k:${k}" aria-hidden="true"></span>`)}
        ${brut(courant != null ? h`<div class="carte-tri" id="carte-tri" data-element="${courant}" tabindex="0" aria-label="Carte : ${it.elements[courant].texte}. Choisis un bac ci-dessous."><span>${it.elements[courant].texte}</span></div>` : '')}
      </div>
      <p class="compteur-tri">${Object.keys(q.tries).length}/${it.elements.length} carte${it.elements.length > 1 ? 's' : ''} classée${Object.keys(q.tries).length > 1 ? 's' : ''}</p>
      <div class="bacs ${it.categories.length >= 4 ? 'nombreux' : ''}" style="--n:${it.categories.length}">${it.categories.map((c, ci) => {
        const icone = it.icones?.[ci] || ICONES_BACS.find(([re]) => re.test(c))?.[1] || String.fromCharCode(65 + ci);
        const nb = Object.values(q.tries).filter(x => x === ci).length;
        return h`<button type="button" class="bac" data-bac="${ci}"><span class="bac-icone" aria-hidden="true">${icone}</span><span class="bac-nom">${c}</span>${brut(nb ? h`<span class="pastille">${nb}</span>` : '')}</button>`;
      })}</div>
    </div>`;
  }
  if (it.type === 'ordre') {
    const reste = q.presentation.ordre.filter(i => !q.places.includes(i));
    return h`${brut(q.places.length === 0 ? boutonPari() : '')}
    <ol class="chemin" aria-label="Chemin : ${q.places.length} sur ${it.elements.length}">
      ${q.places.map((i, pos) => h`<li class="dalle posee"><span class="dalle-num">${pos + 1}</span><span class="dalle-texte">${it.elements[i].texte}${brut(it.elements[i].info ? h`<small>${it.elements[i].info}</small>` : '')}</span></li>`)}
      ${brut(reste.length ? h`<li class="dalle suivante"><span class="dalle-num">${q.places.length + 1}</span><span class="consigne-courte">Quelle étape ?</span><span class="dalles-restantes" aria-hidden="true">${reste.slice(1).map(() => h`<span></span>`)}</span></li>` : '')}
    </ol>
    <div class="tuiles" role="group" aria-label="Étapes à placer">${reste.map((i, k) => h`<button type="button" class="tuile" data-tuile="${i}" style="--k:${k}">${it.elements[i].texte}</button>`)}</div>`;
  }
  return '';
}

function rafraichirJeu(q) {
  const zone = document.getElementById('zone-jeu');
  zone.innerHTML = rendreJeu(q);
  brancherQuestion(q, true);
}

function brancherQuestion(q, partiel = false) {
  const it = q.item;
  if (!partiel) {
    document.getElementById('quitter').addEventListener('click', quitter);
    document.getElementById('ecouter')?.addEventListener('click', () => lire(texteALire(q)));
  }
  if (q.resultat) return;
  document.getElementById('pari')?.addEventListener('click', () => {
    partie.pari = !partie.pari;
    partie.pari ? sons.pari() : sons.clic();
    const b = document.getElementById('pari');
    b.classList.toggle('arme', partie.pari);
    b.setAttribute('aria-pressed', String(partie.pari));
    b.textContent = libellePari();
    if (partie.pari) particules(b, ['⚡'], 6);
  });
  document.getElementById('indice')?.addEventListener('click', () => {
    // retire 2 mauvaises réponses (1 s'il n'y a que 3 options) : elles sont toutes vérifiées fausses
    const fausses = M.melanger(q.presentation.ordre.filter(i => !it.bonnes.includes(i)));
    q.masquees = fausses.slice(0, it.pave ? Math.floor(fausses.length / 2) : Math.min(2, fausses.length - 1));
    q.aide = true;
    // Pas d’audace sur une question aidée : un jeton déjà engagé est rendu
    const rendu = partie.pari;
    partie.pari = false;
    if (rendu) annoncer('Jeton d’audace rendu : il ne s’utilise pas avec un indice.');
    sons.carte();
    annoncer(`${q.masquees.length} mauvaise${q.masquees.length > 1 ? 's' : ''} réponse${q.masquees.length > 1 ? 's' : ''} retirée${q.masquees.length > 1 ? 's' : ''}`);
    rafraichirJeu(q);
    $app.querySelector('[data-choix]:not([disabled])')?.focus({ preventScroll: true });
  });
  // QCM : un appui = une réponse
  $app.querySelectorAll('[data-choix]').forEach(b => b.addEventListener('click', () => {
    const i = Number(b.dataset.choix);
    $app.querySelectorAll('[data-choix]').forEach(x => (x.disabled = true));
    b.classList.add('choisi');
    terminer(q, M.corriger(it, i).correct, { choisi: i, bouton: b });
  }));
  // Panier
  $app.querySelectorAll('[data-objet]').forEach(b => b.addEventListener('click', () => {
    const i = Number(b.dataset.objet);
    q.choix = q.choix.includes(i) ? q.choix.filter(x => x !== i) : [...q.choix, i];
    sons.carte();
    rafraichirJeu(q);
    $app.querySelector(`[data-objet="${i}"]`)?.focus({ preventScroll: true });
  }));
  document.getElementById('valider')?.addEventListener('click', () => {
    const res = M.corriger(it, q.choix);
    terminer(q, res.correct, { detail: res.detail });
  });
  // Tri
  const carte = document.getElementById('carte-tri');
  if (carte) {
    $app.querySelectorAll('[data-bac]').forEach(b => b.addEventListener('click', () => trier(q, Number(carte.dataset.element), Number(b.dataset.bac), b)));
    glisserCarte(carte, (bac) => trier(q, Number(carte.dataset.element), Number(bac.dataset.bac), bac));
  }
  // Chemin
  $app.querySelectorAll('[data-tuile]').forEach(b => b.addEventListener('click', () => placer(q, Number(b.dataset.tuile), b)));
}

function glisserCarte(carte, surDepot) {
  let depart = null;
  carte.addEventListener('pointerdown', e => {
    depart = { x: e.clientX, y: e.clientY, id: e.pointerId };
    carte.setPointerCapture(e.pointerId);
    carte.classList.add('tenue');
  });
  carte.addEventListener('pointermove', e => {
    if (!depart || e.pointerId !== depart.id) return;
    const dx = e.clientX - depart.x, dy = e.clientY - depart.y;
    carte.style.transform = `translate(${dx}px, ${dy}px) rotate(${dx / 12}deg)`;
    $app.querySelectorAll('[data-bac]').forEach(b => { const r = b.getBoundingClientRect(); b.classList.toggle('survol', e.clientX > r.left && e.clientX < r.right && e.clientY > r.top - 30 && e.clientY < r.bottom); });
  });
  const lacher = e => {
    if (!depart) return;
    const bac = [...$app.querySelectorAll('[data-bac]')].find(b => b.classList.contains('survol'));
    $app.querySelectorAll('[data-bac]').forEach(b => b.classList.remove('survol'));
    carte.classList.remove('tenue');
    const bouge = Math.hypot(e.clientX - depart.x, e.clientY - depart.y) > 12;
    depart = null;
    if (bac && bouge) surDepot(bac);
    else carte.style.transform = '';
  };
  carte.addEventListener('pointerup', lacher);
  carte.addEventListener('pointercancel', lacher);
}

async function trier(q, element, categorie, bac) {
  const it = q.item;
  const carte = document.getElementById('carte-tri');
  if (!carte || carte.dataset.verrou) return;
  carte.dataset.verrou = '1';
  const bonne = it.elements[element].categorie;
  if (categorie === bonne) {
    sons.pose();
    bac.classList.add('ok');
    particules(bac, ['✨'], 6);
  } else {
    q.erreurs++;
    sons.faux();
    vibrer(60);
    bac.classList.add('ko');
    secouer(carte);
    const bonBac = $app.querySelector(`[data-bac="${bonne}"]`);
    bonBac.classList.add('indice');
    annoncer(`Non : ${it.categories[bonne]}`);
    flotter(bonBac, `C’était ici`, 'indice');
    await attendre(900);
  }
  carte.classList.add('envolee');
  await attendre(220);
  q.tries[element] = bonne;
  if (Object.keys(q.tries).length === it.elements.length) {
    rafraichirJeu(q);
    return terminer(q, q.erreurs === 0, {});
  }
  rafraichirJeu(q);
  document.getElementById('carte-tri')?.focus({ preventScroll: true });
}

async function placer(q, i, tuile) {
  const it = q.item;
  if (tuile.disabled) return;
  if (i === q.places.length) {
    sons.pose();
    q.places.push(i);
    rafraichirJeu(q);
    const posee = $app.querySelectorAll('.dalle.posee');
    particules(posee[posee.length - 1], ['✨'], 5);
    if (q.places.length === it.elements.length) return terminer(q, q.erreurs === 0, {});
    $app.querySelector('[data-tuile]')?.focus({ preventScroll: true });
  } else {
    q.erreurs++;
    sons.faux();
    vibrer(60);
    secouer(tuile);
    tuile.classList.add('ko');
    $app.querySelector('.dalle.suivante')?.classList.add('indice');
    annoncer('Pas encore celle-ci');
    setTimeout(() => tuile.classList.remove('ko'), 600);
  }
}

// --- fin d'un défi

function terminer(q, correct, extra) {
  const profil = profilActif();
  const it = q.item;
  const pari = partie.pari;
  if (pari) partie.jetons = Math.max(0, partie.jetons - 1);
  const revanche = q.deuxiemeChance;
  const bilan = it.vf
    ? M.enregistrerVraiFaux(profil, q.vf, correct, { serie: partie.serie, serieDejaPayee: partie.serieBonus })
    : M.enregistrerReponse(profil, banque, it, { correct, confiance: pari ? 'sur' : 'hesite', serie: partie.serie, aide: q.aide, revanche, serieDejaPayee: partie.serieBonus });
  if (bilan.bonusSerie) partie.serieBonus = true;
  if (revanche && correct && !q.aide) partie.revanches++;
  const pertes = partie.arcade ? M.viesPerdues(correct) : 0;
  partie.vies = Math.max(0, partie.vies - pertes);
  sauver();
  q.resultat = { correct, pari, pertes, ...bilan, ...extra };
  partie.serie = bilan.serie;
  partie.xp += bilan.xp;
  partie.pari = false;
  if (correct && !q.deuxiemeChance) partie.bonnes++;
  if (bilan.fiche) partie.fiches.push({ item: it, ...bilan.fiche });
  partie.badges.push(...bilan.badgesNouveaux);
  if (bilan.niveauMonte) partie.niveau = bilan.niveauMonte;
  // Revanche : la question revient après au moins 2 autres ; sinon, à la prochaine tournée (boîte 1)
  q.revancheAPlus = false;
  if (!correct && !q.deuxiemeChance && !['defi', 'vraifaux'].includes(partie.mode) && !partie.rejouees.has(it.id)) {
    partie.rejouees.add(it.id);
    if (partie.file.length - partie.index - 1 >= 2) partie.file.push({ item: it, deuxiemeChance: true });
    else q.revancheAPlus = true;
  }
  // réactions
  const pnj = document.getElementById('pnj');
  pnj?.classList.add(correct ? 'content' : 'triste');
  const humeur = pnj?.querySelector('.pnj-humeur');
  if (humeur) humeur.textContent = correct ? '😊' : '😟';
  if (correct) {
    pari ? sons.pari() : sons.juste();
    if (partie.serie >= 2) setTimeout(() => sons.combo(partie.serie), 250);
    particules(extra.bouton || pnj, pari ? ['⚡', '⭐', '💛'] : ['⭐', '✨', '💚']);
    if (bilan.xp) flotter(pnj, `+${bilan.xp} ⭐`);
  } else {
    sons.faux();
    if (pertes) setTimeout(() => sons.coeur(), 200);
    vibrer([80, 40, 80]);
    secouer(document.querySelector('.partie'));
    if (pertes) flotter(document.querySelector('.coeurs'), `−${pertes} ❤️`, 'perte');
  }
  // marquer les réponses du QCM
  if (it.type === 'qcm') $app.querySelectorAll('[data-choix]').forEach(b => {
    const i = Number(b.dataset.choix);
    if (it.bonnes.includes(i)) b.classList.add('juste');
    else if (i === extra.choisi) b.classList.add('faux');
    else b.classList.add('eteint');
  });
  if (it.type === 'multi') $app.querySelectorAll('[data-objet]').forEach(b => {
    const i = Number(b.dataset.objet);
    b.disabled = true;
    b.classList.add(it.bonnes.includes(i) ? 'juste' : q.choix.includes(i) ? 'faux' : 'eteint');
  });
  document.querySelector('.outils-question')?.remove();
  if (voixDispo()) speechSynthesis.cancel();
  document.getElementById('valider')?.setAttribute('disabled', '');
  majHudPartie();
  setTimeout(() => afficherResultat(q, true), correct ? 450 : 650);
}

function majHudPartie() {
  const j = document.querySelector('.jetons');
  if (j) { j.innerHTML = Array.from({ length: M.JETONS_AUDACE }, (_, i) => `<span class="${i < partie.jetons ? '' : 'utilise'}" aria-hidden="true">⚡</span>`).join(''); j.setAttribute('aria-label', `${partie.jetons} jeton${partie.jetons > 1 ? 's' : ''} d’audace`); }
  const c = document.querySelector('.coeurs');
  if (c) c.innerHTML = Array.from({ length: M.VIES }, (_, i) => `<span class="${i < partie.vies ? '' : 'perdu'}" aria-hidden="true">${i < partie.vies ? '❤️' : '🖤'}</span>`).join('');
  const k = document.querySelector('.combo');
  if (k) { k.textContent = `🔥×${partie.serie}`; k.classList.toggle('visible', partie.serie >= 2); k.classList.toggle('feu', partie.serie >= 5); }
}

function premierePhrase(t) {
  const m = t.match(/^.{20,}?[.!?](\s|$)/);
  return m && m[0].length < t.length - 10 ? m[0].trim() : t;
}

function afficherResultat(q, anime) {
  const r = q.resultat, it = q.item;
  const zone = document.getElementById('resultat');
  const titres = r.correct ? ['Bravo !', 'Génial !', 'Parfait !', 'Trop fort !', 'Bien joué !'] : ['Pas encore !', 'Presque !', 'Pas cette fois'];
  const titre = titres[(partie.index + partie.xp) % titres.length];
  const court = premierePhrase(it.pourquoi);
  let solution = '';
  if (it.vf) solution = h`<p class="solution vf-rappel">« ${it.enonce} » <strong>${it.options[it.bonnes[0]].toUpperCase()}</strong></p>`;
  else if (!r.correct && it.type === 'qcm') solution = h`<p class="solution">✔ ${it.options[it.bonnes[0]]}</p>`;
  if (!r.correct && it.type === 'multi') solution = h`<p class="solution">✔ ${it.bonnes.map(b => it.options[b]).join(' · ')}</p>`;
  if (!r.correct && (it.type === 'tri' || it.type === 'ordre')) solution = h`<p class="solution">${q.erreurs} erreur${q.erreurs > 1 ? 's' : ''} : tu feras mieux la prochaine fois !</p>`;
  const ko = partie.arcade && partie.vies <= 0;
  const fin = ko || partie.index + 1 >= partie.file.length;
  zone.innerHTML = h`<div class="carte-resultat ${r.correct ? 'gagne' : 'perdu'} ${anime ? 'monte' : ''}" role="region" aria-labelledby="res-titre">
    <div class="res-tete">
      <span class="res-icone" aria-hidden="true">${r.correct ? (r.pari ? '⚡' : '🎉') : '💡'}</span>
      <h2 id="res-titre" tabindex="-1">${titre}</h2>
      ${brut(r.xp ? h`<span class="gain">+${r.xp} ⭐</span>` : '')}
    </div>
    ${brut(r.pari ? h`<p class="res-pari">${r.correct ? '⚡ Audace payante : +5 ⭐ !' : '⚡ Jeton utilisé. Rien de perdu : lis bien la bonne réponse.'}</p>` : '')}
    ${brut(q.deuxiemeChance && r.correct && !q.aide ? h`<p class="res-pari">🔁 Revanche réussie : tu as corrigé ton erreur !</p>` : '')}
    ${brut(!r.correct && !q.deuxiemeChance && !['defi', 'vraifaux'].includes(partie.mode) ? h`<p class="res-revanche">🔁 ${q.revancheAPlus ? 'Tu pourras réessayer à ta prochaine tournée.' : 'Tu vas pouvoir réessayer plus loin.'}</p>` : '')}
    ${brut(solution)}
    <p class="res-pourquoi">💡 <span id="pourquoi">${court}</span>${brut(court !== it.pourquoi ? h` <button type="button" class="lien-plus" id="plus">${r.correct ? 'Lire plus' : 'Comprendre pourquoi'}</button>` : '')}</p>
    ${brut(r.fiche ? h`<div class="res-fiche rarete-${r.fiche.rarete}"><span aria-hidden="true">🃏</span> ${r.fiche.nouvelle ? 'Nouvelle carte' : 'Carte améliorée'} : <strong>${it.fiche.titre}</strong></div>` : '')}
    <button type="button" class="btn btn-principal btn-large" id="suivant">${ko ? 'Voir le score 💫' : fin ? 'Résultats 🏁' : 'Suivant ▶'}</button>
  </div>`;
  document.getElementById('plus')?.addEventListener('click', e => { document.getElementById('pourquoi').textContent = it.pourquoi; e.target.remove(); });
  document.getElementById('suivant').addEventListener('click', () => { sons.clic(); suivant(); });
  const t = document.getElementById('res-titre');
  t.focus({ preventScroll: true });
  zone.querySelector('.carte-resultat').scrollIntoView({ block: 'end', behavior: mouvementReduit() ? 'auto' : 'smooth' });
  if (r.fiche && anime) setTimeout(() => { sons.piece(); particules(zone.querySelector('.res-fiche'), ['🃏', '✨'], 8); }, 300);
}

function suivant() {
  if (voixDispo()) speechSynthesis.cancel();
  if (partie.arcade && partie.vies <= 0) return ecranFin(true);
  partie.index++;
  if (partie.index >= partie.file.length) return ecranFin(false);
  preparerQuestion();
  ecranQuestion();
}

function quitter() {
  const b = document.getElementById('quitter');
  const engage = partie.index > 0 || partie.file[partie.index].resultat;
  if (!engage || b.dataset.armer) { partie = null; return aller(routeQuartier()); }
  b.dataset.armer = '1';
  b.textContent = 'Quitter ?';
  b.classList.add('armer');
  annoncer('Appuie encore pour quitter. Ta progression est enregistrée.');
  setTimeout(() => { if (b.isConnected) { delete b.dataset.armer; b.textContent = '✕'; b.classList.remove('armer'); } }, 3000);
}

// Raccourcis clavier pendant une partie (ordinateur)
document.addEventListener('keydown', e => {
  if (!partie || (location.hash.slice(1) || '/') !== '/partie' || e.target.matches('input, textarea')) return;
  const q = partie.file[partie.index];
  if (q?.resultat && (e.key === 'Enter' || e.key === ' ') && !e.target.closest('button')) { e.preventDefault(); document.getElementById('suivant')?.click(); return; }
  if (/^[1-9]$/.test(e.key)) {
    const k = Number(e.key) - 1;
    const b = $app.querySelectorAll('[data-choix]:not(.masquee), [data-bac], [data-tuile], [data-objet]')[k];
    if (b && !b.disabled) { e.preventDefault(); b.click(); }
  }
  if (q?.item.vf && !q.resultat && ['v', 'f'].includes(e.key.toLowerCase())) $app.querySelector(`.vf-${e.key.toLowerCase() === 'v' ? 'vrai' : 'faux'}`)?.click();
  if (e.key.toLowerCase() === 'p') document.getElementById('pari')?.click();
  if (e.key.toLowerCase() === 'i') document.getElementById('indice')?.click();
});

// ------------------------------------------------------------------ fin de partie

async function ecranFin(ko) {
  const profil = profilActif();
  const p = partie;
  let bonus = { xp: 0 };
  if (!ko) {
    bonus = M.terminerPartie(profil, { mode: p.mode, mission: p.mission?.id, score: p.bonnes });
    sauver();
    p.xp += bonus.xp;
    if (bonus.niveauMonte) p.niveau = bonus.niveauMonte;
  }
  const etoiles = ko ? 0 : M.etoilesPartie(p.bonnes, p.total);
  const fichesApres = M.collection(profil, banque).filter(f => f.rarete).length;
  const nouvellesDecos = M.DECORATIONS.filter(d => p.fichesAvant < d.fiches && fichesApres >= d.fiches);
  const rejouer = { mode: p.mode, lieu: p.lieu?.id, mission: p.mission?.id, quartier: p.quartier, atelier: p.atelier };
  partie = null;
  afficher(h`<main class="ecran-centre ${ko ? 'fond-ko' : 'fond-victoire'}"><div class="panneau fin">
    <p class="gros-emoji rebond" aria-hidden="true">${ko ? '😵' : etoiles === 3 ? '🏆' : '🏁'}</p>
    <h1 tabindex="-1" data-focus>${ko ? 'Plus de cœurs !' : p.mode === 'defi' ? 'Boss vaincu !' : p.mode === 'mission' ? 'Quête accomplie !' : p.mode === 'vraifaux' ? 'Manche terminée !' : 'Tournée terminée !'}</h1>
    ${brut(ko ? h`<p class="sous-titre">Pause goûter ☕ Tes erreurs t’attendent dans la ville. (Tu peux couper le mode cœurs dans le menu ☰.)</p>` : h`<div class="etoiles-fin" aria-label="${etoiles} étoile${etoiles > 1 ? 's' : ''} sur 3">${[0, 1, 2].map(k => h`<span class="${k < etoiles ? 'pleine' : ''}" style="--k:${k}" aria-hidden="true">★</span>`)}</div>`)}
    <div class="score-fin"><span><strong>${p.bonnes}<small>/${p.total}</small></strong><small>réussis</small></span><span><strong id="compteur-xp">0</strong> <small>⭐ gagnées</small></span></div>
    ${brut(p.mode === 'vraifaux' ? h`<ul class="bilan-vf">${p.file.map(x => h`<li class="${x.resultat?.correct ? 'ok' : 'revoir'}"><span aria-hidden="true">${x.resultat?.correct ? '✅' : '🔁'}</span> <span class="sr-only">${x.resultat?.correct ? 'Compris :' : 'À revoir :'}</span> ${x.vf.affirmation} <strong>${x.vf.vrai ? 'Vrai' : 'Faux'}</strong></li>`)}</ul>` : '')}
    ${brut(p.revanches ? h`<p class="annonce">🔁 ${p.revanches} erreur${p.revanches > 1 ? 's' : ''} corrigée${p.revanches > 1 ? 's' : ''} pendant la partie : c’est comme ça qu’on progresse !</p>` : '')}
    ${brut(p.niveau ? h`<p class="annonce niveau">${p.niveau.icone} Niveau ${p.niveau.rang + 1} : <strong>${p.niveau.nom}</strong> !</p>` : '')}
    ${brut(nouvellesDecos.map(d => h`<p class="annonce annonce-deco">${d.icone} Nouveau dans la ville : <strong>${d.nom}</strong></p>`).join(''))}
    ${brut(p.badges.map(b => h`<p class="annonce">${b.badge.icone} ${b.atelier.titre}</p>`).join(''))}
    ${brut(p.fiches.length ? h`<div class="fiches-gagnees" aria-label="${p.fiches.length} carte${p.fiches.length > 1 ? 's' : ''} gagnée${p.fiches.length > 1 ? 's' : ''}">${p.fiches.slice(0, 8).map((f, k) => h`<span class="mini-carte rarete-${f.rarete}" style="--k:${k}" title="${f.item.fiche.titre}">${banque.ateliers.find(a => a.id === f.item.atelier).icone}</span>`)}${brut(p.fiches.length > 8 ? h`<span class="mini-carte">+${p.fiches.length - 8}</span>` : '')}</div>` : '')}
    <div class="actions-fin">
      <button type="button" class="btn btn-principal btn-large" id="rejouer">${ko ? 'Réessayer ↻' : p.mode === 'defi' ? 'Partie surprise 🎁' : p.mode === 'vraifaux' ? 'Une autre manche ⚡' : 'Rejouer ↻'}</button>
      <a class="btn btn-large" href="#${routeQuartier()}">Carte 🗺️</a>
    </div>
  </div></main>`);
  ko ? sons.defaite() : sons.victoire();
  // compteur de points animé
  const c = document.getElementById('compteur-xp');
  const total = p.xp, debut = performance.now(), duree = mouvementReduit() ? 0 : 900;
  const anim = t => { const k = duree ? Math.min(1, (t - debut) / duree) : 1; c.textContent = Math.round(total * k); if (k < 1) requestAnimationFrame(anim); };
  requestAnimationFrame(anim);
  if (!ko && (etoiles === 3 || p.niveau || nouvellesDecos.length)) { await attendre(500); confettis(); if (p.niveau) sons.niveau(); }
  document.getElementById('rejouer').addEventListener('click', () => { sons.clic(); lancer(p.mode === 'defi' && !ko ? { mode: 'surprise' } : rejouer); });
}

// ------------------------------------------------------------------ album

function carte(item, rarete, aRevoir) {
  const at = banque.ateliers.find(a => a.id === item.atelier);
  if (!rarete) return h`<div class="carte-album verrou" aria-label="Carte à découvrir"><span aria-hidden="true">${at.icone}</span><span aria-hidden="true">?</span></div>`;
  return h`<button type="button" class="carte-album rarete-${rarete}" aria-expanded="false" aria-label="${item.fiche.titre}">
    <span class="face avant"><span class="carte-icone" aria-hidden="true">${at.icone}</span><strong>${item.fiche.titre}</strong><span class="carte-rarete" aria-hidden="true">${{ bronze: '🥉', argent: '🥈', or: '🥇' }[rarete]}</span>${brut(aRevoir ? h`<span class="carte-revoir" aria-hidden="true">🔁</span>` : '')}</span>
    <span class="face arriere">${item.fiche.texte}</span>
  </button>`;
}

function ecranAlbum(profil, filtre = 'tout') {
  const toutes = M.collection(profil, banque);
  const lieu = banque.lieux.find(l => l.id === filtre);
  const liste = toutes.filter(f => !lieu || lieu.ateliers.includes(f.item.atelier));
  const debloquees = liste.filter(f => f.rarete);
  // Prochaines cartes : d'abord celles ratées, puis celles des ateliers déjà commencés, puis des découvertes
  const commences = new Set(liste.filter(f => M.etatItem(profil, f.item.id).b > 0).map(f => f.item.atelier));
  const sans = liste.filter(f => !f.rarete).map(f => ({ ...f, rate: M.etatItem(profil, f.item.id).b === 1 }));
  const vusAteliers = new Set();
  const prochaines = [...sans.filter(f => f.rate), ...sans.filter(f => !f.rate && commences.has(f.item.atelier)), ...sans.filter(f => !f.rate && !commences.has(f.item.atelier))]
    .filter(f => !vusAteliers.has(f.item.atelier) && vusAteliers.add(f.item.atelier)).slice(0, 6);
  afficher(h`${brut(hud(profil))}<main class="ecran-liste">
    <div class="titre-ligne"><h1 tabindex="-1" data-focus>🃏 Album</h1><span class="compte">${toutes.filter(f => f.rarete).length}/${toutes.length}</span>
      <button type="button" class="hud-bouton clair" id="imprimer" aria-label="Imprimer mes cartes" ${debloquees.length ? '' : 'disabled'}>🖨️</button></div>
    <div class="onglets" role="group" aria-label="Filtrer par lieu">
      <button type="button" class="onglet ${filtre === 'tout' ? 'actif' : ''}" data-filtre="tout" aria-pressed="${filtre === 'tout'}">Tout</button>
      ${banque.lieux.map(l => h`<button type="button" class="onglet ${filtre === l.id ? 'actif' : ''}" data-filtre="${l.id}" aria-pressed="${filtre === l.id}" aria-label="${l.nom}">${l.icone}</button>`)}
    </div>
    ${brut(debloquees.length ? h`<p class="astuce">Touche une carte pour la retourner</p>` : '')}
    ${brut(debloquees.length ? h`<div class="album">${debloquees.map(f => carte(f.item, f.rarete, f.aRevoir))}</div>` : h`<p class="astuce">Réussis des défis pour gagner tes premières cartes 🃏</p>`)}
    ${brut(prochaines.length ? h`<h2>🎯 Prochaines cartes</h2><p class="astuce">Touche une carte pour aller la gagner.</p><div class="prochaines">${prochaines.map(f => { const at = banque.ateliers.find(a => a.id === f.item.atelier); const l = lieuDe(f.item); return h`<button type="button" class="carte-prochaine ${f.rate ? 'reconquerir' : ''}" data-atelier="${at.id}"><span class="cp-icone" aria-hidden="true">${at.icone}</span><strong>${at.titre}</strong><small>${f.rate ? '🔁 Ratée : à reconquérir' : '✨ Presque à toi'} · ${l?.nom || ''}</small></button>`; })}</div>` : '')}
    ${brut(liste.length > debloquees.length ? h`<h2>🔒 Encore ${liste.length - debloquees.length} à découvrir</h2><ul class="verrous-lieux">${banque.lieux.filter(l => !lieu || l === lieu).map(l => { const n = liste.filter(f => !f.rarete && l.ateliers.includes(f.item.atelier)).length; return n ? h`<li><span aria-hidden="true">${l.icone}</span> ${l.nom} : ${n}</li>` : ''; })}</ul>` : '')}
  </main>${brut(dock('/album'))}`, { focus: filtre === 'tout' });
  $app.querySelectorAll('[data-filtre]').forEach(b => b.addEventListener('click', () => { sons.clic(); ecranAlbum(profil, b.dataset.filtre); $app.querySelector(`[data-filtre="${b.dataset.filtre}"]`)?.focus(); }));
  $app.querySelectorAll('.carte-album:not(.verrou)').forEach(b => b.addEventListener('click', () => {
    sons.carte();
    const ouvert = b.classList.toggle('retournee');
    b.setAttribute('aria-expanded', String(ouvert));
  }));
  document.getElementById('imprimer').addEventListener('click', () => window.print());
  $app.querySelectorAll('[data-atelier]').forEach(b => b.addEventListener('click', () => { sons.clic(); lancer({ mode: 'entrainement', atelier: b.dataset.atelier }); }));
}

// ------------------------------------------------------------------ trophées

function ecranTrophees(profil) {
  const n = M.niveauDe(profil.xp);
  const fiches = M.collection(profil, banque).filter(f => f.rarete).length;
  afficher(h`${brut(hud(profil))}<main class="ecran-liste">
    <h1 tabindex="-1" data-focus>🏆 Trophées</h1>
    <section class="route-niveaux" aria-label="Niveaux">${M.NIVEAUX.map((x, i) => h`<div class="etape-niveau ${i < n.rang ? 'passe' : i === n.rang ? 'actuel' : ''}"><span class="rond" aria-hidden="true">${x.icone}</span><span>${x.nom}</span>${brut(i === n.rang && n.suivant ? h`<span class="barre-mini"><span style="width:${pct(n.progression)}%"></span></span>` : '')}</div>`)}</section>
    <h2>⭐ Ateliers</h2>
    <div class="grille-trophees">${banque.lieux.map(l => h`<section class="bloc-lieu" style="--c:${l.couleur}"><h3><span aria-hidden="true">${l.icone}</span> ${l.nom}</h3>
      ${l.ateliers.map(id => { const a = banque.ateliers.find(x => x.id === id); const m = M.maitriseAtelier(profil, banque, id); const b = M.badgeDe(m.maitrise); const nb = b ? M.BADGES.indexOf(b) + 1 : 0;
        return h`<div class="ligne-atelier"><span aria-hidden="true">${a.icone}</span><span class="nom">${a.titre}</span><span class="etoiles" aria-label="${nb} étoile${nb > 1 ? 's' : ''} sur 3">${[0, 1, 2].map(k => h`<span class="${k < nb ? 'pleine' : ''}" aria-hidden="true">★</span>`)}</span></div>`; })}
    </section>`)}</div>
    <h2>🏙️ Décorations</h2>
    <div class="decos">${M.DECORATIONS.map(d => h`<div class="deco-trophee ${fiches >= d.fiches ? 'ok' : ''}" title="${d.nom}"><span aria-hidden="true">${fiches >= d.fiches ? d.icone : '🔒'}</span><small>${fiches >= d.fiches ? d.nom : `${d.fiches} 🃏`}</small></div>`)}</div>
  </main>${brut(dock('/trophees'))}`);
}

// ------------------------------------------------------------------ sauvegarde

async function ecranSauvegarde(profil) {
  const code = profil ? await M.exporterCode(profil) : '';
  afficher(h`${brut(profil ? hud(profil) : '')}<main class="ecran-liste etroit">
    <h1 tabindex="-1" data-focus>💾 Sauvegarde</h1>
    ${brut(profil ? h`<section class="panneau-clair pile">
      <h2>Mon code</h2>
      <p class="astuce">Garde-le pour jouer sur un autre appareil, ou donne-le à ton prof.</p>
      <textarea class="code" readonly rows="3" id="code" aria-label="Code de sauvegarde">${code}</textarea>
      <div class="rangee"><button class="btn btn-principal" type="button" id="copier">📋 Copier</button><button class="btn" type="button" id="telecharger">⬇️ Fichier</button></div>
    </section>` : '')}
    <section class="panneau-clair pile">
      <h2>Charger un code</h2>
      <textarea class="code" rows="3" id="code-import" aria-label="Coller un code de sauvegarde" placeholder="LPG1z.…"></textarea>
      <p class="erreur" id="erreur-import" role="alert" hidden></p>
      <button class="btn btn-principal" type="button" id="importer">Charger</button>
    </section>
    <a class="lien-discret" href="#${profil ? '/' : '/profils'}">← Retour</a>
  </main>`);
  document.getElementById('copier')?.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(code); } catch (e) { const z = document.getElementById('code'); z.select(); document.execCommand('copy'); }
    sons.piece(); toast('Code copié ✅');
  });
  document.getElementById('telecharger')?.addEventListener('click', () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([code], { type: 'text/plain' }));
    a.download = `labo-pro-${filiere}-${profil.pseudo.replace(/[^\p{L}\p{N}_-]+/gu, '_')}.txt`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });
  document.getElementById('importer').addEventListener('click', async () => {
    const err = document.getElementById('erreur-import');
    try {
      const p = await M.importerCode(document.getElementById('code-import').value);
      if (p.filiere !== filiere) throw new Error(`Ce code est pour ${FILIERES[p.filiere]?.nom || p.filiere}.`);
      const existant = stock.profils[p.id];
      if (!existant || p.xp >= existant.xp) stock.profils[p.id] = p;
      stock.actif[filiere] = p.id; sauver();
      sons.victoire(); toast(`Re-bonjour ${p.pseudo} !`);
      aller('/');
    } catch (e) { err.hidden = false; err.textContent = e.message || 'Code illisible.'; sons.faux(); }
  });
}

// ------------------------------------------------------------------ aide

function ecranAide() {
  const ligne = (icone, titre, texte) => h`<div class="ligne-aide"><span class="aide-icone" aria-hidden="true">${icone}</span><div><strong>${titre}</strong><span>${texte}</span></div></div>`;
  afficher(h`<main class="ecran-liste etroit">
    <h1 tabindex="-1" data-focus>❓ Comment jouer</h1>
    <div class="panneau-clair pile">
      ${brut(ligne('🏠', 'Touche un bâtiment', 'Aide ses habitants : chaque réponse juste rapporte des ⭐.'))}
      ${brut(ligne('▶', 'Ma tournée', '6 défis choisis pour toi : ce que tu dois revoir, ce que tu as raté, et une découverte.'))}
      ${brut(ligne('🔁', 'Le droit à l’erreur', 'Une partie va toujours jusqu’au bout. Une question ratée revient plus loin : réussis ta revanche (+6 ⭐) !'))}
      ${brut(ligne('💡', 'L’indice', 'Il retire des mauvaises réponses. La question rapporte alors 7 ⭐ au lieu de 10.'))}
      ${brut(ligne('✔', 'Vrai ou faux éclair', '4 affirmations à juger, sans chrono. Une erreur ? La correction tient en une phrase, et l’affirmation reviendra.'))}
      ${brut(ligne('🎬', 'Cas pro', 'Une situation de stage en 3 décisions. Tes choix changent la suite ; à la fin, tu vois ce que tu as bien fait et ce qui reste à travailler. Rejoue pour découvrir l’autre fin !'))}
      ${brut(ligne('⚡', 'Les jetons d’audace', 'Deux par partie. Sûr·e de toi ? Engage un jeton : +5 ⭐ si c’est juste, rien de perdu sinon.'))}
      ${brut(ligne('📅', '3 jours par semaine', 'Ton objectif : jouer au moins 3 jours sur 7. Une absence ne remet rien à zéro.'))}
      ${brut(ligne('⚙️', 'Ton confort', 'Menu ☰ : taille du texte, police lisible, lecture audio, animations, mode cœurs.'))}
      ${brut(ligne('❗', 'Les révisions', 'Ceux que tu n’as pas su aider reviennent te voir plus tard. C’est comme ça qu’on retient !'))}
      ${brut(ligne('🃏', 'Les cartes', 'Chaque réussite te donne une carte mémo. Elle devient 🥈 puis 🥇 si tu réussis encore les jours suivants.'))}
      ${brut(ligne('⏰', 'Le boss du jour', 'Les mêmes défis pour toute la classe. Une fois par jour.'))}
      ${brut(ligne('🏙️', 'Ta ville', 'Plus tu as de cartes, plus ton quartier s’embellit.'))}
    </div>
    <a class="btn btn-principal btn-large" href="#/">J’ai compris ▶</a>
  </main>`);
}

demarrer();
if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('../sw.js').catch(() => {});
