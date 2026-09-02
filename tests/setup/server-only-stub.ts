/**
 * Le paquet `server-only` lève une erreur dès qu'il est importé hors d'un
 * composant serveur. En test, on le remplace par un module vide : les
 * fonctions concernées (disponibilité, paramètres, jetons) restent
 * parfaitement testables en isolation.
 */
export {};
