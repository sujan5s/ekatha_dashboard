"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { setToken } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function AuthCallbackPage() {
  const router = useRouter();
  const { refresh } = useAuth();

  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, "");
    const params = new URLSearchParams(hash);
    const token = params.get("token");

    if (token) {
      setToken(token);
      void refresh().then(() => router.replace("/"));
    } else {
      router.replace("/login?error=oauth");
    }
  }, [refresh, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-cream">
      <span className="ek-spin h-8 w-8 rounded-full border-3 border-saffron/30 border-t-saffron" />
    </div>
  );
}
