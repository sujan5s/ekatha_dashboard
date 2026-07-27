"use client";

import type {
  CheckRecord,
  CheckResult,
  CheckSummary,
  DocType,
  HumanDecision,
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

export const DOC_TYPE_META: Record<DocType, { label: string; icon: string }> = {
  BANK_PASSBOOK: { label: "Bank Passbook", icon: "🏦" },
  AADHAAR: { label: "Aadhaar Card", icon: "🪪" },
  MEDICAL_BILL: { label: "Medical Bill", icon: "🧾" },
  REQUEST_LETTER: { label: "Request Letter", icon: "✍️" },
  PHOTO: { label: "Beneficiary Photo", icon: "📸" },
  OTHER: { label: "Document", icon: "📄" },
};

/** Turn an extracted-field key into a readable label. */
export function humaniseKey(key: string): string {
  return key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase());
}
