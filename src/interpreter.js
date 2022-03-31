/* global ui, extractor */
/**
 * @typedef  {import("./typedef.js").eleveFinancement} eleveFinancement
 * @typedef  {import("./typedef.js").seance}           seance
 * @typedef  {import("./typedef.js").tarification}     tarification
 */

class Interpreter {

  /**
   * [constructor description]
   *
   * @param   {tarification}  tarification
   */
  constructor(tarification) {
    this.tarification = tarification;
    this.reset();
  }

  /**
   * assure la liasion
   *
   * @param   {String}  student  [student description]
   *
   * @return  {String}           retourne une apostrophe ou un e
   */
  apostrophe(student){
    return ["A","E","I","O","U","Y"].indexOf(student.slice(0,1)) === -1 ? "e " : "'";
  }

  /**
   * catégorise les séances
   *
   * @param   {seance}  seance  [seance description]
   *
   * @return  {void}         classe les séances dans this.seances
   */
  addToCategory(seance){
    const noshow      = seance.realise === "marked student as absent" ? " no show" : "";
    const type        = seance.type === "presentation" ? "soutenance" : seance.financement;
    const categorie   = type+" | niveau "+seance.niveau+ noshow;
    if (this.seances[categorie] === undefined) this.seances[categorie] = [];
    this.seances[categorie].push(seance);
  }

  /**
   * [addToCategoryAutomaticInvoice description]
   *
   * @param   {seance}  seance    [seance description]
   * @param   {String}  intitule  [intitule description]
   *
   * @return  {void}              add element to automaticInvoice
   */
  addToCategoryAutomaticInvoice(seance, intitule){
    if ( ! this.automaticInvoice[intitule] ) this.automaticInvoice[intitule] = [];
    this.automaticInvoice[intitule].push(seance);
  }

  ajouteJourTravaille(seance) {
    const jour = seance.split(",")[0];
    if (this.joursTravailles.indexOf(jour) === -1) this.joursTravailles.push(jour);
  }

  /**
   * [automaticInvoiceSessionTitle description]
   *
   * @param   {seance}  seance  [seance description]
   *
   * @return  {String}          [return description]
   */
  automaticInvoiceSessionTitle(seance){
    const financement   = seance.financement === "Financé par un tiers" ? "financed" : "self-paid";
    const realisation   = seance.realise === "Completed" ? "completed" : "no-show";
    const type          = seance.type === "Mentoring" ? "standard" : "defense";
    return `Session mentorat - Expertise ${seance.niveau} - ${financement} - ${type} - ${realisation}`;
  }

  calculSalaire(montant) {
    return montant - Math.round((montant * this.tarification.tauxCotisation));
  }

  defineCategoryAutomaticInvoice(seance){
    let intitule = "defensesUnknownFunding";
    if (seance.type === "Mentorat") {
      intitule = this.automaticInvoiceSessionTitle(seance);
    }
    //si c'est une soutenance d'un élève dont on connait le financement
    // if (seance.type !== "Mentorat" && this.eleves[seance.eleve]){
    //   intitule = this.automaticInvoiceSessionTitle(seance);
    // }
    this.addToCategoryAutomaticInvoice(seance,intitule);
  }

  /**
   * ajoute le tarif de la séance
   *
   * @param   {seance}  seance  [seance description]
   *
   * @return  {void}            complète les informations de la séance
   */
  definirTarif(seance){
    seance.tarif = this.tarification["niveau"+seance.niveau];
    if (seance.financement === "Auto-financé") {
      this.elevesAutofinances.push(seance.eleve);
      seance.tarif = seance.tarif / 2;
    }
    if (seance.realise === "marked student as absent") {
      seance.tarif = seance.tarif / 2;
      this.noShows++;
    }
    this.total += seance.tarif;
  }

  exportAutomaticInvoice(){
    for (const [key, value] of Object.entries(this.automaticInvoice)) {
      console.log(`....${key} : moi ${value.length} | OC ?`);
      value.forEach(session => {
        console.log(`${session.date} - ${session.eleve} (${session.link})`);
      });
    }
  }

  getOpenedDays(year, month, dayNumber) {
    let tmp;
    let joursOuvres = 0;
    for (let i = 0; i < dayNumber; i++) {
      tmp = new Date(year, month, i).getDay();
      if (tmp < 5) joursOuvres++;
    }
    return joursOuvres;
  }

  async interpretsSessions(seances) {
    for (const seance of seances) {
      if (!seance.realise) return;
      if (seance.realise === "Canceled") continue;
      this.nSeances++;
      this.ajouteJourTravaille(seance.date);
      // console.log("seance.type:",seance.type);
      if (seance.type === "presentation") {
        this.soutenances++;
        seance.financement = "Financé par un tiers";
      }
      else await this.statutEleveMentore(seance.eleve, seance.id);
      this.temps += seance.financement === "Auto-financé" ? 0.5 : 1;
      this.definirTarif(seance);
      this.addToCategory(seance);
      this.defineCategoryAutomaticInvoice(seance);
    }
  }

  /**
   * [pluriel description]
   *
   * @param   {Number}  qty  [qty description]
   *
   * @return  {String}       [return description]
   */
  pluriel(qty){
    return qty > 1 ? "s" : "";
  }

