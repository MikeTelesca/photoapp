import { prisma } from "@/lib/db";
import { requireJobAccess } from "@/lib/api-auth";
import { redirect } from "next/navigation";
import { PrintButton } from "@/components/billing/print-button";

export const dynamic = "force-dynamic";

export default async function PrintInvoicePage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await params;
  const access = await requireJobAccess(jobId);
  if ("error" in access) redirect("/login");

  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: { client: true } as any,
  });
  if (!job) redirect("/dashboard");

  const ownerId = (job as any).photographerId || (job as any).ownerId;
  const user = await prisma.user.findUnique({ where: { id: ownerId } });
  if (!user) redirect("/dashboard");

  const businessName = (user as any).businessName || "ATH Media";
  const businessEmail = (user as any).businessEmail || user.email || "";
  const businessPhone = (user as any).businessPhone || "";
  const businessAddress = (user as any).businessAddress || "";
  const rate = (user as any).invoiceRate ?? 50;
  const photoCount = job.approvedPhotos || job.totalPhotos;
  const subtotal = photoCount * rate;
  const invoiceNum = `${(user as any).invoicePrefix || "INV"}-${String(((user as any).invoiceCounter || 1000)).padStart(4, "0")}`;
  const client = (job as any).client;

  return (
    <>
      <style>{`
        @media print {
          @page { margin: 0.5in; }
          .no-print { display: none !important; }
          body { background: white !important; }
          .invoice-container { box-shadow: none !important; max-width: none !important; }
        }
        @media screen {
          body { background: #f5f5f5; padding: 40px 20px; }
        }
      `}</style>

      <div className="no-print mb-4 max-w-4xl mx-auto flex justify-end gap-2">
        <PrintButton />
        <a
          href="/dashboard"
          className="px-4 py-2 rounded border border-graphite-300 text-sm"
        >
          ← Back
        </a>
      </div>

      <div className="invoice-container max-w-4xl mx-auto bg-white p-12 shadow-lg">
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 40 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>
              {businessName}
            </h1>
            <div style={{ fontSize: 11, color: "#666", marginTop: 4 }}>
              {businessEmail}
              {businessPhone && ` · ${businessPhone}`}
            </div>
            {businessAddress && (
              <div style={{ fontSize: 11, color: "#666" }}>{businessAddress}</div>
            )}
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 32, fontWeight: 700 }}>INVOICE</div>
            <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
              #{invoiceNum}
            </div>
            <div style={{ fontSize: 12, color: "#666" }}>
              Date: {new Date().toLocaleDateString()}
            </div>
            {(job as any).invoicePaidAt && (
              <div
                style={{
                  marginTop: 8,
                  padding: "4px 12px",
                  background: "#10b981",
                  color: "white",
                  display: "inline-block",
                  borderRadius: 4,
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                PAID
              </div>
            )}
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 24,
            marginBottom: 32,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "#666",
                textTransform: "uppercase",
                letterSpacing: 0.5,
                marginBottom: 4,
              }}
            >
              Bill to
            </div>
            <div style={{ fontWeight: 600 }}>
              {client?.name || job.clientName || "—"}
            </div>
            {client?.email && (
              <div style={{ fontSize: 13, color: "#444" }}>{client.email}</div>
            )}
            {client?.phone && (
              <div style={{ fontSize: 13, color: "#444" }}>{client.phone}</div>
            )}
            {client?.company && (
              <div style={{ fontSize: 13, color: "#444" }}>
                {client.company}
              </div>
            )}
          </div>
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "#666",
                textTransform: "uppercase",
                letterSpacing: 0.5,
                marginBottom: 4,
              }}
            >
              Job
            </div>
            <div style={{ fontWeight: 600 }}>{job.address}</div>
            <div style={{ fontSize: 13, color: "#444" }}>
              Completed: {job.createdAt.toLocaleDateString()}
            </div>
            <div style={{ fontSize: 13, color: "#444" }}>Preset: {job.preset}</div>
          </div>
        </div>

        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            marginBottom: 24,
          }}
        >
          <thead>
            <tr
              style={{
                borderBottom: "2px solid #444",
                fontSize: 11,
                textTransform: "uppercase",
                color: "#666",
              }}
            >
              <th style={{ textAlign: "left", padding: "8px 0" }}>
                Description
              </th>
              <th style={{ textAlign: "right", padding: "8px 0" }}>Qty</th>
              <th style={{ textAlign: "right", padding: "8px 0" }}>Rate</th>
              <th style={{ textAlign: "right", padding: "8px 0" }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: "1px solid #eee" }}>
              <td style={{ padding: "12px 0" }}>
                Real estate photo editing ({job.preset})
              </td>
              <td style={{ textAlign: "right" }}>{photoCount}</td>
              <td style={{ textAlign: "right" }}>${rate.toFixed(2)}</td>
              <td style={{ textAlign: "right", fontWeight: 600 }}>
                ${subtotal.toFixed(2)}
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr style={{ borderTop: "2px solid #444" }}>
              <td
                colSpan={3}
                style={{
                  textAlign: "right",
                  padding: "12px 0",
                  fontWeight: 700,
                }}
              >
                Total
              </td>
              <td
                style={{
                  textAlign: "right",
                  padding: "12px 0",
                  fontWeight: 700,
                  fontSize: 16,
                }}
              >
                ${subtotal.toFixed(2)}
              </td>
            </tr>
          </tfoot>
        </table>

        <div
          style={{
            textAlign: "center",
            fontSize: 11,
            color: "#666",
            paddingTop: 16,
            borderTop: "1px solid #eee",
          }}
        >
          Payment due within 14 days. Thank you for your business.
        </div>
      </div>
    </>
  );
}
