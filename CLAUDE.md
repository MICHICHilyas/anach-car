# Anach Car — repères pour travailler sur ce projet

Plateforme de location de voitures : site public multilingue + espace de
gestion pour l'agence. Voir `README.md` pour l'installation et le déploiement.

## Démarrage

```bash
npm run db:up && npm run db:deploy && npm run db:seed && npm run dev
```

Espace agence : `/admin` — `admin@anachcar.ma` / `Admin@2026` (démo).

## Règles à respecter

**Les montants sont des entiers en centimes de dirham.** `250 DH` → `25000`.
Utiliser `toCents` / `formatMoney` de `src/lib/money.ts`, jamais de flottants.

**La logique métier vit dans `src/lib/`, pas dans les composants.**
`pricing.ts` et `dates.ts` sont des fonctions pures : elles doivent le rester,
c'est ce qui les rend testables.

**La disponibilité ne se déduit jamais de `vehicle.status`.** Elle se calcule
avec `findConflicts()` / `buildVehicleWhere()` en croisant véhicule, période,
réservations et immobilisations.

**Toute écriture passe par une server action qui appelle `requireUserOrThrow()`
et `logAudit()`.** Les données venant du navigateur sont revalidées par Zod
côté serveur, systématiquement.

**Archiver, ne pas supprimer**, dès qu'un objet a un historique.

**Aucun paramètre métier en dur dans un composant.** Les seuils et règles
vivent dans `src/lib/settings.ts` (modifiables depuis `/admin/parametres`),
les coordonnées dans `src/config/agency.ts`.

**Documents clients** : jamais dans `public/`. Ils passent par
`/api/admin/documents/[id]/file`, qui vérifie la session et journalise l'accès.

## Avant de livrer

```bash
npm run typecheck && npm run lint && npm run check:boundaries && npm test && npm run build
```

`check:boundaries` détecte les fonctions d'un module `"use client"` appelées
depuis un composant serveur. React l'interdit, mais ni le typage ni le build
ne le voient : l'erreur n'apparaît qu'à l'exécution, sur la page concernée.

Les tests d'intégration créent leur propre base `anach_car_test` ; ils ne
touchent jamais la base de développement.

## Modifier le schéma

```bash
# éditer prisma/schema.prisma, puis
npm run db:migrate -- --name description_du_changement
```

Ne jamais modifier une migration déjà appliquée : en créer une nouvelle.
La contrainte d'exclusion anti double réservation vit dans
`prisma/migrations/20260822120500_reservation_overlap_guard/` — c'est du SQL
écrit à la main, Prisma ne sait pas l'exprimer.

## Traductions

`src/i18n/dictionaries/fr.ts` est la source de vérité ; `en.ts` et `ar.ts` en
dérivent par typage. Ajouter une clé en français casse la compilation des deux
autres tant qu'elles ne sont pas complétées — c'est voulu.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
