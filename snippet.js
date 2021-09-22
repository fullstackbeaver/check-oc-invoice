//code to copy inside the chrome's snippet section ()

var script = document.createElement('script');
script.type = 'text/javascript';
script.src = "https://fullstackbeaver.github.io/check-oc-invoice/script.js";  
document.head.appendChild(script);

const extractor = new Extractor("#mainContent section li");   //élément du DOM où sont affichés les séances effectuées dans le mois
const interpreter = new Interpreter({
  forfait           : 30,                                     //forfait attribué à chanque étudiant auto-financé
  niveau1           : 30,                                     //montant en € d'une séance de niveau 1
  niveau2           : 35,                                     //montant en € d'une séance de niveau 2
  niveau3           : 40,                                     //montant en € d'une séance de niveau 3
  tauxCotisation    : .264,                                   // ce taux correspond à celui d'un autoentrepreneur avec le prélèvement libératoire (26,4%)
}); 
const ui = new UI(document.body);                             //changer l'argument pour placer l'outil dans un autre élément du DOM

// ui.launch()                                                //à décommenter pour lancer automatiquement l'extraction des séances