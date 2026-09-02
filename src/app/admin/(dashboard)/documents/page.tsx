import Link from "next/link";
import { FileText, Lock } from "lucide-react";
import { db } from "@/lib/db";
import { formatDateShort } from "@/lib/dates";
import { DOCUMENT_TYPE } from "@/lib/labels";
import { PageHeader } from "@/components/admin/page-header";
import { DocumentActions } from "@/components/admin/document-actions";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableWrapper,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
} from "@/components/ui/table";

export const metadata = { title: "Documents" };

export default async function DocumentsPage() {
  const documents = await db.document.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      customer: { select: { id: true, firstName: true, lastName: true } },
      vehicle: { select: { id: true, brand: true, model: true } },
      uploadedBy: { select: { name: true } },
    },
  });

  return (
    <>
      <PageHeader
        title="Documents"
        description="Pièces d'identité, permis, contrats et documents des véhicules."
      />

      <div className="mb-5 flex items-start gap-3 rounded-[var(--radius-card)] border border-navy-100 bg-teal-50/50 px-5 py-3.5">
        <Lock className="mt-0.5 size-4 shrink-0 text-teal-700" />
        <p className="text-[13px] leading-relaxed text-teal-900">
          Ces fichiers ne sont jamais publiés sur le site. Ils sont stockés hors
          du dossier public et chaque consultation exige une session valide —
          les accès sont journalisés.
        </p>
      </div>

      {documents.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Aucun document"
          description="Les documents s'ajoutent depuis la fiche d'un client ou d'un véhicule."
        />
      ) : (
        <TableWrapper>
          <Table>
            <Thead>
              <tr>
                <Th>Document</Th>
                <Th>Type</Th>
                <Th>Rattaché à</Th>
                <Th>Expiration</Th>
                <Th>Ajouté par</Th>
                <Th>Ajouté le</Th>
                <Th className="text-end">Actions</Th>
              </tr>
            </Thead>
            <Tbody>
              {documents.map((document) => (
                <Tr key={document.id}>
                  <Td>
                    <a
                      href={`/api/admin/documents/${document.id}/file`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 font-medium text-navy-900 hover:text-teal-700"
                    >
                      <FileText className="size-4 text-navy-300" />
                      <span className="truncate">
                        {document.title ?? document.fileName}
                      </span>
                    </a>
                    <span className="mt-0.5 block text-[11.5px] text-navy-400">
                      {(document.size / 1024).toFixed(0)} Ko
                    </span>
                  </Td>
                  <Td>
                    <Badge tone="outline">{DOCUMENT_TYPE[document.type]}</Badge>
                  </Td>
                  <Td className="text-[13px]">
                    {document.customer ? (
                      <Link
                        href={`/admin/clients/${document.customer.id}`}
                        className="hover:text-teal-700"
                      >
                        {document.customer.firstName} {document.customer.lastName}
                      </Link>
                    ) : document.vehicle ? (
                      <Link
                        href={`/admin/vehicules/${document.vehicle.id}`}
                        className="hover:text-teal-700"
                      >
                        {document.vehicle.brand} {document.vehicle.model}
                      </Link>
                    ) : (
                      <span className="text-navy-300">—</span>
                    )}
                  </Td>
                  <Td>
                    {document.expiresAt ? (
                      <Badge
                        tone={document.expiresAt <= new Date() ? "danger" : "warning"}
                      >
                        {formatDateShort(document.expiresAt)}
                      </Badge>
                    ) : (
                      <span className="text-[12.5px] text-navy-300">—</span>
                    )}
                  </Td>
                  <Td className="text-[12.5px] text-navy-500">
                    {document.uploadedBy?.name ?? "—"}
                  </Td>
                  <Td className="text-[12.5px] text-navy-400">
                    {formatDateShort(document.createdAt)}
                  </Td>
                  <Td className="text-end">
                    <DocumentActions
                      documentId={document.id}
                      label={document.title ?? document.fileName}
                    />
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </TableWrapper>
      )}
    </>
  );
}
