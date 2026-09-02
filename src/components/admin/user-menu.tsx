"use client";

import { useTransition } from "react";
import { LogOut, User as UserIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { logout } from "@/server/actions/auth";
import type { SessionUser } from "@/lib/auth";
import { USER_ROLE } from "@/lib/labels";

export function UserMenu({ user }: { user: SessionUser }) {
  const [pending, startTransition] = useTransition();

  const initials = user.name
    .split(" ")
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2.5 rounded-lg py-1.5 pe-2.5 ps-1.5 transition-colors hover:bg-navy-50">
        <span className="flex size-8 items-center justify-center rounded-full bg-navy-900 text-[11.5px] font-bold text-teal-300">
          {initials}
        </span>
        <span className="hidden text-start sm:block">
          <span className="block text-[13px] font-semibold leading-tight text-navy-900">
            {user.name}
          </span>
          <span className="block text-[11px] leading-tight text-navy-400">
            {USER_ROLE[user.role]}
          </span>
        </span>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="min-w-[13rem]">
        <DropdownMenuLabel>{user.email}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled>
          <UserIcon />
          {USER_ROLE[user.role]}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          destructive
          disabled={pending}
          onSelect={(event) => {
            event.preventDefault();
            startTransition(() => logout());
          }}
        >
          <LogOut />
          {pending ? "Déconnexion…" : "Se déconnecter"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
