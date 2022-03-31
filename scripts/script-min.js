extractor&&window.location.reload();class Extractor{constructor(){this.data=[],this.state=0,this.userId=localStorage.getItem("ajs_user_id").slice(1,-1),this.headers={headers:new Headers({Authorization:"Bearer "+localStorage.getItem("7xPFDY3bB3ruX44z__oc-sdk-access-token")})},this.resquestedMonth=null}async extractData(e){void 0===e&&(e={date:new Date(Date.now()).toISOString().slice(0,10),heure:"23",minutes:"59"});var t=await this.fetcher(e);for(const i of t){var s=new Date(i.sessionDate).getMonth();if(0!==this.state){if(1===this.state){if(s!==this.resquestedMonth)return this.extractionEnd();this.addEntry(i)}}else s===this.resquestedMonth&&(this.state++,ui.addMessage("l'extraction commence"),this.addEntry(i))}const a=new Date(t[t.length-1].sessionDate);e={date:a.toISOString().slice(0,10),heure:this.ajusteFormatDate(a.getHours()),minutes:this.ajusteFormatDate(a.getMinutes())},ui.addMessage("nouvelle requête pour avoir plus de séances"),this.extractData(e)}async extractStudentFunding(e){try{var t="isFinancialAidStudent";const s=await fetch(`https://openclassrooms.com/fr/mentorship/students/${e}/dashboard`),a=await s.text();switch(a[a.indexOf(t)+t.length+3]){case"f":return"Auto-financé";case"t":return"Financé par un tiers";default:return null}}catch(e){throw console.error("error",e),e}}getManualFundings(){const e=document.querySelector("resume"),t=e.querySelectorAll("select");t.forEach(e=>{console.log(e.id,e.value),interpreter.eleves[e.id]=e.value}),this.update(interpreter.eleves),alert("les données ont été enregistrées mais fonction (extractor.getManualFundings) à finir")}startSearch(e){this.currentItem=1,this.state=0,this.resquestedMonth=new Date(Date.now()).getMonth(),e&&this.resquestedMonth--,ui.addMessage("recherche du début du mois sélectionné"),this.extractData()}update(e){localStorage.setItem("eleves",JSON.stringify(e))}async fetcher(e){e=`https://api.openclassrooms.com/users/${this.userId}/sessions?actor=expert&before=${e.date}T${e.heure}%3A${e.minutes}%3A00Z&life-cycle-status=canceled%2Ccompleted%2Clate%20canceled%2Cmarked%20student%20as%20absent&sort=sessionDate%20DESC`;try{const t=await fetch(e,this.headers);return await t.json()}catch(e){console.error(e)}}ajusteFormatDate(e){return 10<=e?e.toString():"0"+e}addEntry(e){var t=this.data[this.data.length-1];void 0!==t&&t.date===e.sessionDate&&t.eleve===e.recipient.displayableName&&t.realise===e.status||this.data.push({date:e.sessionDate,eleve:e.recipient.displayableName,id:e.recipient.id,niveau:parseInt(e.projectLevel),realise:e.status,type:e.type})}extractionEnd(){this.state++;var e=interpreter.pluriel(this.data.length);ui.clear(),ui.addMessage(`l'extraction achevée : ${this.data.length} seance${e} planififée${e}`),interpreter.readData()}}var extractor=new Extractor;class UI{constructor(e,t){console.clear(),console.log("src:",t),this.DOM=document.querySelector(".mentorTools resume"),null===this.DOM&&this.initInterface(e,t),this.addMessage(`<button onclick="ui.launch(false)"> extraire les données de ${this.getMonth(!1)}</button>`),(new Date).getDate()<15&&this.addMessage(`<button onclick="ui.launch(true)"> extraire les données de ${this.getMonth(!0)}</button>`)}addMessage(e,t=!1){const s=document.createElement("div");if(s.innerHTML=e,this.DOM.appendChild(s),t)return s.dataset.content=">",s}clear(){this.DOM.innerText=""}close(){const e=document.querySelector(".mentorTools");e.parentNode.removeChild(e)}getMonth(e){const t=new Date;return e&&t.setMonth(t.getMonth()-1),t.toLocaleString("default",{month:"long"})}initInterface(e,t){const s=document.createElement("link");s.type="text/css",s.rel="stylesheet",s.href=t+"/css/style.css",document.head.appendChild(s);const a=document.createElement("div");e.appendChild(a),a.className="mentorTools",a.innerHTML=`
    <svg onclick="ui.close()" focusable="false" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M13 3h-2v10h2V3zm4.83 2.17l-1.42 1.42C17.99 7.86 19 9.81 19 12c0 3.87-3.13 7-7 7s-7-3.13-7-7c0-2.19 1.01-4.14 2.58-5.42L6.17 5.17C4.23 6.82 3 9.26 3 12c0 4.97 4.03 9 9 9s9-4.03 9-9c0-2.74-1.23-5.18-3.17-6.83z"></path>
    </svg>`,this.DOM=document.createElement("resume"),a.appendChild(this.DOM)}launch(e){this.clear(),extractor.startSearch(e)}taskFinished(e,t){e.dataset.content=t?"✔":"X"}showOrderedResults(t){const e=[];for(const s of Object.keys(t))e.push(s);e.sort(),e.forEach(e=>{this.addMessage(`<span>${t[e].length}</span> x ${e}`)})}}var ui=new UI(document.body,src);class Interpreter{constructor(e){this.tarification=e,this.reset()}apostrophe(e){return-1===["A","E","I","O","U","Y"].indexOf(e.slice(0,1))?"e ":"'"}addToCategory(e){var t="marked student as absent"===e.realise?" no show":"",t=("presentation"===e.type?"soutenance":e.financement)+" | niveau "+e.niveau+t;void 0===this.seances[t]&&(this.seances[t]=[]),this.seances[t].push(e)}addToCategoryAutomaticInvoice(e,t){this.automaticInvoice[t]||(this.automaticInvoice[t]=[]),this.automaticInvoice[t].push(e)}ajouteJourTravaille(e){e=new Date(e).getDate();-1===this.joursTravailles.indexOf(e)&&this.joursTravailles.push(e)}automaticInvoiceSessionTitle(e){var t="Financé par un tiers"===e.financement?"financed":"self-paid",s="Completed"===e.realise?"completed":"no-show",a="Mentoring"===e.type?"standard":"defense";return`Session mentorat - Expertise ${e.niveau} - ${t} - ${a} - ${s}`}calculSalaire(e){return e-Math.round(e*this.tarification.tauxCotisation)}defineCategoryAutomaticInvoice(e){let t="defensesUnknownFunding";"Mentorat"===e.type&&(t=this.automaticInvoiceSessionTitle(e)),this.addToCategoryAutomaticInvoice(e,t)}definirTarif(e){e.tarif=this.tarification["niveau"+e.niveau],"Auto-financé"===e.financement&&(this.elevesAutofinances.push(e.eleve),e.tarif=e.tarif/2),"marked student as absent"===e.realise&&(e.tarif=e.tarif/2,this.noShows++),this.total+=e.tarif}exportAutomaticInvoice(){for(var[e,t]of Object.entries(this.automaticInvoice))t.forEach(e=>{console.log(`${e.date} - ${e.eleve} (${e.link})`)})}getOpenedDays(t,s,a){let i=0;for(let e=0;e<a;e++)new Date(t,s,e).getDay()<5&&i++;return i}async interpretsSessions(e){for(const t of e){if(!t.realise)return;"Canceled"!==t.realise&&(this.nSeances++,this.ajouteJourTravaille(t.date),"presentation"===t.type?(this.soutenances++,t.financement="Financé par un tiers"):t.financement=await this.statutEleveMentore(t.eleve,t.id),this.temps+="Auto-financé"===t.financement?.5:1,this.definirTarif(t),this.addToCategory(t),this.defineCategoryAutomaticInvoice(t))}}pluriel(e){return 1<e?"s":""}previsionnelSalaire(){var e=(new Date).getFullYear(),t=(new Date).getMonth(),s=(new Intl.DateTimeFormat("fr-FR",{month:"long"}).format(new Date),new Date(t,e,0).getDate()),s=this.getOpenedDays(e,t,s),t=this.getOpenedDays(e,t,(new Date).getDate());s!==t&&(s=(this.total-this.tarification.forfait)/t*s+this.tarification.forfait,ui.addMessage(`salaire prévisionnel : ${this.calculSalaire(s).toFixed(2)} €`))}async readData(){this.reset();var e={eleves:JSON.parse(localStorage.getItem("eleves")),seances:extractor.data};this.eleves=null===e.eleves?{}:e.eleves;try{if(await this.interpretsSessions(e.seances),0<this.manuallyDefineFunding.length)return ui.clear(),this.manuallyDefineFunding.forEach(e=>{ui.addMessage(`${e} : <select id="${e}"><option value="Auto-financé">Auto-financé</option><option value="Financé par un tiers">Financé par un tiers</option></select>`)}),void ui.addMessage('<button onclick="extractor.getManualFundings()">je valide les changements</button>');this.elevesAutofinances=[...new Set(this.elevesAutofinances)],this.forfaits=this.elevesAutofinances.length,this.montantForfait=this.forfaits*this.tarification.forfait,this.temps+=this.forfaits,this.showResults()}catch(e){ui.addMessage("<i>erreur : </i>"+e.stack)}}reset(){this.automaticInvoice={},this.eleves={},this.elevesAutofinances=[],this.forfaits=0,this.joursTravailles=[],this.manuallyDefineFunding=[],this.nSeances=0,this.noShows=0,this.seances={},this.soutenances=0,this.temps=0,this.total=0}async showAutomaticInvoiceFormat(){ui.clear(),ui.addMessage("recherche le financement des soutenances");for(const t of this.automaticInvoice.defensesUnknownFunding){var e=ui.addMessage("récupère le financement d"+this.apostrophe(t.eleve)+t.eleve,!0);t.financement=this.eleves[t.eleve]||await extractor.extractStudentFunding(t.id),ui.taskFinished(e,!0),e=this.automaticInvoiceSessionTitle(t),this.addToCategoryAutomaticInvoice(t,e)}delete this.automaticInvoice.defensesUnknownFunding,ui.clear(),ui.addMessage(`<span>${this.forfaits}</span> x Flat fees`),ui.showOrderedResults(this.automaticInvoice)}showResults(){var e=this.total+this.montantForfait,t=extractor.data.length,s=this.pluriel(t);ui.clear(),ui.addMessage(`<span>${t}</span> x seance${s} planififée${s}<br>. . . . . . . . . . . . . . . . . . .`),ui.showOrderedResults(this.seances),s=this.pluriel(this.nSeances),ui.addMessage(`<span>${this.nSeances}</span> séance${s} facturée${s} dont ${this.noShows} no show${this.pluriel(this.noShows)} : ${this.total} €HT`),s=this.pluriel(this.forfaits),ui.addMessage(`<span>${this.forfaits}</span> x forfait${s} auto-financé : ${this.montantForfait} €HT`),ui.addMessage(`temps passé : ${this.temps} heure${this.pluriel(this.temps)}`),ui.addMessage("taux horaire "+Math.round(e/this.temps*100)/100+" €HT"),ui.addMessage("facturation : "+e+" €HT"),ui.addMessage("salaire : "+this.calculSalaire(e)+"€"),this.previsionnelSalaire(),ui.addMessage('<button onclick="interpreter.showAutomaticInvoiceFormat()">affichage format facture automatique</button>')}async statutEleveMentore(e,t){if(this.eleves[e])return this.eleves[e];var s=ui.addMessage("récupère le financement d"+this.apostrophe(e)+e,!0);return this.eleves[e]=await extractor.extractStudentFunding(t),"Auto-financé"===this.eleves[e]||"Financé par un tiers"===this.eleves[e]?(extractor.update(this.eleves),ui.taskFinished(s,!0)):(this.manuallyDefineFunding.push(e),ui.taskFinished(s,!1)),this.eleves[e]}}var interpreter=new Interpreter(settings.tarification);settings.autoLaunch&&ui.launch(!1);