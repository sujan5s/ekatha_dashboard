"use client";

import { SWRConfig } from "swr";
import type { Cache } from "swr";
import type { ReactNode } from "react";

const CACHE_STORAGE_KEY = "ekatha_swr_cache";

/**
 * SWR cache backed by localStorage. On load the last-seen data is hydrated into
 * memory so every page paints instantly from cache, then revalidates in the
 * background. The map is flushed back to storage on unload.
 *
 * Only content the dashboard already displays is stored (no tokens/secrets); the
 * cache is cleared on logout in {@link ../lib/auth}.
 */
function localStorageProvider(): Cache {
  const map = new Map<string, unknown>();

  if (typeof window !== "undefined") {
    try {
      const saved = window.localStorage.getItem(CACHE_STORAGE_KEY);
      if (saved) {
        for (const [k, data] of JSON.parse(saved) as [string, unknown][]) {
          // Rehydrate as plain cached data; SWR revalidates it on mount.
          map.set(k, { data });
        }
      }
    } catch {
      // Corrupt/unavailable storage: start empty rather than crash.
    }

    const flush = () => {
      try {
        // Persist only successful payloads — never errors or transient
        // loading/validating flags — so a reload can't resurrect a stale error.
        const entries: [string, unknown][] = [];
        for (const [k, v] of map.entries()) {
          const data = (v as { data?: unknown; error?: unknown })?.data;
          const error = (v as { error?: unknown })?.error;
          if (data !== undefined && error === undefined) entries.push([k, data]);
        }
        window.localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(entries));
      } catch {
        // Quota or privacy mode: skip persistence, in-memory cache still works.
      }
    };
    window.addEventListener("beforeunload", flush);
    // Mobile browsers may never fire beforeunload; persist on tab-hide too.
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") flush();
    });
  }

  return map as unknown as Cache;
}

export function SWRProvider({ children }: { children: ReactNode }) {
  return (
    <SWRConfig
      value={{
        provider: localStorageProvider,
        revalidateOnFocus: true,
        revalidateOnReconnect: true,
        keepPreviousData: true,
        dedupingInterval: 2000,
      }}
    >
      {children}
    </SWRConfig>
  );
}
