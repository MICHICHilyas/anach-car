-- Garde-fou base de données contre la double réservation.
--
-- La vérification applicative (src/lib/availability.ts) reste la première
-- ligne de défense — elle produit des messages clairs — mais une contrainte
-- d'exclusion garantit qu'AUCUN chemin de code (script, import, race
-- condition entre deux requêtes simultanées) ne peut créer deux réservations
-- actives qui se chevauchent sur le même véhicule.

CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Une réservation doit toujours se terminer après son début.
ALTER TABLE "Reservation"
  ADD CONSTRAINT "reservation_period_valid" CHECK ("endAt" > "startAt");

ALTER TABLE "Maintenance"
  ADD CONSTRAINT "maintenance_period_valid" CHECK ("endAt" > "startAt");

-- Chevauchement interdit sur les statuts qui immobilisent réellement le
-- véhicule. Les réservations REJECTED / CANCELLED / COMPLETED libèrent la
-- période et sont donc exclues de la contrainte.
ALTER TABLE "Reservation"
  ADD CONSTRAINT "reservation_no_overlap"
  EXCLUDE USING gist (
    "vehicleId" WITH =,
    tstzrange("startAt", "endAt", '[)') WITH &&
  )
  WHERE ("status" IN ('PENDING', 'CONFIRMED', 'ACTIVE'));

-- Deux immobilisations garage ne peuvent pas non plus se chevaucher.
ALTER TABLE "Maintenance"
  ADD CONSTRAINT "maintenance_no_overlap"
  EXCLUDE USING gist (
    "vehicleId" WITH =,
    tstzrange("startAt", "endAt", '[)') WITH &&
  )
  WHERE ("status" IN ('PLANNED', 'IN_PROGRESS') AND "blocksAvailability" = true);
