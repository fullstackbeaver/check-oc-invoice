# Check OC Invoice

Un snippet qui récapitule les séances afin de vérifier ce que propose openclassrooms pour la facturation.

## Avancement

C'est une première version, encore en phase de teste, beaucoup de choses restent à vérifier et optimiser.
L'interface est une ébauche. L'intégration sera probablement meilleure dans les prochaines versions.

## Pré-requis

- Avoir un compte metor chez openclassrooms

## Installation

- Dans votre navigateur aller dans l'inspecteur puis sources > snippets
- Cliquer sur ajouter un snippet
- Coller le contenu du fichier snippet.js dans la zone prévue à cet effet
- Configurer settings si necessaire en s'appuyant sur les commentaires

## Démarrage

- Aller sur votre tableau de bord de mentor et choisir "historique"
- Ouvrir l'inspecteur > sources > snippets
- Lancer le snippet (clique droit puis run).
- Si vous n'avez pas mis sur true `autoLaunch` dans settings il faudra ensuite cliquer sur le bouton de l'interface
- Si vous voulez utiliser le script avec votre propre serveur il faut cloner ce dépot, installer les dépendances, lancer le script watch et dans la configuration du snippet mettre local sur true

### Avoir plus des informations détaillés sur les séances

Si vous désirez avoir plus ample informations sur les séances afin de vérifier vous pouvez taper dans la console :

- **interpreter.eleves**  pour avoir la liste des élèves ainsi que leur financement.
- **interpreter.seances**  pour avoir le détail des séaances classées par type.
- **interpreter.exportAutomaticInvoice()** pour avoir la date et le nom de l'élève pour chaque type de session avec le tri de la facturation automatique

## Contributing

- Si vous souhaitez contribuer, contactez-moi.
- Les issues sont ouvertes si vous rencontrez un bug

## Versions

**Dernière version stable :** aucune
**Dernière version :** 0.4.0

version 0.4.0 :

* ajout d'une vue avec le tri du système de facturation automatique (pour agréger les doublons dans le PDF fourni par OC vous pouvez utiliser [ce script](https://github.com/fullstackbeaver/summarizes-OC-PDF-invoice) )

version 0.3.0 :

* ajout d'un autoscroll pour récupérer toutes les séances
* mis en place d'un outil pour générer le script au format standard (sans commentaires) et minimifié
* ajout d'un serveur pour avoir une version sans aller chercher le script sur github pages

version 0.2.0 :

* corrige quelques bugs
* vérification que l'on est sur la page historique

version 0.1.0 :

* version initiale

## Roadmap

* ajout d'une interface en cas d'élève qui n'a plus de financement
* ajout d'un système d'extension afin de se connecter à l'API d'un logiciel de comptabilité

## License

Ce projet est sous licence ``WTFTPL``
