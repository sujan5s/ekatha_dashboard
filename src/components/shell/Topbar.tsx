"use client";

import { useAuth } from "@/lib/auth";

const CLIENT_SITE = "http://localhost:3000";

export default function Topbar({ onMenu }: { onMenu?: () => void }) {
  const { user, logout } = useAuth();

  return (
    <header className="flex h-16 items-center justify-between border-b border-line bg-white/80 px-5 backdrop-blur">
      <button
        onClick={onMenu}
        className="rounded-lg p-2 text-ink hover:bg-surface lg:hidden"
        aria-label="Menu"
      >
        ☰
      </button>

      <div className="hidden text-sm text-muted lg:block">
        Manage the Team Ekata homepage content
      </div>

      <div className="flex items-center gap-4">
        <a
          href={CLIENT_SITE}
          target="_blank"
          rel="noreferrer"
          className="hidden text-sm font-semibold text-forest-mid hover:text-forest sm:inline"
        >
          View live site ↗
        </a>
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-forest text-xs font-bold text-white">
            {user?.name?.charAt(0).toUpperCase() ?? "?"}
          </div>
          <div className="hidden leading-tight sm:block">
            <div className="text-sm font-semibold text-ink">{user?.name}</div>
            <div className="text-[11px] font-medium uppercase tracking-wide text-saffron">
              {user?.role}
            </div>
          </div>
        </div>
        <button
          onClick={logout}
          className="rounded-lg border border-line px-3 py-1.5 text-sm font-semibold text-ink transition hover:bg-surface"
        >
          Log out
        </button>
      </div>
    </header>
  );
}
