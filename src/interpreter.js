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

  reset(){
    this.annulees                 = 0;
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

  async readData() {
    this.reset();
    const releve = {
      eleves  : JSON.parse(localStorage.getItem("eleves")),
      seances : extractor.data
    };
    this.eleves = releve.eleves === null ? {} : releve.eleves;
    try {
      for (const seance of releve.seances) {
        if (!seance.realise) return;
        if (seance.realise === "Canceled") {
          this.annulees++;
          continue;
        }
        this.nSeances++;
        this.ajouteJourTravaille(seance.date);
        await this.definirFinancement(seance);
        this.temps += seance.financement === "Auto-financé" ? 0.5 : 1;
        this.definirTarif(seance);
        this.addToCategory(seance);
      }
      if (this.manuallyDefineFunding.length > 0) {
        ui.clear();
        this.manuallyDefineFunding.forEach(eleve => {
          ui.addMessage(`${eleve} : <select id="${eleve}"><option value="Auto-financé">Auto-financé</option><option value="Financé par un tiers">Financé par un tiers</option></select>`);
        });
        ui.addMessage("<button onclick=\"interpreter.readData()\">je valide les changements</button>");
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

  showResults(){

    const chiffreAffaire    = this.total+this.montantForfait;
    const prestations       = [];
    const seancesPlanifiees = extractor.data.length;
    let pluriel             = this.pluriel(seancesPlanifiees);
    ui.clear();
    ui.addMessage(`<span>${seancesPlanifiees}</span> x seance${pluriel} planififée${pluriel}<br>. . . . . . . . . . . . . . . . . . .`);
    for (const key of Object.keys(this.seances)) {
      prestations.push(key);
    }
    prestations.sort();
    prestations.forEach(presta => {
      ui.addMessage(`<span>${this.seances[presta].length}</span> x ${presta}`);
    });
    pluriel = this.pluriel(this.nSeances);
    ui.addMessage(`<span>${this.nSeances}</span> séance${pluriel} facturée${pluriel} dont ${this.noShows} no show${this.pluriel(this.noShows)} : ${this.total} €HT`);
    pluriel = this.pluriel(this.forfaits);
    ui.addMessage(`<span>${this.forfaits}</span> x forfait${pluriel} auto-financé : ${this.montantForfait} €HT`);
    ui.addMessage(`temps passé : ${this.temps} heure${this.pluriel(this.temps)}`);
    ui.addMessage("taux horaire "+ Math.round((chiffreAffaire) / this.temps * 100) / 100+ " €HT");
    ui.addMessage("facturation : "+ chiffreAffaire + " €HT");
    ui.addMessage("salaire : "+ this.calculSalaire(chiffreAffaire) + "€");
    this.previsionnelSalaire();
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
    const noshow = seance.realise === "StudentAbsent" ? " no show" : "";
    const categorie = seance.financement+" | niveau "+seance.niveau+ noshow;
    if (this.seances[categorie] === undefined) this.seances[categorie] = [];
    this.seances[categorie].push(seance);
  }

  /**
   * ajoute le tarif de la séance
   *
   * @param   {seance}  seance  [seance description]
   *
   * @return  {Promise.<void>}            complète les informations de la séance
   * @throw   {Error}
   */
  async definirFinancement(seance){
    if (seance.type === "Soutenance") {
      this.soutenances++;
      seance.financement = "Soutenance";
      return;
    }
    try {
      seance.financement = await this.statutEleve(seance.eleve, seance.link);
      delete seance.link;
    }
    catch (err){
      throw err;
    }
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
    if (seance.realise === "StudentAbsent") {
      seance.tarif = seance.tarif / 2;
      this.noShows++;
    }
    this.total += seance.tarif;
  }

  calculSalaire(montant) {
    return montant - Math.round((montant * this.tarification.tauxCotisation));
  }

  /**
   * [statutEleve description]
   *
   * @param   {String}  eleve  [eleve description]
   *
   * @return  {Promise.<eleveFinancement>}         [return description]
   * @throw   {Error}
   */
  async statutEleve(eleve, link) {
    if (this.eleves[eleve] === undefined) {
      try {
        const ref             = ui.addMessage("récupère le financement d" + this.apostrophe(eleve) + eleve, true);
        this.eleves[eleve]    = await extractor.extractStudentFunding(link);

        if (this.eleves[eleve] === "Auto-financé" || this.eleves[eleve] === "Financé par un tiers") {
          extractor.update(this.eleves);
          ui.taskFinished(ref, true);
        }
        else {
          this.manuallyDefineFunding.push(eleve);
          ui.taskFinished(ref, false);
        }
      }
      catch (err) {
        throw err;
      }
    }
    return this.eleves[eleve];
  }

  ajouteJourTravaille(seance) {
    const jour = seance.split(",")[0];
    if (this.joursTravailles.indexOf(jour) === -1) this.joursTravailles.push(jour);
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

  getOpenedDays(year, month, dayNumber) {
    let tmp;
    let joursOuvres = 0;
    for (let i = 0; i < dayNumber; i++) {
      tmp = new Date(year, month, i).getDay();
      if (tmp < 5) joursOuvres++;
    }
    return joursOuvres;
  }
}