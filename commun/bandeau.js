/* Labo Pro Gutenberg : bandeau de filière et préférences d'affichage communes.
   Utilisation dans <head> :
   <script src="../commun/bandeau.js" data-filiere="assp" data-titre="Accompagnement, soins et services à la personne" data-racine="../" data-jeu="jeu/"></script>
*/
(function () {
  var script = document.currentScript;
  var cfg = script ? script.dataset : {};
  var racine = cfg.racine || '../';
  var html = document.documentElement;

  function lire(cle) { try { return localStorage.getItem(cle); } catch (e) { return null; } }
  function ecrire(cle, val) { try { val == null ? localStorage.removeItem(cle) : localStorage.setItem(cle, val); } catch (e) {} }

  if (cfg.filiere) html.setAttribute('data-filiere', cfg.filiere);
  if (lire('lp-dys') === '1') html.setAttribute('data-dys', '');

  window.LaboPro = window.LaboPro || {};
  window.LaboPro.basculerDys = function () {
    var actif = !html.hasAttribute('data-dys');
    actif ? html.setAttribute('data-dys', '') : html.removeAttribute('data-dys');
    ecrire('lp-dys', actif ? '1' : null);
    document.querySelectorAll('[data-lp-dys]').forEach(function (b) { b.setAttribute('aria-pressed', String(actif)); });
  };

  // Agrandir un schéma de question (bouton [data-zoom] contenant une image) ; Échap ou toucher pour fermer
  document.addEventListener('click', function (ev) {
    var bouton = ev.target.closest && ev.target.closest('[data-zoom]');
    if (!bouton) return;
    var img = bouton.querySelector('img');
    var plein = document.createElement('button');
    plein.type = 'button';
    plein.className = 'lp-schema-plein';
    plein.setAttribute('aria-label', 'Fermer le schéma agrandi');
    var copie = document.createElement('img');
    copie.src = img.src; copie.alt = img.alt;
    plein.appendChild(copie);
    function fermer() { plein.remove(); document.removeEventListener('keydown', echap); bouton.focus(); }
    function echap(e) { if (e.key === 'Escape') fermer(); }
    plein.addEventListener('click', fermer);
    document.addEventListener('keydown', echap);
    document.body.appendChild(plein);
    plein.focus();
  });

  if (cfg.bandeau === 'non') return;

  function poser() {
    if (document.querySelector('.lp-bandeau')) return;
    var b = document.createElement('div');
    b.className = 'lp-bandeau';
    b.setAttribute('role', 'navigation');
    b.setAttribute('aria-label', 'Labo Pro Gutenberg');
    var dys = html.hasAttribute('data-dys');
    b.innerHTML =
      '<a href="' + racine + '" aria-label="Retour au portail Labo Pro">← <span class="lp-masque-mobile">Portail</span></a>' +
      '<span class="lp-filiere">' + (cfg.nom || (cfg.filiere || '').toUpperCase()) +
      (cfg.titre ? '<small>' + cfg.titre + '</small>' : '') + '</span>' +
      '<button type="button" data-lp-dys aria-pressed="' + dys + '" title="Police et espacements adaptés à la lecture">Aa <span class="lp-masque-mobile">Lecture DYS</span></button>' +
      (cfg.jeu ? '<a class="lp-jouer" href="' + cfg.jeu + '">🎮 Mode jeu</a>' : '');
    b.querySelector('[data-lp-dys]').addEventListener('click', window.LaboPro.basculerDys);
    document.body.insertBefore(b, document.body.firstChild);
  }
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', poser) : poser();
})();
