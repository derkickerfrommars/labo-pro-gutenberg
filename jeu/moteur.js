/* =====================================================================
   Labo Pro Gutenberg : moteur du mode jeu
   ---------------------------------------------------------------------
   Module SANS interface (aucun accès au DOM). Il contient toutes les règles :
   révision espacée, points, niveaux, badges, fiches mémo, sauvegarde.
   C'est la référence à reproduire à l'identique dans une app Flutter (Dart).
   Les tests (outils/tests/moteur.test.mjs) décrivent le comportement attendu.

   Vocabulaire :
   - item     : une question de la banque (contenu/<filiere>.json)
   - boîte    : niveau de mémorisation d'un item, de 0 (jamais vu) à 5 (maîtrisé)
   - jour     : nombre de jours depuis le 1er janvier 1970, en heure locale
   ===================================================================== */

export const VERSION_SAUVEGARDE = 1;

/** Niveaux du joueur, par points d'expérience cumulés. */
export const NIVEAUX = [
  { nom: 'Stagiaire', xp: 0, icone: '🌱' },
  { nom: 'Apprenti·e', xp: 150, icone: '🌿' },
  { nom: 'Équipier·e', xp: 450, icone: '🍀' },
  { nom: 'Professionnel·le', xp: 1000, icone: '🌳' },
  { nom: 'Expert·e', xp: 2000, icone: '⭐' },
  { nom: 'Référent·e', xp: 3500, icone: '🏆' },
];

/** Délai (en jours) avant de revoir un item selon sa boîte (système de Leitner). */
export const INTERVALLES = { 1: 0, 2: 1, 3: 3, 4: 7, 5: 14, 6: 30 };
export const BOITE_MAX = 6;
/** Boîte comptée pour la maîtrise des ateliers et la rareté (la boîte 6 ne fait qu’espacer la révision). */
const BOITE_MAITRISE = 5;

export const POINTS = {
  bonneReponse: 10,       // première bonne réponse à un item dans la journée, sans aide
  bonneReponseAidee: 7,   // bonne réponse après un indice
  bonusConfiance: 5,      // jeton d'audace engagé et réussi (perdu sans pénalité sinon)
  effort: 2,              // mauvaise réponse (une fois par item et par jour) : on récompense l'essai
  revanche: 6,            // 2ᵉ chance réussie sans aide après une erreur dans la même partie
  serie: 5,               // 5 bonnes réponses d'affilée (une fois par partie)
  defiDuJour: 30,         // défi du jour terminé (une fois par jour)
  missionTerminee: 40,    // mission terminée (une fois par jour et par mission)
};

/** Seuils de maîtrise d'un atelier (moyenne des boîtes / 5) pour les badges. */
export const BADGES = [
  { id: 'bronze', nom: 'Bronze', seuil: 0.3, icone: '🥉' },
  { id: 'argent', nom: 'Argent', seuil: 0.6, icone: '🥈' },
  { id: 'or', nom: 'Or', seuil: 0.9, icone: '🥇' },
];

/** Rareté d’une fiche mémo selon la meilleure boîte atteinte (une fiche ne perd jamais sa rareté). */
export function rareteFiche(boite) {
  if (boite >= 5) return 'or';
  if (boite >= 3) return 'argent';
  if (boite >= 1) return 'bronze';
  return null;
}

export const TAILLE_PARTIE = 10;
export const TAILLE_LIEU = 6;          // une « tournée » dans un lieu de la carte
export const TAILLE_SURPRISE = 6;
export const TAILLE_DEFI_DU_JOUR = 5;

/** Mode arcade (facultatif) : cœurs au début de chaque partie. Une erreur coûte 1 cœur, jamais plus.
 *  En mode normal, il n'y a pas de cœurs : une partie va toujours jusqu'au bout (droit à l'erreur). */
export const VIES = 3;
export function viesPerdues(correct) { return correct ? 0 : 1; }

/** Jetons d'audace par partie : on en engage un quand on est sûr·e de soi (+5 ⭐ si juste, rien de perdu sinon). */
export const JETONS_AUDACE = 2;

/** Étoiles de fin de partie selon la part de bonnes réponses (premier essai). */
export function etoilesPartie(bonnes, total) {
  const t = total ? bonnes / total : 0;
  return t >= 1 ? 3 : t >= 0.7 ? 2 : t >= 0.4 ? 1 : 0;
}

