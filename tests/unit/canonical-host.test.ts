import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "@/middleware";

/**
 * Une seule adresse pour le site.
 *
 * www.anachcar.com et anachcar.com répondaient toutes deux, et Google les a
 * indexées comme deux sites distincts. Ces cas verrouillent la redirection :
 * une erreur ici rendrait le site inaccessible ou créerait une boucle.
 */
function get(url: string, host: string) {
  return middleware(new NextRequest(url, { headers: { host } }));
}

describe("adresse canonique du site", () => {
  it("renvoie www vers le domaine nu, de façon permanente", () => {
    const response = get("https://www.anachcar.com/fr", "www.anachcar.com");

    expect(response?.status).toBe(308);
    expect(response?.headers.get("location")).toBe("https://anachcar.com/fr");
  });

  it("conserve le chemin et les paramètres", () => {
    // Un lien publicitaire ou un partage ne doit pas perdre sa destination.
    const response = get(
      "https://www.anachcar.com/fr/vehicules?categorie=SUV",
      "www.anachcar.com",
    );

    expect(response?.headers.get("location")).toBe(
      "https://anachcar.com/fr/vehicules?categorie=SUV",
    );
  });

  it("ne redirige pas le domaine nu", () => {
    // Sans quoi le site bouclerait indéfiniment sur lui-même.
    const response = get("https://anachcar.com/fr", "anachcar.com");

    expect(response?.status).not.toBe(308);
  });

  it("laisse passer le développement local", () => {
    const response = get("http://localhost:3000/fr", "localhost:3000");

    expect(response?.status).not.toBe(308);
  });
});
