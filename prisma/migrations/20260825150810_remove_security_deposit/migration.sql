-- Retrait de la caution.
--
-- L'agence a décidé de ne pas demander de caution. Les colonnes et les
-- types de paiement correspondants sont supprimés plutôt que laissés
-- inertes : une colonne morte finit toujours par être réutilisée à
-- tort, et elle continuerait d'apparaître dans les exports.

-- AlterEnum
BEGIN;
CREATE TYPE "PaymentType_new" AS ENUM ('DEPOSIT', 'BALANCE', 'EXTRA_FEE', 'REFUND');
ALTER TABLE "public"."Payment" ALTER COLUMN "type" DROP DEFAULT;
ALTER TABLE "Payment" ALTER COLUMN "type" TYPE "PaymentType_new" USING ("type"::text::"PaymentType_new");
ALTER TYPE "PaymentType" RENAME TO "PaymentType_old";
ALTER TYPE "PaymentType_new" RENAME TO "PaymentType";
DROP TYPE "public"."PaymentType_old";
ALTER TABLE "Payment" ALTER COLUMN "type" SET DEFAULT 'BALANCE';
COMMIT;

-- AlterTable
ALTER TABLE "Rental" DROP COLUMN "securityDepositAmount",
DROP COLUMN "securityDepositReturned";

-- AlterTable
ALTER TABLE "Reservation" DROP COLUMN "securityDeposit";

-- AlterTable
ALTER TABLE "Vehicle" DROP COLUMN "securityDeposit";

