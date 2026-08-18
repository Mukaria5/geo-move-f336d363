import { useEffect, useRef } from "react";
import type { Truck } from "@/lib/booking-data";

type LatLng = { lat: number; lng: number };

/** Generic status-aware marker used by the Tracking & Dispatch Center. */
export type MapMarker = {
  id: string;
  lat: number;
  lng: number;
  /** Marker fill colour (status colour from fleet/driver metadata). */
  color: string;
  /** Small glyph rendered inside the marker. */
  glyph?: string;
  tooltip?: string;
  active?: boolean;
  pulse?: boolean;
};

type Props = {
  center?: LatLng;
  zoom?: number;
  trucks?: Truck[];
  pickup?: LatLng | null;
  dropoff?: LatLng | null;
  driverPos?: LatLng | null;
  selectedTruckId?: string | null;
  showRoute?: boolean;
  onMapClick?: (p: LatLng) => void;
  onTruckClick?: (id: string) => void;
  className?: string;
  /** Generic markers (dispatch center). Rendered alongside `trucks`. */
  markers?: MapMarker[];
  onMarkerClick?: (id: string) => void;
  /** Polyline points for a route overlay. */
  routeLine?: LatLng[] | null;
  /** Changing this value refits the map to markers + route. */
  fitKey?: string | number | null;
};

const NAIROBI: LatLng = { lat: -1.2921, lng: 36.8219 };

