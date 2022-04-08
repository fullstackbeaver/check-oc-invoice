if (extractor) {
  window.location.reload();
}



class Extractor {

  constructor() {
    this.data = [];
    this.state   = 0;
    this.userId  = localStorage.getItem("ajs_user_id").slice(1,-1);
    this.headers = {
      headers: new Headers({
        "Authorization": "Bearer "+localStorage.getItem("7xPFDY3bB3ruX44z__oc-sdk-access-token")
      }),
    };
    this.resquestedMonth=null;
    this.extractsRef = [];
  }

  async extractData(last) {
    if (last === undefined){
      last = {
        date   : new Date(Date.now()).toISOString().slice(0,10), 
        heure  : "23",
        minutes: "59",
      };
    }
    const data = await this.fetcher(last);
    for (const entry of data){
      const mois = new Date(entry.sessionDate).getMonth();
      if (this.state === 0){
        if (mois !== this.resquestedMonth) continue;
        this.state++;
        ui.addMessage("l'extraction commence");
        this.addEntry(entry);
        continue;
      }
      if (this.state === 1){
        if (mois !== this.resquestedMonth) return this.extractionEnd();
        this.addEntry(entry);
      }
    }
    const start  = new Date(data[data.length - 1].sessionDate);
    last = {
      date   : start.toISOString().slice(0,10), 
      heure  : this.ajusteFormatDate(start.getHours()),
      minutes: this.ajusteFormatDate(start.getMinutes()),
    };
    ui.addMessage("nouvelle requête pour avoir plus de séances");
    this.extractData(last);
  }

  async extractStudentFunding(id) {
    try {
      const ref     = "isFinancialAidStudent";
      const data    = await fetch(`https://openclassrooms.com/fr/mentorship/students/${id}/dashboard`);
      const page    = await data.text();
      const funding = page[page.indexOf(ref)+ref.length+3];
      switch (funding){
        case "f"    : return "Auto-financé";
        case "t"    : return "Financé par un tiers";
        default: return null;
      }
    } catch (error) {
      console.error("error",error);
      throw error;
    }
  }

  getManualFundings(){ 
    const resume = document.querySelector("resume");
    const list   = resume.querySelectorAll("select");
    list.forEach(elm => {
      console.log(elm.id, elm.value);
      interpreter.eleves[elm.id] = elm.value;
    });
    this.update(interpreter.eleves);
    alert("les données ont été enregistrées mais fonction (extractor.getManualFundings) à finir");
  }

  startSearch(previous) {
    this.currentItem   = 1;
    this.state         = 0;
    this.resquestedMonth = new Date(Date.now()).getMonth();
    if (previous) this.resquestedMonth--;
    ui.addMessage("recherche du début du mois sélectionné");
    this.extractData();
  }

  update(eleves) {
    localStorage.setItem("eleves", JSON.stringify(eleves));
  }

  async fetcher(props){
    const url = `https://api.openclassrooms.com/users/${this.userId}/sessions?actor=expert&before=${props.date}T${props.heure}%3A${props.minutes}%3A00Z&life-cycle-status=canceled%2Ccompleted%2Clate%20canceled%2Cmarked%20student%20as%20absent&sort=sessionDate%20DESC`;
    try {
      const response = await fetch(url, this.headers);
      const answer= await response.json();
      return answer;
    }
    catch (err){
      console.error(err);
    }
  }

  ajusteFormatDate(valeur){
    if (valeur >= 10) return valeur.toString();
    return "0"+valeur;
  }

  addEntry(entry){
    const ref = entry.sessionDate+"_"+entry.recipient.displayableName+"_"+entry.status;
    if (this.extractsRef.indexOf(ref) !== -1) return;
    this.extractsRef.push(ref);
    this.data.push({
      date    : entry.sessionDate,
      eleve   : entry.recipient.displayableName,
      id      : entry.recipient.id,
      niveau  : parseInt(entry.projectLevel),
      realise : entry.status,
      type    : entry.type
    });
  }

  extractionEnd(){
    this.state++;
    const pluriel = interpreter.pluriel(this.data.length);
    ui.clear();
    ui.addMessage(`l'extraction achevée : ${this.data.length} seance${pluriel} planififée${pluriel}`);
    interpreter.readData();
  }
}
var extractor = new Extractor();

class UI {

