/**
 * Nom du cookie de session, partagé entre le middleware (runtime Edge) et
 * la couche d'authentification serveur. Ce module ne contient volontairement
 * aucune dépendance Node afin de rester importable des deux côtés.
 */
export const SESSION_COOKIE_NAME = "anach_session";
