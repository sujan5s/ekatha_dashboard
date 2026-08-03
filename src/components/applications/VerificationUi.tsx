"use client";

import type {
  CheckRecord,
  CheckResult,
  CheckSummary,
  ComparisonMatrix,
  DocType,
  HumanDecision,
  MatchStatus,
  VerificationStatus,
} from "@/lib/types";

/**
 * Shared vocabulary for showing verification state.
 *
 * The colour system is deliberately blunt: green means the document agreed with
 * the form, red means it contradicted it, amber means OCR couldn't prove either
 * way. A reviewer should never have to guess which of those they're looking at.
 */

const VERIFICATION_STYLE: Record<VerificationStatus, { label: string; cls: string; icon: string }> = {
  PENDING: { label: "Queued", cls: "bg-line text-muted", icon: "⏳" },
  PROCESSING: { label: "Reading…", cls: "bg-blue-100 text-blue-700", icon: "🔄" },
  VERIFIED: { label: "All checks passed", cls: "bg-emerald-100 text-emerald-800", icon: "✓" },
  NEEDS_REVIEW: { label: "Needs review", cls: "bg-amber-100 text-amber-800", icon: "⚠" },
  FAILED: { label: "Could not read", cls: "bg-rose-100 text-rose-800", icon: "✕" },
};

export function VerificationBadge({ status }: { status: VerificationStatus }) {
  const s = VERIFICATION_STYLE[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ${s.cls}`}
    >
      <span className={status === "PROCESSING" ? "ek-spin inline-block" : ""}>{s.icon}</span>
      {s.label}
    </span>
  );
}

const DECISION_STYLE: Record<HumanDecision, { label: string; cls: string; icon: string }> = {
  UNREVIEWED: { label: "Not reviewed", cls: "bg-line text-muted", icon: "○" },
  APPROVED: { label: "Approved", cls: "bg-emerald-100 text-emerald-800", icon: "✓" },
  REJECTED: { label: "Rejected", cls: "bg-rose-100 text-rose-800", icon: "✕" },
};

export function DecisionBadge({
  decision,
  reviewer,
}: {
  decision: HumanDecision;
  reviewer?: string;
}) {
  const s = DECISION_STYLE[decision];
  return (
    <div>
      <span
        className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ${s.cls}`}
      >
        <span>{s.icon}</span>
        {s.label}
      </span>
      {reviewer && decision !== "UNREVIEWED" && (
        <div className="mt-1 text-[11px] text-muted">by {reviewer}</div>
      )}
    </div>
  );
}

const RESULT_STYLE: Record<CheckResult, { cls: string; icon: string; label: string }> = {
  PASS: { cls: "text-emerald-700 bg-emerald-50 border-emerald-200", icon: "✓", label: "Pass" },
  FAIL: { cls: "text-rose-700 bg-rose-50 border-rose-200", icon: "✕", label: "Fail" },
  WARN: { cls: "text-amber-800 bg-amber-50 border-amber-200", icon: "⚠", label: "Check" },
  SKIP: { cls: "text-muted bg-surface border-line", icon: "–", label: "N/A" },
};

/** Compact pass/warn/fail bar for the list view. */
export function CheckBar({ summary }: { summary: CheckSummary }) {
  const decisive = summary.passed + summary.failed + summary.warnings;
  if (decisive === 0) {
    return <span className="text-xs text-muted">No checks yet</span>;
  }

  const pct = (n: number) => `${(n / decisive) * 100}%`;

  return (
    <div className="min-w-[150px]">
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-line">
        {summary.passed > 0 && (
          <div className="bg-emerald-500" style={{ width: pct(summary.passed) }} />
        )}
        {summary.warnings > 0 && (
          <div className="bg-amber-400" style={{ width: pct(summary.warnings) }} />
        )}
        {summary.failed > 0 && <div className="bg-rose-500" style={{ width: pct(summary.failed) }} />}
      </div>
      <div className="mt-1 flex gap-2 text-[11px] font-medium">
        <span className="text-emerald-700">{summary.passed} pass</span>
        {summary.warnings > 0 && <span className="text-amber-700">{summary.warnings} check</span>}
        {summary.failed > 0 && <span className="text-rose-700">{summary.failed} fail</span>}
      </div>
    </div>
  );
}

/**
 * One check, showing form value against document value side by side — the
 * comparison is the whole point, so it is never collapsed away.
 */
export function CheckRow({ check }: { check: CheckRecord }) {
  const s = RESULT_STYLE[check.result];
  return (
    <div className={`rounded-xl border px-3.5 py-2.5 ${s.cls}`}>
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 text-sm font-bold" aria-hidden>
          {s.icon}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold">{check.label}</span>
            <span className="rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">
              {s.label}
            </span>
          </div>

          {(check.expected || check.found) && (
            <div className="mt-1.5 grid gap-1.5 sm:grid-cols-2">
              {check.expected && (
                <ValueCell label="On the form" value={check.expected} />
              )}
              {check.found && <ValueCell label="On the document" value={check.found} />}
            </div>
          )}

          {check.detail && <p className="mt-1.5 text-xs opacity-90">{check.detail}</p>}
        </div>
      </div>
    </div>
  );
}

function ValueCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/60 px-2.5 py-1.5">
      <div className="text-[10px] font-bold uppercase tracking-wide opacity-70">{label}</div>
      <div className="break-words text-xs font-semibold">{value}</div>
    </div>
  );
}

// ─────────────────────── cross-document comparison ───────────────────────

const MATCH_STYLE: Record<MatchStatus, { label: string; cls: string }> = {
  MATCHED: { label: "Matched", cls: "bg-emerald-100 text-emerald-800" },
  FOUND: { label: "Found", cls: "bg-emerald-100 text-emerald-800" },
  MISMATCH: { label: "Mismatch", cls: "bg-rose-100 text-rose-800" },
  REVIEW: { label: "Check", cls: "bg-amber-100 text-amber-800" },
  NOT_FOUND: { label: "Not found", cls: "bg-rose-50 text-rose-700" },
  SINGLE_SOURCE: { label: "One source", cls: "bg-blue-50 text-blue-700" },
  NA: { label: "N/A", cls: "bg-surface text-muted" },
};

export function MatchBadge({ status }: { status: MatchStatus }) {
  const s = MATCH_STYLE[status];
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${s.cls}`}
    >
      {s.label}
    </span>
  );
}

/**
 * Every fact the application asserts, as each document states it.
 *
 * The per-document checks are organised by document, which is the wrong shape
 * for the question a reviewer is actually answering: is this the same person,
 * and is this the right account? That question is answered by reading *across*
 * — Aadhaar name, passbook name, letter name — so this table puts one fact per
 * row and one document per column, and states the verdict in a single word at
 * the end of the row.
 *
 * A blank cell is meaningful: it means that document does not carry this fact,
 * which is not the same as a disagreement, so it renders as an explicit "N/A"
 * rather than as empty space.
 */
export function ComparisonTable({ matrix }: { matrix: ComparisonMatrix }) {
  if (matrix.columns.length === 0) {
    return <p className="text-sm text-muted">No documents to compare on this application.</p>;
  }

  return (
    // The table has a column per document and cannot narrow indefinitely; it
    // scrolls inside its own frame so the page never scrolls sideways.
    <div className="overflow-x-auto rounded-2xl border border-line bg-white shadow-sm">
      <table className="w-full min-w-[760px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-line bg-surface text-left">
            <th className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-muted">
              Parameter
            </th>
            {matrix.columns.map((c) => (
              <th
                key={c.docType}
                className="border-l border-line px-4 py-3 text-xs font-bold uppercase tracking-wide text-muted"
              >
                <span className="mr-1.5">{DOC_TYPE_META[c.docType]?.icon}</span>
                {c.label}
              </th>
            ))}
            <th className="border-l border-line px-4 py-3 text-xs font-bold uppercase tracking-wide text-muted">
              Verification
            </th>
          </tr>
        </thead>
        <tbody>
          {matrix.rows.map((row) => (
            <tr key={row.key} className="border-b border-line last:border-b-0 align-top">
              <th className="bg-surface/60 px-4 py-3 text-left text-sm font-semibold text-ink">
                {row.label}
                {row.formValue && (
                  <span className="mt-1 block max-w-[180px] text-[11px] font-normal leading-snug text-muted">
                    On the form: {row.formValue}
                  </span>
                )}
              </th>

              {matrix.columns.map((c) => {
                const value = row.cells[c.docType];
                return (
                  <td key={c.docType} className="border-l border-line px-4 py-3">
                    {value ? (
                      <span className="break-words text-ink">{value}</span>
                    ) : (
                      <span className="text-xs text-muted">N/A</span>
                    )}
                  </td>
                );
              })}

              <td className="border-l border-line px-4 py-3">
                <MatchBadge status={row.status} />
                {row.detail && (
                  <p className="mt-1.5 max-w-[240px] text-[11px] leading-snug text-muted">
                    {row.detail}
                  </p>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export const DOC_TYPE_META: Record<DocType, { label: string; icon: string }> = {
  BANK_PASSBOOK: { label: "Bank Passbook", icon: "🏦" },
  AADHAAR: { label: "Aadhaar Card", icon: "🪪" },
  MEDICAL_BILL: { label: "Medical Bill", icon: "🧾" },
  REQUEST_LETTER: { label: "Request Letter", icon: "✍️" },
  PHOTO: { label: "Beneficiary Photo", icon: "📸" },
  OTHER: { label: "Document", icon: "📄" },
};

/** Turn an extracted-field key into a readable label. */
/** Field keys that are acronyms, and would otherwise render as "Ifsc"/"Dob". */
const ACRONYMS = new Set(["IFSC", "DOB", "MICR", "OCR", "ID", "UHID", "PAN", "INR"]);

export function humaniseKey(key: string): string {
  return key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((word) =>
      ACRONYMS.has(word.toUpperCase())
        ? word.toUpperCase()
        : word.charAt(0).toUpperCase() + word.slice(1),
    )
    .join(" ");
}
