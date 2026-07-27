"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import useSWR from "swr";
import PageHeader from "@/components/shell/PageHeader";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { api, downloadFile } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import {
  VerificationBadge,
  DecisionBadge,
  CheckRow,
  DOC_TYPE_META,
  humaniseKey,
} from "@/components/applications/VerificationUi";
import type {
  ApplicationDetail,
  CheckRecord,
  HumanDecision,
  VerifiedDocument,
} from "@/lib/types";

export default function ApplicationDetailPage({
  params,
}: {
  // Next 16: route params arrive as a promise and are unwrapped with `use()`.
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const toast = useToast();

  const { data, error, isLoading, mutate } = useSWR<ApplicationDetail>(
    `/api/applications/${id}`,
    api,
    {
      refreshInterval: (d) =>
        d?.verificationStatus === "PROCESSING" || d?.verificationStatus === "PENDING" ? 4000 : 0,
    },
  );

  const [reviewOpen, setReviewOpen] = useState(false);
  const [rerunning, setRerunning] = useState(false);
  const [exporting, setExporting] = useState<"pdf" | "xlsx" | null>(null);

  useEffect(() => {
    if (error) toast.error(error instanceof Error ? error.message : "Failed to load application");
  }, [error, toast]);

  async function rerunOcr() {
    setRerunning(true);
    try {
      await api(`/api/applications/${id}/verify`, { method: "POST" });
      toast.success("Re-reading documents — this takes a few seconds");
      await mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not start verification");
    } finally {
      setRerunning(false);
    }
  }

  async function exportFile(kind: "pdf" | "xlsx") {
    setExporting(kind);
    try {
      await downloadFile(`/api/applications/${id}/export.${kind}`, `application.${kind}`);
      toast.success(`${kind.toUpperCase()} downloaded`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed");
    } finally {
      setExporting(null);
    }
  }

  if (isLoading) {
    return <div className="p-10 text-center text-sm text-muted">Loading application…</div>;
  }
  if (!data) {
    return (
      <div className="p-10 text-center text-sm text-muted">
        Application not found.{" "}
        <Link href="/applications" className="font-semibold text-saffron">
          Back to list
        </Link>
      </div>
    );
  }

  const { checkSummary } = data;
  const answered = buildAnswers(data);

  return (
    <>
      <Link
        href="/applications"
        className="mb-3 inline-block text-sm font-semibold text-muted hover:text-saffron"
      >
        ← All applications
      </Link>

      <PageHeader
        title={data.form.beneficiaryName || "Application"}
        subtitle={`Reference ${data.id} · submitted ${new Date(data.createdAt).toLocaleString("en-IN")}`}
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" onClick={() => exportFile("xlsx")} loading={exporting === "xlsx"}>
              ⬇ Excel
            </Button>
            <Button variant="ghost" onClick={() => exportFile("pdf")} loading={exporting === "pdf"}>
              🖨 Printable PDF
            </Button>
            <Button variant="forest" onClick={rerunOcr} loading={rerunning}>
              🔄 Re-run OCR
            </Button>
            <Button onClick={() => setReviewOpen(true)}>✓ Human verify</Button>
          </div>
        }
      />

      {/* ── Status summary ── */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Automated verification">
          <VerificationBadge status={data.verificationStatus} />
          {data.verifiedAt && (
            <div className="mt-1.5 text-[11px] text-muted">
              {new Date(data.verifiedAt).toLocaleString("en-IN")}
            </div>
          )}
        </StatCard>

        <StatCard label="Human verification">
          <DecisionBadge decision={data.humanDecision} reviewer={data.humanReviewer} />
          {data.humanReviewedAt && (
            <div className="mt-1.5 text-[11px] text-muted">
              {new Date(data.humanReviewedAt).toLocaleString("en-IN")}
            </div>
          )}
        </StatCard>

        <StatCard label="Checks">
          <div className="flex items-baseline gap-1">
            <span className="font-display text-2xl font-semibold text-ink">
              {checkSummary.passed}
            </span>
            <span className="text-sm text-muted">/ {checkSummary.total} passed</span>
          </div>
          <div className="mt-1 flex gap-2 text-[11px] font-medium">
            {checkSummary.failed > 0 && (
              <span className="text-rose-700">{checkSummary.failed} failed</span>
            )}
            {checkSummary.warnings > 0 && (
              <span className="text-amber-700">{checkSummary.warnings} need a look</span>
            )}
          </div>
        </StatCard>

        <StatCard label="Documents">
          <div className="font-display text-2xl font-semibold text-ink">
            {data.documents.length}
          </div>
          <div className="mt-1 text-[11px] text-muted">
            {data.documents.filter((d) => d.status === "FAILED").length} unreadable
          </div>
        </StatCard>
      </div>

      {data.humanNotes && (
        <div className="mb-6 rounded-xl border border-line bg-white p-4">
          <div className="text-xs font-bold uppercase tracking-wide text-muted">Reviewer notes</div>
          <p className="mt-1 whitespace-pre-wrap text-sm text-ink">{data.humanNotes}</p>
        </div>
      )}

      {/* ── Cross-document checks ── */}
      {data.crossChecks.length > 0 && (
        <Section title="Cross-document checks" subtitle="Consistency across the whole application">
          <div className="grid gap-2.5">
            {data.crossChecks.map((c) => (
              <CheckRow key={c.key} check={c} />
            ))}
          </div>
        </Section>
      )}

      {/* ── Per-document verification ── */}
      <Section
        title="Document verification"
        subtitle="What OCR read from each upload, checked against the form"
      >
        <div className="grid gap-4">
          {data.documents.length === 0 && (
            <p className="text-sm text-muted">No documents were attached to this application.</p>
          )}
          {data.documents.map((doc) => (
            <DocumentCard key={doc.id} doc={doc} />
          ))}
        </div>
      </Section>

      {/* ── The form as submitted ── */}
      <Section title="Application details" subtitle="Answers exactly as the applicant entered them">
        <div className="overflow-hidden rounded-xl border border-line bg-white">
          <table className="w-full text-sm">
            <tbody>
              {answered.map((row, i) => (
                <tr key={row.key} className={i > 0 ? "border-t border-line" : ""}>
                  <td className="w-2/5 bg-surface px-4 py-3 align-top text-xs font-semibold text-muted">
                    {row.label}
                  </td>
                  <td className="px-4 py-3 align-top text-ink">
                    {row.isFile ? (
                      <span className="inline-flex items-center gap-1.5 text-muted">
                        📎 {row.value}
                      </span>
                    ) : (
                      <span className="whitespace-pre-wrap">{row.value || "—"}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* Mounted only while open, so its form state initialises from the
          freshest data instead of being re-synced by an effect. */}
      {reviewOpen && (
      <HumanReviewModal
        onClose={() => setReviewOpen(false)}
        current={data.humanDecision}
        currentNotes={data.humanNotes}
        onSubmit={async (decision, notes) => {
          await api(`/api/applications/${id}/review`, {
            method: "PATCH",
            body: { decision, notes },
          });
          await mutate();
          toast.success(
            decision === "UNREVIEWED" ? "Review cleared" : `Application ${decision.toLowerCase()}`,
          );
          setReviewOpen(false);
        }}
      />
      )}
    </>
  );
}

// ─────────────────────── document card ───────────────────────

function DocumentCard({ doc }: { doc: VerifiedDocument }) {
  const [showText, setShowText] = useState(false);
  const meta = DOC_TYPE_META[doc.docType] ?? DOC_TYPE_META.OTHER;
  const checks: CheckRecord[] = doc.checks ?? [];
  const extracted = Object.entries(doc.extracted ?? {}).filter(
    ([, v]) => v !== null && v !== undefined && v !== "" && typeof v !== "object",
  );

  const isImage = doc.mimeType.startsWith("image/");

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-surface px-5 py-3">
        <div className="flex items-center gap-3">
          <span className="text-xl">{meta.icon}</span>
          <div>
            <div className="font-semibold text-ink">{meta.label}</div>
            <div className="text-xs text-muted">
              {doc.fileName}
              {doc.ocrProvider && ` · read by ${doc.ocrProvider}`}
              {doc.ocrConfidence > 0 && ` · ${doc.ocrConfidence.toFixed(0)}% confidence`}
            </div>
          </div>
        </div>
        <VerificationBadge status={doc.status} />
      </div>

      {doc.error && (
        <div className="border-b border-rose-200 bg-rose-50 px-5 py-3 text-sm text-rose-800">
          {doc.error}
        </div>
      )}

      <div className="grid gap-5 p-5 lg:grid-cols-[280px_1fr]">
        {/* Preview */}
        <div>
          {doc.viewUrl ? (
            isImage ? (
              <a href={doc.viewUrl} target="_blank" rel="noreferrer" className="block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={doc.viewUrl}
                  alt={`${meta.label} uploaded by the applicant`}
                  className="max-h-64 w-full rounded-xl border border-line object-contain"
                />
                <span className="mt-1.5 block text-center text-xs font-semibold text-saffron">
                  Open full size ↗
                </span>
              </a>
            ) : (
              <a
                href={doc.viewUrl}
                target="_blank"
                rel="noreferrer"
                className="flex h-40 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-line bg-surface text-sm font-semibold text-saffron"
              >
                <span className="text-3xl">📄</span>
                Open document ↗
              </a>
            )
          ) : (
            <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-line bg-surface px-3 text-center text-xs text-muted">
              File not available in storage
            </div>
          )}

          {doc.rawText && (
            <button
              onClick={() => setShowText((v) => !v)}
              className="mt-2 w-full rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-muted hover:bg-surface"
            >
              {showText ? "Hide" : "Show"} raw OCR text
            </button>
          )}
          {showText && (
            <pre className="mt-2 max-h-56 overflow-auto rounded-lg bg-ink/90 p-3 text-[11px] leading-relaxed text-cream">
              {doc.rawText}
            </pre>
          )}
        </div>

        {/* Extracted + checks */}
        <div className="min-w-0">
          {extracted.length > 0 && (
            <>
              <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">
                Details read from this document
              </h4>
              <div className="mb-4 grid gap-2 sm:grid-cols-2">
                {extracted.map(([k, v]) => (
                  <div key={k} className="rounded-lg bg-surface px-3 py-2">
                    <div className="text-[10px] font-bold uppercase tracking-wide text-muted">
                      {humaniseKey(k)}
                    </div>
                    <div className="break-words text-sm font-semibold text-ink">{String(v)}</div>
                  </div>
                ))}
              </div>
            </>
          )}

          {checks.length > 0 && (
            <>
              <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">
                Cross-verification
              </h4>
              <div className="grid gap-2.5">
                {checks.map((c) => (
                  <CheckRow key={c.key} check={c} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────── human review ───────────────────────

function HumanReviewModal({
  onClose,
  current,
  currentNotes,
  onSubmit,
}: {
  onClose: () => void;
  current: HumanDecision;
  currentNotes: string;
  onSubmit: (decision: HumanDecision, notes: string) => Promise<void>;
}) {
  const [decision, setDecision] = useState<HumanDecision>(current);
  const [notes, setNotes] = useState(currentNotes);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const options: Array<{ value: HumanDecision; label: string; hint: string; cls: string }> = [
    {
      value: "APPROVED",
      label: "✓ Approve",
      hint: "Documents check out — cleared for disbursal",
      cls: "border-emerald-300 bg-emerald-50 text-emerald-800",
    },
    {
      value: "REJECTED",
      label: "✕ Reject",
      hint: "Documents don't support this application",
      cls: "border-rose-300 bg-rose-50 text-rose-800",
    },
    {
      value: "UNREVIEWED",
      label: "○ Clear decision",
      hint: "Send back to the unreviewed queue",
      cls: "border-line bg-surface text-muted",
    },
  ];

  async function save() {
    setSaving(true);
    try {
      await onSubmit(decision, notes);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save the review");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open onClose={onClose} title="Human verification">
      <p className="mb-4 text-sm text-muted">
        The automated checks are a guide, not a decision. Confirm what you see on the scans before
        approving — especially any check marked <strong>Check</strong> or <strong>Fail</strong>.
      </p>

      <div className="grid gap-2">
        {options.map((o) => (
          <button
            key={o.value}
            onClick={() => setDecision(o.value)}
            className={`rounded-xl border-2 px-4 py-3 text-left transition ${
              decision === o.value ? `${o.cls} border-current` : "border-line bg-white hover:bg-surface"
            }`}
          >
            <div className="text-sm font-bold">{o.label}</div>
            <div className="text-xs opacity-80">{o.hint}</div>
          </button>
        ))}
      </div>

      <label className="mt-4 block">
        <span className="text-xs font-bold uppercase tracking-wide text-muted">
          Notes {decision === "REJECTED" && <span className="text-rose-600">(recommended)</span>}
        </span>
        <textarea
          rows={4}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="What did you confirm, and anything the next reviewer should know…"
          className="mt-1 w-full rounded-xl border border-line bg-white px-3 py-2 text-sm outline-none focus:border-saffron"
        />
      </label>

      <div className="mt-5 flex justify-end gap-3">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={save} loading={saving}>
          Save decision
        </Button>
      </div>
    </Modal>
  );
}

// ─────────────────────── helpers ───────────────────────

function StatCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-4 shadow-sm">
      <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted">{label}</div>
      {children}
    </div>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-8">
      <h2 className="font-display text-xl font-semibold text-ink">{title}</h2>
      {subtitle && <p className="mb-3 mt-0.5 text-sm text-muted">{subtitle}</p>}
      {children}
    </section>
  );
}

/**
 * Pair the payload with the current form field definitions so answers render
 * with their real questions, in the order the applicant saw them.
 */
function buildAnswers(data: ApplicationDetail) {
  const labelByKey = new Map(data.fields.map((f) => [f.fieldKey, f.titleEn]));
  const order =
    data.fields.length > 0
      ? data.fields.map((f) => f.fieldKey)
      : Object.keys(data.payload).filter((k) => k !== "meta_summary");

  const rows: Array<{ key: string; label: string; value: string; isFile: boolean }> = [];

  for (const key of order) {
    if (key === "meta_summary") continue;
    const value = data.payload[key];
    if (value === undefined) continue;

    const label = labelByKey.get(key) ?? humaniseKey(key);
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const f = value as { fileName?: string };
      rows.push({ key, label, value: f.fileName ?? "Uploaded file", isFile: true });
    } else {
      rows.push({ key, label, value: String(value ?? ""), isFile: false });
    }
  }
  return rows;
}
