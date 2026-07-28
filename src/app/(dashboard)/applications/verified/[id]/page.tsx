"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import useSWR from "swr";
import PageHeader from "@/components/shell/PageHeader";
import Button from "@/components/ui/Button";
import { api, downloadFile } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import { DecisionBadge, DOC_TYPE_META, humaniseKey } from "@/components/applications/VerificationUi";
import type { ApplicationDetail, VerifiedDocument } from "@/lib/types";

/**
 * The verified record for one application.
 *
 * This is the documented version: the form as submitted, every value confirmed
 * off every document, and the uploaded files themselves. It shows values, not
 * the machinery that produced them — no engine names, no confidence scores, no
 * check verdicts. Those belong to the review page, where the judgement is still
 * being made; here the judgement has been made.
 */

/**
 * The fields that constitute the record for each document type, in reading
 * order. An allow-list, so working notes (candidate readings, directory blobs,
 * word counts) never surface on a record.
 */
const RECORD_FIELDS: Record<string, Array<[string, string]>> = {
  AADHAAR: [
    ["name", "Name on card"],
    ["aadhaarNumber", "Aadhaar number"],
    ["dob", "Date of birth"],
    ["gender", "Gender"],
    ["guardianName", "Parent / spouse"],
    ["address", "Address"],
    ["pincode", "PIN code"],
  ],
  BANK_PASSBOOK: [
    ["accountHolder", "Account holder"],
    ["accountNumber", "Account number"],
    ["ifsc", "IFSC"],
    ["bankName", "Bank"],
    ["branchName", "Branch"],
  ],
  MEDICAL_BILL: [
    ["patientName", "Patient"],
    ["hospitalName", "Hospital"],
    ["billNumber", "Bill number"],
    ["billDate", "Bill date"],
    ["totalAmount", "Bill total"],
  ],
  REQUEST_LETTER: [["letterDate", "Letter dated"]],
  PHOTO: [],
  OTHER: [],
};

const MONEY_FIELDS = new Set(["totalAmount"]);

function formatValue(field: string, value: unknown): string {
  if (!MONEY_FIELDS.has(field)) return String(value);
  const n = typeof value === "number" ? value : Number(String(value).replace(/[₹,\s]/g, ""));
  return Number.isFinite(n) ? `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}` : String(value);
}