/** Décorations de la ville, débloquées selon le nombre de fiches mémo gagnées. */
export const DECORATIONS = [
  { id: "fleurs", icone: "🌷", nom: "Massifs de fleurs", fiches: 3 },
  { id: "arbres", icone: "🌳", nom: "Arbres", fiches: 8 },
  { id: "banc", icone: "🪑", nom: "Bancs", fiches: 15 },
  { id: "fontaine", icone: "⛲", nom: "Fontaine", fiches: 25 },
  { id: "ballons", icone: "🎈", nom: "Ballons", fiches: 40 },
  { id: "kiosque", icone: "🎪", nom: "Kiosque à musique", fiches: 60 },
  { id: "manege", icone: "🎠", nom: "Manège", fiches: 80 },
  { id: "feu", icone: "🎆", nom: "Feu d’artifice", fiches: 110 },
  { id: "arcenciel", icone: "🌈", nom: "Arc-en-ciel", fiches: 140 },
];
export function decorations(nbFiches) { return DECORATIONS.filter(d => nbFiches >= d.fiches); }
export function prochaineDecoration(nbFiches) { return DECORATIONS.find(d => nbFiches < d.fiches) || null; }

// ------------------------------------------------------------------ temps

export function jourDe(date = new Date()) {
  return Math.floor((date.getTime() - date.getTimezoneOffset() * 60000) / 86400000);
}

// ------------------------------------------------------------------ hasard reproductible

