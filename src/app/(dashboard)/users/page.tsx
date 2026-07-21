"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import PageHeader from "@/components/shell/PageHeader";
import Button from "@/components/ui/Button";
import { TextInput } from "@/components/ui/Field";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/lib/auth";
import type { AdminUserRow, Role } from "@/lib/types";

const PAGE_LABELS: Record<string, string> = {
  overview: "Home Page",
  "home-hero": "Hero",
  "home-counters": "Counters",
  "home-impact": "Impact",
  "home-gallery": "Gallery",
  "home-stories": "Stories",
  "home-team": "Team",
  "home-faq": "FAQ",
  submissions: "Submissions",
};

export default function UsersPage() {
  const toast = useToast();
  const { user: me } = useAuth();
  const [queryInput, setQueryInput] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data, error, isLoading, mutate } = useSWR<{ users: AdminUserRow[]; pageKeys: string[] }>(
    `/api/users${submittedQuery ? `?q=${encodeURIComponent(submittedQuery)}` : ""}`,
    api
  );

  const users = data?.users || [];
  const pageKeys = data?.pageKeys || [];
  const loading = isLoading;

  useEffect(() => {
    if (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load");
    }
  }, [error, toast]);

  async function changeRole(u: AdminUserRow, role: Role) {
    const optimisticData = {
      users: users.map((user) => (user.id === u.id ? { ...user, role } : user)),
      pageKeys,
    };
    try {
      await mutate(
        async () => {
          await api(`/api/users/${u.id}/role`, { method: "PATCH", body: { role } });
          toast.success(`${u.name} is now ${role}`);
          return api<{ users: AdminUserRow[]; pageKeys: string[] }>(
            `/api/users${submittedQuery ? `?q=${encodeURIComponent(submittedQuery)}` : ""}`
          );
        },
        { optimisticData, rollbackOnError: true, revalidate: false }
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    }
  }

  async function savePermissions(u: AdminUserRow, keys: string[]) {
    try {
      await api(`/api/users/${u.id}/permissions`, {
        method: "PUT",
        body: { pageKeys: keys },
      });
      toast.success("Permissions saved");
      await mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    }
  }

  return (
    <>
      <PageHeader
        title="User Control"
        subtitle="Promote or demote staff and set page access for volunteers."
      />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setSubmittedQuery(queryInput);
        }}
        className="mb-4 flex max-w-sm gap-2"
      >
        <TextInput
          placeholder="Search email or name…"
          value={queryInput}
          onChange={(e) => setQueryInput(e.target.value)}
        />
        <Button type="submit" variant="ghost">
          Search
        </Button>
      </form>

      <div className="flex flex-col gap-3">
        {loading ? (
          <div className="p-10 text-center text-sm text-muted">Loading…</div>
        ) : (
          users.map((u) => (
            <div key={u.id} className="rounded-2xl border border-line bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold text-ink">
                    {u.name}{" "}
                    {u.id === me?.id && (
                      <span className="text-xs font-normal text-muted">(you)</span>
                    )}
                  </div>
                  <div className="text-sm text-muted">{u.email}</div>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={u.role}
                    onChange={(e) => changeRole(u, e.target.value as Role)}
                    disabled={u.id === me?.id}
                    className="rounded-lg border border-line bg-white px-3 py-1.5 text-sm font-semibold disabled:opacity-60"
                  >
                    <option value="ADMIN">Admin</option>
                    <option value="VOLUNTEER">Volunteer</option>
                    <option value="CLIENT">Client</option>
                  </select>
                  {u.role === "VOLUNTEER" && (
                    <Button
                      variant="ghost"
                      onClick={() => setExpanded(expanded === u.id ? null : u.id)}
                    >
                      {expanded === u.id ? "Hide access" : "Page access"}
                    </Button>
                  )}
                </div>
              </div>

              {expanded === u.id && u.role === "VOLUNTEER" && (
                <VolunteerPermissions
                  pageKeys={pageKeys.filter((k) => k !== "users")}
                  current={u.permissions.map((p) => p.pageKey)}
                  onSave={(keys) => savePermissions(u, keys)}
                />
              )}
            </div>
          ))
        )}
      </div>
    </>
  );
}

function VolunteerPermissions({
  pageKeys,
  current,
  onSave,
}: {
  pageKeys: string[];
  current: string[];
  onSave: (keys: string[]) => void;
}) {
  const HOME_KEYS = [
    "overview",
    "home-hero",
    "home-about",
    "home-counters",
    "home-impact",
    "home-gallery",
    "home-stories",
    "home-team",
    "home-faq",
  ];

  const isHomeSelected = current.some((k) => k === "overview" || k.startsWith("home-"));
  const otherKeys = pageKeys.filter((k) => k !== "overview" && !k.startsWith("home-"));

  const [homeChecked, setHomeChecked] = useState(isHomeSelected);
  const [selectedOthers, setSelectedOthers] = useState<Set<string>>(
    new Set(current.filter((k) => !HOME_KEYS.includes(k)))
  );

  const handleSave = () => {
    const finalKeys: string[] = [...selectedOthers];
    if (homeChecked) {
      finalKeys.push(...HOME_KEYS);
    }
    onSave(finalKeys);
  };

  return (
    <div className="mt-4 border-t border-line pt-4">
      <div className="text-xs font-semibold uppercase tracking-wider text-muted mb-3">
        Page Access Permissions
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <label className="flex items-center gap-2.5 rounded-lg border border-line bg-cream/20 p-2.5 text-sm font-medium text-ink transition hover:bg-cream/40 cursor-pointer">
          <input
            type="checkbox"
            checked={homeChecked}
            onChange={(e) => setHomeChecked(e.target.checked)}
            className="h-4 w-4 rounded accent-saffron"
          />
          <span>Home Page</span>
        </label>

        {otherKeys.map((key) => {
          const label = PAGE_LABELS[key] ?? key;
          const isChecked = selectedOthers.has(key);
          return (
            <label
              key={key}
              className="flex items-center gap-2.5 rounded-lg border border-line bg-cream/20 p-2.5 text-sm font-medium text-ink transition hover:bg-cream/40 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={isChecked}
                onChange={(e) => {
                  setSelectedOthers((prev) => {
                    const next = new Set(prev);
                    if (e.target.checked) next.add(key);
                    else next.delete(key);
                    return next;
                  });
                }}
                className="h-4 w-4 rounded accent-saffron"
              />
              <span>{label}</span>
            </label>
          );
        })}
      </div>
      <div className="mt-4">
        <Button onClick={handleSave}>Save access</Button>
      </div>
    </div>
  );
}