  constructor(domTarget, src) {
    console.clear();
    console.log("src:",src);

    this.DOM    = document.querySelector(".mentorTools resume");
    if (this.DOM === null) this.initInterface(domTarget, src);
    this.addMessage(`<button onclick="ui.launch(false)"> extraire les données de ${this.getMonth(false)}</button>`);
    if (new Date().getDate() < 15) {
      this.addMessage(`<button onclick="ui.launch(true)"> extraire les données de ${this.getMonth(true)}</button>`);
    }
  }

  addMessage(msg, prefix=false) {
    const ref       = document.createElement("div");
    ref.innerHTML   = msg;
    this.DOM.appendChild(ref);
    if (prefix){
      ref.dataset.content=">";
      return ref;
    }
  }

  clear(){
    this.DOM.innerText = "";
  }

  close(){
    const target = document.querySelector(".mentorTools");
    target.parentNode.removeChild(target);
  }

  getMonth(previous){
    const date = new Date();
    if (previous) date.setMonth(date.getMonth() -1);
    return date.toLocaleString("default", { month: "long" });
  }

  initInterface(domTarget, src) {
    const style   = document.createElement("link");
    style.type    = "text/css";
    style.rel     = "stylesheet";
    style.href    = src+"/css/style.css";
    document.head.appendChild(style);

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

  launch(previous) {
    this.clear();
    extractor.startSearch(previous);
  }

  taskFinished(ref, succeed){
    ref.dataset.content = succeed ? "✔" : "X";
  }

  showOrderedResults(seances) {
    const prestations = [];
    for (const key of Object.keys(seances)) {
      prestations.push(key);
    }
    prestations.sort();
    prestations.forEach(presta => {
      this.addMessage(`<span>${seances[presta].length}</span> x ${presta}`);
    });
  }
}

var ui = new UI(document.body, src);


class Interpreter {

  constructor(tarification) {
    this.tarification = tarification;
    this.reset();
  }

  apostrophe(student){
    return ["A","E","I","O","U","Y"].indexOf(student.slice(0,1)) === -1 ? "e " : "'";
  }

  addToCategory(seance){
    const noshow      = seance.realise === "marked student as absent" ? " no show" : "";
    const type        = seance.type === "presentation" ? "soutenance" : seance.financement;
    const categorie   = type+" | niveau "+seance.niveau+ noshow;
    if (this.seances[categorie] === undefined) this.seances[categorie] = [];
    this.seances[categorie].push(seance);
  }

  addToCategoryAutomaticInvoice(seance, intitule){
    if ( ! this.automaticInvoice[intitule] ) this.automaticInvoice[intitule] = [];
    this.automaticInvoice[intitule].push(seance);
  }

  ajouteJourTravaille(seance) {
    const jour = new Date(seance).getDate();
    if (this.joursTravailles.indexOf(jour) === -1) this.joursTravailles.push(jour);
  }

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
    this.addToCategoryAutomaticInvoice(seance,intitule);
  }

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
      if (seance.realise === "canceled") continue;
      this.nSeances++;
      this.ajouteJourTravaille(seance.date);
      if (seance.type === "presentation") {
        this.soutenances++;
        seance.financement = "Financé par un tiers";
      }
      else seance.financement = await this.statutEleveMentore(seance.eleve, seance.id);
      this.temps += seance.financement === "Auto-financé" ? 0.5 : 1;
      this.definirTarif(seance);
      this.addToCategory(seance);
      this.defineCategoryAutomaticInvoice(seance);
    }
  }

  pluriel(qty){
    return qty > 1 ? "s" : "";
  }

  previsionnelSalaire() {

    const idMois  = new Date().getMonth();
    console.log("idMois:",idMois, extractor.resquestedMonth);
    if (idMois !== extractor.resquestedMonth) return;

    const annee   = new Date().getFullYear();


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
      seance.financement = this.eleves[seance.eleve] ? this.eleves[seance.eleve]: await extractor.extractStudentFunding(seance.id);
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

  async statutEleveMentore(eleve, id) {
    if (this.eleves[eleve]) return this.eleves[eleve]; 
    const ref             = ui.addMessage("récupère le financement d" + this.apostrophe(eleve) + eleve, true);
    this.eleves[eleve]    = await extractor.extractStudentFunding(id);
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

var interpreter = new Interpreter(settings.tarification);
if (settings.autoLaunch) ui.launch(false);