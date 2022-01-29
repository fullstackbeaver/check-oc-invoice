if (extractor) {
  delete extractor, interpreter, ui, Extractor, Interpreter, UI;
}



class Extractor {

  constructor(domSrc, seeMoreBtn) {
    this.data               = [];
    this.domSrc             = domSrc;
    this.firstEntry         = 0;
    this.lastEntry          = 0;
    this.mutationObserver   = new MutationObserver(this.extractData.bind(this));
    this.seeMoreBtn         = seeMoreBtn;
    this.skipNextTitle;
    this.state = 0;
  }

  checkPage() {
    const lang = window.location.pathname.slice(0, 3);
    const target = "/mentorship/dashboard/mentorship-sessions-history";
    if (window.location.pathname.slice(3) !== target) {
      ui.addMessage(`<a href="${lang + target}"><h1>ce n'est pas la bonne page</h1>aller à la page historique</a>`);
      return false;
    }
    return true;
  }

  extractData() {
    window.scrollTo(0, document.body.scrollHeight);
    const list = document.querySelectorAll(this.domSrc);
    if (list.length === 0) return;
    let newLine;
    for (let i = this.currentItem, size = list.length; i < size; i++) {
      if (list[i].innerText.length <= 20) {
        this.state++;
        if (this.state === 2) {
          this.mutationObserver.disconnect();
          const pluriel = interpreter.pluriel(this.data.length);
          ui.clear();
          ui.addMessage(`l'extraction achevée : ${this.data.length} seance${pluriel} planififée${pluriel}`);
          interpreter.readData();
          return;
        }
        if (this.state === 1) {
          ui.addMessage("l'extraction commence");
          continue;
        }
      }
      if (this.state === 1) {
        this.currentItem = i+1;
        newLine = this.newLine(list[i]);
        if (newLine) this.data.push(newLine);
      }
    }
    const btns = document.querySelectorAll(this.seeMoreBtn);
    const seeMoreBtn = btns[btns.length - 1];
    if (seeMoreBtn !== undefined) {
      ui.addMessage("nouvelle requête pour avoir plus de séances");
      seeMoreBtn.click();
    }
  }

  async extractStudentFunding(src) {
    try {
      const data  = await fetch(src);
      let funding = await data.text();
      const start = funding.indexOf("mentorshipStudent__details");
      funding = funding.slice(start, start + 100);
      funding = funding.slice(funding.indexOf("<p>") + 4, funding.indexOf("</p>") - 1);
      funding = funding.replace(/\n/g, "").trim();
      return funding;
    } catch (error) {
      throw error;
    }
  }

  getManualFundings(){ 
    alert("fonction extractor.getManualFundings() à coder");
  }

  newLine(node) {
    const list = node.querySelectorAll("div");
    return {
      date    : list[3].innerText,
      eleve   : list[4].innerText,
      link    : list[4].querySelector("a").href,
      niveau  : list[8] ? parseInt(list[8].innerText) : null,
      realise : list[0].querySelector("svg").getAttribute("data-name").slice(0, -4),
      type    : list[0].innerText
    };
  }

  startSearch(previous) {
    this.currentItem = 1;
    this.skipNextTitle = previous;
    this.state = previous ? 0 : 1;
    this.mutationObserver.observe(document.querySelector("#mainContent"), { childList: true, subtree: true });
    ui.addMessage("recherche du début du mois sélectionné");
    this.extractData();
  }

  update(eleves) {
    localStorage.setItem("eleves", JSON.stringify(eleves));
  }
}
var extractor = new Extractor("#mainContent section li", "#mainContent button.webapp-0-MuiButton-text");

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
    if (!extractor.checkPage()) return;
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
    const noshow      = seance.realise === "StudentAbsent" ? " no show" : "";
    const type        = seance.type === "Soutenance" ? "soutenance" : seance.financement;
    const categorie   = type+" | niveau "+seance.niveau+ noshow;
    if (this.seances[categorie] === undefined) this.seances[categorie] = [];
    this.seances[categorie].push(seance);
  }

  addToCategoryAutomaticInvoice(seance, intitule){
    if ( ! this.automaticInvoice[intitule] ) this.automaticInvoice[intitule] = [];
    this.automaticInvoice[intitule].push(seance);
  }

  ajouteJourTravaille(seance) {
    const jour = seance.split(",")[0];
    if (this.joursTravailles.indexOf(jour) === -1) this.joursTravailles.push(jour);
  }

  automaticInvoiceSessionTitle(seance){
    const financement   = seance.financement === "Financé par un tiers" ? "financed" : "self-paid";
    const realisation   = seance.realise === "Completed" ? "completed" : "no-show";
    const type          = seance.type === "Mentorat" ? "standard" : "defense";
    return `Session mentorat - Expertise ${seance.niveau} - ${financement} - ${type} - ${realisation}`;
  }

  calculSalaire(montant) {
    return montant - Math.round((montant * this.tarification.tauxCotisation));
  }

  async definirFinancement(seance){
    try {
      seance.financement = await this.statutEleveMentore(seance.eleve, seance.link);
    }
    catch (err){
      throw err;
    }
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
    if (seance.realise === "StudentAbsent") {
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
      if (seance.type === "Soutenance") {
        this.soutenances++;
        seance.financement = "Financé par un tiers";
      }
      else await this.definirFinancement(seance);
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

  async statutEleveMentore(eleve, link) {
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
}

var interpreter = new Interpreter(settings.tarification);
if (settings.autoLaunch) ui.launch(false);