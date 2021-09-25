/**
 * @typedef  {import("./typedef.js").eleveFinancement} eleveFinancement
 * @typedef  {import("./typedef.js").seance}           seance
 * @typedef  {import("./typedef.js").tarification}     tarification
 */

 class Extractor {

  /**
   * les données extraites de la page
   */
  data                = [];
  firstEntry          = 0;
  lastEntry           = 0;
  mutationObserver    = new MutationObserver(this.extractData.bind(this));
  rawData             = [];
  seeMoreBtn;
  skipNextTitle;

  /**
   * l'étape d'extraction
   * @type {Number}
   * 0: l'extraction n'a pas commencé
   * 1: le début du mois à relever est trouvé : l'extraction a commencé
   * 2: la fin du mois à relever est trouvée
   */
  state = 0;
  /**
   * [constructor description]
   *
   * @param   {String}  domSrc  la référence de l'élément à importer
   */
  constructor(domSrc, seeMoreBtn) {
    this.domSrc       = domSrc;
    this.seeMoreBtn   =seeMoreBtn;
  }

  checkPage(){
    const lang   = window.location.pathname.slice(0,3);
    const target = "/mentorship/dashboard/mentorship-sessions-history";
    if (window.location.pathname.slice(3) !== target){
      ui.addMessage(`<a href="${lang+target}"><h1>ce n'est pas la bonne page</h1>aller à la page historique</a>`)
      return false;
    }
    return true;
  }

  extractData() {
    window.scrollTo(0, document.body.scrollHeight);
    const list = document.querySelectorAll(this.domSrc);
    let newLine;
    for (let i=this.currentItem, size=list.length; i<size; i++){
      // @ts-ignore
      if (list[i].innerText.length <= 20) {
        this.state++;
        if (this.state === 2) {
          this.mutationObserver.disconnect();
          const pluriel = interpreter.pluriel(this.data.length);
          ui.addMessage(`l'extraction achevée : ${this.data.length} seance${pluriel} planififée${pluriel}`);
          interpreter.readData({
            eleves  : JSON.parse(localStorage.getItem("eleves")),
            seances : this.data
          });
          return;
        }
        if (this.state === 1) {
          ui.addMessage("l'extraction commence");
          continue;
        }
      }
      if (this.state === 1) {
        this.currentItem = i;
        newLine = this.newLine(list[i]);
        if (newLine) this.data.push(newLine);
      }
      
    }
    const btns = document.querySelectorAll(this.seeMoreBtn);
    const seeMoreBtn = btns[btns.length - 1];    
    if (seeMoreBtn !== undefined) {
      ui.addMessage("nouvelle requête pour avoir plus de séances")
      seeMoreBtn.click();
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
  
  startSearch(previous){
    this.currentItem    = 1;
    this.skipNextTitle  = previous;
    this.rawData        = [];
    this.state          = previous ? 0 : 1;
    this.mutationObserver.observe(document.querySelector("#mainContent"),{childList: true, subtree: true});
    ui.addMessage("recherche du début du mois sélectionné");
    this.extractData();
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
   * @param   {tarification}  tarification
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
   * @param   {Object}           releve  [releve description]
   * @param   {Object}           releve.eleves
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
        this.temps += seance.financement === "Auto-financé" ? 0.5 : 1;
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
    ui.clear();
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
    if(seance.financement === "Auto-financé") {
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
    .mentorTools a{
      text-decoration: none;
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
      cursor:pointer;
    }
  `;

  /**
   * [constructor description]
   *
   * @param   {HTMLElement}  domTarget  le noeud HTML où sera injecté l'outil
   */
  constructor(domTarget, lang) {
    console.clear(); 
    this.DOM    = document.querySelector(".mentorTools resume");
    this.lang   = lang;
    if (this.DOM === null) this.initInterface(domTarget);
    this.addMessage(`<button onclick="ui.launch(false)"> extraire les données de ${this.getMonth(false)}</button>`);
    if(new Date().getDate() < 15) {
      this.addMessage(`<button onclick="ui.launch(true)"> extraire les données de ${this.getMonth(true)}</button>`);
    }
  }

  /**
   * ajoute un message dans le DOM
   *
   * @param   {String}  msg  le message à ajouter (au format HTML si besoin)
   *
   * @return  {HTMLElement}  une référence du noeud HTML qui vient d'être ajouté
   */
  addMessage(msg) {
    const ref       = document.createElement("div");
    ref.innerHTML   = msg;
    this.DOM.appendChild(ref);
    return ref;
  }

  clear(){
    this.DOM.innerText = "";
  }

  close(){
    const target = document.querySelector(".mentorTools");
    target.parentNode.removeChild(target);
  }

  /**
   * [showMonth description]
   *
   * @param   {Boolean}  previous  true le mois précédent false le mois courrant
   *
   * @return  {String}            [return description]
   */
  getMonth(previous){
    const date = new Date();
    if (previous) date.setMonth(date.getMonth() -1);
    return date.toLocaleString('default', { month: 'long' });
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
   * [launch description]
   *
   * @param   {Boolean}  previous  true le mois précédent false le mois courrant
   *
   * @return  {void}            [return description]
   */
  launch(previous) {
    this.clear();
    if(!extractor.checkPage()) return;
    extractor.startSearch(previous);
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