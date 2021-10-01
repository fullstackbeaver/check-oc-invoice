/* global ui, interpreter */

/**
 * @typedef  {import("./typedef.js").seance}           seance
 */

class Extractor {

  /**
   * [constructor description]
   *
   * @param   {String}  domSrc  la référence de l'élément à importer
   */
  constructor(domSrc, seeMoreBtn) {
    this.data               = [];
    this.domSrc             = domSrc;
    this.firstEntry         = 0;
    this.lastEntry          = 0;
    this.mutationObserver   = new MutationObserver(this.extractData.bind(this));
    this.seeMoreBtn         = seeMoreBtn;
    this.seeMoreBtn;
    this.skipNextTitle;
    /**
     * l'étape d'extraction
     * @type {Number}
     * 0: l'extraction n'a pas commencé
     * 1: le début du mois à relever est trouvé : l'extraction a commencé
     * 2: la fin du mois à relever est trouvée
     */
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
      // @ts-ignore
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
        // @ts-ignore
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

  /**
   * extract funding information from student page
   *
   * @param   {String}  src  [eleve description]
   *
   * @return  {Promise}         [return description]
   * @throw   {Error}
   */
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
      niveau  : list[8] ? parseInt(list[8].innerText) : null,
      // @ts-ignore
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