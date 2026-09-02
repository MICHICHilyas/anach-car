import Link from "next/link";
import { CarFront } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default function NotFound() {
  return (
    <div className="container-page py-24">
      <EmptyState
        icon={CarFront}
        title="Page introuvable"
        description="La page que vous cherchez n'existe pas ou a été déplacée."
        action={
          <>
            <Button asChild variant="outline">
              <Link href="/fr">Retour à l&apos;accueil</Link>
            </Button>
            <Button asChild>
              <Link href="/fr/vehicules">Voir nos véhicules</Link>
            </Button>
          </>
        }
      />
    </div>
  );
}
