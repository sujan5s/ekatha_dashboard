"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import useSWR from "swr";
import PageHeader from "@/components/shell/PageHeader";
import Button from "@/components/ui/Button";
import { api, downloadFile } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import { DecisionBadge } from "@/components/applications/VerificationUi";
import type { VerifiedApplicationRow, HumanDecision } from "@/lib/types";

/**
 * The archive of applications a human has actually decided on.
 *
 * Kept apart from the working queue on purpose: an application in /applications
 * is still being examined, and the values on it are whatever OCR guessed. Once a
 * reviewer signs it off it becomes a record, and a record is what gets printed,
 * filed and acted on.
 */

type DecisionFilter = Extract<HumanDecision, "APPROVED" | "REJECTED"> | "ALL";

const FILTERS: Array<{ value: DecisionFilter; label: string }> = [
  { value: "ALL", label: "All decided" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
];

export default function VerifiedApplicationsPage() {
  const toast = useToast();
  const [decision, setDecision] = useState<DecisionFilter>("ALL");
  const [exporting, setExporting] = useState(false);

  const { data, error, isLoading } = useSWR<VerifiedApplicationRow[]>(
    `/api/applications/verified${decision === "ALL" ? "" : `?decision=${decision}`}`,
    api,
  );

  const items = data ?? [];

  useEffect(() => {
    if (error) toast.error(error instanceof Error ? error.message : "Failed to load verified records");
  }, [error, toast]);

  async function exportAll() {
    setExporting(true);
    try {
      await downloadFile(
        "/api/applications/export/all.xlsx?verified=1",
        "Ekatha_Verified_Applications.xlsx",
      );
      toast.success("Excel export downloaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed");
    } finally {
      setExporting(false);
    }
  }

  const approved = items.filter((a) => a.humanDecision === "APPROVED").length;

  return (
    <>
      <PageHeader
        title="Verified records"
        subtitle="Applications a reviewer has signed off. Each record documents the form, the values confirmed from every document, and the uploaded files — and can be printed."
        action={
          <Button variant="ghost" onClick={exportAll} loading={exporting}>
            ⬇ Export records to Excel
          </Button>
        }
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <StatCard label="Records" value={items.length} />
        <StatCard label="Approved" value={approved} tone="emerald" />
        <StatCard label="Rejected" value={items.length - approved} tone="rose" />
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <span className="w-28 shrink-0 text-xs font-semibold uppercase tracking-wide text-muted">
          Decision
        </span>
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setDecision(f.value)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
              decision === f.value ? "bg-saffron text-white" : "bg-white text-muted hover:bg-surface"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
        {isLoading ? (
          <div className="p-10 text-center text-sm text-muted">Loading…</div>
        ) : items.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted">
            No applications have been through human verification yet.{" "}
            <Link href="/applications" className="font-semibold text-saffron">
              Go to the review queue
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead className="bg-surface text-left text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-5 py-3">Beneficiary</th>
                  <th className="px-5 py-3">Submitted</th>
                  <th className="px-5 py-3">Decision</th>
                  <th className="px-5 py-3">Verified on</th>
                  <th className="px-5 py-3">Documents</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((a) => (
                  <tr key={a.id} className="border-t border-line hover:bg-surface/60">
                    <td className="px-5 py-3">
                      <div className="font-semibold text-ink">
                        {a.beneficiaryName || "—"}
                        {a.beneficiaryAge !== null && (
                          <span className="ml-1.5 text-xs font-normal text-muted">
                            {a.beneficiaryAge} yrs
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted">{a.mobile || "No mobile"}</div>
                    </td>
                    <td className="px-5 py-3 text-muted">
                      {new Date(a.createdAt).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-5 py-3">
                      <DecisionBadge decision={a.humanDecision} reviewer={a.humanReviewer} />
                    </td>
                    <td className="px-5 py-3 text-muted">
                      {a.humanReviewedAt
                        ? new Date(a.humanReviewedAt).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })
                        : "—"}
                    </td>
                    <td className="px-5 py-3 text-muted">
                      {a.documentCount}
                      {a.correctedCount > 0 && (
                        <span
                          className="ml-1.5 text-xs font-semibold text-emerald-700"
                          title={`${a.correctedCount} document(s) carry reviewer corrections`}
                        >
                          ✎ {a.correctedCount}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Link
                        href={`/applications/verified/${a.id}`}
                        className="font-semibold text-saffron hover:underline"
                      >
                        Open record →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "emerald" | "rose";
}) {
  const color =
    tone === "emerald" ? "text-emerald-700" : tone === "rose" ? "text-rose-700" : "text-ink";
  return (
    <div className="rounded-2xl border border-line bg-white p-4 shadow-sm">
      <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-muted">{label}</div>
      <div className={`font-display text-2xl font-semibold ${color}`}>{value}</div>
    </div>
  );
}
