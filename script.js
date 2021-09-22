/* global extractor */

/**
 * @typedef  {Object}                                       seance
 * @property {String}                                       date
 * @property {String}                                       eleve
 * @property {String}                                       [financement]
 * @property {String}                                       link
 * @property {Number|null}                                  niveau
 * @property {("StudentAbsent" | "Completed" | "Canceled")} realise
 * @property {Number}                                       [tarif]
 * @property {String}                                       type
 */

/**
 * @typedef {("Auto-financé" |  "Financé par un tiers")} eleveFinancement
 */


 class Extractor {

  /**
   * les données extraites de la page
   */
  data = [];

  /**
   * l'étape d'extraction
   * @type {Number}
   * 0: l'extraction n'a pas commencé
   * 1: l'extraction a commencé
   * 2: un premier titre à été trouvé
   * 3: l'extraction est finie
   */
  state = 0;
  /**
   * [constructor description]
   *
   * @param   {String}  domSrc  la référence de l'élément à importer
   */
  constructor(domSrc) {
    this.domSrc = domSrc;
  }

  extractList() {
    const list    = document.querySelectorAll(this.domSrc);
    this.data     = [];
    this.state    = 1;
    let newLine;
    for (let i = 0, size= list.length; i < size; i++) {
      if (this.state === 3) break;
      // @ts-ignore
      newLine = this.newLine(list[i]);
      if (newLine) this.data.push(newLine);
    }
    return {
      eleves  : JSON.parse(localStorage.getItem("eleves")),
      seances : this.data
    }
  }

  /**
   * extract funding information from student page
   *
   * @param   {String}  src  [eleve description]
   *
   * @return  {Promise}         [return description]
   * @throw   {Error}
   */
  async extractStudentFunding(src){
    try {
      const data    = await fetch(src);
      let funding   = await data.text();
      let start     = funding.indexOf("mentorshipStudent__details");
      funding       = funding.slice(start, start+100);
      funding       = funding.slice(funding.indexOf("<p>")+4, funding.indexOf("</p>")-1);
      funding       = funding.replace(/\n/g, '').trim();
      return funding;
    } catch (error) {
      throw error;
    }
  }

  /**
   * [newLine description]
   *
   * @param   {HTMLElement}  node  [node description]
   *
   * @return  {seance | void}        [return description]
   */
  newLine(node) {
    const content = node.innerText;
    if (content.length <= 20) {
      this.state++;
      return;
    }
    const list = node.querySelectorAll("div");
    return {
      date    : list[3].innerText,
      eleve   : list[4].innerText,
      link    : list[4].querySelector("a").href,
      niveau  : list[8] ? parseInt(list[8].innerText) : null ,
      type    : list[0].innerText,
      // @ts-ignore
      realise : list[0].querySelector("svg").getAttribute("data-name").slice(0,-4)
    }
  }

  update(eleves){
    localStorage.setItem("eleves", JSON.stringify(eleves));
  }
}

class Interpreter {
  annulees              = 0;
  eleves                = {};
  elevesAutofinances    = [];
  forfaits              = 0;
  joursTravailles       = [];
  nSeances              = 0;
  noShows               = 0;
  seances               = {};
  soutenances           = 0;
  temps                 = 0;
  total                 = 0;
  tarification;

  /**
   * [constructor description]
   *
   * @param   {Object}  tarification
   * @param   {Number}  tarification.forfait
   * @param   {Number}  tarification.niveau1
   * @param   {Number}  tarification.niveau2
   * @param   {Number}  tarification.niveau3
   * @param   {Number}  tarification.tauxCotisation 
   */
  constructor(tarification) {
    this.tarification = tarification;
  }

  reset(){
    this.annulees             = 0;
    this.eleves               = {};
    this.elevesAutofinances   = [];
    this.joursTravailles      = [];
    this.nSeances             = 0;
    this.noShows              = 0;
    this.seances              = {};
    this.soutenances          = 0;
    this.temps                = 0;
    this.total                = 0;
  }

