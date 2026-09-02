"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AlertTriangle,
  Bell,
  CalendarCheck,
  Check,
  CheckCheck,
  Droplets,
  Loader2,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { markAllNotifications, markNotification } from "@/server/actions/settings";
import { cn } from "@/lib/utils";

const SEVERITY_STYLES = {
  DANGER: "border-s-[var(--color-danger)]",
  WARNING: "border-s-[var(--color-warning)]",
  SUCCESS: "border-s-[var(--color-success)]",
  INFO: "border-s-[var(--color-info)]",
} as const;

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  MAINTENANCE_DUE: Droplets,
  MAINTENANCE_OVERDUE: Droplets,
  INSURANCE_EXPIRING: ShieldAlert,
  INSPECTION_EXPIRING: ShieldAlert,
  NEW_RESERVATION: CalendarCheck,
  RESERVATION_CONFIRMED: CalendarCheck,
  RENTAL_STARTING: CalendarCheck,
  RENTAL_RETURN_DUE: AlertTriangle,
  RENTAL_OVERDUE: AlertTriangle,
};

export function NotificationItem({
  notification,
}: {
  notification: {
    id: string;
    type: string;
    severity: keyof typeof SEVERITY_STYLES;
    title: string;
    message: string | null;
    link: string | null;
    isRead: boolean;
    createdAtLabel: string;
  };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const Icon = ICONS[notification.type] ?? Bell;

  return (
    <li
      className={cn(
        "flex items-start gap-4 rounded-[var(--radius-card)] border border-navy-100 border-s-[3px] bg-white px-5 py-4 shadow-[var(--shadow-soft)]",
        SEVERITY_STYLES[notification.severity],
        notification.isRead && "opacity-60",
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0 text-navy-400" />

      <div className="min-w-0 flex-1">
        {notification.link ? (
          <Link
            href={notification.link}
            className="text-[14px] font-semibold text-navy-900 hover:text-teal-700"
          >
            {notification.title}
          </Link>
        ) : (
          <p className="text-[14px] font-semibold text-navy-900">
            {notification.title}
          </p>
        )}
        {notification.message ? (
          <p className="mt-1 text-[13px] leading-relaxed text-navy-500">
            {notification.message}
          </p>
        ) : null}
        <p className="mt-1.5 text-[11.5px] text-navy-400">
          {notification.createdAtLabel}
        </p>
      </div>

      {!notification.isRead ? (
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await markNotification(notification.id);
              if (result.ok) router.refresh();
              else toast.error(result.error);
            })
          }
          className="shrink-0 rounded-md p-1.5 text-navy-400 transition-colors hover:bg-navy-50 hover:text-teal-700"
          aria-label="Marquer comme lue"
          title="Marquer comme lue"
        >
          {pending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Check className="size-4" />
          )}
        </button>
      ) : null}
    </li>
  );
}

export function MarkAllButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await markAllNotifications();
          if (result.ok) {
            toast.success("Toutes les notifications sont marquées comme lues.");
            router.refresh();
          } else toast.error(result.error);
        })
      }
    >
      {pending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <CheckCheck className="size-4" />
      )}
      Tout marquer comme lu
    </Button>
  );
}
