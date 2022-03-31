/**
 * @typedef  {Object}                                       seance
 * @property {String}                                       date
 * @property {String}                                       eleve
 * @property {String}                                       [financement]
 * @property {String}                                       id      //TODO: verifier si ce n'est pas un number
 * @property {Number|null}                                  niveau
 * @property {("marked student as absent" | "Completed" | "Canceled")} realise
 * @property {Number}                                       [tarif]
 * @property {String}                                       type
 *
 * @typedef {("Auto-financé" | "Financé par un tiers")} eleveFinancement
 *
 * @typedef  {Object}  tarification
 * @property {Number}  forfait
 * @property {Number}  niveau1
 * @property {Number}  niveau2
 * @property {Number}  niveau3
 * @property {Number}  tauxCotisation
 *
 * @typedef   {Object}     requeteTemporelle
 * @property  {String}     date  date au format 2022-03-01  YYYY-MM-DD
 * @property  {String}     heure  heure au format HH
 * @property  {String}     minutes  minutes au format MM
 */

module.exports = {};