  /**
   * [readData description]
   *
   * @param   {Object}  releve  [releve description]
   * @param   {Object}  releve.eleves
   * @param   {Array.<seance>}   releve.seances
   *
   * @return  {Promise.<void>}          [return description]
   */
  async readData(releve) {
    this.reset();
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
        this.temps += seance.financement !== "Financé par un tiers" ? 0.5 : 1;
        this.definirTarif(seance);
        this.addToCategory(seance);
      };
      this.elevesAutofinances   = [...new Set(this.elevesAutofinances)];
      this.forfaits             = this.elevesAutofinances.length;
      this.montantForfait       = this.forfaits*this.tarification.forfait;
      this.temps                += this.forfaits;
      extractor.update(this.eleves);
      this.showResults();
    }
    catch (err) {
      ui.addMessage("<i>erreur : </i>" + err.stack);
    }
  }

  showResults(){

    const chiffreAffaire    = this.total+this.montantForfait;
    const prestations       = [];
    let pluriel;
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
      seance.financement = "Financé par un tiers";
      return;
    }
    try{
      seance.financement = await this.statutEleve(seance.eleve, seance.link);
      delete seance.link;
    }
    catch(err){
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
    if(seance.financement !== "Financé par un tiers") {
      this.elevesAutofinances.push(seance.eleve);
      seance.tarif = seance.tarif / 2;
    }
    if(seance.realise === "StudentAbsent") {
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
      try{
        const ref = ui.addMessage("récupère le financement d"+this.apostrophe(eleve)+eleve);
        this.eleves[eleve] = await extractor.extractStudentFunding(link);
        ui.taskFinished(ref);
      }
      catch (err){
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
    const moisTxt = new Intl.DateTimeFormat('fr-FR', { month: 'long' }).format(new Date())
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

class UI {

  /**
   * @type {HTMLElement}
   */
  DOM;

  styleSheet = `
    :root{
      --oc_color:#7451eb;
    }
    .mentorTools{
      position:fixed;
      top:0;
      z-index:100;
      background-color: rgba(255,255,255,.9);
      padding: 1rem;
      display: flex;
      align-items: flex-start;
      box-shadow: 0 0 10px var(--oc_color);
    }
    .mentorTools b{
      color : var(--oc_color);
    }
    .mentorTools div {
      padding: .2rem;
    }
    .mentorTools resume {
      max-height: 50vh;
      overflow-y: scroll;
    }
    .mentorTools span{
      width: 2rem;
      display: inline-block;
      border-bottom: 1px dashed;
    }
    .mentorTools svg{
        width:24px;
    }
  `;

  /**
   * [constructor description]
   *
   * @param   {HTMLElement}  domTarget  [domTarget description]
   */
  constructor(domTarget) {
    console.clear(); 
    this.DOM = document.querySelector(".mentorTools resume");
    if (this.DOM === null) this.initInterface(domTarget);
    this.DOM.innerHTML = '<button onclick="ui.launch()"> extraire les données</button>';
  }

  initInterface(domTarget) {
    const style = document.createElement("style");
    document.head.appendChild(style);
    style.innerText = this.styleSheet;

    const container = document.createElement("div");
    domTarget.appendChild(container);
    container.className = "mentorTools";
    container.innerHTML = `
    <svg onclick="ui.close()" focusable="false" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M13 3h-2v10h2V3zm4.83 2.17l-1.42 1.42C17.99 7.86 19 9.81 19 12c0 3.87-3.13 7-7 7s-7-3.13-7-7c0-2.19 1.01-4.14 2.58-5.42L6.17 5.17C4.23 6.82 3 9.26 3 12c0 4.97 4.03 9 9 9s9-4.03 9-9c0-2.74-1.23-5.18-3.17-6.83z"></path>
    </svg>`;
    this.DOM = document.createElement("resume");
    container.appendChild(this.DOM);
  }

  /**
   * [addMessage description]
   *
   * @param   {String}  msg  [msg description]
   *
   * @return  {HTMLElement}       [return description]
   */
  addMessage(msg) {
    const ref       = document.createElement("div");
    ref.innerHTML   = msg;
    this.DOM.appendChild(ref);
    return ref;
  }

  launch() {
    this.DOM.innerText = "";
    const data    = extractor.extractList();
    const pluriel = interpreter.pluriel(data.seances.length);
    this.addMessage(`l'extraction achevée : ${data.seances.length} seance${pluriel} planififée${pluriel}`);
    interpreter.readData(data);
  }

  close(){
    const target = document.querySelector(".mentorTools");
    target.parentNode.removeChild(target);
  }

  /**
   * [taskFinished description]
   *
   * @param   {HTMLElement}  ref  [ref description]
   *
   * @return  {void}       [return description]
   */
  taskFinished(ref){
    ref.innerHTML+="&nbsp;&nbsp;&nbsp;<b>✔</b>";
  }
}