// Renders a Leaflet/OSM map. Browser-only — guarded for SSR.
export function LeafletMap({
  center = NAIROBI, zoom = 12, trucks = [], pickup, dropoff, driverPos,
  selectedTruckId, showRoute, onMapClick, onTruckClick, className,
  markers, onMarkerClick, routeLine, fitKey,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const layersRef = useRef<{
    trucks: Map<string, any>;
    generic: Map<string, any>;
    pickup?: any; dropoff?: any; driver?: any; route?: any; line?: any;
  }>({
    trucks: new Map(),
    generic: new Map(),
  });
  const LRef = useRef<any>(null);
  const markerClickRef = useRef(onMarkerClick);
  markerClickRef.current = onMarkerClick;


  // Init once
  useEffect(() => {
    if (typeof window === "undefined" || !containerRef.current || mapRef.current) return;
    let cancelled = false;
    (async () => {
      const L = await import("leaflet");
      await import("leaflet/dist/leaflet.css");
      if (cancelled || !containerRef.current) return;
      LRef.current = L;
      const map = L.map(containerRef.current, { zoomControl: false, attributionControl: false }).setView(
        [center.lat, center.lng],
        zoom,
      );
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        subdomains: "abc",
        attribution: "© OpenStreetMap contributors",
      }).addTo(map);
      L.control.zoom({ position: "bottomright" }).addTo(map);
      map.on("click", (e: any) => onMapClick?.({ lat: e.latlng.lat, lng: e.latlng.lng }));
      mapRef.current = map;
    })();
    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update center
  useEffect(() => {
    if (mapRef.current) mapRef.current.setView([center.lat, center.lng], zoom);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center.lat, center.lng]);

  // Trucks
  useEffect(() => {
    const L = LRef.current;
    const map = mapRef.current;
    if (!L || !map) return;
    const seen = new Set<string>();
    trucks.forEach((t) => {
      if (t.current_lat == null || t.current_lng == null) return;
      seen.add(t.id);
      const active = selectedTruckId === t.id;
      const html = `<div style="
        background:${active ? "var(--safety, #facc15)" : "#fff"};
        color:#0a0a0a; width:32px;height:32px;border-radius:10px;
        display:grid;place-items:center;font-size:18px;
        box-shadow:0 0 ${active ? "20px var(--safety-glow, #facc1580)" : "8px rgba(0,0,0,.5)"};
        border:2px solid ${active ? "var(--safety, #facc15)" : "rgba(255,255,255,.4)"};
      ">🚛</div>`;
      const icon = L.divIcon({ html, className: "", iconSize: [32, 32], iconAnchor: [16, 16] });
      let marker = layersRef.current.trucks.get(t.id);
      if (marker) {
        marker.setLatLng([t.current_lat, t.current_lng]);
        marker.setIcon(icon);
      } else {
        marker = L.marker([t.current_lat, t.current_lng], { icon }).addTo(map);
        marker.on("click", () => onTruckClick?.(t.id));
        marker.bindTooltip(`${t.truck_model} · ${t.capacity_tons}T`, { direction: "top", offset: [0, -16] });
        layersRef.current.trucks.set(t.id, marker);
      }
    });
    // remove gone
    layersRef.current.trucks.forEach((m, id) => {
      if (!seen.has(id)) {
        map.removeLayer(m);
        layersRef.current.trucks.delete(id);
      }
    });
  }, [trucks, selectedTruckId, onTruckClick]);

  // Pickup pin
  useEffect(() => {
    const L = LRef.current;
    const map = mapRef.current;
    if (!L || !map) return;
    if (layersRef.current.pickup) {
      map.removeLayer(layersRef.current.pickup);
      layersRef.current.pickup = null;
    }
    if (pickup) {
      const icon = L.divIcon({
        html: `<div style="background:var(--safety,#facc15);width:28px;height:28px;border-radius:50%;border:3px solid #fff;box-shadow:0 0 16px var(--safety-glow,#facc1580)"></div>`,
        className: "", iconSize: [28, 28], iconAnchor: [14, 14],
      });
      layersRef.current.pickup = L.marker([pickup.lat, pickup.lng], { icon }).addTo(map).bindTooltip("Pickup");
    }
  }, [pickup]);

  // Dropoff pin
  useEffect(() => {
    const L = LRef.current;
    const map = mapRef.current;
    if (!L || !map) return;
    if (layersRef.current.dropoff) {
      map.removeLayer(layersRef.current.dropoff);
      layersRef.current.dropoff = null;
    }
    if (dropoff) {
      const icon = L.divIcon({
        html: `<div style="background:#fff;width:24px;height:24px;border-radius:6px;border:3px solid #0a0a0a;box-shadow:0 4px 12px rgba(0,0,0,.5)"></div>`,
        className: "", iconSize: [24, 24], iconAnchor: [12, 12],
      });
      layersRef.current.dropoff = L.marker([dropoff.lat, dropoff.lng], { icon }).addTo(map).bindTooltip("Dropoff");
    }
  }, [dropoff]);

  // Driver
  useEffect(() => {
    const L = LRef.current;
    const map = mapRef.current;
    if (!L || !map) return;
    if (layersRef.current.driver) {
      map.removeLayer(layersRef.current.driver);
      layersRef.current.driver = null;
    }
    if (driverPos) {
      const icon = L.divIcon({
        html: `<div style="background:var(--safety,#facc15);width:36px;height:36px;border-radius:12px;display:grid;place-items:center;font-size:18px;box-shadow:0 0 24px var(--safety-glow,#facc1580);border:2px solid #fff">🚛</div>`,
        className: "", iconSize: [36, 36], iconAnchor: [18, 18],
      });
      layersRef.current.driver = L.marker([driverPos.lat, driverPos.lng], { icon }).addTo(map);
    }
  }, [driverPos]);

  // Route
  useEffect(() => {
    const L = LRef.current;
    const map = mapRef.current;
    if (!L || !map) return;
    if (layersRef.current.route) {
      map.removeLayer(layersRef.current.route);
      layersRef.current.route = null;
    }
    if (showRoute && pickup && dropoff) {
      layersRef.current.route = L.polyline(
        [[pickup.lat, pickup.lng], [dropoff.lat, dropoff.lng]],
        { color: "#facc15", weight: 3, dashArray: "6 8", opacity: 0.9 },
      ).addTo(map);
      map.fitBounds(layersRef.current.route.getBounds(), { padding: [60, 60] });
    }
  }, [showRoute, pickup, dropoff]);

  return <div ref={containerRef} className={className ?? "absolute inset-0"} style={{ background: "#0b1220" }} />;
}
