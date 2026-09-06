import { getSettings } from "@/lib/settings";
import { canSeeFinancials, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/dates";
import { USER_ROLE } from "@/lib/labels";
import { PageHeader } from "@/components/admin/page-header";
import { SettingsForm } from "@/components/admin/settings-form";
import { UserDialog } from "@/components/admin/user-dialog";
import { UserActions } from "@/components/admin/user-actions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Paramètres" };

export default async function SettingsPage() {
  // Lu avant les autres requêtes : le rôle décide de ce qu'on interroge.
  const user = await requireUser();
  /*
   * Le journal dit qui a validé une réservation, modifié un prix ou consulté
   * une pièce d'identité. C'est l'outil de contrôle du gérant sur son agence :
   * un employé n'a pas à suivre l'activité de ses collègues.
   */
  const showAudit = canSeeFinancials(user);

  const [settings, users, recentAudit] = await Promise.all([
    getSettings(),
    db.user.findMany({
      orderBy: [{ isActive: "desc" }, { createdAt: "asc" }],
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        isActive: true,
        lastLoginAt: true,
      },
    }),
    showAudit
      ? db.auditLog.findMany({
          orderBy: { createdAt: "desc" },
          take: 15,
          select: {
            id: true,
            summary: true,
            userLabel: true,
            action: true,
            createdAt: true,
          },
        })
      : [],
  ]);

  // Seul un administrateur gère les comptes ; les autres rôles voient la
  // liste sans pouvoir y toucher.
  const isAdmin = user.role === "ADMIN";

  return (
    <>
      <PageHeader
        title="Paramètres"
        description="Coordonnées, règles de location et seuils d'alerte de l'agence."
      />

      <div className="grid gap-5 xl:grid-cols-[1.7fr_1fr]">
        <SettingsForm settings={settings} />

        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Comptes de l&apos;agence</CardTitle>
              {isAdmin ? <UserDialog /> : null}
            </CardHeader>
            <CardContent className="p-0">
              <ul className="divide-y divide-navy-50">
                {users.map((account) => (
                  <li
                    key={account.id}
                    className={
                      account.isActive
                        ? "px-5 py-3.5"
                        : "bg-navy-50/40 px-5 py-3.5"
                    }
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-[13.5px] font-medium text-navy-900">
                          {account.name}
                          {account.id === user.id ? (
                            <span className="ms-2 text-[11.5px] text-teal-700">
                              (vous)
                            </span>
                          ) : null}
                        </p>
                        <p className="truncate text-[12px] text-navy-400">
                          {account.email}
                          {account.phone ? ` · ${account.phone}` : ""}
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center gap-1">
                        <Badge tone={account.isActive ? "teal" : "neutral"}>
                          {USER_ROLE[account.role]}
                        </Badge>
                        {isAdmin ? (
                          <>
                            <UserDialog
                              userId={account.id}
                              initialValues={{
                                name: account.name,
                                email: account.email,
                                role: account.role,
                                phone: account.phone ?? "",
                              }}
                            />
                            <UserActions
                              userId={account.id}
                              userName={account.name}
                              isActive={account.isActive}
                              isSelf={account.id === user.id}
                            />
                          </>
                        ) : null}
                      </div>
                    </div>

                    <p className="mt-1 text-[11.5px] text-navy-400">
                      {!account.isActive
                        ? "Accès désactivé"
                        : account.lastLoginAt
                          ? `Dernière connexion : ${formatDateTime(account.lastLoginAt)}`
                          : "Jamais connecté"}
                    </p>
                  </li>
                ))}
              </ul>

              {!isAdmin ? (
                <p className="border-t border-navy-100 px-5 py-3 text-[12px] leading-relaxed text-navy-400">
                  Seul un administrateur peut créer ou modifier les comptes.
                </p>
              ) : null}
            </CardContent>
          </Card>

          {showAudit ? (
          <Card>
            <CardHeader>
              <CardTitle>Journal d&apos;activité</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {recentAudit.length === 0 ? (
                <p className="px-5 py-6 text-center text-[13px] text-navy-400">
                  Aucune action enregistrée.
                </p>
              ) : (
                <ol className="divide-y divide-navy-50">
                  {recentAudit.map((entry) => (
                    <li key={entry.id} className="px-5 py-3">
                      <p className="text-[13px] text-navy-800">{entry.summary}</p>
                      <p className="mt-0.5 text-[11.5px] text-navy-400">
                        {entry.userLabel} · {formatDateTime(entry.createdAt)}
                      </p>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
          ) : null}
        </div>
      </div>
    </>
  );
}
