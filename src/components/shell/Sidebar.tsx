"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { preload } from "swr";
import { NAV_ITEMS, SECTION_ORDER, NavItem, PREFETCH_KEY_BY_HREF } from "@/lib/nav";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { allowedPages } = useAuth();

  // Warm the target page's data cache on hover/focus so the click feels instant.
  const prefetch = useCallback((href: string) => {
    const key = PREFETCH_KEY_BY_HREF[href];
    if (key) void preload(key, api);
  }, []);

  const isHomeRoute =
    pathname === "/" ||
    NAV_ITEMS.find((i) => i.pageKey === "overview")?.children?.some(
      (c) => pathname === c.href || pathname.startsWith(c.href)
    );

  const [homeOpen, setHomeOpen] = useState(true);

  useEffect(() => {
    if (isHomeRoute) {
      setHomeOpen(true);
    }
  }, [pathname, isHomeRoute]);

  const visibleItems = NAV_ITEMS.map((item) => {
    if (item.children) {
      const visibleChildren = item.children.filter((child) =>
        allowedPages.includes(child.pageKey)
      );
      const isParentAllowed = allowedPages.includes(item.pageKey);
      if (!isParentAllowed && visibleChildren.length === 0) {
        return null;
      }
      return {
        ...item,
        children: visibleChildren,
      };
    }
    return allowedPages.includes(item.pageKey) ? item : null;
  }).filter((item): item is NavItem => item !== null);

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col bg-forest-deep text-cream/80 select-none">
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
          const items = visibleItems.filter((i) => i.section === section);
          if (items.length === 0) return null;

          return (
            <div key={section} className="mb-4">
              <div className="px-3 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-cream/35">
                {section}
              </div>
              {items.map((item) => {
                const hasChildren = Boolean(item.children && item.children.length > 0);
                const isParentActive = pathname === item.href;
                const isAnyChildActive = item.children?.some(
                  (c) => pathname === c.href || pathname.startsWith(c.href)
                );

                if (hasChildren) {
                  return (
                    <div key={item.pageKey} className="mb-1">
                      <div
                        className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition ${
                          isParentActive
                            ? "bg-saffron text-white shadow-[0_4px_14px_rgba(232,93,4,0.35)]"
                            : isAnyChildActive
                            ? "bg-white/10 text-white"
                            : "text-cream/70 hover:bg-white/5 hover:text-white"
                        }`}
                      >
                        <Link
                          href={item.href}
                          onClick={onNavigate}
                          onMouseEnter={() => prefetch(item.href)}
                          onFocus={() => prefetch(item.href)}
                          className="flex flex-1 items-center gap-3"
                        >
                          <span className="w-4 text-center text-xs opacity-90">
                            {item.icon}
                          </span>
                          <span>{item.label}</span>
                        </Link>
                        <button
                          type="button"
                          onClick={() => setHomeOpen((prev) => !prev)}
                          className="p-1 text-cream/60 hover:text-white transition"
                          aria-label="Toggle dropdown"
                        >
                          <svg
                            className={`h-4 w-4 transition-transform duration-200 ${
                              homeOpen ? "rotate-180" : ""
                            }`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 9l-7 7-7-7"
                            />
                          </svg>
                        </button>
                      </div>

                      {homeOpen && item.children && (
                        <div className="mt-1 ml-3 pl-3 border-l border-white/10 flex flex-col gap-0.5">
                          {item.children.map((child) => {
                            const active =
                              child.href === "/"
                                ? pathname === "/"
                                : pathname === child.href || pathname.startsWith(child.href);
                            return (
                              <Link
                                key={child.pageKey}
                                href={child.href}
                                onClick={onNavigate}
                                onMouseEnter={() => prefetch(child.href)}
                                onFocus={() => prefetch(child.href)}
                                className={`flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition ${
                                  active
                                    ? "bg-saffron/90 text-white font-semibold shadow-sm"
                                    : "text-cream/65 hover:bg-white/5 hover:text-white"
                                }`}
                              >
                                <span className="w-3.5 text-center text-[10px] opacity-80">
                                  {child.icon}
                                </span>
                                <span>{child.label}</span>
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                }

                const active =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.pageKey}
                    href={item.href}
                    onClick={onNavigate}
                    onMouseEnter={() => prefetch(item.href)}
                    onFocus={() => prefetch(item.href)}
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
