"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import PageHeader from "@/components/shell/PageHeader";
import Button from "@/components/ui/Button";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/lib/auth";
import type { AdminUserRow, Role } from "@/lib/types";

const PAGE_LABELS: Record<string, string> = {
  overview: "Home Page",
  "home-hero": "Hero Section",
  "home-counters": "Counters",
  "home-impact": "Impact",
  "home-gallery": "Gallery",
  "home-stories": "Stories",
  "home-team": "Team",
  "home-faq": "FAQ",
  "form-control": "Form Control",
  submissions: "Form Submissions",
};

const ROLE_COLORS: Record<Role, { bg: string; text: string; border: string; icon: string }> = {
  ADMIN: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", icon: "👑" },
  VOLUNTEER: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", icon: "⭐" },
  CLIENT: { bg: "bg-gray-100", text: "text-gray-600", border: "border-gray-200", icon: "👤" },
};

function getInitials(name: string) {
  if (!name) return "U";
  const parts = name.trim().split(" ");
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export default function UsersPage() {
  const toast = useToast();
  const { user: me } = useAuth();
  const [queryInput, setQueryInput] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data, error, isLoading, mutate } = useSWR<{ users: AdminUserRow[]; pageKeys: string[] }>(
    "/api/users",
    api
  );

  const users = data?.users || [];
  const pageKeys = data?.pageKeys || [];

  useEffect(() => {
    if (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load users");
    }
  }, [error, toast]);

  // Client-side filter
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(queryInput.toLowerCase()) ||
      u.email.toLowerCase().includes(queryInput.toLowerCase());
    const matchesRole = roleFilter === "ALL" || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const adminCount = users.filter((u) => u.role === "ADMIN").length;
  const volunteerCount = users.filter((u) => u.role === "VOLUNTEER").length;
  const clientCount = users.filter((u) => u.role === "CLIENT").length;

  async function changeRole(u: AdminUserRow, role: Role) {
    const optimisticData = {
      users: users.map((user) => (user.id === u.id ? { ...user, role } : user)),
      pageKeys,
    };
    try {
      await mutate(
        async () => {
          await api(`/api/users/${u.id}/role`, { method: "PATCH", body: { role } });
          toast.success(`${u.name} role updated to ${role}`);
          return api<{ users: AdminUserRow[]; pageKeys: string[] }>("/api/users");
        },
        { optimisticData, rollbackOnError: true, revalidate: false }
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Role update failed");
    }
  }

  async function savePermissions(u: AdminUserRow, keys: string[]) {
    try {
      await api(`/api/users/${u.id}/permissions`, {
        method: "PUT",
        body: { pageKeys: keys },
      });
      toast.success(`Page access updated for ${u.name}`);
      await mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    }
  }

  return (
    <div className="space-y-8 pb-16">
      <PageHeader
        title="User Control & Permissions"
        subtitle="Manage admin staff, assign volunteer page permissions, and monitor system access."
      />

      {/* Metrics Header */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-line bg-white p-4 shadow-sm">
          <span className="text-[11px] font-bold text-muted uppercase tracking-wider block">Total Users</span>
          <span className="text-2xl font-black text-ink mt-1 block">{users.length}</span>
        </div>
        <div className="rounded-2xl border border-amber-200/80 bg-amber-50/30 p-4 shadow-sm">
          <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider block">👑 Admins</span>
          <span className="text-2xl font-black text-amber-800 mt-1 block">{adminCount}</span>
        </div>
        <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/30 p-4 shadow-sm">
          <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">⭐ Volunteers</span>
          <span className="text-2xl font-black text-emerald-800 mt-1 block">{volunteerCount}</span>
        </div>
        <div className="rounded-2xl border border-line bg-gray-50/50 p-4 shadow-sm">
          <span className="text-[11px] font-bold text-muted uppercase tracking-wider block">👤 Clients</span>
          <span className="text-2xl font-black text-gray-700 mt-1 block">{clientCount}</span>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-line bg-white p-4 shadow-sm">
        <div className="relative flex-1 min-w-[260px]">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted text-sm">🔍</span>
          <input
            type="text"
            placeholder="Instant search by user name or email..."
            value={queryInput}
            onChange={(e) => setQueryInput(e.target.value)}
            className="w-full rounded-xl border border-line bg-gray-50/50 pl-10 pr-4 py-2 text-xs text-ink focus:bg-white focus:outline-none focus:ring-2 focus:ring-saffron/30 transition"
          />
        </div>

        {/* Role Tabs */}
        <div className="flex items-center gap-1 rounded-xl bg-gray-100 p-1 border border-line">
          {["ALL", "ADMIN", "VOLUNTEER", "CLIENT"].map((role) => (
            <button
              key={role}
              type="button"
              onClick={() => setRoleFilter(role)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                roleFilter === role
                  ? "bg-white text-ink shadow-sm"
                  : "text-muted hover:text-ink"
              }`}
            >
              {role === "ALL" ? "All Users" : role}
            </button>
          ))}
        </div>
      </div>

      {/* Users List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="flex h-48 items-center justify-center">
            <div className="text-center space-y-2">
              <div className="h-7 w-7 animate-spin rounded-full border-4 border-saffron border-t-transparent mx-auto" />
              <p className="text-xs font-semibold text-muted">Loading user database...</p>
            </div>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-12 text-center text-muted">
            <span className="text-3xl block mb-2">👥</span>
            <p className="text-sm font-bold text-ink">No users match your criteria</p>
            <p className="text-xs text-muted mt-1">Try clearing your search query or role filter.</p>
          </div>
        ) : (
          filteredUsers.map((u) => {
            const roleStyle = ROLE_COLORS[u.role] || ROLE_COLORS.CLIENT;
            const isMe = u.id === me?.id;

            return (
              <div
                key={u.id}
                className={`rounded-2xl border transition-all bg-white p-5 shadow-sm hover:shadow-md ${
                  isMe ? "border-saffron/40 ring-1 ring-saffron/20" : "border-line"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-4">
                  {/* User Profile Info */}
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-saffron/15 text-saffron font-black text-sm border border-saffron/20 shadow-xs">
                      {getInitials(u.name)}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-ink text-base">{u.name}</span>
                        {isMe && (
                          <span className="rounded-full bg-saffron/15 px-2 py-0.5 text-[10px] font-extrabold text-saffron uppercase border border-saffron/30">
                            You
                          </span>
                        )}
                        <span
                          className={`inline-flex items-center gap-1 rounded-md px-2.5 py-0.5 text-[10px] font-bold border ${roleStyle.bg} ${roleStyle.text} ${roleStyle.border}`}
                        >
                          <span>{roleStyle.icon}</span>
                          <span>{u.role}</span>
                        </span>
                      </div>
                      <div className="text-xs text-muted truncate mt-0.5">{u.email}</div>
                    </div>
                  </div>

                  {/* Actions & Role Select */}
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-muted hidden sm:inline">Role:</span>
                      <select
                        value={u.role}
                        onChange={(e) => changeRole(u, e.target.value as Role)}
                        disabled={isMe}
                        className="rounded-xl border border-line bg-gray-50/80 px-3 py-2 text-xs font-bold text-ink focus:bg-white focus:outline-none transition disabled:opacity-50 cursor-pointer"
                      >
                        <option value="ADMIN">👑 Admin</option>
                        <option value="VOLUNTEER">⭐ Volunteer</option>
                        <option value="CLIENT">👤 Client</option>
                      </select>
                    </div>

                    {u.role === "VOLUNTEER" && (
                      <Button
                        variant={expanded === u.id ? "primary" : "ghost"}
                        onClick={() => setExpanded(expanded === u.id ? null : u.id)}
                        className="text-xs shadow-xs"
                      >
                        {expanded === u.id ? "Close Access" : "🔑 Page Access"}
                      </Button>
                    )}
                  </div>
                </div>

                {/* Volunteer Permissions Panel */}
                {expanded === u.id && u.role === "VOLUNTEER" && (
                  <VolunteerPermissions
                    pageKeys={pageKeys.filter((k) => k !== "users")}
                    current={u.permissions.map((p) => p.pageKey)}
                    onSave={(keys) => savePermissions(u, keys)}
                  />
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
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
    <div className="mt-5 border-t border-line pt-4 bg-gray-50/50 p-4 rounded-xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-ink">
            Volunteer Page Access Permissions
          </h4>
          <p className="text-[11px] text-muted">Select which admin dashboard pages this volunteer can access.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <label className="flex items-center gap-3 rounded-xl border border-line bg-white p-3 text-xs font-bold text-ink shadow-xs hover:border-saffron/40 transition cursor-pointer">
          <input
            type="checkbox"
            checked={homeChecked}
            onChange={(e) => setHomeChecked(e.target.checked)}
            className="h-4 w-4 rounded accent-saffron"
          />
          <span>🏠 Home Page Content</span>
        </label>

        {otherKeys.map((key) => {
          const label = PAGE_LABELS[key] ?? key;
          const isChecked = selectedOthers.has(key);
          return (
            <label
              key={key}
              className="flex items-center gap-3 rounded-xl border border-line bg-white p-3 text-xs font-bold text-ink shadow-xs hover:border-saffron/40 transition cursor-pointer"
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
              <span>
                {key === "form-control" && "📝 "}
                {key === "submissions" && "📬 "}
                {label}
              </span>
            </label>
          );
        })}
      </div>

      <div className="flex justify-end pt-2">
        <Button onClick={handleSave} variant="primary" className="text-xs">
          💾 Save Volunteer Access
        </Button>
      </div>
    </div>
  );
}
