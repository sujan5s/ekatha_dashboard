"use client";

import { useCallback, useEffect, useState } from "react";
import PageHeader from "@/components/shell/PageHeader";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import type { Submission, SubmissionStatus } from "@/lib/types";

const STATUSES: SubmissionStatus[] = ["NEW", "REVIEWED", "CLOSED"];
const NEXT: Record<SubmissionStatus, SubmissionStatus | null> = {
  NEW: "REVIEWED",
  REVIEWED: "CLOSED",
  CLOSED: null,
};

export default function SubmissionsPage() {
  const toast = useToast();
  const [items, setItems] = useState<Submission[]>([]);
  const [filter, setFilter] = useState<SubmissionStatus | "ALL">("ALL");
  const [active, setActive] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = filter === "ALL" ? "" : `?status=${filter}`;
      setItems(await api<Submission[]>(`/api/submissions${q}`));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [filter, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  async function setStatus(item: Submission, status: SubmissionStatus) {
    try {
      await api(`/api/submissions/${item.id}`, { method: "PATCH", body: { status } });
      toast.success(`Marked ${status.toLowerCase()}`);
      setActive(null);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    }
  }

  return (
    <>
      <PageHeader
        title="Submissions"
        subtitle="Help applications and donation/join requests from the site."
      />

      <div className="mb-4 flex gap-2">
        {(["ALL", ...STATUSES] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
              filter === s ? "bg-saffron text-white" : "bg-white text-muted hover:bg-surface"
            }`}
          >
            {s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
        {loading ? (
          <div className="p-10 text-center text-sm text-muted">Loading…</div>
        ) : items.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted">No submissions.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-surface text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-5 py-3">Type</th>
                <th className="px-5 py-3">Name</th>
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((s) => (
                <tr key={s.id} className="border-t border-line">
                  <td className="px-5 py-3">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                        s.type === "HELP"
                          ? "bg-saffron/10 text-saffron"
                          : "bg-forest/10 text-forest-mid"
                      }`}
                    >
                      {s.type}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-ink">
                    {String((s.payload.name as string) ?? "—")}
                  </td>
                  <td className="px-5 py-3 text-muted">
                    {new Date(s.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-3">
                    <StatusBadge status={s.status} />
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => setActive(s)}
                      className="font-semibold text-saffron"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal
        open={active !== null}
        onClose={() => setActive(null)}
        title={`${active?.type ?? ""} submission`}
        wide
      >
        {active && (
          <>
            <div className="mb-4 flex items-center gap-3">
              <StatusBadge status={active.status} />
              <span className="text-sm text-muted">
                {new Date(active.createdAt).toLocaleString()}
              </span>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {Object.entries(active.payload).map(([k, v]) => (
                <div key={k} className="rounded-lg bg-surface px-3 py-2">
                  <div className="text-xs font-semibold uppercase text-muted">{k}</div>
                  <div className="text-sm text-ink">{String(v)}</div>
                </div>
              ))}
            </div>
            <div className="mt-6 flex justify-end gap-3">
              {NEXT[active.status] && (
                <Button onClick={() => setStatus(active, NEXT[active.status]!)}>
                  Mark {NEXT[active.status]!.toLowerCase()}
                </Button>
              )}
              {active.status !== "NEW" && (
                <Button variant="ghost" onClick={() => setStatus(active, "NEW")}>
                  Reopen
                </Button>
              )}
            </div>
          </>
        )}
      </Modal>
    </>
  );
}

function StatusBadge({ status }: { status: SubmissionStatus }) {
  const map: Record<SubmissionStatus, string> = {
    NEW: "bg-saffron/15 text-saffron",
    REVIEWED: "bg-gold/15 text-[#8a6d10]",
    CLOSED: "bg-line text-muted",
  };
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${map[status]}`}>
      {status}
    </span>
  );
}
