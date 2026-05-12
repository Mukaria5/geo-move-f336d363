// Static option lists. ALL trucks/bookings come from Supabase, not from here.

export type MachineryType = {
  id: string;
  name: string;
  weight: string;
  icon: string;
};

export const MACHINERY: MachineryType[] = [
  { id: "excavator", name: "Excavator", weight: "20-30T", icon: "🚜" },
  { id: "bulldozer", name: "Bulldozer", weight: "25-40T", icon: "🛠️" },
  { id: "crane", name: "Mobile Crane", weight: "30-60T", icon: "🏗️" },
  { id: "loader", name: "Wheel Loader", weight: "15-25T", icon: "🚧" },
  { id: "backhoe", name: "Backhoe", weight: "5-10T", icon: "⚙️" },
  { id: "roller", name: "Roller", weight: "10-15T", icon: "🛞" },
  { id: "generator", name: "Generator", weight: "5-20T", icon: "⚡" },
  { id: "container", name: "Container", weight: "20-40ft", icon: "📦" },
  { id: "tractor", name: "Tractor", weight: "5-12T", icon: "🚜" },
  { id: "custom", name: "Custom", weight: "Specify", icon: "➕" },
];

export type BookingStage =
  | "requested"
  | "accepted"
  | "en_route"
  | "loading"
  | "in_transit"
  | "delivered"
  | "completed"
  | "cancelled";

export const STAGES: { id: BookingStage; label: string; desc: string }[] = [
  { id: "requested", label: "Request sent", desc: "Searching for nearby low loaders…" },
  { id: "accepted", label: "Driver accepted", desc: "Your operator is preparing the rig." },
  { id: "en_route", label: "Driver en route", desc: "On the way to your pickup location." },
  { id: "loading", label: "Loading machine", desc: "Securing your equipment on the low-bed." },
  { id: "in_transit", label: "In transit", desc: "On the road to your delivery point." },
  { id: "delivered", label: "Delivered", desc: "Equipment offloaded successfully." },
  { id: "completed", label: "Trip completed", desc: "Receipt generated. Thanks for using LoadLink." },
  { id: "cancelled", label: "Cancelled", desc: "This booking was cancelled." },
];

export type Truck = {
  id: string;
  owner_id: string;
  driver_id: string | null;
  truck_model: string;
  plate: string;
  capacity_tons: number;
  base_price: number;
  price_per_km: number;
  is_online: boolean;
  is_available: boolean;
  current_lat: number | null;
  current_lng: number | null;
  verified: boolean;
};

export type Booking = {
  id: string;
  client_id: string;
  truck_id: string | null;
  driver_id: string | null;
  pickup_address: string;
  pickup_lat: number | null;
  pickup_lng: number | null;
  dropoff_address: string;
  dropoff_lat: number | null;
  dropoff_lng: number | null;
  machinery_type: string | null;
  weight_tons: number | null;
  distance_km: number | null;
  estimated_price: number | null;
  final_price: number | null;
  status: BookingStage;
  notes: string | null;
  created_at: string;
};

// haversine in km
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function estimatePrice(truck: Pick<Truck, "base_price" | "price_per_km">, km: number): number {
  return Math.round(truck.base_price + truck.price_per_km * km);
}

export function etaMinutes(km: number, avgKmh = 40): number {
  return Math.max(5, Math.round((km / avgKmh) * 60));
}

// OSM Nominatim search (no API key, free, browser-friendly).
export type GeoResult = { display_name: string; lat: number; lng: number };

export async function geocode(q: string): Promise<GeoResult[]> {
  if (!q.trim()) return [];
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&countrycodes=ke,ug,tz,rw&q=${encodeURIComponent(q)}`;
  try {
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) return [];
    const data: Array<{ display_name: string; lat: string; lon: string }> = await res.json();
    return data.map((d) => ({ display_name: d.display_name, lat: parseFloat(d.lat), lng: parseFloat(d.lon) }));
  } catch {
    return [];
  }
}
