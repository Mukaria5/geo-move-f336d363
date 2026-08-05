import { supabase } from "@/integrations/supabase/client";

export const CLIENT_BUCKET = "client-media";

const cache = new Map<string, string>();

/** Creates (and caches) a signed URL for a private client-media object. */
export async function clientMediaUrl(path: string | null | undefined): Promise<string | null> {
  if (!path) return null;
  const hit = cache.get(path);
  if (hit) return hit;
  const { data } = await supabase.storage.from(CLIENT_BUCKET).createSignedUrl(path, 3600);
  if (!data?.signedUrl) return null;
  cache.set(path, data.signedUrl);
  return data.signedUrl;
}

export async function uploadClientMedia(userId: string, file: File, prefix = "docs"): Promise<string> {
  const ext = file.name.split(".").pop() ?? "bin";
  const path = `${userId}/${prefix}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(CLIENT_BUCKET).upload(path, file, { upsert: false });
  if (error) throw error;
  return path;
}

export async function openClientMedia(path: string): Promise<void> {
  const url = await clientMediaUrl(path);
  if (url) window.open(url, "_blank");
}

export async function downloadClientMedia(path: string, filename: string): Promise<void> {
  const { data } = await supabase.storage.from(CLIENT_BUCKET).download(path);
  if (!data) return;
  const url = URL.createObjectURL(data);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
