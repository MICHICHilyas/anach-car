import type { Metadata } from "next";
import { LEGAL_DOCUMENTS } from "@/config/legal";
import { LegalPageContent } from "@/components/site/legal-page";

const DOCUMENT = LEGAL_DOCUMENTS["annulation"];

export const metadata: Metadata = {
  title: DOCUMENT.title,
  description: DOCUMENT.intro,
};

export default function Page() {
  return <LegalPageContent document={DOCUMENT} />;
}
