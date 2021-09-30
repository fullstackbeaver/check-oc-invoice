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
 * @typedef {("Auto-financé" | "Financé par un tiers")} eleveFinancement
 */

/**
 * @typedef  {Object}  tarification
 * @property {Number}  forfait
 * @property {Number}  niveau1
 * @property {Number}  niveau2
 * @property {Number}  niveau3
 * @property {Number}  tauxCotisation 
 */
module.exports = {};