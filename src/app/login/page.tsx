"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { api, API_BASE, ApiError, setToken } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/components/ui/Toast";
import Button from "@/components/ui/Button";
import { Field, TextInput } from "@/components/ui/Field";
import type { DashUser } from "@/lib/types";

type Mode = "login" | "signup" | "otp";

export default function LoginPage() {
  const router = useRouter();
  const { refresh } = useAuth();
  const toast = useToast();

  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);

  async function finishWithToken(token: string) {
    setToken(token);
    await refresh();
    router.replace("/");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        await api("/api/auth/signup", {
          method: "POST",
          body: { name, email, password },
        });
        toast.success("Check your email for a 6-digit code.");
        setMode("otp");
      } else if (mode === "login") {
        const res = await api<{ token?: string; needsVerification?: boolean }>(
          "/api/auth/login",
          { method: "POST", body: { email, password } },
        );
        if (res.token) {
          await finishWithToken(res.token);
        } else {
          toast.info("Please verify your email — we sent a new code.");
          setMode("otp");
        }
      } else {
        const res = await api<{ token: string; user: DashUser }>(
          "/api/auth/verify-otp",
          { method: "POST", body: { email, otp } },
        );
        await finishWithToken(res.token);
      }
    } catch (err) {
      // A 403 on login means the email isn't verified yet → go to OTP step.
      if (err instanceof ApiError && err.status === 403 && mode === "login") {
        toast.info("Please verify your email — we sent a new code.");
        setMode("otp");
      } else {
        toast.error(err instanceof Error ? err.message : "Something went wrong");
      }
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    try {
      await api("/api/auth/resend-otp", { method: "POST", body: { email } });
      toast.success("A new code is on its way.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not resend");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-forest-deep p-4">
      <div className="ek-pop w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
        <div className="mb-6 flex items-center gap-2.5">
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-line bg-cream/40 shadow-sm">
            <Image
              src="/logo.webp"
              alt="Ekatha Logo"
              width={40}
              height={40}
              className="h-full w-full object-cover"
              priority
            />
          </div>
          <div className="font-display text-2xl font-bold text-ink">
            Ekatha <span className="text-saffron">Admin</span>
          </div>
        </div>

        <h1 className="font-display text-xl font-semibold text-ink">
          {mode === "signup"
            ? "Create your account"
            : mode === "otp"
              ? "Verify your email"
              : "Welcome back"}
        </h1>
        <p className="mt-1 mb-6 text-sm text-muted">
          {mode === "otp"
            ? `Enter the 6-digit code sent to ${email}.`
            : "Staff sign-in for Team Ekata content."}
        </p>

        <form onSubmit={submit} className="flex flex-col gap-4">
          {mode === "signup" && (
            <Field label="Full name">
              <TextInput
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Your name"
              />
            </Field>
          )}

          {mode !== "otp" && (
            <>
              <Field label="Email">
                <TextInput
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@email.com"
                />
              </Field>
              <Field label="Password">
                <TextInput
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  placeholder="At least 8 characters"
                />
              </Field>
            </>
          )}

          {mode === "otp" && (
            <Field label="Verification code">
              <TextInput
                inputMode="numeric"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                required
                placeholder="000000"
                className="text-center text-lg tracking-[0.4em]"
              />
            </Field>
          )}

          <Button type="submit" loading={busy} className="mt-1 w-full">
            {mode === "signup"
              ? "Sign up"
              : mode === "otp"
                ? "Verify & continue"
                : "Log in"}
          </Button>
        </form>

        {mode === "otp" ? (
          <button
            onClick={resend}
            className="mt-4 w-full text-center text-sm font-semibold text-saffron"
          >
            Resend code
          </button>
        ) : (
          <>
            <div className="my-5 flex items-center gap-3 text-xs text-muted">
              <span className="h-px flex-1 bg-line" /> or{" "}
              <span className="h-px flex-1 bg-line" />
            </div>
            <a
              href={`${API_BASE}/api/auth/google`}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-surface"
            >
              Continue with Google
            </a>
            <p className="mt-5 text-center text-sm text-muted">
              {mode === "login" ? "New here?" : "Already have an account?"}{" "}
              <button
                onClick={() => setMode(mode === "login" ? "signup" : "login")}
                className="font-semibold text-saffron"
              >
                {mode === "login" ? "Create an account" : "Log in"}
              </button>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
