/* global extractor */
class UI {

  /**
   * [constructor description]
   *
   *
   * @param   {HTMLElement}  domTarget  le noeud HTML où sera injecté l'outil
   */
  constructor(domTarget, src) {
    console.clear();
    console.log("src:",src);

    /**
     * @type {HTMLElement}
     */
    this.DOM    = document.querySelector(".mentorTools resume");
    if (this.DOM === null) this.initInterface(domTarget, src);
    this.addMessage(`<button onclick="ui.launch(false)"> extraire les données de ${this.getMonth(false)}</button>`);
    if (new Date().getDate() < 15) {
      this.addMessage(`<button onclick="ui.launch(true)"> extraire les données de ${this.getMonth(true)}</button>`);
    }
  }

  /**
   * ajoute un message dans le DOM
   *
   * @param   {String}   msg       le message à ajouter (au format HTML si besoin)
   * @param   {Boolean}  [prefix]  le message à ajouter (au format HTML si besoin)
   *
   * @return  {HTMLElement | void}  une référence du noeud HTML qui vient d'être ajouté si il y a un prefixe sinon rien
   */
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

  /**
   * [launch description]
   *
   * @param   {Boolean}  previous  true le mois précédent false le mois courrant
   *
   * @return  {void}            [return description]
   */
  launch(previous) {
    this.clear();
    if (!extractor.checkPage()) return;
    extractor.startSearch(previous);
  }

  /**
   * [taskFinished description]
   *
   * @param   {HTMLElement}  ref  [ref description]
   * @param   {Boolean}      succeed
   *
   * @return  {void}       [return description]
   */
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