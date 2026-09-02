# Anach Car — plateforme de location de voitures

Plateforme complète pour l'agence **Anach Car** (Dcheira - Inezgane, Agadir) :
un site public multilingue avec réservation en ligne, et un espace de gestion
pour l'agence (flotte, réservations, locations, clients, maintenance,
paiements, documents).

---

## 1. Sommaire

1. [Démarrage rapide](#2-démarrage-rapide)
2. [Stack technique](#3-stack-technique)
3. [Architecture](#4-architecture)
4. [Base de données](#5-base-de-données)
5. [Fonctionnalités](#6-fonctionnalités)
6. [Règles métier](#7-règles-métier-implémentées)
7. [Variables d'environnement](#8-variables-denvironnement)
8. [Commandes](#9-commandes)
9. [Tests](#10-tests)
10. [Sécurité](#11-sécurité)
11. [Déploiement](#12-déploiement-en-production)
12. [Points restant à configurer](#13-points-restant-à-configurer)

---

## 2. Démarrage rapide

Prérequis : **Node.js 20+** et **Docker** (pour PostgreSQL en local).

```bash
# 1. Dépendances
npm install

# 2. Variables d'environnement
cp .env.example .env
#    puis renseignez DATABASE_URL et AUTH_SECRET (voir §8)

# 3. Base de données PostgreSQL (port 5433)
npm run db:up

# 4. Schéma + données de démonstration
npm run db:deploy
npm run db:seed

# 5. Lancement
npm run dev
```

| Espace | URL | Accès |
| --- | --- | --- |
| Site public | http://localhost:3000/fr | — |
| Espace agence | http://localhost:3000/admin | `admin@anachcar.ma` / `Admin@2026` |

> Les comptes ci-dessus proviennent du jeu de démonstration. **Supprimez-les
> avant toute mise en production** et créez un compte réel avec
> `npm run create-admin`.

---

## 3. Stack technique

| Domaine | Choix | Pourquoi |
| --- | --- | --- |
| Framework | **Next.js 16** (App Router, React 19) | Rendu serveur, server actions, une seule base de code pour le site et le dashboard |
| Langage | **TypeScript** strict | Les erreurs de données sont attrapées à la compilation |
| Base de données | **PostgreSQL 17** | Contraintes d'exclusion `gist` — le garde-fou anti double réservation |
| ORM | **Prisma 7** + `@prisma/adapter-pg` | Schéma typé, migrations versionnées |
| Styles | **Tailwind CSS 4** | Jetons de design centralisés dans `globals.css` |
| Composants | **Radix UI** + composants maison (style shadcn) | Accessibilité clavier et lecteurs d'écran, code possédé par le projet |
| Validation | **Zod 4** | Mêmes schémas côté client et serveur |
| Graphiques | **Recharts** | Tableau de bord |
| Icônes | **Lucide** | Jeu cohérent, léger |
| Tests | **Vitest** | Unitaires + intégration sur une vraie base |
| Authentification | Sessions opaques en base + `bcryptjs` | Révocation immédiate, aucun secret dans le cookie |

Aucune dépendance superflue : pas de microservices, pas de state manager, pas
de librairie de dates lourde (l'API `Intl` native suffit).

---

## 4. Architecture

```
src/
├── app/
│   ├── layout.tsx                  Racine : polices, langue, direction (LTR/RTL)
│   ├── [locale]/                   SITE PUBLIC (fr | en | ar)
│   │   ├── page.tsx                Accueil + moteur de recherche
│   │   ├── vehicules/              Catalogue, filtres, fiche véhicule
│   │   ├── reservation/            Formulaire + page de confirmation
│   │   ├── a-propos/ contact/      Pages éditoriales
│   │   └── mentions-legales/ …     Pages juridiques
│   ├── admin/
│   │   ├── (auth)/login/           Connexion (hors coquille du dashboard)
│   │   └── (dashboard)/            Espace agence protégé
│   └── api/
│       ├── media/[...key]/         Photos de véhicules (public, clé validée)
│       └── admin/documents/…/file  Documents clients (session obligatoire)
│
├── components/
│   ├── ui/                         Bibliothèque de base (Button, Card, Dialog…)
│   ├── site/                       Composants du site public
│   └── admin/                      Composants du dashboard
│
├── lib/                            CŒUR MÉTIER (testable, sans UI)
│   ├── availability.ts             Disponibilité réelle et conflits
│   ├── pricing.ts                  Moteur de tarification (fonction pure)
│   ├── dates.ts                    Fuseau Africa/Casablanca, jours facturés
│   ├── money.ts                    Montants en centimes de dirham
│   ├── auth.ts                     Sessions, mots de passe, contrôle d'accès
│   ├── settings.ts                 Paramètres modifiables par l'agence
│   ├── notifications.ts            Génération des alertes
│   ├── storage.ts                  Stockage fichiers (local | vercel-blob)
│   ├── mailer.ts                   Emails (console | resend)
│   └── audit.ts                    Journal d'activité
│
├── server/
│   ├── actions/                    Écritures (server actions)
│   └── queries/                    Lectures (composants serveur)
│
├── i18n/                           Dictionnaires fr / en / ar
├── config/                         Coordonnées agence, textes juridiques
│
brand-assets/                       Logo source haute définition (non publié)
└── generated/prisma/               Client Prisma (généré, non versionné)
```

**Principe directeur** : toute la logique métier vit dans `src/lib`, sans
dépendance à React. Les composants affichent, les server actions valident et
écrivent, la base contraint. Le navigateur n'est jamais une source de vérité —
modifier un prix dans les outils de développement n'a aucun effet.

### Internationalisation et sens de lecture

Le middleware préfixe les URL publiques par la langue (`/` → `/fr`) et expose
la locale via l'en-tête `x-locale`, que le layout racine utilise pour poser
`lang` et `dir` sur `<html>`. L'arabe bascule toute la mise en page en RTL
(classes logiques `ps-`/`pe-`/`start-`/`end-`) et change la pile de polices.

Deux points méritent une attention particulière :

**Les données qui restent en LTR.** En arabe, le moteur bidirectionnel
réordonne les suites de caractères neutres : `+212 6 61 80 58 08` devenait
`08 58 80 61 6 212+`. La classe `.ltr-content` (et sa variante en ligne
`.ltr-inline`) applique `direction: ltr` **et** `unicode-bidi: isolate` —
sans l'isolation, un numéro collé à un mot arabe se réordonne encore. À
utiliser pour : numéros de téléphone, emails, immatriculations, références,
montants, dates et heures.

**Les libellés techniques sont traduits.** `src/lib/labels.ts` reste en
français : il sert au dashboard, qui n'existe qu'en français. Le site public
passe par `src/i18n/vehicle-labels.ts`, sinon une fiche arabe afficherait
« Manuelle · Diesel » en plein milieu du texte.
Le dashboard est en français uniquement — c'est la langue de travail de
l'agence.

---

## 5. Base de données

15 modèles. Les principaux :

| Modèle | Rôle |
| --- | --- |
| `Vehicle` / `VehicleImage` | Flotte, tarifs par palier, suivi vidange, assurance, visite technique |
| `Customer` | Fichier clients (créé automatiquement à la première réservation) |
| `Reservation` | Demande puis dossier de location, avec devis figé |
| `Rental` | État des lieux départ / retour d'une location réellement en cours |
| `Payment` | Acomptes, soldes, frais supplémentaires, remboursements |
| `Maintenance` / `MaintenanceRecord` | Immobilisations planifiées / historique d'entretien |
| `Document` | Pièces sensibles (CIN, permis, contrats) |
| `Notification` | Alertes du dashboard, idempotentes via `dedupeKey` |
| `PricingRule` | Saisons, promotions, remises longue durée |
| `Setting` | Paramètres modifiables sans redéploiement |
| `AuditLog` | Qui a fait quoi, et quand |
| `User` / `Session` | Comptes du personnel et sessions révocables |

### Conventions

- **Montants en centimes** (`Int`). `250,00 DH` → `25000`. Aucune erreur
  d'arrondi possible sur les additions de devis (`src/lib/money.ts`).
- **Dates en `timestamptz`**, stockées en UTC, affichées en heure marocaine.
- **Archivage plutôt que suppression** dès qu'un objet a un historique
  (`archivedAt`), pour ne pas trouer la comptabilité.

### Le garde-fou anti double réservation

La migration `20260822120500_reservation_overlap_guard` installe une
contrainte d'exclusion PostgreSQL :

```sql
ALTER TABLE "Reservation"
  ADD CONSTRAINT "reservation_no_overlap"
  EXCLUDE USING gist (
    "vehicleId" WITH =,
    tstzrange("startAt", "endAt", '[)') WITH &&
  )
  WHERE ("status" IN ('PENDING', 'CONFIRMED', 'ACTIVE'));
```

Aucun chemin de code — script d'import, requêtes simultanées, bug futur — ne
peut créer deux réservations qui se chevauchent sur le même véhicule. La
vérification applicative reste la première ligne de défense (elle produit des
messages clairs) ; la base est le filet de sécurité.

---

## 6. Fonctionnalités

### Site public

- Accueil avec moteur de recherche par dates, heures et lieux
- Catalogue filtrable (catégorie, transmission, carburant, places, prix, tri)
- **Disponibilité réelle** : une voiture louée aujourd'hui reste réservable
  le mois prochain ; une voiture au garage n'apparaît pas
- Fiche véhicule : galerie, caractéristiques, équipements, grille tarifaire,
  périodes déjà réservées, module de réservation avec prix calculé en direct
- Réservation **sans création de compte**, prix total affiché avant envoi
- **Dépôt de la CIN et du permis** au moment de la demande : les pièces
  arrivent directement dans la fiche du client, côté agence (exigence
  désactivable dans les paramètres)
- Page de confirmation avec numéro `AC-2026-00001`, protégée par jeton
- **Avis clients** : note globale, cartes en grille sur desktop, défilement
  à aimantation sur mobile (`scroll-snap` natif, aucun script). Contenu dans
  `src/config/testimonials.ts` — **ce sont des exemples à remplacer par de
  vrais retours** ; vider le tableau retire la section
- Bandeau de réassurance sous le moteur de recherche
- Pages À propos, Contact (carte, formulaire, WhatsApp), 4 pages juridiques
- Trilingue **français / anglais / arabe** avec RTL, bouton WhatsApp flottant
- SEO : métadonnées, Open Graph, `sitemap.xml`, `robots.txt`, données
  structurées `schema.org` sur chaque véhicule

### Espace agence

| Page | Contenu |
| --- | --- |
| **Tableau de bord** | KPI flotte / réservations / finances, alertes, graphiques, départs et retours du jour |
| **Réservations** | Filtres par statut, recherche, confirmation, refus, annulation, remise des clés, retour, **contrat imprimable**, saisie au comptoir avec photo de la CIN et du permis |
| **Calendrier** | Planning par véhicule, jour par jour, avec réservations et immobilisations |
| **Véhicules** | CRUD complet, photos, tarifs par palier, suivi vidange, archivage |
| **Clients** | Fiches, historique, documents, paiements, notes internes, liste noire |
| **Locations** | Locations en cours, retards, historique des retours |
| **Maintenance** | Alertes vidange, assurances, visites techniques, immobilisations, historique et coûts |
| **Paiements** | Encaissements et dossiers à encaisser |
| **Documents** | Pièces sensibles déposées depuis les fiches client, véhicule ou réservation ; accès journalisé |
| **Notifications** | Centre d'alertes, marquage lu |
| **Paramètres** | Coordonnées, règles de location, seuils d'alerte, **gestion des comptes du personnel**, journal d'activité |

### Animations

Discrètes et courtes (200–600 ms), toutes neutralisées par
`prefers-reduced-motion` : entrée en cascade du hero, révélation des sections
au défilement (`<Reveal>`, un `IntersectionObserver` qui se détache après le
premier passage), zoom léger des photos au survol, icône de bouton qui avance
de 2 px, en-tête qui se densifie au défilement. Le contenu est toujours
présent dans le HTML : seule l'opacité change.

### Contrat de location imprimable

Depuis une réservation confirmée, `/admin/contrats/[id]` produit un contrat au
format A4, prêt à signer : identité des parties, véhicule, kilométrage et
carburant au départ, durée, montants (total, déjà réglé, reste dû),
huit conditions essentielles et deux blocs de signature. La page est rendue
hors de la coquille du dashboard — à l'impression, seul le contrat sort.

### Tâches planifiées

`GET /api/cron/reminders`, protégée par `CRON_SECRET`, envoie les rappels aux
clients dont la location démarre dans les 24 heures et rafraîchit les alertes
de la flotte. L'envoi est idempotent : rappeler la route dix fois n'envoie
qu'un seul email par réservation.

`vercel.json` déclare déjà l'exécution quotidienne à 8 h UTC. Avec un autre
hébergeur :

```cron
0 8 * * * curl -fsS -H "Authorization: Bearer $CRON_SECRET" \
  https://www.anachcar.ma/api/cron/reminders
```

---

## 7. Règles métier implémentées

### Cycle de vie d'une réservation

```
        (site public)              (agence)            (comptoir)          (retour)
  PENDING ─────────────────► CONFIRMED ──────────► ACTIVE ──────────► COMPLETED
     │                            │
     ├──► REJECTED                └──► CANCELLED
```

Rien n'est confirmé automatiquement : une demande envoyée depuis le site
attend la validation de l'agence. Chaque transition vérifie l'état de départ —
impossible de clôturer une location jamais démarrée.

### Disponibilité

Elle ne dépend **pas** du champ `vehicle.status`, mais du croisement :

> véhicule × période demandée × réservations existantes × immobilisations garage

Une demande `PENDING` bloque la période : c'est ce qui garantit qu'aucun
client ne se voit promettre une voiture déjà demandée. Refuser une demande
libère immédiatement le créneau.

### Tarification

`src/lib/pricing.ts` est une **fonction pure**, testée isolément :

1. Choix du tarif de base selon la durée (jour → 3 jours → semaine → mois)
2. Ajustement saisonnier (`PricingRule` de type `SEASON`)
3. Frais additionnels (lieu de prise en charge, règles `EXTRA_FEE`)
4. Remises (`PROMO`, `LONG_DURATION`), plafonnées au sous-total

Une journée = 24 h, avec une **tolérance configurable** (60 min par défaut)
avant de facturer un jour supplémentaire.

### Pas de caution

L'agence a choisi de ne pas demander de caution. Le champ, les types de
paiement associés et les colonnes correspondantes ont été **supprimés** —
schéma compris (migration `remove_security_deposit`) — plutôt que laissés
inertes : une colonne morte finit toujours par être réutilisée à tort et
continue d'apparaître dans les exports.

### Maintenance

Chaque véhicule porte son intervalle de vidange et son kilométrage à la
dernière vidange ; la prochaine échéance est **calculée**, jamais saisie deux
fois. Enregistrer une vidange met à jour l'échéance et éteint l'alerte.

Les alertes (vidange proche ou dépassée, assurance, visite technique,
documents, départs et retours imminents) sont recalculées à l'ouverture du
dashboard : **aucune tâche planifiée à installer**.

---

## 8. Variables d'environnement

Copiez `.env.example` vers `.env`.

| Variable | Obligatoire | Rôle |
| --- | --- | --- |
| `DATABASE_URL` | ✅ | Connexion PostgreSQL |
| `AUTH_SECRET` | ✅ | Signature des jetons de confirmation (32 caractères minimum) |
| `SESSION_MAX_AGE_DAYS` | — | Durée de session (défaut : 7) |
| `NEXT_PUBLIC_SITE_URL` | ✅ en prod | URL publique (liens des emails, sitemap) |
| `STORAGE_DRIVER` | — | `local` (défaut) ou `vercel-blob` |
| `STORAGE_LOCAL_DIR` | — | Dossier de stockage local (défaut : `.data/uploads`) |
| `BLOB_READ_WRITE_TOKEN` | si `vercel-blob` | Jeton Vercel Blob |
| `EMAIL_DRIVER` | — | `console` (défaut) ou `resend` |
| `EMAIL_FROM` | si `resend` | Expéditeur |
| `EMAIL_AGENCY_INBOX` | — | Boîte qui reçoit les nouvelles demandes |
| `RESEND_API_KEY` | si `resend` | Clé API Resend |
| `CRON_SECRET` | ✅ en prod | Protège `/api/cron/reminders` (`openssl rand -hex 32`) |

Générer un secret solide :

```bash
openssl rand -base64 32
```

---

## 9. Commandes

| Commande | Effet |
| --- | --- |
| `npm run dev` | Serveur de développement |
| `npm run build` | Build de production (génère le client Prisma) |
| `npm start` | Serveur de production |
| `npm run typecheck` | Vérification TypeScript |
| `npm run lint` | ESLint |
| `npm run check:boundaries` | Vérifie qu'aucune fonction client n'est appelée côté serveur |
| `npm test` | Suite de tests |
| `npm run db:up` / `db:down` | PostgreSQL local (Docker) |
| `npm run db:migrate` | Créer et appliquer une migration (développement) |
| `npm run db:deploy` | Appliquer les migrations (production) |
| `npm run db:seed` | Données de démonstration |
| `npm run db:reset` | ⚠️ Vide la base et rejoue les migrations |
| `npm run db:sync-counters` | Réaligne la numérotation après un import ou une restauration |
| `npm run db:studio` | Explorateur de base Prisma |
| `npm run create-admin` | Créer un compte pour l'espace agence |
| `npm run brand` | Régénérer les déclinaisons du logo depuis `brand-assets/` |
| `npm run hero:photos` | Étalonner vos photos de véhicules aux couleurs du Hero |

### Comptes du personnel

Une fois le premier administrateur créé, **tout se fait depuis l'interface** :
Paramètres → Comptes de l'agence. Créer un compte, changer un rôle,
réinitialiser un mot de passe, désactiver ou supprimer un accès.

Deux garde-fous empêchent l'agence de s'enfermer dehors : personne ne peut
désactiver ni supprimer son propre compte, et le dernier administrateur actif
ne peut être ni rétrogradé, ni désactivé, ni supprimé.

Désactiver un compte ou réinitialiser un mot de passe **ferme immédiatement
les sessions ouvertes** — l'accès est coupé sans attendre l'expiration du
cookie.

### Créer le premier administrateur

La ligne de commande ne sert plus qu'à l'amorçage, quand aucun compte
n'existe encore :

```bash
npm run create-admin
# ou, sans interaction :
npm run create-admin -- --email=gerant@anachcar.ma --name="Gérant" --role=ADMIN --password='…'
```

Rôles disponibles : `ADMIN` (tout), `MANAGER` (gestion sans suppression
définitive), `EMPLOYEE` (exploitation quotidienne).

---

## 10. Tests

```bash
npm test
```

**56 tests** répartis en deux familles :

- **Unitaires** — tarification (12 cas), dates et fuseau, clés de fichiers,
  jetons de confirmation.
- **Intégration** — exécutés sur une vraie base PostgreSQL créée à la volée
  (`anach_car_test`), jamais sur la base de développement.

Ce qui est couvert :

| Règle vérifiée | Test |
| --- | --- |
| Deux réservations qui se chevauchent sont refusées | contrainte base **et** server action |
| Une demande `PENDING` bloque déjà le créneau | ✅ |
| Deux locations qui se suivent sont acceptées | ✅ |
| Annuler une réservation libère la période | ✅ |
| Date de retour < date de départ refusée | ✅ |
| `4 jours × 250 DH = 1 000 DH` (exemple du cahier des charges) | ✅ |
| Tarifs dégressifs 3 jours / semaine / mois | ✅ |
| Tolérance de retour, haute saison, remises, plafonnement | ✅ |
| Un véhicule en maintenance n'est pas proposé | ✅ |
| Un véhicule loué aujourd'hui reste réservable plus tard | ✅ |
| Numérotation `AC-ANNÉE-NNNNN` sans doublon | ✅ |
| Numérotation qui saute les références déjà prises (compteur en retard) | ✅ |
| Client existant enrichi au lieu d'être dupliqué | ✅ |
| Champ piège anti-robot, limitation de débit | ✅ |
| Clé de fichier avec `../` rejetée | ✅ |
| Jeton de confirmation d'une autre réservation rejeté | ✅ |
| Fichier exécutable ou trop volumineux refusé à l'upload | ✅ |
| CIN et permis rattachés au client et au dossier à la réservation | ✅ |
| Demande refusée si les pièces exigées sont absentes | ✅ |
| Réservation au comptoir : départ immédiat, confirmation directe, pièces facultatives | ✅ |
| Réservation au comptoir refusée en cas de chevauchement | ✅ |
| Impossible de rétrograder, désactiver ou supprimer le dernier administrateur | ✅ |
| Impossible de désactiver ou supprimer son propre compte | ✅ |
| Désactivation et changement de mot de passe ferment les sessions ouvertes | ✅ |
| Création de compte réservée aux administrateurs | ✅ |
| Photo et document rangés dans des dossiers distincts | ✅ |
| Lecture d'une clé de fichier forgée refusée | ✅ |

---

## 11. Sécurité

- **Authentification** : sessions opaques en base. Le cookie ne contient qu'un
  jeton aléatoire ; seul son hash SHA-256 est stocké. Désactiver un employé
  invalide ses sessions immédiatement.
- **Autorisation** : `requireUser()` est appelé dans le layout du dashboard,
  dans chaque server action et dans chaque route sensible. Le middleware ne
  fait qu'un pré-filtrage cosmétique.
- **Mots de passe** : bcrypt, 12 tours. Message d'erreur identique pour un
  email inconnu et un mot de passe faux (pas d'énumération de comptes).
- **Limitation de débit** : connexion (5 / 5 min), réservation (5 / 10 min),
  contact (3 / 10 min).
- **Validation** : Zod sur toutes les entrées, côté serveur systématiquement.
- **Injection SQL** : requêtes paramétrées par Prisma, aucune concaténation.
- **XSS** : échappement React par défaut ; le seul `dangerouslySetInnerHTML`
  sert aux données structurées SEO, construites depuis `JSON.stringify`.
- **CSRF** : les server actions de Next.js vérifient l'origine ; les cookies
  sont `SameSite=Lax`, `HttpOnly`, `Secure` en production.
- **Documents clients** : jamais dans `public/`. Servis par une route qui
  vérifie la session, interdit la mise en cache et **journalise chaque accès**.
- **Traversée de répertoire** : les clés de fichiers sont validées par une
  expression régulière stricte.
- **Confirmation de réservation** : les références étant séquentielles, la
  page publique exige un jeton HMAC dérivé de `AUTH_SECRET`.
- **Fuite de données** : les requêtes du site public utilisent des `select`
  explicites — notes internes, coûts d'entretien et données clients ne
  quittent jamais le serveur.

---

## 12. Déploiement en production

### Vercel + PostgreSQL managé (recommandé)

1. **Base de données** : Neon, Supabase ou Vercel Postgres.
   L'extension `btree_gist` doit être disponible (c'est le cas chez tous les
   fournisseurs cités) — la migration l'active automatiquement.
2. **Variables d'environnement** dans Vercel : voir §8. Passez
   `STORAGE_DRIVER=vercel-blob` et `EMAIL_DRIVER=resend`.
3. **Migrations** : ajoutez `npm run db:deploy` à la commande de build, ou
   exécutez-la une fois depuis votre poste avec le `DATABASE_URL` de production.
4. **Premier compte** : `npm run create-admin` avec le `DATABASE_URL` de
   production.
5. **Ne jouez pas `db:seed` en production** — c'est un jeu de données fictif.

```bash
# Depuis votre poste, une seule fois
DATABASE_URL="postgresql://…prod…" npm run db:deploy
DATABASE_URL="postgresql://…prod…" npm run create-admin
```

### Stockage des fichiers

Le pilote `local` écrit dans `.data/uploads`, hors du dossier public. Il
convient à un serveur dédié avec disque persistant, **mais pas à Vercel**
(système de fichiers éphémère). En production sur Vercel, utilisez
`STORAGE_DRIVER=vercel-blob` et renseignez `BLOB_READ_WRITE_TOKEN` (onglet
Storage du projet Vercel, « Connect Store » puis « Blob »).

**Deux niveaux d'accès, et la distinction n'est pas cosmétique :**

| Contenu | Accès | Lecture |
| --- | --- | --- |
| Photos de véhicules | `public` | URL CDN, enregistrée en base à l'envoi |
| CIN, permis, contrats | `private` | Uniquement côté serveur, avec le jeton |

Un fichier privé n'a **aucune URL exploitable** : même en connaissant son
adresse exacte, on ne peut pas l'ouvrir sans le jeton du magasin. Les pièces
d'identité ne sont donc lisibles que par `/api/admin/documents/[id]/file`, qui
vérifie la session et journalise chaque consultation.

Le code ne reconstruit jamais l'URL d'un fichier à partir de sa clé : les
photos publiques utilisent l'URL renvoyée par le magasin à l'envoi, tout le
reste passe par une route interne. Trois tests verrouillent cette règle dans
`tests/integration/storage.test.ts`.

### Pièces d'identité : qui y accède, et pour combien de temps

À transmettre au gérant, car c'est lui le responsable de traitement :

- **Qui** — uniquement les comptes du personnel connectés à `/admin`. Chaque
  ouverture d'une pièce est inscrite au journal d'activité, avec l'auteur et la
  date. Aucun accès n'est possible depuis le site public.
- **Combien de temps** — les pièces sont conservées pendant toute la relation
  commerciale et au-delà, à des fins de preuve. Il n'y a **pas** de purge
  automatique : c'est un choix explicite du gérant, et il est écrit tel quel
  dans la page de confidentialité (`src/config/legal.ts`). Les clients en sont
  donc informés, comme l'exige la loi 09-08.
- **Suppression à la demande** — la page de confidentialité l'annonce : un
  client peut demander la suppression de ses pièces. Il faut que quelqu'un à
  l'agence sache traiter cette demande depuis la fiche client.
- **Sauvegarde** — le magasin de fichiers n'est pas sauvegardé par défaut.
  Perdre le magasin, c'est perdre les pièces justificatives de tous les
  dossiers en cours. À mettre en place avant la mise en ligne.

### Après la mise en ligne

- [ ] Supprimer les comptes et données de démonstration
- [ ] Renseigner RC, ICE, IF et patente dans `src/config/legal.ts`
- [x] Logo officiel intégré (déclinaisons générées par `npm run brand`)
- [ ] Remplacer les illustrations par de vraies photos de véhicules
- [ ] Vérifier les coordonnées dans `src/config/agency.ts`
- [ ] Déclarer le traitement des données auprès de la CNDP
- [ ] Mettre en place une sauvegarde du magasin de fichiers
- [ ] Expliquer au gérant qui accède aux pièces d'identité (section ci-dessus)

---

## 13. Points restant à configurer

| Sujet | État | À faire |
| --- | --- | --- |
| **Logo** | ✅ intégré | Pour le remplacer : nouveau fichier dans `brand-assets/` puis `npm run brand` |
| **Photos de véhicules** | Visuels de substitution générés par IA | Téléverser les vraies photos depuis la fiche de chaque véhicule, ou déposer des photos dans `brand-assets/hero-photos/` puis `npm run hero:photos`. Tant qu'une photo n'est pas authentique, le Hero annonce la **catégorie** et non le modèle — une agence ne peut pas montrer une voiture qu'elle ne loue pas. |
| **Mentions légales** | Base rédigée | Compléter RC / ICE / IF / patente et l'hébergeur |
| **Emails** | Pilote `console` | Créer un compte Resend, renseigner `RESEND_API_KEY` et vérifier le domaine |
| **Paiement en ligne** | Non activé (choix assumé) | L'architecture `Payment` est prête : ajouter un pilote de paiement le moment venu |
| **WhatsApp** | Liens `wa.me` pré-remplis | Suffisant en v1 ; l'API Business peut être branchée sur `src/lib/whatsapp.ts` |
| **Google Maps** | Carte intégrée sans clé | Une clé API permettra un affichage personnalisé |
| **Rappels automatiques** | ✅ opérationnels | Renseigner `CRON_SECRET` en production ; le cron Vercel est déjà déclaré |

---

## 14. Choix d'architecture notables

**Pourquoi des montants en centimes ?** Additionner des flottants finit
toujours par produire `1000.0000000001`. Sur des devis, des acomptes et des
acomptes, c'est inacceptable. Les entiers ferment le sujet définitivement.

**Pourquoi une contrainte d'exclusion PostgreSQL ?** Une vérification
applicative laisse une fenêtre entre le contrôle et l'écriture. Deux clients
qui valident au même instant peuvent tous deux passer le contrôle. La base est
le seul endroit où la règle est réellement inviolable.

**Pourquoi des sessions en base plutôt que des JWT ?** Une agence doit pouvoir
retirer l'accès à un employé immédiatement. Un JWT reste valide jusqu'à son
expiration ; une session en base se supprime.

**Pourquoi pas de paiement en ligne en v1 ?** Le marché local règle à
l'agence. Construire un tunnel de paiement inutilisé aurait ajouté de la
complexité, des obligations réglementaires et des frais — pour rien. Le modèle
`Payment` est en revanche complet, prêt à recevoir un pilote.

**Pourquoi le dashboard en français uniquement ?** C'est la langue de travail
de l'agence. Traduire l'interface de gestion en trois langues aurait triplé la
surface de maintenance sans bénéfice pour le client final.
