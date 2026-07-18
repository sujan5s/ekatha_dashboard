"use client";

import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "forest" | "ghost" | "danger" | "subtle";

const styles: Record<Variant, string> = {
  primary:
    "bg-saffron text-white hover:bg-saffron-dark shadow-[0_4px_16px_rgba(232,93,4,0.25)]",
  forest: "bg-forest text-white hover:bg-forest-mid",
  ghost: "bg-transparent text-ink border border-line hover:bg-surface",
  danger: "bg-danger text-white hover:brightness-110",
  subtle: "bg-surface text-ink hover:bg-line",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
}

export default function Button({
  variant = "primary",
  loading = false,
  disabled,
  className = "",
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${styles[variant]} ${className}`}
    >
      {loading && (
        <span className="ek-spin h-4 w-4 rounded-full border-2 border-white/40 border-t-white" />
      )}
      {children}
    </button>
  );
}
