//code to copy inside the chrome's snippet section ()
const settings = {
  "autoLaunch"    : false,                     // passer à pour lancer automatiquement l'extraction des séances
  "tarification": {
    forfait           : 30,                    // forfait attribué à chanque étudiant auto-financé
    niveau1           : 30,                    // montant en € d'une séance de niveau 1
    niveau2           : 35,                    // montant en € d'une séance de niveau 2
    niveau3           : 40,                    // montant en € d'une séance de niveau 3
    tauxCotisation    : .264,                  // ce taux correspond à celui d'un autoentrepreneur avec le prélèvement libératoire (26,4%)
  }
}

var extractor, interpreter, ui;
async function load() {
  const scripts     = await fetch("https://fullstackbeaver.github.io/check-oc-invoice/script.js");
  const script_tag  = document.createElement('script');
  document.head.appendChild(script_tag);
  script_tag.type   = 'text/javascript';
  script_tag.text   = await scripts.text();
  extractor         = new Extractor   ("#mainContent section li", "#mainContent button");
  interpreter       = new Interpreter (settings.tarification);
  ui                = new UI          (document.body, settings.lang);
  if (settings.autoLaunch) ui.launch(false);
}
load();