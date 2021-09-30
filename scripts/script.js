if (extractor) {
  delete extractor, interpreter, ui, Extractor, Interpreter, UI;
}

class Extractor {

  constructor(domSrc, seeMoreBtn) {
    this.domSrc = domSrc;
    this.seeMoreBtn = seeMoreBtn;
    this.data = [];
    this.firstEntry = 0;
    this.lastEntry = 0;
    this.mutationObserver = new MutationObserver(this.extractData.bind(this));
    this.seeMoreBtn;
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
        this.currentItem = i;
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
      const data = await fetch(src);
      let funding = await data.text();
      let start = funding.indexOf("mentorshipStudent__details");
      funding = funding.slice(start, start + 100);
      funding = funding.slice(funding.indexOf("<p>") + 4, funding.indexOf("</p>") - 1);
      funding = funding.replace(/\n/g, "").trim();
      return funding;
    } catch (error) {
      throw error;
    }
  }

  newLine(node) {
    const list = node.querySelectorAll("div");
    return {
      date: list[3].innerText,
      eleve: list[4].innerText,
      link: list[4].querySelector("a").href,
      niveau: list[8] ? parseInt(list[8].innerText) : null,
      type: list[0].innerText,
      realise: list[0].querySelector("svg").getAttribute("data-name").slice(0, -4)
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
var extractor = new Extractor("#mainContent section li", "#mainContent button");

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
}

var ui = new UI(document.body, src);

class Interpreter {

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
        this.manuallyDefineFunding.forEach(eleve =>{
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

  pluriel(qty){
    return qty > 1 ? "s" : "";
  }

  apostrophe(student){
    return ["A","E","I","O","U","Y"].indexOf(student.slice(0,1)) === -1 ? "e " : "'";
  }

  addToCategory(seance){
    const noshow = seance.realise === "StudentAbsent" ? " no show" : "";
    const categorie = seance.financement+" | niveau "+seance.niveau+ noshow;
    if (this.seances[categorie] === undefined) this.seances[categorie] = [];
    this.seances[categorie].push(seance);
  }

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

var interpreter = new Interpreter(settings.tarification);
if (settings.autoLaunch) ui.launch(false);
alert("ok");