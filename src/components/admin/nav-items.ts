import {
  Bell,
  CalendarDays,
  CalendarCheck,
  Car,
  FileText,
  KeyRound,
  LayoutDashboard,
  Settings,
  UserCircle,
  Users,
  Wallet,
  Wrench,
} from "lucide-react";

/** Navigation de l'espace agence — source unique pour la sidebar et le menu mobile. */
export const ADMIN_NAV = [
  { href: "/admin", label: "Tableau de bord", icon: LayoutDashboard, exact: true },
  { href: "/admin/reservations", label: "Réservations", icon: CalendarCheck, badge: "pending" as const },
  { href: "/admin/calendrier", label: "Calendrier", icon: CalendarDays },
  { href: "/admin/vehicules", label: "Véhicules", icon: Car },
  { href: "/admin/clients", label: "Clients", icon: Users },
  { href: "/admin/locations", label: "Locations", icon: KeyRound },
  { href: "/admin/maintenance", label: "Maintenance", icon: Wrench },
  { href: "/admin/paiements", label: "Paiements", icon: Wallet },
  { href: "/admin/documents", label: "Documents", icon: FileText },
  { href: "/admin/notifications", label: "Notifications", icon: Bell, badge: "unread" as const },
  { href: "/admin/parametres", label: "Paramètres", icon: Settings },
  // Accessible à tous les rôles, contrairement aux Paramètres réservés aux admins.
  { href: "/admin/mon-compte", label: "Mon compte", icon: UserCircle },
] as const;
