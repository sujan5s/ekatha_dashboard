import { generateReactHelpers } from "@uploadthing/react";
import { API_BASE, getToken } from "./api";
import { toWebp } from "./webp";

// Router is loosely typed across the package boundary; endpoint name is "image".
const helpers = generateReactHelpers({ url: `${API_BASE}/api/uploadthing` });

/** Convert to webp then upload to UploadThing via our auth-gated endpoint. */
export async function uploadImage(
  file: File,
  opts: { maxEdge?: number } = {},
): Promise<{ key: string; url: string }> {
  const webp = await toWebp(file, opts.maxEdge ?? 1920);
  const res = await helpers.uploadFiles("image" as never, {
    files: [webp],
    headers: { authorization: `Bearer ${getToken() ?? ""}` },
  });
  const first = res?.[0] as { key: string; ufsUrl?: string; url?: string } | undefined;
  if (!first) throw new Error("Upload failed. Please try again.");
  return { key: first.key, url: first.ufsUrl ?? first.url ?? "" };
}
