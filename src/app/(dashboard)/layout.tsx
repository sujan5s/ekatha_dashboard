"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import Sidebar from "@/components/shell/Sidebar";
import Topbar from "@/components/shell/Topbar";

function FullScreen({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-cream">
      {children}
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading) {
    return (
      <FullScreen>
        <span className="ek-spin h-8 w-8 rounded-full border-3 border-saffron/30 border-t-saffron" />
      </FullScreen>
    );
  }

  if (!user) return null;

  if (user.role === "CLIENT") {
    return (
      <FullScreen>
        <div className="max-w-md rounded-2xl bg-white p-8 text-center shadow-lg">
          <div className="mb-3 text-4xl">🔒</div>
          <h1 className="font-display text-2xl font-semibold text-ink">
            No dashboard access
          </h1>
          <p className="mt-2 text-sm text-muted">
            Your account isn&rsquo;t authorised for the admin dashboard. If you
            believe this is a mistake, contact a Team Ekata administrator.
          </p>
          <a
            href="/login"
            className="mt-5 inline-block text-sm font-semibold text-saffron"
          >
            Back to login
          </a>
        </div>
      </FullScreen>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-cream">
      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-ink/40"
            onClick={() => setMenuOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full">
            <Sidebar onNavigate={() => setMenuOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar onMenu={() => setMenuOpen(true)} />
        <main className="flex-1 overflow-y-auto p-5 sm:p-8">{children}</main>
      </div>
    </div>
  );
}
