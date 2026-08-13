"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ProductStatusControl({
  productId,
  productName,
  initialStatus,
}: {
  productId: string;
  productName: string;
  initialStatus: "draft" | "active" | "archived";
}) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function save() {
    setSaving(true);
    setMessage("");

    try {
      const response = await fetch("/api/admin/products/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: productId, status }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to update product");

      setMessage(status === "active" ? "Published" : "Saved");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update product");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2 sm:justify-end">
      <span
        className={`rounded-full px-3 py-1 text-xs font-bold ${
          status === "active"
            ? "bg-green-50 text-green-700"
            : status === "archived"
              ? "bg-black/5 text-black/45"
              : "bg-amber-50 text-amber-700"
        }`}
      >
        {status}
      </span>
      <select
        value={status}
        onChange={(event) => setStatus(event.target.value as typeof status)}
        disabled={saving}
        className="rounded-lg border border-black/10 bg-white px-2 py-2 text-xs disabled:opacity-50"
        aria-label={`Status for ${productName}`}
      >
        <option value="draft">Draft</option>
        <option value="active">Publish</option>
        <option value="archived">Archive</option>
      </select>
      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="rounded-lg border border-black/10 px-3 py-2 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-50"
      >
        {saving ? "Saving…" : status === "active" ? "Publish" : "Save"}
      </button>
      {message && (
        <span className={`w-full text-xs font-semibold ${message === "Published" || message === "Saved" ? "text-green-700" : "text-red-600"}`}>
          {message}
        </span>
      )}
    </div>
  );
}
