"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
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
  ComparisonTable,
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
  // Exports link straight at a document (…?doc=<id>); honour that so the link
  // lands the reviewer on the right card instead of the top of the page.
  const focusDocId = useSearchParams().get("doc");

  const { data, error, isLoading, mutate } = useSWR<ApplicationDetail>(
    `/api/applications/${id}`,
    api,
    {
      // Poll while the documents are being read — but stop once it has clearly
      // stalled. Polling for ever renders as a spinner that never resolves and
      // tells the reviewer nothing; the banner below says what happened instead.
      refreshInterval: (d) => (isReading(d) && !hasStalled(d) ? 4000 : 0),
    },
  );

  const [reviewOpen, setReviewOpen] = useState(false);
  const [rerunning, setRerunning] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (error) toast.error(error instanceof Error ? error.message : "Failed to load application");
  }, [error, toast]);

  async function rerunOcr() {
    setRerunning(true);
    try {
      await api(`/api/applications/${id}/verify`, { method: "POST" });
      toast.success("Re-reading documents — your corrections are kept");
      await mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not start verification");
    } finally {
      setRerunning(false);
    }
  }

  async function exportWorkbook() {
    setExporting(true);
    try {
      await downloadFile(`/api/applications/${id}/export.xlsx`, "application.xlsx");
      toast.success("Excel downloaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed");
    } finally {
      setExporting(false);
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
            <Button variant="ghost" onClick={exportWorkbook} loading={exporting}>
              ⬇ Excel
            </Button>
            <Button variant="forest" onClick={rerunOcr} loading={rerunning}>
              🔄 Re-run OCR
            </Button>
            <Button onClick={() => setReviewOpen(true)}>✓ Human verify</Button>
          </div>
        }
      />

      {/* ── While the documents are being read ──
          Until this finishes there is nothing on the page but a badge, which
          reads as a broken screen rather than as work in progress. Say what is
          happening, roughly how long it takes, and — once it has run far past
          that — say plainly that it has stalled and offer the way out. */}
      {isReading(data) && (
        <div
          className={`mb-5 flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3 text-sm ${
            hasStalled(data)
              ? "border-amber-300 bg-amber-50 text-amber-900"
              : "border-blue-200 bg-blue-50 text-blue-900"
          }`}
        >
          {hasStalled(data) ? (
            <>
              <span className="text-lg">⚠</span>
              <span>
                Reading these documents has been running for{" "}
                <strong>{minutesSince(data.updatedAt)} minutes</strong>, far longer than it should.
                The run was most likely interrupted. Start it again — anything already read is kept.
              </span>
              <Button variant="forest" onClick={rerunOcr} loading={rerunning} className="ml-auto">
                🔄 Re-run OCR
              </Button>
            </>
          ) : (
            <>
              <span className="ek-spin text-lg">🔄</span>
              <span>
                Reading the uploaded documents. This usually takes under a minute — the page updates
                itself when it is done.
              </span>
            </>
          )}
        </div>
      )}

      {/* The printable record is produced from confirmed values, so it lives
          with the verified applications rather than here in the working queue. */}
      {data.humanDecision !== "UNREVIEWED" && (
        <div className="mb-5 flex flex-wrap items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          <span className="text-lg">✓</span>
          <span>
            Verified by <strong>{data.humanReviewer || "a reviewer"}</strong>. The printable record
            is on the verified applications page.
          </span>
          <Link
            href={`/applications/verified/${data.id}`}
            className="ml-auto font-semibold text-emerald-800 underline"
          >
            Open record →
          </Link>
        </div>
      )}

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

      {/* ── The comparison ──
          First, deliberately: it is the whole application in one screen, and it
          is where a wrong account number or a different person shows up. The
          per-document detail below exists to explain a row that looks wrong. */}
      {data.comparison && data.comparison.rows.length > 0 && (
        <Section
          title="Document comparison"
          subtitle="Every value as each document states it, and whether they agree"
        >
          <ComparisonTable matrix={data.comparison} />
          <p className="mt-2 text-xs text-muted">
            Read across each row. Anything marked <strong>Mismatch</strong> or{" "}
            <strong>Check</strong> needs your eyes on the scans before this application is approved.
          </p>
        </Section>
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
            <DocumentCard
              key={doc.id}
              doc={doc}
              applicationId={data.id}
              onSaved={mutate}
              focused={doc.id === focusDocId}
            />
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
                      // A filename tells a reviewer nothing; the link opens the
                      // actual scan they need to look at.
                      row.viewUrl ? (
                        <a
                          href={row.viewUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 font-semibold text-saffron hover:underline"
                        >
                          📎 {row.value} <span className="text-xs">↗</span>
                        </a>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-muted">
                          📎 {row.value} <span className="text-xs">(not stored)</span>
                        </span>
                      )
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

// ─────────────────────── reading state ───────────────────────

/**
 * How long a read may run before it is treated as stalled.
 *
 * Generous on purpose. Every document is a round-trip to a vision model, and the
 * cost of calling a slow run "stalled" is only a banner the reviewer can ignore,
 * whereas calling a stalled run "slow" is the bug this replaces — a page that
 * spins for ever and never says why.
 */
const STALL_AFTER_MS = 5 * 60 * 1000;

function isReading(d?: ApplicationDetail): boolean {
  return d?.verificationStatus === "PROCESSING" || d?.verificationStatus === "PENDING";
}

/** `updatedAt` last moved when the submission entered PROCESSING. */
function hasStalled(d?: ApplicationDetail): boolean {
  if (!isReading(d) || !d?.updatedAt) return false;
  return Date.now() - new Date(d.updatedAt).getTime() > STALL_AFTER_MS;
}

function minutesSince(iso: string): number {
  return Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
}

// ─────────────────────── document card ───────────────────────

function DocumentCard({
  doc,
  applicationId,
  onSaved,
  focused,
}: {
  doc: VerifiedDocument;
  applicationId: string;
  onSaved: () => Promise<unknown>;
  /** Linked to directly from an export; scroll it into view. */
  focused?: boolean;
}) {
  const [showText, setShowText] = useState(false);
  const [editing, setEditing] = useState(false);
  const [card, setCard] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    if (focused && card) card.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [focused, card]);
  const meta = DOC_TYPE_META[doc.docType] ?? DOC_TYPE_META.OTHER;
  const checks: CheckRecord[] = doc.checks ?? [];
  // Show what the document says now, corrections included — never the stale
  // machine reading a reviewer has already replaced.
  const extracted = flattenExtracted(doc.values ?? doc.extracted);

  const isImage = doc.mimeType.startsWith("image/");
  const editable = doc.editableFields ?? [];

  return (
    <div
      ref={setCard}
      id={`doc-${doc.id}`}
      className={`overflow-hidden rounded-2xl border bg-white shadow-sm ${
        focused ? "border-saffron ring-2 ring-saffron/30" : "border-line"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-surface px-5 py-3">
        <div className="flex items-center gap-3">
          <span className="text-xl">{meta.icon}</span>
          <div>
            <div className="font-semibold text-ink">{meta.label}</div>
            <div className="text-xs text-muted">
              {doc.fileName}
              {doc.ocrProvider && ` · read by ${doc.ocrProvider}`}
              {doc.ocrConfidence > 0 && ` · ${doc.ocrConfidence.toFixed(0)}% confidence`}
              {doc.correctedBy && ` · corrected by ${doc.correctedBy}`}
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
          <div className="mb-2 flex items-center justify-between gap-3">
            <h4 className="text-xs font-bold uppercase tracking-wide text-muted">
              Details read from this document
            </h4>
            {editable.length > 0 && !editing && (
              <button
                onClick={() => setEditing(true)}
                className="rounded-lg border border-line px-2.5 py-1 text-xs font-semibold text-saffron hover:bg-surface"
              >
                ✎ Correct values
              </button>
            )}
          </div>

          {editing ? (
            <CorrectionForm
              doc={doc}
              applicationId={applicationId}
              onDone={async () => {
                await onSaved();
                setEditing(false);
              }}
              onCancel={() => setEditing(false)}
            />
          ) : (
            extracted.length > 0 && (
              <div className="mb-4 grid gap-2 sm:grid-cols-2">
                {extracted.map(([label, value, key]) => {
                  const corrected = key !== undefined && key in (doc.corrections ?? {});
                  return (
                    <div
                      key={label}
                      className={`rounded-lg px-3 py-2 ${
                        corrected ? "bg-emerald-50 ring-1 ring-emerald-200" : "bg-surface"
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wide text-muted">
                          {label}
                        </span>
                        {corrected && (
                          <span
                            className="text-[10px] font-bold text-emerald-700"
                            title={`Corrected by ${doc.correctedBy || "a reviewer"}`}
                          >
                            ✎ corrected
                          </span>
                        )}
                      </div>
                      <div className="break-words text-sm font-semibold text-ink">{value}</div>
                    </div>
                  );
                })}
              </div>
            )
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

// ─────────────────────── correcting a bad read ───────────────────────

/** Human-readable labels for the fields a reviewer is allowed to correct. */
const FIELD_LABELS: Record<string, string> = {
  accountNumber: "Account number",
  ifsc: "IFSC code",
  bankName: "Bank",
  branchName: "Branch",
  accountHolder: "Account holder",
  aadhaarNumber: "Aadhaar number",
  name: "Name on card",
  dob: "Date of birth",
  gender: "Gender",
  address: "Address",
  pincode: "PIN code",
  guardianName: "Parent / spouse (S/O, W/O, D/O)",
  totalAmount: "Bill total",
  patientName: "Patient name",
  hospitalName: "Hospital",
  billNumber: "Bill number",
  billDate: "Bill date",
  receiptType: "Kind of document (bill, advance receipt…)",
  letterDate: "Letter date",
  beneficiaryName: "Person the letter is for",
  matchesDocument: "Same person as the Aadhaar photo?",
};

/** Fields worth giving more than one line of typing room. */
const LONG_FIELDS = new Set(["address"]);

/**
 * Yes/no fields, offered as a choice rather than a text box.
 *
 * "Could not tell" is a first-class answer here, not an empty field: a reviewer
 * who genuinely cannot tell two blurred photographs apart is recording a real
 * finding, and forcing that into yes-or-no would put a guess on the record.
 */
const BOOLEAN_FIELDS = new Set(["matchesDocument"]);

const BOOLEAN_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "", label: "Could not tell" },
  { value: "true", label: "Yes — same person" },
  { value: "false", label: "No — different person" },
];