/** Générateur pseudo-aléatoire déterministe (mulberry32) : même graine, même suite. */
export function hasard(graine) {
  let a = graine >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function grainePour(texte) {
  let h = 2166136261;
  for (let i = 0; i < texte.length; i++) h = Math.imul(h ^ texte.charCodeAt(i), 16777619);
  return h >>> 0;
}

export function melanger(liste, alea = Math.random) {
  const a = [...liste];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(alea() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ------------------------------------------------------------------ profil

export function nouveauProfil({ pseudo, avatar, filiere }, jour = jourDe()) {
  return {
    v: VERSION_SAUVEGARDE,
    id: Math.random().toString(36).slice(2, 10),
    pseudo: String(pseudo).trim().slice(0, 24),
    avatar,
    filiere,
    creeLe: jour,
    xp: 0,
    items: {},          // id -> { b: boîte, m: meilleure boîte atteinte après une bonne réponse, j: dernier jour vu, n: nb de réponses, r: nb de bonnes réponses, p: dernier jour où des points ont été gagnés }
    jours: {},          // jour -> nb de réponses ce jour-là (pour la série de jours)
    defis: {},          // jour -> score du défi du jour
    missions: {},       // id de mission -> dernier jour terminé
    badges: {},         // id d'atelier -> 'bronze' | 'argent' | 'or'
    serieMax: 0,        // meilleure série de bonnes réponses d'affilée
  };
}

export function niveauDe(xp) {
  let i = 0;
  while (i + 1 < NIVEAUX.length && xp >= NIVEAUX[i + 1].xp) i++;
  const actuel = NIVEAUX[i], suivant = NIVEAUX[i + 1] || null;
  return {
    rang: i,
    ...actuel,
    suivant,
    progression: suivant ? (xp - actuel.xp) / (suivant.xp - actuel.xp) : 1,
  };
}

/** Jours où l'élève a joué parmi les 7 derniers (aujourd'hui compris). Objectif : 3 par semaine.
 *  Contrairement à une série, une absence ne remet rien à zéro. */
export const OBJECTIF_SEMAINE = 3;
export function joursActifs(profil, jour = jourDe()) {
  let n = 0;
  for (let j = jour - 6; j <= jour; j++) if (profil.jours[j]) n++;
  return n;
}

/** Nombre de jours consécutifs (jusqu'à aujourd'hui ou hier) avec au moins une réponse. */
export function serieDeJours(profil, jour = jourDe()) {
  let j = profil.jours[jour] ? jour : jour - 1;
  let n = 0;
  while (profil.jours[j]) { n++; j--; }
  return n;
}

// ------------------------------------------------------------------ révision espacée

export function etatItem(profil, id) {
  return profil.items[id] || { b: 0, m: 0, j: null, n: 0, r: 0, p: null };
}

export function estDu(etat, jour) {
  if (etat.b === 0) return false;
  return jour - etat.j >= INTERVALLES[etat.b];
}

/** Nouvelle boîte après une réponse. */
export function boiteApres(etat, correct, jour, aide = false) {
  if (!correct) return 1;
  if (aide) return Math.max(1, etat.b);               // réussi avec un indice : on ne monte pas
  if (etat.b === 0) return 2;                         // découvert et réussi du premier coup
  if (etat.b === 1) return 2;                         // erreur corrigée
  if (estDu(etat, jour)) return Math.min(BOITE_MAX, etat.b + 1); // révisé au bon moment : on monte
  return etat.b;                                      // révisé trop tôt : on ne monte pas (pas de bachotage)
}

// ------------------------------------------------------------------ correction

/**
 * Corrige une réponse. Formats de `reponse` :
 *  - qcm   : index de l'option choisie (dans l'ordre d'origine de l'item)
 *  - multi : tableau d'index choisis
 *  - ordre : tableau d'index d'éléments (ordre d'origine) dans l'ordre proposé par l'élève
 *  - tri   : tableau, pour chaque élément (ordre d'origine), l'index de catégorie choisi
 * Retourne { correct, detail } où detail donne la justesse de chaque partie.
 */
export function corriger(item, reponse) {
  switch (item.type) {
    case 'qcm': {
      const correct = item.bonnes.includes(reponse);
      return { correct, detail: item.options.map((_, i) => item.bonnes.includes(i)) };
    }
    case 'multi': {
      const choix = new Set(reponse);
      const detail = item.options.map((_, i) => choix.has(i) === item.bonnes.includes(i));
      return { correct: detail.every(Boolean), detail };
    }
    case 'ordre': {
      const detail = reponse.map((idx, pos) => idx === pos);
      return { correct: detail.every(Boolean), detail };
    }
    case 'tri': {
      const detail = item.elements.map((e, i) => reponse[i] === e.categorie);
      return { correct: detail.every(Boolean), detail };
    }
    default:
      throw new Error('type inconnu : ' + item.type);
  }
}

// ------------------------------------------------------------------ enregistrer une réponse

/**
 * Applique une réponse au profil (le profil est modifié).
 * @param confiance 'sur' | 'hesite' | 'tente'
 * @param serie nombre de bonnes réponses d'affilée AVANT cette réponse, dans la partie en cours
 * Retourne ce qui s'est passé, pour l'affichage.
 */
export function enregistrerReponse(profil, banque, item, { correct, confiance = 'hesite', serie = 0, aide = false, revanche = false, serieDejaPayee = false }, jour = jourDe()) {
  const avant = etatItem(profil, item.id);
  const niveauAvant = niveauDe(profil.xp).rang;
  const rareteAvant = rareteFiche(avant.m || 0);

  let xp = 0;
  const dejaPayeAujourdhui = avant.p === jour;
  if (correct && revanche && !aide) {
    xp += POINTS.revanche;                            // erreur corrigée dans la même partie
  } else if (correct && !dejaPayeAujourdhui) {
    xp += aide ? POINTS.bonneReponseAidee : POINTS.bonneReponse;
  } else if (!correct && !dejaPayeAujourdhui) {
    xp += POINTS.effort;
  }
  if (correct && confiance === 'sur') xp += POINTS.bonusConfiance;
  const nouvelleSerie = correct ? serie + 1 : 0;
  const bonusSerie = correct && nouvelleSerie === 5 && !serieDejaPayee;
  if (bonusSerie) xp += POINTS.serie;

  const apres = {
    b: boiteApres(avant, correct, jour, aide),
    m: 0,
    j: jour,
    n: avant.n + 1,
    r: avant.r + (correct ? 1 : 0),
    p: xp > 0 ? jour : avant.p,
  };
  // La carte de l’album : bronze dès une réussite (même aidée), argent et or seulement sans aide
  apres.m = correct ? Math.max(avant.m || 0, aide ? 1 : apres.b) : (avant.m || 0);
  profil.items[item.id] = apres;
  profil.xp += xp;
  profil.jours[jour] = (profil.jours[jour] || 0) + 1;
  profil.serieMax = Math.max(profil.serieMax, nouvelleSerie);

  const rareteApres = rareteFiche(apres.m);
  const badgesNouveaux = majBadges(profil, banque);

  return {
    correct,
    xp,
    serie: nouvelleSerie,
    bonusSerie,
    boiteAvant: avant.b,
    boite: apres.b,
    // Alerte métacognitive : sûr·e de soi mais faux
    certitudeFausse: !correct && confiance === 'sur',
    fiche: rareteApres && rareteApres !== rareteAvant ? { rarete: rareteApres, nouvelle: !rareteAvant } : null,
    niveauMonte: niveauDe(profil.xp).rang > niveauAvant ? niveauDe(profil.xp) : null,
    badgesNouveaux,
  };
}

// ------------------------------------------------------------------ badges et statistiques

export function maitriseAtelier(profil, banque, atelierId) {
  const items = banque.items.filter(i => i.atelier === atelierId);
  if (!items.length) return { maitrise: 0, vus: 0, total: 0, aRevoir: 0 };
  let somme = 0, vus = 0, aRevoir = 0;
  const jour = jourDe();
  for (const it of items) {
    const e = etatItem(profil, it.id);
    somme += Math.min(e.b, BOITE_MAITRISE);
    if (e.b > 0) vus++;
    if (e.b === 1 || estDu(e, jour)) aRevoir++;
  }
  return { maitrise: somme / (BOITE_MAITRISE * items.length), vus, total: items.length, aRevoir };
}

export function badgeDe(maitrise) {
  let badge = null;
  for (const b of BADGES) if (maitrise >= b.seuil) badge = b;
  return badge;
}

/** Met à jour les badges (un badge acquis n'est jamais retiré) et renvoie les nouveaux. */
export function majBadges(profil, banque) {
  const nouveaux = [];
  const ordre = BADGES.map(b => b.id);
  for (const a of banque.ateliers) {
    const b = badgeDe(maitriseAtelier(profil, banque, a.id).maitrise);
    if (!b) continue;
    const actuel = profil.badges[a.id];
    if (!actuel || ordre.indexOf(b.id) > ordre.indexOf(actuel)) {
      profil.badges[a.id] = b.id;
      nouveaux.push({ atelier: a, badge: b });
    }
  }
  return nouveaux;
}

export function collection(profil, banque) {
  return banque.items.map(it => {
    const e = etatItem(profil, it.id);
    return { item: it, rarete: rareteFiche(e.m || 0), aRevoir: e.b === 1 };
  });
}

export function statistiques(profil, banque, jour = jourDe()) {
  const fiches = collection(profil, banque);
  return {
    niveau: niveauDe(profil.xp),
    serieJours: serieDeJours(profil, jour),
    fichesDebloquees: fiches.filter(f => f.rarete).length,
    fichesTotal: fiches.length,
    aRevoir: banque.items.filter(it => { const e = etatItem(profil, it.id); return e.b === 1 || estDu(e, jour); }).length,
    defiFait: profil.defis[jour] != null,
  };
}

// ------------------------------------------------------------------ composer une partie

/**
 * Priorité d'un item pour l'entraînement : d'abord les erreurs et les révisions dues,
 * puis les nouveaux, puis les autres (les moins maîtrisés d'abord).
 */
function priorite(profil, item, jour) {
  const e = etatItem(profil, item.id);
  if (e.b === 1) return 0;
  if (estDu(e, jour)) return 1;
  if (e.b === 0) return 2;
  return 3 + e.b;
}

function choisir(profil, items, nombre, jour, alea) {
  return melanger(items, alea)
    .sort((a, b) => priorite(profil, a, jour) - priorite(profil, b, jour))
    .slice(0, nombre);
}

/**
 * Prépare la liste des questions d'une partie.
 * mode : "lieu" (avec lieu) | "surprise" | "entrainement" (avec atelier) | "eclair" | "erreurs" | "defi" | "mission" (avec mission)
 * Étape de mission : { texte, atelier, nombre } (tirage dans l'atelier) ou { texte, atelier, items: [ids] } (questions imposées, dans l'ordre)
 * quartier (facultatif) : limite "surprise", "eclair" et "erreurs" aux ateliers de ce quartier de la carte
 * Retourne { questions: [{item, etape?}], ... } ; questions vide si rien à faire.
 */
export function composerPartie(profil, banque, { mode, atelier, mission, lieu, quartier }, jour = jourDe(), alea = Math.random) {
  const tous = quartier && ['surprise', 'eclair', 'erreurs', 'tournee'].includes(mode) ? itemsDuQuartier(banque, quartier) : banque.items;
  switch (mode) {
    case 'entrainement': {
      const items = tous.filter(i => i.atelier === atelier);
      return { questions: choisir(profil, items, TAILLE_PARTIE, jour, alea).map(item => ({ item })) };
    }
    case "lieu": {
      const l = banque.lieux.find(x => x.id === lieu);
      const items = tous.filter(i => l.ateliers.includes(i.atelier));
      return { questions: choisir(profil, items, TAILLE_LIEU, jour, alea).map(item => ({ item })), lieu: l };
    }
    case "surprise": {
      // 2 difficultés récentes (erreurs), puis du hasard parmi ce qui n'est pas maîtrisé
      const erreurs = melanger(tous.filter(i => etatItem(profil, i.id).b === 1), alea).slice(0, 2);
      const pool = tous.filter(i => etatItem(profil, i.id).b < 5 && !erreurs.includes(i));
      const reste = melanger(pool.length >= TAILLE_SURPRISE ? pool : tous.filter(i => !erreurs.includes(i)), alea).slice(0, TAILLE_SURPRISE - erreurs.length);
      return { questions: melanger([...erreurs, ...reste], alea).map(item => ({ item })) };
    }
    case "tournee": {
      // « Ma tournée » : 2 révisions dues, 2 notions fragiles, 1 découverte, puis on complète (sans doublon)
      const etat = i => etatItem(profil, i.id);
      const pris = new Set();
      const prendre = (liste, n) => melanger(liste.filter(i => !pris.has(i)), alea).slice(0, n).forEach(i => pris.add(i));
      prendre(tous.filter(i => etat(i).b >= 2 && estDu(etat(i), jour)), 2);
      prendre(tous.filter(i => etat(i).b === 1), 2);
      prendre(tous.filter(i => etat(i).b === 0), 1);
      prendre(tous.filter(i => etat(i).b === 0 || etat(i).b === 1 || estDu(etat(i), jour)), TAILLE_LIEU - pris.size);
      prendre(tous.filter(i => etat(i).b < 5), TAILLE_LIEU - pris.size);
      prendre(tous, TAILLE_LIEU - pris.size);
      return { questions: melanger([...pris], alea).map(item => ({ item })) };
    }
    case 'eclair': {
      // mélange d'ateliers, en privilégiant ce qui n'est pas encore maîtrisé
      const pool = tous.filter(i => etatItem(profil, i.id).b < 5);
      return { questions: melanger(choisir(profil, pool.length >= TAILLE_PARTIE ? pool : tous, TAILLE_PARTIE * 3, jour, alea), alea).slice(0, TAILLE_PARTIE).map(item => ({ item })) };
    }
    case 'erreurs': {
      const items = tous.filter(i => { const e = etatItem(profil, i.id); return e.b === 1 || estDu(e, jour); });
      return { questions: choisir(profil, items, TAILLE_SURPRISE, jour, alea).map(item => ({ item })) };
    }
    case 'defi': {
      // le même défi pour toute la classe ce jour-là
      const a = hasard(grainePour(banque.filiere + ':' + jour));
      return { questions: melanger(tous, a).slice(0, TAILLE_DEFI_DU_JOUR).map(item => ({ item })), graine: jour };
    }
    case 'mission': {
      const m = banque.missions.find(x => x.id === mission);
      const questions = [];
      for (const etape of m.etapes) {
        // Étape racontée : questions précises dans l'ordre (etape.items) ; sinon tirage dans l'atelier
        const items = etape.items
          ? etape.items.map(id => tous.find(i => i.id === id)).filter(Boolean)
          : choisir(profil, tous.filter(i => i.atelier === etape.atelier), etape.nombre, jour, alea);
        items.forEach((item, k) => questions.push({ item, etape: k === 0 ? etape.texte : null }));
      }
      return { questions, mission: m };
    }
    default:
      throw new Error('mode inconnu : ' + mode);
  }
}

/** Points de fin de partie (défi du jour, mission). Le profil est modifié. */
export function terminerPartie(profil, { mode, mission, score }, jour = jourDe()) {
  let xp = 0;
  if (mode === 'defi' && profil.defis[jour] == null) {
    profil.defis[jour] = score;
    xp += POINTS.defiDuJour;
  }
  if (mode === 'mission' && profil.missions[mission] !== jour) {
    profil.missions[mission] = jour;
    xp += POINTS.missionTerminee;
  }
  const niveauAvant = niveauDe(profil.xp).rang;
  profil.xp += xp;
  return { xp, niveauMonte: niveauDe(profil.xp).rang > niveauAvant ? niveauDe(profil.xp) : null };
}

// ------------------------------------------------------------------ Vrai ou faux éclair

export const TAILLE_VRAI_FAUX = 4;

/** État d'une affirmation : n vues, r justes, j dernier jour, ok dernière réponse juste, p jour payé. */
export function etatVraiFaux(profil, id) {
  return profil.vf?.[id] || { n: 0, r: 0, j: null, ok: null, p: null };
}

/**
 * Compose une manche : 4 affirmations de concepts tous différents.
 * Priorité : erreurs passées, puis jamais vues, puis vues il y a longtemps ; jamais une affirmation déjà réussie aujourd'hui
 * s'il en reste d'autres. Pas d'équilibre vrai/faux imposé par manche (ce serait un indice).
 */
export function composerVraiFaux(profil, banque, jour = jourDe(), alea = Math.random) {
  const liste = banque.vraiFaux || [];
  const rang = v => {
    const e = etatVraiFaux(profil, v.id);
    if (e.ok === false) return 0;
    if (!e.n) return 1;
    if (e.j === jour) return 4;
    return 2 + Math.min(1, e.r / Math.max(1, e.n));
  };
  const tries = melanger(liste, alea).sort((a, b) => rang(a) - rang(b));
  const pris = [], concepts = new Set();
  for (const v of tries) {
    if (pris.length >= TAILLE_VRAI_FAUX) break;
    if (concepts.has(v.concept)) continue;
    pris.push(v); concepts.add(v.concept);
  }
  return pris.length >= TAILLE_VRAI_FAUX ? melanger(pris, alea) : [];
}

/** Transforme une affirmation en question affichable (deux boutons, ordre fixe Vrai puis Faux). */
export function itemVraiFaux(v) {
  return {
    id: v.id, atelier: v.atelier, type: 'qcm', vf: true, ordreFixe: true,
    contexte: '⚡ Vrai ou faux ?', enonce: v.affirmation,
    options: ['Vrai', 'Faux'], bonnes: [v.vrai ? 0 : 1],
    pourquoi: v.correction,
  };
}

/**
 * Enregistre une réponse de vrai/faux. Points de base une fois par affirmation et par jour (10 juste, 2 pour l'essai).
 * Une réponse binaire ne fait monter aucune boîte de Leitner et ne gagne pas de carte : elle sert à réviser.
 */
export function enregistrerVraiFaux(profil, v, correct, { serie = 0, serieDejaPayee = false } = {}, jour = jourDe()) {
  profil.vf ??= {};
  const avant = etatVraiFaux(profil, v.id);
  const niveauAvant = niveauDe(profil.xp).rang;
  let xp = avant.p === jour ? 0 : correct ? POINTS.bonneReponse : POINTS.effort;
  const nouvelleSerie = correct ? serie + 1 : 0;
  const bonusSerie = correct && nouvelleSerie === 5 && !serieDejaPayee;
  if (bonusSerie) xp += POINTS.serie;
  profil.vf[v.id] = { n: avant.n + 1, r: avant.r + (correct ? 1 : 0), j: jour, ok: correct, p: xp > 0 ? jour : avant.p };
  profil.xp += xp;
  profil.jours[jour] = (profil.jours[jour] || 0) + 1;
  profil.serieMax = Math.max(profil.serieMax, nouvelleSerie);
  return {
    correct, xp, serie: nouvelleSerie, bonusSerie, certitudeFausse: false, fiche: null, badgesNouveaux: [],
    niveauMonte: niveauDe(profil.xp).rang > niveauAvant ? niveauDe(profil.xp) : null,
  };
}

// ------------------------------------------------------------------ Cas professionnels à décisions

/** Points par décision selon la qualité du choix (jamais affichée telle quelle à l'élève). */
export const POINTS_CAS = { juste: 10, partiel: 7, 'a-revoir': 2 };
export const CAS_PLAFOND_INDICE = 7;   // une décision prise après l'indice rapporte 7 au plus
export const CAS_BONUS_FIN = 5;        // bonus de la première fin atteinte
export const CAS_DECISIONS = 3;

/** État d'un cas pour un joueur : fois terminé, meilleur score, fins découvertes, dernier jour. */
export function etatCas(profil, id) {
  return profil.cas?.[id] || { fois: 0, meilleur: 0, fins: [], j: null };
}

export function finsDuCas(cas) {
  return Object.entries(cas.noeuds).filter(([, n]) => n.type === 'fin').map(([id]) => id);
}

/** Démarre une partie : la progression est un simple objet sérialisable (nœud courant + décisions prises). */
export function demarrerCas(cas) {
  return { cas: cas.id, noeud: cas.depart, decisions: [], indices: [] };
}

/** Passe une scène (nœud sans choix). */
export function avancerCas(cas, etat) {
  const n = cas.noeuds[etat.noeud];
  if (n.type !== 'scene') return etat;
  return { ...etat, noeud: n.suite };
}

export function indiceCas(etat) {
  return etat.indices.includes(etat.noeud) ? etat : { ...etat, indices: [...etat.indices, etat.noeud] };
}

/** Applique un choix. Renvoie le nouvel état et la décision enregistrée (pour afficher le retour). */
export function choisirCas(cas, etat, choixId) {
  const n = cas.noeuds[etat.noeud];
  const c = n?.type === 'decision' && n.choix.find(x => x.id === choixId);
  if (!c) throw new Error(`choix inconnu : ${etat.noeud}/${choixId}`);
  const aide = etat.indices.includes(etat.noeud);
  const xp = Math.min(POINTS_CAS[c.qualite] ?? 0, aide ? CAS_PLAFOND_INDICE : Infinity);
  const decision = { noeud: etat.noeud, choix: c.id, qualite: c.qualite, aide, xp, gain: c.gain || null };
  return { etat: { ...etat, noeud: c.suite, decisions: [...etat.decisions, decision] }, decision };
}

/** Bilan d'une partie terminée : score, compétences travaillées (indicateurs gagnés), fin atteinte. */
export function bilanCas(cas, etat) {
  const score = etat.decisions.reduce((s, d) => s + d.xp, 0);
  const gagnes = new Set(etat.decisions.map(d => d.gain).filter(Boolean));
  return {
    score, fin: etat.noeud,
    indicateurs: cas.indicateurs.map(i => ({ ...i, ok: gagnes.has(i.id) })),
    parfait: etat.decisions.every(d => d.qualite === 'juste' && !d.aide),
  };
}

/**
 * Enregistre une partie terminée. Première fois : score + bonus de fin.
 * Ensuite : seulement l'amélioration par rapport au meilleur score (rejouer pour mieux faire paie, rejouer en boucle non).
 */
export function enregistrerCas(profil, cas, etat, jour = jourDe()) {
  profil.cas ??= {};
  const b = bilanCas(cas, etat);
  const avant = etatCas(profil, cas.id);
  const xp = avant.fois ? Math.max(0, b.score - avant.meilleur) : b.score + CAS_BONUS_FIN;
  const nouvelleFin = !avant.fins.includes(b.fin);
  profil.cas[cas.id] = {
    fois: avant.fois + 1, meilleur: Math.max(avant.meilleur, b.score),
    fins: nouvelleFin ? [...avant.fins, b.fin] : avant.fins, j: jour,
  };
  const niveauAvant = niveauDe(profil.xp).rang;
  profil.xp += xp;
  profil.jours[jour] = (profil.jours[jour] || 0) + 1;
  return {
    ...b, xp, nouvelleFin, premiereFois: !avant.fois, record: avant.fois > 0 && b.score > avant.meilleur,
    finsVues: profil.cas[cas.id].fins.length, finsTotal: finsDuCas(cas).length,
    niveauMonte: niveauDe(profil.xp).rang > niveauAvant ? niveauDe(profil.xp) : null,
  };
}

// ------------------------------------------------------------------ présentation d'un item

/**
 * Prépare l'affichage : mélange les options (sauf ordreFixe), les éléments à ordonner, etc.
 * Les index renvoyés dans `ordre` permettent de retrouver l'index d'origine pour corriger.
 */
export function presenter(item, alea = Math.random) {
  if (item.type === 'qcm' || item.type === 'multi') {
    const idx = item.options.map((_, i) => i);
    return { ordre: item.ordreFixe ? idx : melanger(idx, alea) };
  }
  if (item.type === 'ordre') {
    let ordre;
    do { ordre = melanger(item.elements.map((_, i) => i), alea); } while (ordre.every((v, i) => v === i) && item.elements.length > 1);
    return { ordre };
  }
  if (item.type === 'tri') return { ordre: melanger(item.elements.map((_, i) => i), alea) };
  return { ordre: [] };
}

// ------------------------------------------------------------------ sauvegarde (code à copier)

const PREFIXE = 'LPG1';

function versBase64Url(octets) {
  let s = '';
  for (let i = 0; i < octets.length; i++) s += String.fromCharCode(octets[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function depuisBase64Url(texte) {
  const s = atob(texte.replace(/-/g, '+').replace(/_/g, '/'));
  const o = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) o[i] = s.charCodeAt(i);
  return o;
}
async function transformer(octets, flux) {
  const s = new Blob([octets]).stream().pipeThrough(flux);
  return new Uint8Array(await new Response(s).arrayBuffer());
}

/**
 * Code de sauvegarde : « LPG1z.<base64url(deflate(JSON))> » ou « LPG1j.<base64url(JSON)> » si la compression n'est pas disponible.
 * Contient tout le profil : sert à changer d'appareil et au tableau de bord enseignant.
 */
export async function exporterCode(profil) {
  const json = new TextEncoder().encode(JSON.stringify(profil));
  if (typeof CompressionStream !== 'undefined') {
    return `${PREFIXE}z.` + versBase64Url(await transformer(json, new CompressionStream('deflate-raw')));
  }
  return `${PREFIXE}j.` + versBase64Url(json);
}

export async function importerCode(code) {
  const propre = String(code).replace(/\s+/g, '');
  const m = /^LPG1([zj])\.([A-Za-z0-9_-]+)$/.exec(propre);
  if (!m) throw new Error('Ce code n’est pas un code de sauvegarde Labo Pro.');
  let octets = depuisBase64Url(m[2]);
  if (m[1] === 'z') {
    if (typeof DecompressionStream === 'undefined') throw new Error('Ce navigateur ne sait pas lire ce code. Essaie avec un navigateur à jour.');
    octets = await transformer(octets, new DecompressionStream('deflate-raw'));
  }
  const profil = JSON.parse(new TextDecoder().decode(octets));
  return valider(profil);
}

/** Vérifie et complète un profil lu depuis le stockage ou un code. */
export function valider(p) {
  if (!p || typeof p !== 'object' || typeof p.pseudo !== 'string' || !p.filiere) throw new Error('Sauvegarde illisible.');
  const base = nouveauProfil({ pseudo: p.pseudo, avatar: p.avatar, filiere: p.filiere }, p.creeLe ?? jourDe());
  return { ...base, ...p, items: p.items || {}, jours: p.jours || {}, defis: p.defis || {}, missions: p.missions || {}, badges: p.badges || {}, xp: Number(p.xp) || 0 };
}

// ------------------------------------------------------------------ carte de la ville

/** Maîtrise d'un lieu : moyenne pondérée de ses ateliers. */
export function maitriseLieu(profil, banque, lieuId) {
  const l = banque.lieux.find(x => x.id === lieuId);
  let somme = 0, total = 0, vus = 0, aRevoir = 0;
  for (const a of l.ateliers) {
    const m = maitriseAtelier(profil, banque, a);
    somme += m.maitrise * m.total; total += m.total; vus += m.vus; aRevoir += m.aRevoir;
  }
  const maitrise = total ? somme / total : 0;
  return { maitrise, vus, total, aRevoir, etoiles: BADGES.filter(b => maitrise >= b.seuil).length };
}

/** Quartier d'un lieu de la carte ("ville" par défaut). */
export const quartierDe = lieu => lieu?.quartier || 'ville';

/** Questions des ateliers appartenant aux lieux d'un quartier. */
export function itemsDuQuartier(banque, quartier) {
  const ateliers = new Set(banque.lieux.filter(l => quartierDe(l) === quartier).flatMap(l => l.ateliers));
  return banque.items.filter(i => ateliers.has(i.atelier));
}

/** Questions à revoir aujourd'hui (les personnages qui attendent sur la carte), éventuellement dans un seul quartier. */
export function aRevoirAujourdhui(profil, banque, jour = jourDe(), quartier = null) {
  return (quartier ? itemsDuQuartier(banque, quartier) : banque.items).filter(it => { const e = etatItem(profil, it.id); return e.b === 1 || estDu(e, jour); });
}