  previsionnelSalaire() {

    const annee   = new Date().getFullYear();
    const idMois  = new Date().getMonth();
    const moisTxt = new Intl.DateTimeFormat("fr-FR", { month: "long" }).format(new Date());
    const refDate = this.joursTravailles[this.joursTravailles.length - 1];

    if (refDate.indexOf(moisTxt) === -1) return;
    if (parseInt(refDate.split(" ")[2]) !== annee) return;

    const joursDansLeMois         = new Date(idMois, annee, 0).getDate();
    const joursOuvres             = this.getOpenedDays(annee, idMois, joursDansLeMois);
    const joursOuvresTravailles   = this.getOpenedDays(annee, idMois, new Date().getDate());

    if (joursOuvres === joursOuvresTravailles) return;

    const prev = ((this.total - this.tarification.forfait) / joursOuvresTravailles * joursOuvres) + this.tarification.forfait;

    ui.addMessage(`salaire prévisionnel : ${this.calculSalaire(prev).toFixed(2)} €`);
  }

  async readData() {
    this.reset();
    const releve = {
      eleves  : JSON.parse(localStorage.getItem("eleves")),
      seances : extractor.data
    };
    this.eleves = releve.eleves === null ? {} : releve.eleves;
    try {
      await this.interpretsSessions(releve.seances);
      if (this.manuallyDefineFunding.length > 0) {
        ui.clear();
        this.manuallyDefineFunding.forEach(eleve => {
          ui.addMessage(`${eleve} : <select id="${eleve}"><option value="Auto-financé">Auto-financé</option><option value="Financé par un tiers">Financé par un tiers</option></select>`);
        });
        ui.addMessage("<button onclick=\"extractor.getManualFundings()\">je valide les changements</button>");
        return;
      }
      this.elevesAutofinances   = [...new Set(this.elevesAutofinances)];
      this.forfaits             = this.elevesAutofinances.length;
      this.montantForfait       = this.forfaits*this.tarification.forfait;
      this.temps                += this.forfaits;
      this.showResults();
    }
    catch (err) {
      ui.addMessage("<i>erreur : </i>" + err.stack);
    }
  }

  reset(){
    this.automaticInvoice         = {};
    this.eleves                   = {};
    this.elevesAutofinances       = [];
    this.forfaits                 = 0;
    this.joursTravailles          = [];
    this.manuallyDefineFunding    = [];
    this.nSeances                 = 0;
    this.noShows                  = 0;
    this.seances                  = {};
    this.soutenances              = 0;
    this.temps                    = 0;
    this.total                    = 0;
  }

  async showAutomaticInvoiceFormat(){
    ui.clear();
    ui.addMessage("recherche le financement des soutenances");
    let intitule;
    for (const seance of this.automaticInvoice.defensesUnknownFunding) {
      const ref          = ui.addMessage("récupère le financement d" + this.apostrophe(seance.eleve) + seance.eleve, true);
      seance.financement = this.eleves[seance.eleve] ? this.eleves[seance.eleve]: await extractor.extractStudentFunding(seance.link);
      ui.taskFinished(ref, true);
      intitule = this.automaticInvoiceSessionTitle(seance);
      this.addToCategoryAutomaticInvoice(seance,intitule);
    }
    delete this.automaticInvoice.defensesUnknownFunding;
    ui.clear();
    ui.addMessage(`<span>${this.forfaits}</span> x Flat fees`);
    ui.showOrderedResults(this.automaticInvoice);
  }

  showResults(){
    const chiffreAffaire    = this.total+this.montantForfait;
    const seancesPlanifiees = extractor.data.length;
    let pluriel             = this.pluriel(seancesPlanifiees);
    ui.clear();
    ui.addMessage(`<span>${seancesPlanifiees}</span> x seance${pluriel} planififée${pluriel}<br>. . . . . . . . . . . . . . . . . . .`);
    ui.showOrderedResults(this.seances);
    pluriel = this.pluriel(this.nSeances);
    ui.addMessage(`<span>${this.nSeances}</span> séance${pluriel} facturée${pluriel} dont ${this.noShows} no show${this.pluriel(this.noShows)} : ${this.total} €HT`);
    pluriel = this.pluriel(this.forfaits);
    ui.addMessage(`<span>${this.forfaits}</span> x forfait${pluriel} auto-financé : ${this.montantForfait} €HT`);
    ui.addMessage(`temps passé : ${this.temps} heure${this.pluriel(this.temps)}`);
    ui.addMessage("taux horaire "+ Math.round((chiffreAffaire) / this.temps * 100) / 100+ " €HT");
    ui.addMessage("facturation : "+ chiffreAffaire + " €HT");
    ui.addMessage("salaire : "+ this.calculSalaire(chiffreAffaire) + "€");
    this.previsionnelSalaire();
    ui.addMessage("<button onclick=\"interpreter.showAutomaticInvoiceFormat()\">affichage format facture automatique</button>");
  }

  /**
   * [statutEleveMentore description]
   *
   * @param   {String}  eleve  [eleve description]
   *
   * @return  {Promise.<eleveFinancement>}         [return description]
   * @throw   {Error}
   */
  async statutEleveMentore(eleve, id) {
    if (this.eleves[eleve]) return this.eleves[eleve]; //TODO regarder pourquoi ça va chercher quand même si l'étudiant vient d'être récupéré
    const ref             = ui.addMessage("récupère le financement d" + this.apostrophe(eleve) + eleve, true);
    this.eleves[eleve]    = await extractor.extractStudentFunding(id);
    // console.log(eleve, "id:",id,this.eleves[eleve]);
    if (this.eleves[eleve] === "Auto-financé" || this.eleves[eleve] === "Financé par un tiers") {
      extractor.update(this.eleves);
      ui.taskFinished(ref, true);
    }
    else {
      this.manuallyDefineFunding.push(eleve);
      ui.taskFinished(ref, false);
    }
    return this.eleves[eleve];
  }
}