/**
 * Edit the values read off one document.
 *
 * The reviewer is looking at the scan beside this form, so this is where a bad
 * read gets fixed. Corrections are saved separately from the OCR output, which
 * is why re-running OCR afterwards does not undo them, and saving re-runs the
 * document's checks so the verdicts reflect the corrected values immediately.
 */
function CorrectionForm({
  doc,
  applicationId,
  onDone,
  onCancel,
}: {
  doc: VerifiedDocument;
  applicationId: string;
  onDone: () => Promise<void>;
  onCancel: () => void;
}) {
  const toast = useToast();
  const values = (doc.values ?? doc.extracted ?? {}) as Record<string, unknown>;

  const [draft, setDraft] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      doc.editableFields.map((f) => [f, values[f] === null || values[f] === undefined ? "" : String(values[f])]),
    ),
  );
  const [saving, setSaving] = useState(false);

  const original = (doc.extracted ?? {}) as Record<string, unknown>;

  async function save() {
    // Only send what actually changed, so an untouched field is never recorded
    // as a human-confirmed correction.
    const changed: Record<string, string> = {};
    for (const [field, value] of Object.entries(draft)) {
      const current = values[field] === null || values[field] === undefined ? "" : String(values[field]);
      if (value !== current) changed[field] = value;
    }

    if (Object.keys(changed).length === 0) {
      onCancel();
      return;
    }

    setSaving(true);
    try {
      await api(`/api/applications/${applicationId}/documents/${doc.id}`, {
        method: "PATCH",
        body: { corrections: changed },
      });
      toast.success("Corrections saved — checks re-run");
      await onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save the corrections");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mb-4 rounded-xl border border-saffron/40 bg-saffron/5 p-4">
      <p className="mb-3 text-xs text-muted">
        Read each value off the scan and correct anything wrong. Leave a field empty if the document
        genuinely does not show it. Re-running OCR later will not overwrite what you enter here.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        {doc.editableFields.map((field) => {
          const label = FIELD_LABELS[field] ?? humaniseKey(field);
          const machineRead = original[field];
          const changed = draft[field] !== (values[field] == null ? "" : String(values[field]));

          return (
            <label key={field} className={LONG_FIELDS.has(field) ? "sm:col-span-2" : ""}>
              <span className="text-[10px] font-bold uppercase tracking-wide text-muted">{label}</span>
              {BOOLEAN_FIELDS.has(field) ? (
                <select
                  value={draft[field] ?? ""}
                  onChange={(e) => setDraft((d) => ({ ...d, [field]: e.target.value }))}
                  className={`mt-1 w-full rounded-lg border bg-white px-2.5 py-1.5 text-sm outline-none focus:border-saffron ${
                    changed ? "border-saffron" : "border-line"
                  }`}
                >
                  {BOOLEAN_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : LONG_FIELDS.has(field) ? (
                <textarea
                  rows={2}
                  value={draft[field] ?? ""}
                  onChange={(e) => setDraft((d) => ({ ...d, [field]: e.target.value }))}
                  className={`mt-1 w-full rounded-lg border bg-white px-2.5 py-1.5 text-sm outline-none focus:border-saffron ${
                    changed ? "border-saffron" : "border-line"
                  }`}
                />
              ) : (
                <input
                  value={draft[field] ?? ""}
                  onChange={(e) => setDraft((d) => ({ ...d, [field]: e.target.value }))}
                  className={`mt-1 w-full rounded-lg border bg-white px-2.5 py-1.5 text-sm outline-none focus:border-saffron ${
                    changed ? "border-saffron" : "border-line"
                  }`}
                />
              )}
              {/* Keep the machine's original reading visible, so a reviewer can
                  always see what they are overriding. */}
              {machineRead !== null && machineRead !== undefined && machineRead !== "" && (
                <span className="mt-0.5 block truncate text-[10px] text-muted">
                  Read as: {displayValue(machineRead)}
                </span>
              )}
            </label>
          );
        })}
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={save} loading={saving}>
          Save corrections
        </Button>
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

/** Render a read value for a human. Raw `true`/`false` reads as a bug, not a fact. */
function displayValue(value: unknown): string {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

/**
 * Flatten an extracted-fields object into label/value pairs for display.
 *
 * Nested records (the RBI directory entry behind an IFSC) and lists (the other
 * lines on an Aadhaar card that could have been the name) are included rather
 * than skipped — those are exactly the values a reviewer needs when a check
 * comes back uncertain.
 */
function flattenExtracted(
  extracted: unknown,
  prefix = "",
): Array<[label: string, value: string, key: string | undefined]> {
  if (!extracted || typeof extracted !== "object") return [];
  const out: Array<[string, string, string | undefined]> = [];

  for (const [k, v] of Object.entries(extracted as Record<string, unknown>)) {
    if (v === null || v === undefined || v === "") continue;
    const label = prefix ? `${prefix} — ${humaniseKey(k)}` : humaniseKey(k);

    if (Array.isArray(v)) {
      if (v.length === 0) continue;
      out.push([
        label,
        v.map((item) => (typeof item === "object" ? JSON.stringify(item) : String(item))).join(", "),
        k,
      ]);
      continue;
    }
    if (typeof v === "object") {
      // Nested values belong to their parent object, not to a correctable field.
      out.push(...flattenExtracted(v, label));
      continue;
    }
    out.push([label, displayValue(v), prefix ? undefined : k]);
  }
  return out;
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

  const rows: Array<{
    key: string;
    label: string;
    value: string;
    isFile: boolean;
    viewUrl: string | null;
  }> = [];

  for (const key of order) {
    if (key === "meta_summary") continue;
    const value = data.payload[key];
    if (value === undefined) continue;

    const label = labelByKey.get(key) ?? humaniseKey(key);
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const f = value as { fileName?: string };
      rows.push({
        key,
        label,
        value: f.fileName ?? "Uploaded file",
        isFile: true,
        viewUrl: data.documentsByField?.[key] ?? null,
      });
    } else {
      rows.push({ key, label, value: String(value ?? ""), isFile: false, viewUrl: null });
    }
  }
  return rows;
}
