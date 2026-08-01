import { supabase } from "@/integrations/supabase/client";

export const VEHICLE_BUCKET = "vehicle-media";

const cache = new Map<string, string>();

/** Creates (and caches) a signed URL for a private vehicle-media object. */
export async function vehicleMediaUrl(path: string | null | undefined): Promise<string | null> {
  if (!path) return null;
  const hit = cache.get(path);
  if (hit) return hit;
  const { data } = await supabase.storage.from(VEHICLE_BUCKET).createSignedUrl(path, 3600);
  if (!data?.signedUrl) return null;
  cache.set(path, data.signedUrl);
  return data.signedUrl;
}

export async function uploadVehicleMedia(userId: string, file: File, prefix = "vehicles"): Promise<string> {
  const ext = file.name.split(".").pop() ?? "bin";
  const path = `${userId}/${prefix}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(VEHICLE_BUCKET).upload(path, file, { upsert: false });
  if (error) throw error;
  return path;
}
