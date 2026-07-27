"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import useSWR from "swr";
import PageHeader from "@/components/shell/PageHeader";
import Button from "@/components/ui/Button";
import { api, downloadFile } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import {
  VerificationBadge,
  DecisionBadge,
  CheckBar,
} from "@/components/applications/VerificationUi";
import type { ApplicationRow, VerificationStatus, HumanDecision } from "@/lib/types";

type VerificationFilter = VerificationStatus | "ALL";
type DecisionFilter = HumanDecision | "ALL";

const VERIFICATION_FILTERS: Array<{ value: VerificationFilter; label: string }> = [
  { value: "ALL", label: "All" },
  { value: "NEEDS_REVIEW", label: "Needs review" },
  { value: "VERIFIED", label: "Auto-verified" },
  { value: "PENDING", label: "Pending" },
  { value: "PROCESSING", label: "Processing" },
  { value: "FAILED", label: "OCR failed" },
];

const DECISION_FILTERS: Array<{ value: DecisionFilter; label: string }> = [
  { value: "ALL", label: "All" },
  { value: "UNREVIEWED", label: "Not reviewed" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
];

export default function ApplicationsPage() {
  const toast = useToast();
  const [verification, setVerification] = useState<VerificationFilter>("ALL");
  const [decision, setDecision] = useState<DecisionFilter>("ALL");
  const [exporting, setExporting] = useState(false);

  const query = new URLSearchParams();
  if (verification !== "ALL") query.set("verification", verification);
  if (decision !== "ALL") query.set("decision", decision);
  const qs = query.toString();

  const { data, error, isLoading } = useSWR<ApplicationRow[]>(
    `/api/applications${qs ? `?${qs}` : ""}`,
    api,
    {
      // OCR runs in the background after submission; refresh so a row that is
      // still PROCESSING lands on its final status without a manual reload.
      refreshInterval: (rows) =>
        rows?.some((r) => r.verificationStatus === "PROCESSING" || r.verificationStatus === "PENDING")
          ? 5000
          : 0,
    },
  );

  const items = data ?? [];

  useEffect(() => {
    if (error) toast.error(error instanceof Error ? error.message : "Failed to load applications");
  }, [error, toast]);

  async function exportAll() {
    setExporting(true);
    try {
      await downloadFile("/api/applications/export/all.xlsx", "Ekatha_Applications.xlsx");
      toast.success("Excel export downloaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed");
    } finally {
      setExporting(false);
    }
  }

  const needsAttention = items.filter(
    (a) => a.humanDecision === "UNREVIEWED" && a.checkSummary.failed > 0,
  ).length;

  return (
    <>
      <PageHeader
        title="Applications"
        subtitle="Aid applications with automatically verified documents. Every reading is cross-checked against the form — confirm before disbursing."
        action={
          <Button variant="ghost" onClick={exportAll} loading={exporting}>
            ⬇ Export all to Excel
          </Button>
        }
      />

      {needsAttention > 0 && (
        <div className="mb-5 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <span className="text-lg">⚠️</span>
          <span>
            <strong>{needsAttention}</strong>{" "}
            {needsAttention === 1 ? "application has" : "applications have"} failed checks and
            no human decision yet.
          </span>
        </div>
      )}

      <div className="mb-5 space-y-3">
        <FilterRow
          label="Verification"
          options={VERIFICATION_FILTERS}
          value={verification}
          onChange={setVerification}
        />
        <FilterRow
          label="Human review"
          options={DECISION_FILTERS}
          value={decision}
          onChange={setDecision}
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
        {isLoading ? (
          <div className="p-10 text-center text-sm text-muted">Loading…</div>
        ) : items.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted">
            No applications match these filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-surface text-left text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-5 py-3">Beneficiary</th>
                  <th className="px-5 py-3">Submitted</th>
                  <th className="px-5 py-3">Docs</th>
                  <th className="px-5 py-3">Automated checks</th>
                  <th className="px-5 py-3">Verification</th>
                  <th className="px-5 py-3">Human review</th>
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
                    <td className="px-5 py-3 text-muted">{a.documentCount}</td>
                    <td className="px-5 py-3">
                      <CheckBar summary={a.checkSummary} />
                    </td>
                    <td className="px-5 py-3">
                      <VerificationBadge status={a.verificationStatus} />
                    </td>
                    <td className="px-5 py-3">
                      <DecisionBadge decision={a.humanDecision} reviewer={a.humanReviewer} />
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Link
                        href={`/applications/${a.id}`}
                        className="font-semibold text-saffron hover:underline"
                      >
                        Review →
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

function FilterRow<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="w-28 shrink-0 text-xs font-semibold uppercase tracking-wide text-muted">
        {label}
      </span>
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
            value === o.value ? "bg-saffron text-white" : "bg-white text-muted hover:bg-surface"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
