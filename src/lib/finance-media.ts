import { supabase } from "@/integrations/supabase/client";

export const FINANCE_BUCKET = "finance-media";

const cache = new Map<string, string>();

/** Creates (and caches) a signed URL for a private finance-media object. */
export async function financeMediaUrl(path: string | null | undefined): Promise<string | null> {
  if (!path) return null;
  const hit = cache.get(path);
  if (hit) return hit;
  const { data } = await supabase.storage.from(FINANCE_BUCKET).createSignedUrl(path, 3600);
  if (!data?.signedUrl) return null;
  cache.set(path, data.signedUrl);
  return data.signedUrl;
}

export async function uploadFinanceMedia(userId: string, file: File, prefix = "docs"): Promise<string> {
  const ext = file.name.split(".").pop() ?? "bin";
  const path = `${userId}/${prefix}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(FINANCE_BUCKET).upload(path, file, { upsert: false });
  if (error) throw error;
  return path;
}

export async function openFinanceMedia(path: string): Promise<void> {
  const url = await financeMediaUrl(path);
  if (url) window.open(url, "_blank");
}

export async function downloadFinanceMedia(path: string, filename: string): Promise<void> {
  const { data } = await supabase.storage.from(FINANCE_BUCKET).download(path);
  if (!data) return;
  const url = URL.createObjectURL(data);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
