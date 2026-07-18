"use client";

import { useRef, useState } from "react";
import { uploadImage } from "@/lib/upload";
import { useToast } from "./Toast";

/**
 * Shows the current image and lets the user replace it. Converts to webp and
 * uploads on select, then reports the new { url, key } upward.
 */
export default function ImageUpload({
  url,
  onChange,
  maxEdge = 1920,
  aspect = "aspect-video",
}: {
  url: string;
  onChange: (v: { url: string; key: string }) => void;
  maxEdge?: number;
  aspect?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      const result = await uploadImage(file, { maxEdge });
      onChange(result);
      toast.success("Image uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-4">
      <div
        className={`${aspect} w-32 shrink-0 overflow-hidden rounded-xl border border-line bg-surface`}
      >
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-muted">
            No image
          </div>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-xl border border-line bg-white px-3.5 py-2 text-sm font-semibold text-ink transition hover:bg-surface disabled:opacity-60"
        >
          {busy ? (
            <span className="ek-spin h-4 w-4 rounded-full border-2 border-saffron/40 border-t-saffron" />
          ) : null}
          {url ? "Replace image" : "Upload image"}
        </button>
        <span className="text-xs text-muted">Converted to WebP automatically.</span>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </div>
  );
}
