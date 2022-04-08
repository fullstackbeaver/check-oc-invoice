/* global ui, interpreter */

/**
 * @typedef  {import("./typedef.js").seance}            seance
 * @typedef  {import("./typedef.js").requeteTemporelle} requeteTemporelle
 */

class Extractor {

  constructor() {
    this.data = [];
    /**
     * l'étape d'extraction
     * @type {Number}
     * 0: l'extraction n'a pas commencé
     * 1: le début du mois à relever est trouvé: l'extraction a commencé
     * 2: la fin du mois à relever est trouvée
     */
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

  /**
   * [extractData description]
   *
   * @param   {requeteTemporelle}  [last]  [last description]
   *
   * @return  {Promise.<void>}        [return description]
   */
  async extractData(last) {
    if (last === undefined){
      last = {
        date   : new Date(Date.now()).toISOString().slice(0,10), //2022-03-01
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
      date   : start.toISOString().slice(0,10), //2022-03-01
      heure  : this.ajusteFormatDate(start.getHours()),
      minutes: this.ajusteFormatDate(start.getMinutes()),
    };
    ui.addMessage("nouvelle requête pour avoir plus de séances");
    this.extractData(last);
  }

  /**
   * extract funding information from student page
   *
   * @param   {String}  id  student in: header
   *
   * @return  {Promise}         [return description]
   * @throw   {Error}
   */
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

  getManualFundings(){ //TODO: finir la fonction
    const resume = document.querySelector("resume");
    const list   = resume.querySelectorAll("select");
    list.forEach(elm => {
      console.log(elm.id, elm.value);
      interpreter.eleves[elm.id] = elm.value;
    });
    this.update(interpreter.eleves);
    alert("les données ont été enregistrées mais fonction (extractor.getManualFundings) à finir");
  }

  /**
   * [startSearch description]
   *
   * @param   {Boolean}  previous  mois précédent ou non
   *
   * @return  {void}            [return description]
   */
  startSearch(previous) {
    this.currentItem   = 1;
    this.state         = 0;
    this.resquestedMonth = new Date(Date.now()).getMonth();
    if (previous) this.resquestedMonth--;
    //TODO: ajouter la prise en charge du changement d'année
    ui.addMessage("recherche du début du mois sélectionné");
    this.extractData();
  }

  update(eleves) {
    localStorage.setItem("eleves", JSON.stringify(eleves));
  }

  /**
   * [fetcher description]
   * @param   {requeteTemporelle} props
   *
   * @return  {Promise.<Object>}         [return description]
   */
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

  /**
   * [ajusteFormatDate description]
   *
   * @param   {Number}  valeur  [valeur description]
   *
   * @return  {String}          [return description]
   */
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