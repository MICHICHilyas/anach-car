"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Copy,
  KeyRound,
  Loader2,
  MoreVertical,
  Trash2,
  UserCheck,
  UserX,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { deleteUser, resetUserPassword, setUserActive } from "@/server/actions/users";

/**
 * Actions sur un compte : activation, mot de passe, suppression.
 *
 * Le compte de la personne connectée n'affiche aucune action dangereuse —
 * on ne peut ni se désactiver, ni se supprimer soi-même. Le serveur refuse
 * de toute façon, mais autant ne pas proposer un bouton qui échouera.
 */
export function UserActions({
  userId,
  userName,
  isActive,
  isSelf,
}: {
  userId: string;
  userName: string;
  isActive: boolean;
  isSelf: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [passwordOpen, setPasswordOpen] = useState(false);

  function run(
    action: () => Promise<{ ok: boolean; error?: string }>,
    message: string,
  ) {
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        toast.success(message);
        router.refresh();
      } else {
        toast.error(result.error ?? "Action impossible.");
      }
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          className="rounded-md p-1.5 text-navy-400 transition-colors hover:bg-navy-50 hover:text-navy-800"
          aria-label={`Actions sur le compte ${userName}`}
          disabled={pending}
        >
          {pending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <MoreVertical className="size-3.5" />
          )}
        </DropdownMenuTrigger>

        <DropdownMenuContent>
          <DropdownMenuItem onSelect={() => setPasswordOpen(true)}>
            <KeyRound />
            Réinitialiser le mot de passe
          </DropdownMenuItem>

          {!isSelf ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() =>
                  run(
                    () => setUserActive(userId, !isActive),
                    isActive ? "Compte désactivé." : "Compte réactivé.",
                  )
                }
              >
                {isActive ? <UserX /> : <UserCheck />}
                {isActive ? "Désactiver l'accès" : "Réactiver l'accès"}
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      {!isSelf ? (
        <ConfirmDialog
          trigger={
            <button
              type="button"
              className="rounded-md p-1.5 text-navy-400 transition-colors hover:bg-[var(--color-danger-soft)] hover:text-[var(--color-danger)]"
              aria-label={`Supprimer le compte ${userName}`}
            >
              <Trash2 className="size-3.5" />
            </button>
          }
          title={`Supprimer le compte de ${userName} ?`}
          description={
            <>
              L&apos;accès est coupé immédiatement. Le journal d&apos;activité
              conserve son nom sur les actions passées : l&apos;historique de
              l&apos;agence reste lisible.
              <br />
              <br />
              Si la personne peut revenir, préférez <strong>désactiver
              l&apos;accès</strong> : le compte est conservé et se réactive en
              un clic.
            </>
          }
          confirmLabel="Supprimer définitivement"
          onConfirm={async () => {
            const result = await deleteUser(userId);
            if (result.ok) {
              toast.success("Compte supprimé.");
              router.refresh();
            } else toast.error(result.error);
          }}
        />
      ) : null}

      <ResetPasswordDialog
        userId={userId}
        userName={userName}
        open={passwordOpen}
        onOpenChange={setPasswordOpen}
      />
    </>
  );
}

function ResetPasswordDialog({
  userId,
  userName,
  open,
  onOpenChange,
}: {
  userId: string;
  userName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  function generate() {
    const alphabet = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const bytes = new Uint32Array(14);
    crypto.getRandomValues(bytes);
    setPassword(Array.from(bytes, (n) => alphabet[n % alphabet.length]).join(""));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title={`Nouveau mot de passe — ${userName}`}
        description="Les sessions ouvertes sur ce compte seront fermées immédiatement."
      >
        <div className="space-y-4">
          {error ? (
            <p
              role="alert"
              className="rounded-lg bg-[var(--color-danger-soft)] px-3.5 py-2.5 text-[13px] font-medium text-[var(--color-danger)]"
            >
              {error}
            </p>
          ) : null}

          <Field
            label="Mot de passe"
            htmlFor="reset-password"
            required
            hint="8 caractères minimum · à communiquer à la personne concernée"
          >
            <div className="flex gap-2">
              <Input
                id="reset-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="new-password"
                className="font-mono"
              />
              <Button type="button" variant="outline" onClick={generate}>
                <Wand2 className="size-4" />
                Générer
              </Button>
              {password ? (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label="Copier le mot de passe"
                  onClick={() => {
                    navigator.clipboard.writeText(password);
                    toast.success("Mot de passe copié.");
                  }}
                >
                  <Copy className="size-4" />
                </Button>
              ) : null}
            </div>
          </Field>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Annuler</Button>
          </DialogClose>
          <Button
            disabled={pending || !password}
            onClick={() =>
              startTransition(async () => {
                setError(null);
                const result = await resetUserPassword({ userId, password });
                if (result.ok) {
                  toast.success("Mot de passe réinitialisé.");
                  setPassword("");
                  onOpenChange(false);
                  router.refresh();
                } else setError(result.error);
              })
            }
          >
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
