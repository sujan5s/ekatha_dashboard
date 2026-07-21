"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import PageHeader from "@/components/shell/PageHeader";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

interface Overview {
  counts: Record<string, number>;
  newSubmissions: number;
  recentActivity: {
    id: string;
    userEmail: string;
    action: string;
    createdAt: string;
  }[];
}

const CARDS: { key: string; label: string; href: string }[] = [
  { key: "heroSlides", label: "Hero slides", href: "/hero" },
  { key: "counters", label: "Counters", href: "/counters" },
  { key: "impactBars", label: "Impact bars", href: "/impact" },
  { key: "gallery", label: "Gallery images", href: "/gallery" },
  { key: "testimonials", label: "Stories", href: "/stories" },
  { key: "team", label: "Team members", href: "/team" },
  { key: "faqs", label: "FAQs", href: "/faq" },
];

export default function OverviewPage() {
  const { user } = useAuth();
  const [showAllActivity, setShowAllActivity] = useState(false);
  
  const { data, error } = useSWR<Overview>("/api/overview", api);

  return (
    <>
      <PageHeader
        title={`Welcome, ${user?.name?.split(" ")[0] ?? ""}`}
        subtitle="A snapshot of the Team Ekata homepage content."
      />

      {error ? (
        <div className="rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      ) : !data ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-white/60" />
          ))}
        </div>
      ) : (
        <>
          <Link
            href="/submissions"
            className="mb-6 flex items-center justify-between rounded-2xl bg-forest p-5 text-white transition hover:bg-forest-mid"
          >
            <div>
              <div className="text-sm text-cream/70">New submissions</div>
              <div className="font-display text-3xl font-semibold">
                {data.newSubmissions}
              </div>
            </div>
            <span className="text-sm font-semibold text-saffron-light">
              Open inbox →
            </span>
          </Link>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {CARDS.map((c) => (
              <Link
                key={c.key}
                href={c.href}
                className="rounded-2xl border border-line bg-white p-5 shadow-sm transition hover:border-saffron/40 hover:shadow-md"
              >
                <div className="font-display text-3xl font-semibold text-ink">
                  {data.counts[c.key] ?? 0}
                </div>
                <div className="mt-1 text-sm text-muted">{c.label}</div>
              </Link>
            ))}
          </div>

          <h2 className="mt-8 mb-3 text-sm font-bold uppercase tracking-wide text-muted">
            Recent activity
          </h2>
          <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
            {data.recentActivity.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted">
                No changes logged yet.
              </div>
            ) : (
              <>
                {(showAllActivity
                  ? data.recentActivity
                  : data.recentActivity.slice(0, 10)
                ).map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between border-b border-line px-5 py-3 text-sm last:border-0"
                  >
                    <span className="font-medium text-ink">{a.action}</span>
                    <span className="text-muted">
                      {a.userEmail} · {new Date(a.createdAt).toLocaleString()}
                    </span>
                  </div>
                ))}

                {data.recentActivity.length > 10 && (
                  <div className="border-t border-line bg-surface/50 p-3 text-center">
                    <button
                      onClick={() => setShowAllActivity(!showAllActivity)}
                      className="text-sm font-semibold text-saffron hover:underline cursor-pointer"
                    >
                      {showAllActivity
                        ? "Show less"
                        : `Show more (${data.recentActivity.length - 10} more)`}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}
    </>
  );
}
