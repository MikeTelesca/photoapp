"use client";
import { useEffect, useState } from "react";

interface Props {
  jobId: string;
  open: boolean;
  onClose: () => void;
}

export function InvoicePreviewModal({ jobId, open, onClose }: Props) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [paid, setPaid] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch(`/api/jobs/${jobId}/invoice/preview`)
      .then(r => r.json())
      .then(d => {
        setData(d);
        setPaid(d?.paidAt || null);
      })
      .finally(() => setLoading(false));
  }, [open, jobId]);

  async function togglePaid() {
    const res = await fetch(`/api/jobs/${jobId}/invoice/paid`, {
      method: paid ? "DELETE" : "POST",
    });
    if (res.ok) {
      setPaid(paid ? null : new Date().toISOString());
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-3 border-b border-graphite-100 flex justify-between items-center sticky top-0 bg-white">
          <h2 className="text-lg font-bold text-graphite-900">Invoice preview</h2>
          <div className="flex gap-2">
            <button onClick={togglePaid}
              className={`text-xs px-3 py-1.5 rounded font-semibold ${
                paid ? "bg-emerald-500 text-white" : "border border-graphite-200 text-graphite-700"
              }`}>
              {paid ? "✓ Paid" : "Mark as paid"}
            </button>
            <a href={`/api/jobs/${jobId}/invoice`} download
              className="text-xs px-3 py-1.5 rounded bg-cyan text-white font-semibold">
              Download PDF
            </a>
            <button onClick={onClose}
              className="text-xs px-3 py-1.5 rounded border border-graphite-200">
              Close
            </button>
          </div>
        </div>
        {loading || !data ? (
          <div className="p-12 text-center text-graphite-400">Loading...</div>
        ) : (
          <div className="p-8 text-graphite-900">
            <div className="flex justify-between mb-8">
              <div>
                <h1 className="text-2xl font-bold">{data.business.name}</h1>
                <div className="text-xs text-graphite-500 mt-1">
                  {data.business.email}
                  {data.business.phone && ` · ${data.business.phone}`}
                </div>
                {data.business.address && (
                  <div className="text-xs text-graphite-500">{data.business.address}</div>
                )}
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold">INVOICE</div>
                <div className="text-xs text-graphite-500 mt-1">#{data.invoiceNum}</div>
                <div className="text-xs text-graphite-500">Date: {new Date(data.today).toLocaleDateString()}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-8">
              <div>
                <div className="text-xs font-semibold text-graphite-500 uppercase tracking-wide mb-1">Bill to</div>
                <div className="font-medium">{data.client?.name || "—"}</div>
                {data.client?.email && <div className="text-sm text-graphite-600">{data.client.email}</div>}
                {data.client?.phone && <div className="text-sm text-graphite-600">{data.client.phone}</div>}
                {data.client?.company && <div className="text-sm text-graphite-600">{data.client.company}</div>}
              </div>
              <div>
                <div className="text-xs font-semibold text-graphite-500 uppercase tracking-wide mb-1">Job</div>
                <div className="font-medium">{data.job.address}</div>
                <div className="text-sm text-graphite-600">Completed: {new Date(data.job.completedAt).toLocaleDateString()}</div>
              </div>
            </div>

            <table className="w-full mb-6">
              <thead>
                <tr className="border-b-2 border-graphite-300 text-xs uppercase tracking-wide text-graphite-500">
                  <th className="text-left py-2">Description</th>
                  <th className="text-right py-2">Qty</th>
                  <th className="text-right py-2">Rate</th>
                  <th className="text-right py-2">Amount</th>
                </tr>
              </thead>
              <tbody>
                {data.lineItems.map((item: any, i: number) => (
                  <tr key={i} className="border-b border-graphite-100">
                    <td className="py-3">{item.description}</td>
                    <td className="text-right">{item.quantity}</td>
                    <td className="text-right">${item.rate.toFixed(2)}</td>
                    <td className="text-right font-semibold">${item.amount.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-graphite-300">
                  <td colSpan={3} className="text-right py-3 font-bold">Total</td>
                  <td className="text-right py-3 font-bold text-lg">${data.total.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>

            <div className="text-center text-xs text-graphite-500 pt-4 border-t border-graphite-100">
              Payment due within 14 days. Thank you for your business.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
