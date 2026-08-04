import { supabase } from "@/integrations/supabase/client";

export const DRIVER_BUCKET = "driver-media";

const cache = new Map<string, string>();

/** Creates (and caches) a signed URL for a private driver-media object. */
export async function driverMediaUrl(path: string | null | undefined): Promise<string | null> {
  if (!path) return null;
  const hit = cache.get(path);
  if (hit) return hit;
  const { data } = await supabase.storage.from(DRIVER_BUCKET).createSignedUrl(path, 3600);
  if (!data?.signedUrl) return null;
  cache.set(path, data.signedUrl);
  return data.signedUrl;
}

export async function uploadDriverMedia(userId: string, file: File, prefix = "docs"): Promise<string> {
  const ext = file.name.split(".").pop() ?? "bin";
  const path = `${userId}/${prefix}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(DRIVER_BUCKET).upload(path, file, { upsert: false });
  if (error) throw error;
  return path;
}

export async function openDriverMedia(path: string): Promise<void> {
  const url = await driverMediaUrl(path);
  if (url) window.open(url, "_blank");
}
