extractor&&(delete extractor,Extractor,Interpreter,UI);class Extractor{constructor(e,t){this.data=[],this.domSrc=e,this.firstEntry=0,this.lastEntry=0,this.mutationObserver=new MutationObserver(this.extractData.bind(this)),this.seeMoreBtn=t,this.skipNextTitle,this.state=0}checkPage(){var e=window.location.pathname.slice(0,3),t="/mentorship/dashboard/mentorship-sessions-history";return window.location.pathname.slice(3)===t||(ui.addMessage(`<a href="${e+t}"><h1>ce n'est pas la bonne page</h1>aller à la page historique</a>`),!1)}extractData(){window.scrollTo(0,document.body.scrollHeight);var i=document.querySelectorAll(this.domSrc);if(0!==i.length){for(let e=this.currentItem,t=i.length;e<t;e++){if(i[e].innerText.length<=20){if(this.state++,2===this.state){this.mutationObserver.disconnect();var a=interpreter.pluriel(this.data.length);return ui.clear(),ui.addMessage(`l'extraction achevée : ${this.data.length} seance${a} planififée${a}`),void interpreter.readData()}if(1===this.state){ui.addMessage("l'extraction commence");continue}}1===this.state&&(this.currentItem=e+1,(a=this.newLine(i[e]))&&this.data.push(a))}var e=document.querySelectorAll(this.seeMoreBtn);const t=e[e.length-1];void 0!==t&&(ui.addMessage("nouvelle requête pour avoir plus de séances"),t.click())}}async extractStudentFunding(t){try{const a=await fetch(t);let e=await a.text();var i=e.indexOf("mentorshipStudent__details");return e=e.slice(i,i+100),e=e.slice(e.indexOf("<p>")+4,e.indexOf("</p>")-1),e=e.replace(/\n/g,"").trim(),e}catch(e){throw e}}getManualFundings(){alert("fonction extractor.getManualFundings() à coder")}newLine(e){const t=e.querySelectorAll("div");return{date:t[3].innerText,eleve:t[4].innerText,link:t[4].querySelector("a").href,niveau:t[8]?parseInt(t[8].innerText):null,realise:t[0].querySelector("svg").getAttribute("data-name").slice(0,-4),type:t[0].innerText}}startSearch(e){this.currentItem=1,this.skipNextTitle=e,this.state=e?0:1,this.mutationObserver.observe(document.querySelector("#mainContent"),{childList:!0,subtree:!0}),ui.addMessage("recherche du début du mois sélectionné"),this.extractData()}update(e){localStorage.setItem("eleves",JSON.stringify(e))}}var extractor=new Extractor("#mainContent section li",".MuiButton-root");class UI{constructor(e,t){console.clear(),console.log("src:",t),this.DOM=document.querySelector(".mentorTools resume"),null===this.DOM&&this.initInterface(e,t),this.addMessage(`<button onclick="ui.launch(false)"> extraire les données de ${this.getMonth(!1)}</button>`),(new Date).getDate()<15&&this.addMessage(`<button onclick="ui.launch(true)"> extraire les données de ${this.getMonth(!0)}</button>`)}addMessage(e,t=!1){const i=document.createElement("div");if(i.innerHTML=e,this.DOM.appendChild(i),t)return i.dataset.content=">",i}clear(){this.DOM.innerText=""}close(){const e=document.querySelector(".mentorTools");e.parentNode.removeChild(e)}getMonth(e){const t=new Date;return e&&t.setMonth(t.getMonth()-1),t.toLocaleString("default",{month:"long"})}initInterface(e,t){const i=document.createElement("link");i.type="text/css",i.rel="stylesheet",i.href=t+"/css/style.css",document.head.appendChild(i);const a=document.createElement("div");e.appendChild(a),a.className="mentorTools",a.innerHTML=`
    <svg onclick="ui.close()" focusable="false" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M13 3h-2v10h2V3zm4.83 2.17l-1.42 1.42C17.99 7.86 19 9.81 19 12c0 3.87-3.13 7-7 7s-7-3.13-7-7c0-2.19 1.01-4.14 2.58-5.42L6.17 5.17C4.23 6.82 3 9.26 3 12c0 4.97 4.03 9 9 9s9-4.03 9-9c0-2.74-1.23-5.18-3.17-6.83z"></path>
    </svg>`,this.DOM=document.createElement("resume"),a.appendChild(this.DOM)}launch(e){this.clear(),extractor.checkPage()&&extractor.startSearch(e)}taskFinished(e,t){e.dataset.content=t?"✔":"X"}showOrderedResults(t){const e=[];for(const i of Object.keys(t))e.push(i);e.sort(),e.forEach(e=>{this.addMessage(`<span>${t[e].length}</span> x ${e}`)})}}var ui=new UI(document.body,src);class Interpreter{constructor(e){this.tarification=e,this.reset()}apostrophe(e){return-1===["A","E","I","O","U","Y"].indexOf(e.slice(0,1))?"e ":"'"}addToCategory(e){var t="StudentAbsent"===e.realise?" no show":"",t=("Soutenance"===e.type?"soutenance":e.financement)+" | niveau "+e.niveau+t;void 0===this.seances[t]&&(this.seances[t]=[]),this.seances[t].push(e)}addToCategoryAutomaticInvoice(e,t){this.automaticInvoice[t]||(this.automaticInvoice[t]=[]),this.automaticInvoice[t].push(e)}ajouteJourTravaille(e){e=e.split(",")[0];-1===this.joursTravailles.indexOf(e)&&this.joursTravailles.push(e)}automaticInvoiceSessionTitle(e){var t="Financé par un tiers"===e.financement?"financed":"self-paid",i="Completed"===e.realise?"completed":"no-show",a="Mentorat"===e.type?"standard":"defense";return`Session mentorat - Expertise ${e.niveau} - ${t} - ${a} - ${i}`}calculSalaire(e){return e-Math.round(e*this.tarification.tauxCotisation)}async definirFinancement(e){try{e.financement=await this.statutEleveMentore(e.eleve,e.link)}catch(e){throw e}}defineCategoryAutomaticInvoice(e){let t="defensesUnknownFunding";"Mentorat"===e.type&&(t=this.automaticInvoiceSessionTitle(e)),this.addToCategoryAutomaticInvoice(e,t)}definirTarif(e){e.tarif=this.tarification["niveau"+e.niveau],"Auto-financé"===e.financement&&(this.elevesAutofinances.push(e.eleve),e.tarif=e.tarif/2),"StudentAbsent"===e.realise&&(e.tarif=e.tarif/2,this.noShows++),this.total+=e.tarif}exportAutomaticInvoice(){for(var[e,t]of Object.entries(this.automaticInvoice))console.log(`....${e} : moi ${t.length} | OC ?`),t.forEach(e=>{console.log(`${e.date} - ${e.eleve} (${e.link})`)})}getOpenedDays(t,i,a){let s=0;for(let e=0;e<a;e++)new Date(t,i,e).getDay()<5&&s++;return s}async interpretsSessions(e){for(const t of e){if(!t.realise)return;"Canceled"!==t.realise&&(this.nSeances++,this.ajouteJourTravaille(t.date),"Soutenance"===t.type?(this.soutenances++,t.financement="Financé par un tiers"):await this.definirFinancement(t),this.temps+="Auto-financé"===t.financement?.5:1,this.definirTarif(t),this.addToCategory(t),this.defineCategoryAutomaticInvoice(t))}}pluriel(e){return 1<e?"s":""}previsionnelSalaire(){var e=(new Date).getFullYear(),t=(new Date).getMonth(),i=new Intl.DateTimeFormat("fr-FR",{month:"long"}).format(new Date);const a=this.joursTravailles[this.joursTravailles.length-1];-1!==a.indexOf(i)&&parseInt(a.split(" ")[2])===e&&(i=new Date(t,e,0).getDate(),(i=this.getOpenedDays(e,t,i))!==(t=this.getOpenedDays(e,t,(new Date).getDate()))&&(i=(this.total-this.tarification.forfait)/t*i+this.tarification.forfait,ui.addMessage(`salaire prévisionnel : ${this.calculSalaire(i).toFixed(2)} €`)))}async readData(){this.reset();var e={eleves:JSON.parse(localStorage.getItem("eleves")),seances:extractor.data};this.eleves=null===e.eleves?{}:e.eleves;try{if(await this.interpretsSessions(e.seances),0<this.manuallyDefineFunding.length)return ui.clear(),this.manuallyDefineFunding.forEach(e=>{ui.addMessage(`${e} : <select id="${e}"><option value="Auto-financé">Auto-financé</option><option value="Financé par un tiers">Financé par un tiers</option></select>`)}),void ui.addMessage('<button onclick="extractor.getManualFundings()">je valide les changements</button>');this.elevesAutofinances=[...new Set(this.elevesAutofinances)],this.forfaits=this.elevesAutofinances.length,this.montantForfait=this.forfaits*this.tarification.forfait,this.temps+=this.forfaits,this.showResults()}catch(e){ui.addMessage("<i>erreur : </i>"+e.stack)}}reset(){this.automaticInvoice={},this.eleves={},this.elevesAutofinances=[],this.forfaits=0,this.joursTravailles=[],this.manuallyDefineFunding=[],this.nSeances=0,this.noShows=0,this.seances={},this.soutenances=0,this.temps=0,this.total=0}async showAutomaticInvoiceFormat(){ui.clear(),ui.addMessage("recherche le financement des soutenances");for(const t of this.automaticInvoice.defensesUnknownFunding){var e=ui.addMessage("récupère le financement d"+this.apostrophe(t.eleve)+t.eleve,!0);t.financement=this.eleves[t.eleve]||await extractor.extractStudentFunding(t.link),ui.taskFinished(e,!0),e=this.automaticInvoiceSessionTitle(t),this.addToCategoryAutomaticInvoice(t,e)}delete this.automaticInvoice.defensesUnknownFunding,ui.clear(),ui.addMessage(`<span>${this.forfaits}</span> x Flat fees`),ui.showOrderedResults(this.automaticInvoice)}showResults(){var e=this.total+this.montantForfait,t=extractor.data.length,i=this.pluriel(t);ui.clear(),ui.addMessage(`<span>${t}</span> x seance${i} planififée${i}<br>. . . . . . . . . . . . . . . . . . .`),ui.showOrderedResults(this.seances),i=this.pluriel(this.nSeances),ui.addMessage(`<span>${this.nSeances}</span> séance${i} facturée${i} dont ${this.noShows} no show${this.pluriel(this.noShows)} : ${this.total} €HT`),i=this.pluriel(this.forfaits),ui.addMessage(`<span>${this.forfaits}</span> x forfait${i} auto-financé : ${this.montantForfait} €HT`),ui.addMessage(`temps passé : ${this.temps} heure${this.pluriel(this.temps)}`),ui.addMessage("taux horaire "+Math.round(e/this.temps*100)/100+" €HT"),ui.addMessage("facturation : "+e+" €HT"),ui.addMessage("salaire : "+this.calculSalaire(e)+"€"),this.previsionnelSalaire(),ui.addMessage('<button onclick="interpreter.showAutomaticInvoiceFormat()">affichage format facture automatique</button>')}async statutEleveMentore(e,t){if(void 0===this.eleves[e])try{var i=ui.addMessage("récupère le financement d"+this.apostrophe(e)+e,!0);this.eleves[e]=await extractor.extractStudentFunding(t),"Auto-financé"===this.eleves[e]||"Financé par un tiers"===this.eleves[e]?(extractor.update(this.eleves),ui.taskFinished(i,!0)):(this.manuallyDefineFunding.push(e),ui.taskFinished(i,!1))}catch(e){throw e}return this.eleves[e]}}var interpreter=new Interpreter(settings.tarification);settings.autoLaunch&&ui.launch(!1);