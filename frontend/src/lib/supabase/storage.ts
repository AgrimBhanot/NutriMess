import type { SupabaseClient } from "@supabase/supabase-js";

export const BUCKETS = {
  menuImages: "menu-images",
  complaints: "complaints",
  plateImages: "plate-images",
  chatImages: "chat-images",
} as const;

export const MAX_IMAGE_MB = 5;

function extensionFor(file: File): string {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName && fromName.length <= 5) return fromName;
  return file.type.split("/")[1] ?? "jpg";
}

const RETRY_DELAYS_MS = [600, 1800];

function isRetryable(error: unknown): boolean {
  // Gateway/server errors (e.g. Supabase's intermittent 520) and network
  // failures are worth retrying; 4xx (RLS, size, mime type) are not.
  const status =
    error && typeof error === "object" && "status" in error
      ? Number(error.status)
      : NaN;
  return Number.isNaN(status) || status >= 500;
}

/**
 * Upload an image under `{folder}/{random}.{ext}`. The first folder segment
 * is what the storage RLS policies check (bhawan id or user id).
 * Retries transient failures. Returns the object path within the bucket.
 */
export async function uploadImage(
  supabase: SupabaseClient,
  bucket: (typeof BUCKETS)[keyof typeof BUCKETS],
  folder: string,
  file: File
): Promise<string> {
  const path = `${folder}/${crypto.randomUUID()}.${extensionFor(file)}`;

  for (let attempt = 0; ; attempt++) {
    const { error } = await supabase.storage.from(bucket).upload(path, file, {
      contentType: file.type,
      upsert: false, // upsert would need UPDATE policies the buckets don't grant
    });
    if (!error) return path;
    // A retried request whose earlier attempt actually landed
    if (attempt > 0 && "statusCode" in error && error.statusCode === "409") {
      return path;
    }
    if (attempt >= RETRY_DELAYS_MS.length || !isRetryable(error)) throw error;
    await new Promise((r) => setTimeout(r, RETRY_DELAYS_MS[attempt]));
  }
}

export function publicImageUrl(
  supabase: SupabaseClient,
  bucket: typeof BUCKETS.menuImages,
  path: string
): string {
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

/** Signed URLs for private buckets; missing/forbidden paths are skipped. */
export async function signedImageUrls(
  supabase: SupabaseClient,
  bucket:
    | typeof BUCKETS.complaints
    | typeof BUCKETS.plateImages
    | typeof BUCKETS.chatImages,
  paths: string[],
  expiresIn = 60 * 60
): Promise<Record<string, string>> {
  if (paths.length === 0) return {};
  const { data } = await supabase.storage
    .from(bucket)
    .createSignedUrls(paths, expiresIn);
  const urls: Record<string, string> = {};
  for (const item of data ?? []) {
    if (item.path && item.signedUrl) urls[item.path] = item.signedUrl;
  }
  return urls;
}
