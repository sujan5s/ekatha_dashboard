"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS, SECTION_ORDER } from "@/lib/nav";
import { useAuth } from "@/lib/auth";

export default function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { allowedPages } = useAuth();

  const visible = NAV_ITEMS.filter((i) => allowedPages.includes(i.pageKey));

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col bg-forest-deep text-cream/80">
      <div className="flex items-center gap-2.5 px-6 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-saffron to-gold text-xs font-extrabold text-white">
          TE
        </div>
        <div className="leading-tight">
          <div className="font-display text-lg font-bold text-white">
            Ekatha <span className="text-saffron-light">Admin</span>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-2">
        {SECTION_ORDER.map((section) => {
          const items = visible.filter((i) => i.section === section);
          if (items.length === 0) return null;
          return (
            <div key={section} className="mb-4">
              <div className="px-3 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-cream/35">
                {section}
              </div>
              {items.map((item) => {
                const active =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.pageKey}
                    href={item.href}
                    onClick={onNavigate}
                    className={`mb-0.5 flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                      active
                        ? "bg-saffron text-white shadow-[0_4px_14px_rgba(232,93,4,0.35)]"
                        : "text-cream/70 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <span className="w-4 text-center text-xs opacity-90">
                      {item.icon}
                    </span>
                    {item.label}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      <div className="px-5 py-4 text-[11px] text-cream/30">
        Team Ekata · Content control
      </div>
    </aside>
  );
}
