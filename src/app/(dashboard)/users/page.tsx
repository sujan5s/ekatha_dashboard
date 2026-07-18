"use client";

import { useCallback, useEffect, useState } from "react";
import PageHeader from "@/components/shell/PageHeader";
import Button from "@/components/ui/Button";
import { TextInput } from "@/components/ui/Field";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/lib/auth";
import type { AdminUserRow, Role } from "@/lib/types";

const PAGE_LABELS: Record<string, string> = {
  overview: "Overview",
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
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [pageKeys, setPageKeys] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (q = "") => {
    setLoading(true);
    try {
      const data = await api<{ users: AdminUserRow[]; pageKeys: string[] }>(
        `/api/users${q ? `?q=${encodeURIComponent(q)}` : ""}`,
      );
      setUsers(data.users);
      setPageKeys(data.pageKeys);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  async function changeRole(u: AdminUserRow, role: Role) {
    try {
      await api(`/api/users/${u.id}/role`, { method: "PATCH", body: { role } });
      toast.success(`${u.name} is now ${role}`);
      await load(query);
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
      await load(query);
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
          void load(query);
        }}
        className="mb-4 flex max-w-sm gap-2"
      >
        <TextInput
          placeholder="Search email or name…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
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
  const [selected, setSelected] = useState<Set<string>>(new Set(current));

  return (
    <div className="mt-4 border-t border-line pt-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {pageKeys.map((key) => (
          <label key={key} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={selected.has(key)}
              onChange={(e) => {
                setSelected((s) => {
                  const next = new Set(s);
                  if (e.target.checked) next.add(key);
                  else next.delete(key);
                  return next;
                });
              }}
              className="h-4 w-4 accent-saffron"
            />
            {PAGE_LABELS[key] ?? key}
          </label>
        ))}
      </div>
      <div className="mt-4">
        <Button onClick={() => onSave([...selected])}>Save access</Button>
      </div>
    </div>
  );
}
