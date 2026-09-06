import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { USER_ROLE } from "@/lib/labels";
import { formatDateTime } from "@/lib/dates";
import { PageHeader } from "@/components/admin/page-header";
import { ChangePasswordForm } from "@/components/admin/change-password-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Mon compte" };

/**
 * Espace personnel, accessible à tous les rôles.
 *
 * La réinitialisation depuis /admin/parametres est réservée aux
 * administrateurs et ne demande pas le mot de passe actuel : elle sert à
 * dépanner quelqu'un, pas à gérer son propre compte. Ici chacun change son
 * mot de passe sans que personne d'autre ait à le connaître.
 */
export default async function AccountPage() {
  const user = await requireUser();
  // La session ne porte que l'essentiel : la dernière connexion vient de la base.
  const account = await db.user.findUnique({
    where: { id: user.id },
    select: { lastLoginAt: true },
  });

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Mon compte" }]}
        title="Mon compte"
        description="Vos informations et votre mot de passe."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Informations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-[14.5px]">
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-wide text-navy-400">
                Nom
              </p>
              <p className="mt-0.5 text-navy-900">{user.name}</p>
            </div>
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-wide text-navy-400">
                Email
              </p>
              <p className="mt-0.5 ltr-content text-navy-900">{user.email}</p>
            </div>
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-wide text-navy-400">
                Rôle
              </p>
              <Badge className="mt-1">{USER_ROLE[user.role]}</Badge>
            </div>
            {account?.lastLoginAt ? (
              <div>
                <p className="text-[12px] font-semibold uppercase tracking-wide text-navy-400">
                  Dernière connexion
                </p>
                <p className="mt-0.5 text-navy-700">
                  {formatDateTime(account.lastLoginAt)}
                </p>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Changer le mot de passe</CardTitle>
          </CardHeader>
          <CardContent>
            <ChangePasswordForm />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
