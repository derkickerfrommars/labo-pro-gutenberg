// Labo de biologie ASSP : lit les questions « bio-* » de ../contenu/assp.json (même banque que le mode jeu).
// Aucune donnée n'est envoyée : les meilleurs scores restent dans le navigateur de l'élève.

const $app = document.getElementById('app');
const CLE = 'lp-bio';
let banque, lieux, ateliers, items;

// ------------------------------------------------------------ outils
const echapper = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function h(chaines, ...vals) {
  return chaines.reduce((acc, s, i) => {
    let v = i ? vals[i - 1] : '';
    if (Array.isArray(v)) v = v.join('');
    else if (v && typeof v === 'object' && 'brut' in v) v = v.brut;
    else if (i) v = echapper(v);
    return acc + v + s;
  });
}
const brut = s => ({ brut: s });
const melanger = t => { const a = [...t]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const hasard = t => t[Math.floor(Math.random() * t.length)];
const annoncer = t => { const a = document.getElementById('annonces'); a.textContent = ''; setTimeout(() => (a.textContent = t), 30); };
const mouvementReduit = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

function lireStock() { try { return JSON.parse(localStorage.getItem(CLE)) || {}; } catch { return {}; } }
function ecrireStock(s) { try { localStorage.setItem(CLE, JSON.stringify(s)); } catch { /* navigation privée : tant pis */ } }
const meilleur = id => lireStock().meilleurs?.[id] ?? null;
function noterScore(id, pct) {
  const s = lireStock();
  s.meilleurs = s.meilleurs || {};
  const record = s.meilleurs[id] == null || pct > s.meilleurs[id];
  if (record) s.meilleurs[id] = pct;
  ecrireStock(s);
  return record;
}
const etoiles = pct => (pct == null ? 0 : pct >= 90 ? 3 : pct >= 70 ? 2 : pct >= 40 ? 1 : 0);
const rangEtoiles = n => h`${[0, 1, 2].map(k => h`<span class="${k < n ? 'ok' : ''}">★</span>`)}`;

function confettis() {
  if (mouvementReduit()) return;
  const zone = document.getElementById('celebration');
  const couleurs = ['#0b7a75', '#ffd25e', '#ef4444', '#6366f1', '#ec4899', '#10b981'];
  for (let i = 0; i < 70; i++) {
    const c = document.createElement('span');
    c.className = 'confetti';
    c.style.left = Math.random() * 100 + '%';
    c.style.background = hasard(couleurs);
    c.style.animationDelay = Math.random() * 0.5 + 's';
    zone.appendChild(c);
    setTimeout(() => c.remove(), 2600);
  }
}

// Messages d'encouragement : variés pour ne pas lasser
const BRAVO = ['Bien joué ! 🎉', 'Excellent ! 🌟', 'Parfait, tu maîtrises ! 💪', 'Trop fort·e ! 🚀', 'Bravo, c’est ça ! ✅', 'Yes ! Ton cerveau chauffe 🧠🔥', 'Pile poil ! 🎯'];
const COURAGE = ['Pas grave, c’est en se trompant qu’on retient ! 💡', 'Presque ! Lis bien l’explication 👇', 'Oups ! Cette question reviendra, tu l’auras la prochaine fois 💪', 'Une erreur = une nouvelle connexion dans ton cerveau 🧠', 'On apprend ensemble : regarde la correction 👀'];
const SERIES = { 3: '🔥 3 d’affilée !', 5: '⚡ 5 d’affilée, en feu !', 8: '🌋 8 d’affilée, incroyable !', 12: '👑 12 d’affilée, légende du labo !' };

// ------------------------------------------------------------ routeur
async function demarrer() {
  try {
    banque = await (await fetch('../contenu/assp.json')).json();
  } catch {
    $app.innerHTML = '<p class="chargement">Impossible de charger les questions. Vérifie ta connexion puis recharge la page 🔄</p>';
    return;
  }
  lieux = banque.lieux.filter(l => l.quartier === 'sante');
  const idsBio = new Set(lieux.flatMap(l => l.ateliers));
  ateliers = banque.ateliers.filter(a => idsBio.has(a.id));
  items = banque.items.filter(i => idsBio.has(i.atelier));
  addEventListener('hashchange', router);
  router();
}

function router() {
  const [route, arg] = location.hash.replace(/^#\/?/, '').split('/');
  quiz = null;
  if (route === 'atelier' && ateliers.some(a => a.id === arg)) return lancer({ id: arg, titre: atelier(arg).titre, icone: atelier(arg).icone, questions: melanger(items.filter(i => i.atelier === arg)) });
  if (route === 'eclair') return lancer({ id: 'eclair', titre: 'Révision éclair', icone: '⚡', questions: melanger(items).slice(0, 10) });
  if (route === 'fiches') return ecranFiches(arg);
  return ecranAccueil();
}
const atelier = id => ateliers.find(a => a.id === id);
const lieuDe = idAtelier => lieux.find(l => l.ateliers.includes(idAtelier));
function afficher(html) {
  $app.innerHTML = html;
  scrollTo({ top: 0 });
  $app.querySelector('[data-focus]')?.focus({ preventScroll: true });
}

// ------------------------------------------------------------ accueil
function ecranAccueil() {
  const total = ateliers.length;
  const reussis = ateliers.filter(a => etoiles(meilleur(a.id)) >= 2).length;
  const toutesEtoiles = ateliers.reduce((s, a) => s + etoiles(meilleur(a.id)), 0);
  afficher(h`
  <section class="hero">
    <div>
      <div class="surtitre">Bac Pro ASSP · Biologie et microbiologie</div>
      <h1 tabindex="-1" data-focus>Le labo du corps humain</h1>
      <p>${items.length} défis sur tout le programme : cellules, microbes, cœur, cerveau, peau, grossesse… Chaque réponse est expliquée et se termine par une fiche « À retenir ».</p>
      <div class="hero-actions">
        <a class="btn jeu" href="#/eclair">⚡ Révision éclair (10 questions)</a>
        <a class="btn clair" href="#/fiches">🧠 Fiches mémo</a>
        <a class="btn clair" href="../jeu/?f=assp#/sante">🎮 Jouer à la Cité Santé</a>
      </div>
      <div class="jauge" aria-label="${toutesEtoiles} étoiles sur ${total * 3}">
        <div class="jauge-barre"><span style="width:${Math.round((toutesEtoiles / (total * 3)) * 100)}%"></span></div>
        <small>⭐ ${toutesEtoiles} / ${total * 3} étoiles · ${reussis} atelier${reussis > 1 ? 's' : ''} sur ${total} réussi${reussis > 1 ? 's' : ''}${toutesEtoiles === 0 ? ' · Choisis un atelier pour commencer !' : ''}</small>
      </div>
    </div>
    <div class="hero-art" aria-hidden="true"><span>🫀</span><span>🦠</span><span>🧬</span></div>
  </section>
  ${lieux.map(l => h`
  <section class="lieu" style="--c:${l.couleur}">
    <div class="lieu-titre"><span class="pastille" aria-hidden="true">${l.icone}</span><h2>${l.nom}</h2></div>
    <div class="grille">${l.ateliers.map(atelier).map(a => {
      const pct = meilleur(a.id), n = items.filter(i => i.atelier === a.id).length;
      return h`<a class="atelier" href="#/atelier/${a.id}" style="text-decoration:none;color:inherit" aria-label="${a.titre}, ${n} questions${pct != null ? `, meilleur score ${pct} %` : ''}">
        <span class="ic" aria-hidden="true">${a.icone}</span>
        <strong>${a.titre}</strong>
        <span class="meta">${n} défis${pct != null ? ` · record ${pct} %` : ' · nouveau ✨'}</span>
        <span class="etoiles" aria-hidden="true">${brut(rangEtoiles(etoiles(pct)))}</span>
        ${brut(a.programme ? h`<span class="programme">📘 ${a.programme}</span>` : '')}
      </a>`;
    })}</div>
  </section>`)}`);
}

// ------------------------------------------------------------ quiz
let quiz = null;

function lancer({ id, titre, icone, questions }) {
  quiz = { id, titre, icone, questions, i: 0, bonnes: 0, serie: 0, erreurs: [] };
  question();
}

function question() {
  const q = quiz, it = q.questions[q.i];
  const lieu = lieuDe(it.atelier);
  q.etat = { it, fini: false };
  if (it.type === 'qcm') q.etat.ordre = it.ordreFixe ? it.options.map((_, k) => k) : melanger(it.options.map((_, k) => k));
  if (it.type === 'multi') { q.etat.ordre = melanger(it.options.map((_, k) => k)); q.etat.choix = new Set(); }
  if (it.type === 'ordre') { q.etat.tuiles = melanger(it.elements.map((_, k) => k)); q.etat.place = []; }
  if (it.type === 'tri') q.etat.choix = it.elements.map(() => null);
  const ctx = it.contexte ? decouperContexte(it.contexte) : null;
  afficher(h`
  <section class="scene" style="--c:${lieu.couleur}">
    <div class="scene-tete">
      <div><div class="surligne">${lieu.icone} ${lieu.nom} · ${atelier(it.atelier).titre}</div><h2 tabindex="-1" data-focus>${q.icone} ${q.titre}</h2></div>
      <span class="statut">Question ${q.i + 1} / ${q.questions.length}${brut(q.serie >= 3 ? h`<span class="serie">🔥 ${q.serie}</span>` : '')}</span>
    </div>
    <div class="barre" aria-hidden="true"><span style="width:${(q.i / q.questions.length) * 100}%"></span></div>
    ${brut(ctx ? h`<div class="contexte"><span class="visage" aria-hidden="true">${ctx.visage}</span><span>${ctx.texte}</span></div>` : '')}
    <p class="question">${it.enonce}</p>
    ${brut(it.image ? h`<figure class="schema-q"><button type="button" class="schema-zoom" data-zoom aria-label="Agrandir le schéma"><img src="../contenu/${it.image.src}" alt="${it.image.alt}" loading="eager" decoding="async"></button><figcaption>Touche le schéma pour l’agrandir</figcaption></figure>` : '')}
    ${brut(consigne(it))}
    <div id="zone">${brut(zone())}</div>
    <div id="retour"></div>
    <div class="actions" id="actions">${brut(boutons())}</div>
    <div class="actions no-print"><a class="btn secondaire" href="#/">← Tous les ateliers</a></div>
  </section>`);
  brancher();
}

function decouperContexte(c) {
  const m = c.match(/^(\p{Extended_Pictographic}(?:‍\p{Extended_Pictographic}|️|\p{Emoji_Modifier})*)\s*/u);
  return m ? { visage: m[1], texte: c.slice(m[0].length) } : { visage: '🧑‍⚕️', texte: c };
}
function consigne(it) {
  if (it.type === 'multi') return h`<p class="consigne">✋ Plusieurs bonnes réponses : sélectionne-les puis valide.</p>`;
  if (it.type === 'ordre') return h`<p class="consigne">👆 Touche les étapes dans le bon ordre (touche une étape placée pour la retirer).</p>`;
  if (it.type === 'tri') return h`<p class="consigne">🗂️ Pour chaque proposition, choisis la bonne catégorie.</p>`;
  return '';
}

function zone() {
  const { it, ordre, choix, tuiles, place, fini, correction } = quiz.etat;
  if (it.type === 'qcm' || it.type === 'multi') {
    return h`<div class="reponses ${it.pave ? 'pave' : ''}">${ordre.map((k, pos) => {
      let cls = '';
      if (fini) {
        const bonne = it.bonnes.includes(k), prise = it.type === 'qcm' ? correction.choix === k : choix.has(k);
        cls = bonne && prise ? 'juste' : !bonne && prise ? 'fausse' : bonne ? 'manquee' : 'eteinte';
      } else if (it.type === 'multi' && choix.has(k)) cls = 'choisie';
      const expl = fini && it.explications?.[k] ? h`<span class="expl">${it.explications[k]}</span>` : '';
      return h`<button type="button" class="reponse ${cls}" data-k="${k}" ${fini ? 'disabled' : ''} ${it.type === 'multi' ? `aria-pressed="${choix.has(k)}"` : ''}>${brut(it.pave ? '' : h`<span class="lettre" aria-hidden="true">${String.fromCharCode(65 + pos)}</span>`)}${it.options[k]}${brut(expl)}</button>`;
    })}</div>`;
  }
  if (it.type === 'ordre') {
    return h`<div class="ordre-zone">
      <ol class="ordre-liste">${it.elements.map((_, pos) => {
        const k = place[pos];
        if (k == null) return h`<li class="vide">…</li>`;
        const cls = fini ? (k === pos ? 'juste' : 'fausse') : 'pleine';
        return h`<li class="${cls}">${fini ? brut(h`<span>${it.elements[pos].texte}${brut(it.elements[pos].info ? h`<small>${it.elements[pos].info}</small>` : '')}${brut(k !== pos ? h`<small>Tu avais mis : ${it.elements[k].texte}</small>` : '')}</span>`) : brut(h`<button type="button" class="tuile" data-retirer="${pos}" style="flex:1;border:0;padding:0;background:none">${it.elements[k].texte} <span aria-hidden="true">✖</span></button>`)}</li>`;
      })}</ol>
      ${brut(fini ? '' : h`<div class="tuiles">${tuiles.filter(k => !place.includes(k)).map(k => h`<button type="button" class="tuile" data-tuile="${k}">${it.elements[k].texte}</button>`)}</div>`)}
    </div>`;
  }
  // tri
  return h`<div class="tri">${it.elements.map((e, ei) => {
    const cls = fini ? (choix[ei] === e.categorie ? 'juste' : 'fausse') : '';
    return h`<div class="tri-ligne ${cls}">
      <span class="tri-texte">${e.texte}${brut(fini && choix[ei] !== e.categorie ? h`<small>✔ ${it.categories[e.categorie]}</small>` : '')}</span>
      <span class="puces" role="group" aria-label="Catégorie pour : ${e.texte}">${it.categories.map((c, ci) => h`<button type="button" class="puce" data-el="${ei}" data-cat="${ci}" aria-pressed="${choix[ei] === ci}" ${fini ? 'disabled' : ''}>${it.icones?.[ci] ? it.icones[ci] + ' ' : ''}${c}</button>`)}</span>
    </div>`;
  })}</div>`;
}

function boutons() {
  const { it, fini, choix, place } = quiz.etat;
  if (fini) return h`<button type="button" class="btn principal" id="suivant">${quiz.i + 1 < quiz.questions.length ? 'Question suivante →' : 'Voir mon score 🏁'}</button>`;
  if (it.type === 'qcm') return '';
  const pret = it.type === 'multi' ? choix.size > 0 : it.type === 'ordre' ? place.length === it.elements.length : choix.every(c => c != null);
  return h`<button type="button" class="btn principal" id="valider" ${pret ? '' : 'disabled'}>Valider ✔</button>`;
}

function rafraichir() {
  document.getElementById('zone').innerHTML = zone();
  document.getElementById('actions').innerHTML = boutons();
  brancher();
}

function brancher() {
  const e = quiz.etat, it = e.it;
  $app.querySelectorAll('[data-k]').forEach(b => b.addEventListener('click', () => {
    const k = +b.dataset.k;
    if (it.type === 'qcm') return corriger({ choix: k });
    e.choix.has(k) ? e.choix.delete(k) : e.choix.add(k);
    rafraichir();
    $app.querySelector(`[data-k="${k}"]`)?.focus();
  }));
  $app.querySelectorAll('[data-tuile]').forEach(b => b.addEventListener('click', () => { e.place.push(+b.dataset.tuile); rafraichir(); ($app.querySelector('[data-tuile]') || $app.querySelector('#valider'))?.focus(); }));
  $app.querySelectorAll('[data-retirer]').forEach(b => b.addEventListener('click', () => { e.place.splice(+b.dataset.retirer, 1); rafraichir(); }));
  $app.querySelectorAll('[data-cat]').forEach(b => b.addEventListener('click', () => { e.choix[+b.dataset.el] = +b.dataset.cat; rafraichir(); $app.querySelector(`[data-el="${b.dataset.el}"][data-cat="${b.dataset.cat}"]`)?.focus(); }));
  document.getElementById('valider')?.addEventListener('click', () => corriger({}));
  document.getElementById('suivant')?.addEventListener('click', suivant);
}

function corriger({ choix }) {
  const e = quiz.etat, it = e.it;
  let juste;
  if (it.type === 'qcm') juste = it.bonnes.includes(choix);
  else if (it.type === 'multi') juste = e.choix.size === it.bonnes.length && it.bonnes.every(k => e.choix.has(k));
  else if (it.type === 'ordre') juste = e.place.every((k, pos) => k === pos);
  else juste = it.elements.every((el, i) => e.choix[i] === el.categorie);
  e.fini = true;
  e.correction = { choix, juste };
  if (juste) { quiz.bonnes++; quiz.serie++; } else { quiz.serie = 0; quiz.erreurs.push(it); }
  const serie = juste && SERIES[quiz.serie];
  document.getElementById('retour').innerHTML = h`<div class="retour ${juste ? '' : 'rate'}" tabindex="-1" id="retour-bloc">
    <h3>${juste ? hasard(BRAVO) : hasard(COURAGE)}${serie ? ' · ' + serie : ''}</h3>
    <p style="margin:0">${it.pourquoi}</p>
    ${brut(it.fiche ? h`<div class="memo"><b>🧠 À retenir · ${it.fiche.titre}</b>${it.fiche.texte}</div>` : '')}
  </div>`;
  rafraichir();
  annoncer(juste ? 'Bonne réponse.' : 'Réponse incorrecte. Lis la correction.');
  const r = document.getElementById('retour-bloc');
  r.focus({ preventScroll: true });
  r.scrollIntoView({ behavior: mouvementReduit() ? 'auto' : 'smooth', block: 'nearest' });
  if (serie) confettis();
}

function suivant() {
  quiz.i++;
  if (quiz.i < quiz.questions.length) return question();
  fin();
}

function fin() {
  const q = quiz, total = q.questions.length, pct = Math.round((q.bonnes / total) * 100);
  const record = q.id !== 'eclair' && q.id !== 'erreurs' && noterScore(q.id, pct);
  const n = etoiles(pct);
  const titre = pct === 100 ? 'Sans faute, chapeau ! 🏆' : pct >= 70 ? 'Super travail ! 🌟' : pct >= 40 ? 'Bon début, continue ! 💪' : 'Chaque essai te rend plus fort·e 🌱';
  const conseil = pct === 100 ? 'Tu peux passer à un autre atelier, ou défier tes camarades dans le mode jeu.'
    : q.erreurs.length ? `Rejoue tes ${q.erreurs.length} erreur${q.erreurs.length > 1 ? 's' : ''} tout de suite : c’est la meilleure façon de les retenir.` : '';
  const fichesId = q.id.startsWith('bio-') ? q.id : '';
  afficher(h`<section class="scene"><div class="fin">
    <div class="gros" aria-hidden="true">${pct === 100 ? '🏆' : pct >= 70 ? '🎉' : pct >= 40 ? '💪' : '🌱'}</div>
    <h2 tabindex="-1" data-focus>${titre}</h2>
    <div class="etoiles-fin" aria-label="${n} étoile${n > 1 ? 's' : ''} sur 3">${brut(rangEtoiles(n))}</div>
    <p style="font-size:1.25rem;font-weight:850;margin-bottom:4px">${q.bonnes} / ${total} réussis · ${pct} %</p>
    ${brut(record ? h`<p class="statut" style="display:inline-block">🎖️ Nouveau record pour cet atelier !</p>` : '')}
    <p>${conseil}</p>
    <div class="actions">
      ${brut(q.erreurs.length ? h`<button type="button" class="btn principal" id="erreurs">🔁 Revoir mes erreurs</button>` : '')}
      ${brut(fichesId ? h`<a class="btn secondaire" href="#/fiches/${fichesId}">🧠 Fiches mémo de l’atelier</a>` : '')}
      <a class="btn secondaire" href="#/">← Tous les ateliers</a>
      <a class="btn jeu" href="../jeu/?f=assp#/sante">🎮 Mode jeu</a>
    </div>
  </div></section>`);
  if (pct >= 70) confettis();
  document.getElementById('erreurs')?.addEventListener('click', () => lancer({ id: 'erreurs', titre: 'Mes erreurs', icone: '🔁', questions: melanger(q.erreurs) }));
}

// ------------------------------------------------------------ fiches mémo
function ecranFiches(filtre) {
  const choix = ateliers.some(a => a.id === filtre) ? filtre : '';
  const liste = items.filter(i => i.fiche && (!choix || i.atelier === choix));
  let pos = 0;
  const cartes = melanger(liste);
  afficher(h`<section class="scene">
    <div class="scene-tete"><div><div class="surligne">Mémorisation</div><h2 tabindex="-1" data-focus>🧠 Fiches mémo</h2></div><span class="statut">${liste.length} fiches</span></div>
    <div class="fiches-outils">
      <label class="visuellement-cache" for="filtre">Atelier</label>
      <select id="filtre"><option value="">Tout le programme</option>${lieux.map(l => h`<optgroup label="${l.icone} ${l.nom}">${l.ateliers.map(atelier).map(a => h`<option value="${a.id}" ${a.id === choix ? 'selected' : ''}>${a.icone} ${a.titre}</option>`)}</optgroup>`)}</select>
      <button type="button" class="btn secondaire" id="imprimer">🖨️ Imprimer</button>
      <a class="btn secondaire" href="#/">← Ateliers</a>
    </div>
    <p class="consigne" style="margin:0 0 6px">Lis le titre, essaie de te rappeler la notion <strong>dans ta tête</strong>, puis retourne la carte pour vérifier. Se tester, c’est la méthode la plus efficace pour retenir !</p>
    <div class="flash no-print">
      <button type="button" class="flash-carte" id="flash" aria-live="polite"></button>
      <div class="actions" style="justify-content:center"><button type="button" class="btn secondaire" id="prec">← Précédente</button><button type="button" class="btn principal" id="suiv">Suivante →</button></div>
    </div>
    <h3 style="margin-top:26px">Toutes les fiches</h3>
    <div class="liste-fiches">${liste.map(i => { const l = lieuDe(i.atelier); return h`<div class="fiche" style="--c:${l.couleur}"><em>${atelier(i.atelier).icone} ${atelier(i.atelier).titre}</em><b>${i.fiche.titre}</b><span>${i.fiche.texte}</span></div>`; })}</div>
  </section>`);
  const flash = document.getElementById('flash');
  const montrer = () => {
    const it = cartes[pos], a = atelier(it.atelier);
    flash.classList.remove('retournee');
    flash.setAttribute('aria-label', `Fiche ${pos + 1} sur ${cartes.length} : ${it.fiche.titre}. Touche pour retourner.`);
    flash.innerHTML = h`<span class="flash-face recto"><span class="ic" aria-hidden="true">${a.icone}</span><strong>${it.fiche.titre}</strong><small>${pos + 1} / ${cartes.length} · touche pour retourner 🔄</small></span><span class="flash-face verso"><span>${it.fiche.texte}</span></span>`;
  };
  if (cartes.length) montrer();
  flash.addEventListener('click', () => {
    flash.classList.toggle('retournee');
    if (flash.classList.contains('retournee')) annoncer(cartes[pos].fiche.texte);
  });
  document.getElementById('suiv').addEventListener('click', () => { pos = (pos + 1) % cartes.length; montrer(); });
  document.getElementById('prec').addEventListener('click', () => { pos = (pos - 1 + cartes.length) % cartes.length; montrer(); });
  document.getElementById('filtre').addEventListener('change', e => { location.hash = '#/fiches' + (e.target.value ? '/' + e.target.value : ''); });
  document.getElementById('imprimer').addEventListener('click', () => print());
}

// Raccourcis clavier : 1-4 / A-D pour répondre, Entrée pour continuer
addEventListener('keydown', e => {
  if (!quiz?.etat || e.ctrlKey || e.metaKey || e.altKey || /input|select|textarea/i.test(e.target.tagName)) return;
  const { it, fini, ordre } = quiz.etat;
  if (fini && e.key === 'Enter' && e.target.id !== 'suivant') { e.preventDefault(); return suivant(); }
  if (fini || it.type !== 'qcm') return;
  const n = '1234'.indexOf(e.key) >= 0 ? '1234'.indexOf(e.key) : 'abcd'.indexOf(e.key.toLowerCase());
  if (n >= 0 && n < ordre.length) corriger({ choix: ordre[n] });
});

demarrer();