export default function VerifiedRecordPage({ params }: { params: Promise<{ id: string }> }) {
  // Next 16: route params arrive as a promise and are unwrapped with `use()`.
  const { id } = use(params);
  const toast = useToast();
  const [printing, setPrinting] = useState(false);

  const { data, error, isLoading } = useSWR<ApplicationDetail>(`/api/applications/${id}`, api);

  useEffect(() => {
    if (error) toast.error(error instanceof Error ? error.message : "Failed to load the record");
  }, [error, toast]);

  async function printRecord() {
    setPrinting(true);
    try {
      await downloadFile(`/api/applications/${id}/export.pdf`, "application-record.pdf");
      toast.success("Record downloaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not produce the record");
    } finally {
      setPrinting(false);
    }
  }

  if (isLoading) return <div className="p-10 text-center text-sm text-muted">Loading record…</div>;
  if (!data) {
    return (
      <div className="p-10 text-center text-sm text-muted">
        Record not found.{" "}
        <Link href="/applications/verified" className="font-semibold text-saffron">
          Back to verified records
        </Link>
      </div>
    );
  }

  // A record only exists once a human has decided. Anything else is still a
  // draft reading, and presenting it as a record would misrepresent it.
  if (data.humanDecision === "UNREVIEWED") {
    return (
      <>
        <Link
          href="/applications/verified"
          className="mb-3 inline-block text-sm font-semibold text-muted hover:text-saffron"
        >
          ← Verified records
        </Link>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center">
          <div className="mb-2 text-3xl">⏳</div>
          <h2 className="font-display text-lg font-semibold text-ink">Not yet verified</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-amber-900">
            This application still has to go through human verification. Once a reviewer confirms the
            values read from the documents, the record is created here and can be printed.
          </p>
          <Link
            href={`/applications/${id}`}
            className="mt-4 inline-block rounded-xl bg-saffron px-4 py-2 text-sm font-semibold text-white"
          >
            Review this application →
          </Link>
        </div>
      </>
    );
  }

  const answers = buildAnswers(data);
  const documents = data.documents.filter(
    (d) => (RECORD_FIELDS[d.docType] ?? []).length > 0 || d.viewUrl,
  );

  return (
    <>
      <Link
        href="/applications/verified"
        className="mb-3 inline-block text-sm font-semibold text-muted hover:text-saffron"
      >
        ← Verified records
      </Link>

      <PageHeader
        title={data.form.beneficiaryName || "Verified record"}
        subtitle={`Reference ${data.id} · received ${new Date(data.createdAt).toLocaleDateString("en-IN", { dateStyle: "long" })}`}
        action={
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/applications/${data.id}`}
              className="rounded-xl border border-line px-4 py-2 text-sm font-semibold text-muted hover:bg-surface"
            >
              Review detail
            </Link>
            <Button onClick={printRecord} loading={printing}>
              🖨 Print record (PDF)
            </Button>
          </div>
        }
      />

      {/* ── Verification banner ── */}
      <div
        className={`mb-6 flex flex-wrap items-center gap-4 rounded-2xl border p-5 ${
          data.humanDecision === "APPROVED"
            ? "border-emerald-200 bg-emerald-50"
            : "border-rose-200 bg-rose-50"
        }`}
      >
        <DecisionBadge decision={data.humanDecision} reviewer={data.humanReviewer} />
        <div className="text-sm text-ink">
          Verified by <strong>{data.humanReviewer || "a reviewer"}</strong>
          {data.humanReviewedAt &&
            ` on ${new Date(data.humanReviewedAt).toLocaleDateString("en-IN", { dateStyle: "long" })}`}
        </div>
      </div>

      {data.humanNotes && (
        <Section title="Reviewer's notes">
          <div className="rounded-xl border border-line bg-white p-4 text-sm text-ink">
            <p className="whitespace-pre-wrap">{data.humanNotes}</p>
          </div>
        </Section>
      )}

      {/* ── The form ── */}
      <Section title="Application details" subtitle="Answers exactly as the applicant entered them">
        <div className="overflow-hidden rounded-xl border border-line bg-white">
          <table className="w-full text-sm">
            <tbody>
              {answers.map((row, i) => (
                <tr key={row.key} className={i > 0 ? "border-t border-line" : ""}>
                  <td className="w-2/5 bg-surface px-4 py-3 align-top text-xs font-semibold text-muted">
                    {row.label}
                  </td>
                  <td className="px-4 py-3 align-top text-ink">
                    {row.isFile ? (
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
                        <span className="text-muted">📎 {row.value} (not stored)</span>
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

      {/* ── The documents ── */}
      <Section
        title="Verified document details"
        subtitle="Values confirmed from each uploaded document"
      >
        <div className="grid gap-4">
          {documents.length === 0 && (
            <p className="text-sm text-muted">No documents were attached to this application.</p>
          )}
          {documents.map((doc) => (
            <RecordCard key={doc.id} doc={doc} />
          ))}
        </div>
      </Section>
    </>
  );
}

// ─────────────────────── one document ───────────────────────

function RecordCard({ doc }: { doc: VerifiedDocument }) {
  const meta = DOC_TYPE_META[doc.docType] ?? DOC_TYPE_META.OTHER;
  const values = (doc.values ?? doc.extracted ?? {}) as Record<string, unknown>;
  const corrections = doc.corrections ?? {};
  const isImage = doc.mimeType.startsWith("image/");

  const rows = (RECORD_FIELDS[doc.docType] ?? []).flatMap(([field, label]) => {
    const value = values[field];
    if (value === null || value === undefined || value === "") return [];
    return [{ field, label, value: formatValue(field, value), corrected: field in corrections }];
  });

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-surface px-5 py-3">
        <div className="flex items-center gap-3">
          <span className="text-xl">{meta.icon}</span>
          <div className="font-semibold text-ink">{meta.label}</div>
        </div>
        {doc.viewUrl && (
          <a
            href={doc.viewUrl}
            target="_blank"
            rel="noreferrer"
            className="text-sm font-semibold text-saffron hover:underline"
          >
            Open file ↗
          </a>
        )}
      </div>

      <div className="grid gap-5 p-5 lg:grid-cols-[240px_1fr]">
        <div>
          {doc.viewUrl ? (
            isImage ? (
              <a href={doc.viewUrl} target="_blank" rel="noreferrer" className="block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={doc.viewUrl}
                  alt={`${meta.label} submitted with this application`}
                  className="max-h-56 w-full rounded-xl border border-line object-contain"
                />
              </a>
            ) : (
              <a
                href={doc.viewUrl}
                target="_blank"
                rel="noreferrer"
                className="flex h-36 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-line bg-surface text-sm font-semibold text-saffron"
              >
                <span className="text-3xl">📄</span>
                Open document ↗
              </a>
            )
          ) : (
            <div className="flex h-36 items-center justify-center rounded-xl border border-dashed border-line bg-surface px-3 text-center text-xs text-muted">
              File not available in storage
            </div>
          )}
        </div>

        <div className="min-w-0">
          {rows.length === 0 ? (
            <p className="text-sm text-muted">No details were recorded from this document.</p>
          ) : (
            <dl className="divide-y divide-line">
              {rows.map((row) => (
                <div key={row.field} className="flex flex-wrap gap-2 py-2 first:pt-0 last:pb-0">
                  <dt className="w-44 shrink-0 text-xs font-semibold uppercase tracking-wide text-muted">
                    {row.label}
                  </dt>
                  <dd className="min-w-0 flex-1 break-words text-sm font-semibold text-ink">
                    {row.value}
                    {row.corrected && (
                      <span
                        className="ml-2 text-[10px] font-bold uppercase text-emerald-700"
                        title={`Confirmed by ${doc.correctedBy || "a reviewer"}`}
                      >
                        ✎ confirmed
                      </span>
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────── helpers ───────────────────────

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
      {!subtitle && <div className="mb-3" />}
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
