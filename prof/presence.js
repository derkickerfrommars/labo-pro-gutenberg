/* Présence anonyme de l'espace enseignant.
   But : savoir combien de personnes ont l'espace enseignant ouvert EN MÊME TEMPS,
   pour qu'un collègue sache qu'un autre est en train de lire pendant qu'il modifie.

   Vie privée :
   - aucune donnée personnelle n'est transmise : juste une clé aléatoire jetable
     (régénérée à chaque ouverture) et un horodatage ;
   - on ne stocke jamais de nom, de code élève ni d'identité ;
   - la présence n'existe que pendant que la page est ouverte : à la fermeture,
     l'entrée est effacée automatiquement (onDisconnect) ;
   - visible uniquement dans l'espace enseignant (élèves jamais comptés).

   Portable Flutter : la logique (clé jetable + onDisconnect + comptage des
   entrées récentes) se transpose telle quelle avec le SDK firebase_database.
   Voir docs/FLUTTER.md.

   CONFIGURATION : coller ci-dessous les valeurs du projet Firebase
   (console Firebase › ⚙ Paramètres du projet › Vos applications › Web).
   Tant que databaseURL est vide, le compteur reste simplement masqué. */

const BASE_SDK = 'https://www.gstatic.com/firebasejs/10.14.1';

export const CONFIG_FIREBASE = {
  apiKey: 'AIzaSyBj9SGaeOFAJVwR3vVcQpfbazMXW0fjHH0',
  authDomain: 'labo-pro-presence.firebaseapp.com',
  databaseURL: 'https://labo-pro-presence-default-rtdb.europe-west1.firebasedatabase.app',
  projectId: 'labo-pro-presence',
};

const CANAL = 'presence-enseignants'; // les élèves ne touchent jamais ce nœud
const BATTEMENT = 25000;  // rafraîchit sa présence toutes les 25 s
const EXPIRATION = 70000; // au-delà de 70 s sans signe de vie, on ne compte plus

export const presenceConfiguree = () => Boolean(CONFIG_FIREBASE.databaseURL);

/* Lance le suivi. `surCompte` est appelé avec :
   - { configure:false }            si Firebase n'est pas renseigné ;
   - { configure:true, n:<nombre> } à chaque changement du nombre de présents ;
   - { erreur:true }                si la connexion échoue.
   Renvoie une fonction d'arrêt (à appeler pour se retirer proprement). */
export function suivrePresence(surCompte) {
  if (!presenceConfiguree()) { surCompte({ configure: false }); return () => {}; }

  const etat = { arret: false, nettoyer: null };
  const stop = () => {
    etat.arret = true;
    if (etat.nettoyer) etat.nettoyer();
  };
  // Filet de sécurité en plus de onDisconnect (navigation interne, bfcache).
  addEventListener('pagehide', stop, { once: true });

  (async () => {
    let db, ref, onValue, onDisconnect, set, remove, serverTimestamp;
    try {
      const { initializeApp } = await import(`${BASE_SDK}/firebase-app.js`);
      let getDatabase;
      ({ getDatabase, ref, onValue, onDisconnect, set, remove, serverTimestamp } =
        await import(`${BASE_SDK}/firebase-database.js`));
      db = getDatabase(initializeApp(CONFIG_FIREBASE));
    } catch (e) {
      console.warn('[présence] Firebase indisponible :', e?.message || e);
      surCompte({ erreur: true });
      return;
    }
    if (etat.arret) return; // stop appelé pendant le chargement

    const id = Math.random().toString(36).slice(2) + Date.now().toString(36);
    const moi = ref(db, `${CANAL}/${id}`);
    const tous = ref(db, CANAL);
    let offset = 0, timer = null;

    // Décalage horloge locale / serveur, pour comparer les horodatages sans dériver.
    const detacheHorloge = onValue(ref(db, '.info/serverTimeOffset'), s => { offset = s.val() || 0; });

    const battre = () => { if (!etat.arret) set(moi, { t: serverTimestamp() }).catch(() => {}); };
    onDisconnect(moi).remove();     // effacé automatiquement si l'onglet se ferme ou plante
    battre();
    timer = setInterval(battre, BATTEMENT);

    const detacheTous = onValue(tous, s => {
      const maintenant = Date.now() + offset;
      let n = 0;
      s.forEach(enfant => {
        const t = enfant.child('t').val();
        if (typeof t === 'number' && maintenant - t < EXPIRATION) n++;
      });
      surCompte({ configure: true, n });
    }, () => surCompte({ erreur: true }));

    etat.nettoyer = () => {
      clearInterval(timer);
      detacheTous();
      detacheHorloge();
      remove(moi).catch(() => {});
    };
    if (etat.arret) etat.nettoyer(); // stop a pu être appelé juste avant l'affectation
  })();

  return stop;
}
