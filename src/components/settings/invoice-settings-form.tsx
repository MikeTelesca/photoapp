"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

interface Props {
  initialBusinessName: string;
  initialBusinessEmail: string;
  initialBusinessPhone: string;
  initialBusinessAddress: string;
  initialInvoiceRate: number;
  initialInvoicePrefix: string;
  initialInvoiceCounter?: number;
}

export function InvoiceSettingsForm({
  initialBusinessName,
  initialBusinessEmail,
  initialBusinessPhone,
  initialBusinessAddress,
  initialInvoiceRate,
  initialInvoicePrefix,
  initialInvoiceCounter = 1000,
}: Props) {
  const [businessName, setBusinessName] = useState(initialBusinessName);
  const [businessEmail, setBusinessEmail] = useState(initialBusinessEmail);
  const [businessPhone, setBusinessPhone] = useState(initialBusinessPhone);
  const [businessAddress, setBusinessAddress] = useState(initialBusinessAddress);
  const [invoiceRate, setInvoiceRate] = useState(String(initialInvoiceRate));
  const [invoicePrefix, setInvoicePrefix] = useState(initialInvoicePrefix);
  const [invoiceCounter, setInvoiceCounter] = useState(String(initialInvoiceCounter));
  const [saving, setSaving] = useState(false);
  const { addToast } = useToast();

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const trimmedPrefix = invoicePrefix.trim();
    if (trimmedPrefix.length < 1 || trimmedPrefix.length > 6) {
      addToast("error", "Invoice prefix must be 1-6 characters");
      return;
    }
    const counterNum = parseInt(invoiceCounter, 10);
    if (!Number.isFinite(counterNum) || counterNum < 0) {
      addToast("error", "Invoice counter must be a non-negative number");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName,
          businessEmail,
          businessPhone,
          businessAddress,
          invoiceRate: parseFloat(invoiceRate) || 50,
          invoicePrefix: trimmedPrefix,
          invoiceCounter: counterNum,
        }),
      });
      if (res.ok) {
        addToast("success", "Invoice settings saved");
      } else {
        const data = await res.json();
        addToast("error", data.error || "Failed to save");
      }
    } finally {
      setSaving(false);
    }
  }

  const inputCls =
    "w-full px-3 py-2 rounded-lg border border-graphite-200 dark:border-graphite-700 bg-white dark:bg-graphite-900 text-graphite-900 dark:text-white text-sm focus:outline-none focus:border-cyan focus:ring-1 focus:ring-cyan";
  const labelCls =
    "text-xs font-semibold text-graphite-500 dark:text-graphite-400 uppercase tracking-wider mb-1.5 block";

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Business Name</label>
          <input
            type="text"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            className={inputCls}
            placeholder="ATH Media"
          />
        </div>
        <div>
          <label className={labelCls}>Business Email</label>
          <input
            type="email"
            value={businessEmail}
            onChange={(e) => setBusinessEmail(e.target.value)}
            className={inputCls}
            placeholder="billing@athmedia.com"
          />
        </div>
        <div>
          <label className={labelCls}>Business Phone</label>
          <input
            type="tel"
            value={businessPhone}
            onChange={(e) => setBusinessPhone(e.target.value)}
            className={inputCls}
            placeholder="(555) 000-0000"
          />
        </div>
        <div>
          <label className={labelCls}>Business Address</label>
          <input
            type="text"
            value={businessAddress}
            onChange={(e) => setBusinessAddress(e.target.value)}
            className={inputCls}
            placeholder="123 Main St, City, ST 00000"
          />
        </div>
        <div>
          <label className={labelCls}>Rate per Photo ($)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={invoiceRate}
            onChange={(e) => setInvoiceRate(e.target.value)}
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Invoice Prefix</label>
          <input
            type="text"
            value={invoicePrefix}
            onChange={(e) => setInvoicePrefix(e.target.value)}
            className={inputCls}
            placeholder="INV"
            minLength={1}
            maxLength={6}
            required
          />
          <p className="text-[11px] text-graphite-400 mt-1">1-6 chars, e.g. INV-1000, ATH-1001</p>
        </div>
        <div>
          <label className={labelCls}>Next Invoice Number</label>
          <div className="flex gap-2">
            <input
              type="number"
              min="0"
              step="1"
              value={invoiceCounter}
              onChange={(e) => setInvoiceCounter(e.target.value)}
              className={inputCls}
              placeholder="1000"
            />
            <button
              type="button"
              onClick={() => setInvoiceCounter("1000")}
              className="px-3 py-2 text-xs rounded-lg border border-graphite-200 dark:border-graphite-700 text-graphite-600 dark:text-graphite-300 hover:bg-graphite-50 dark:hover:bg-graphite-800 whitespace-nowrap"
            >
              Reset
            </button>
          </div>
          <p className="text-[11px] text-graphite-400 mt-1">Next invoice will use this number, then auto-increment.</p>
        </div>
      </div>
      <Button type="submit" disabled={saving}>
        {saving ? "Saving..." : "Save Invoice Settings"}
      </Button>
    </form>
  );
}
