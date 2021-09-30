//code to copy inside the chrome's snippet section ()
const settings = {
  "autoLaunch": false,                       // passer à pour lancer automatiquement l'extraction des séances
  "local": true,                        // utilie le script en local ou celui sur github pages
  "tarification": {
    forfait: 30,                    // forfait attribué à chanque étudiant auto-financé
    niveau1: 30,                    // montant en € d'une séance de niveau 1
    niveau2: 35,                    // montant en € d'une séance de niveau 2
    niveau3: 40,                    // montant en € d'une séance de niveau 3
    tauxCotisation: .264,                  // ce taux correspond à celui d'un autoentrepreneur avec le prélèvement libératoire (26,4%)
  }
};
const src = settings.local ? 
  "http://localhost:8888" : 
  "https://fullstackbeaver.github.io/check-oc-invoice";

insertScript(`${src}/scripts/script${settings.local ? "" : "-min"}.js`);

function insertScript(src){
  const script_tag    = document.createElement("script");
  script_tag.type     = "text/javascript";
  script_tag.src      = src;
  document.head.appendChild(script_tag);
}