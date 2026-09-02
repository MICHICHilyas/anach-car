import { MessageCircle } from "lucide-react";
import { whatsappGeneral } from "@/lib/whatsapp";

/**
 * Bouton WhatsApp flottant.
 *
 * Au Maroc, c'est le canal de contact le plus naturel : il reste visible en
 * permanence. Une seule animation, à l'apparition — un élément qui pulse en
 * continu finit par agacer et détourne l'attention du formulaire.
 *
 * Sur mobile il descend sous la barre système grâce à `safe-area-inset`, et
 * se réduit à son icône pour ne pas recouvrir les boutons de la page.
 */
export function WhatsAppFloat({ label = "WhatsApp" }: { label?: string }) {
  return (
    <a
      href={whatsappGeneral()}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${label} — Anach Car`}
      style={{ bottom: "max(1.25rem, env(safe-area-inset-bottom))" }}
      className="group fixed end-4 z-40 flex items-center gap-2.5 rounded-full bg-[#25D366] px-3.5 py-3.5 text-white shadow-[0_6px_20px_-6px_rgba(37,211,102,.55)] transition-[transform,box-shadow] duration-300 ease-out animate-[whatsapp-in_0.5s_cubic-bezier(0.16,1,0.3,1)_0.6s_both] hover:-translate-y-0.5 hover:shadow-[0_10px_28px_-8px_rgba(37,211,102,.7)] active:scale-95 sm:end-5 sm:px-4 print:hidden"
    >
      <MessageCircle className="size-6 shrink-0" />
      <span className="hidden text-sm font-semibold sm:inline">{label}</span>
    </a>
  );
}
