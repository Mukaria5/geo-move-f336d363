import { useEffect, useRef, useState } from "react";
import { DRIVER_STATUS_META, initials, type DriverRow } from "@/lib/driver-data-model";
import { driverMediaUrl } from "@/lib/driver-media";

type LatLng = { lat: number; lng: number };
const NAIROBI: LatLng = { lat: -1.2921, lng: 36.8219 };

/** Live OSM map with photo markers for drivers, colour-ringed by availability status. */
export function DriverLiveMap({
  drivers, selectedId, onSelect, className,
}: {
  drivers: DriverRow[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const LRef = useRef<any>(null);
  const markers = useRef<Map<string, any>>(new Map());
  const [photos, setPhotos] = useState<Record<string, string>>({});

  useEffect(() => {
    let alive = true;
    (async () => {
      const entries = await Promise.all(
        drivers.filter((d) => d.photo_url).map(async (d) => [d.id, await driverMediaUrl(d.photo_url)] as const),
      );
      if (!alive) return;
      const next: Record<string, string> = {};
      for (const [id, url] of entries) if (url) next[id] = url;
      setPhotos(next);
    })();
    return () => { alive = false; };
  }, [drivers]);

  useEffect(() => {
    if (typeof window === "undefined" || !containerRef.current || mapRef.current) return;
    let cancelled = false;
    (async () => {
      const L = await import("leaflet");
      await import("leaflet/dist/leaflet.css");
      if (cancelled || !containerRef.current) return;
      LRef.current = L;
      const map = L.map(containerRef.current, { zoomControl: false, attributionControl: false })
        .setView([NAIROBI.lat, NAIROBI.lng], 11);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19, subdomains: "abc", attribution: "© OpenStreetMap contributors",
      }).addTo(map);
      L.control.zoom({ position: "bottomright" }).addTo(map);
      mapRef.current = map;
    })();
    return () => {
      cancelled = true;
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
      markers.current.clear();
    };
  }, []);

  useEffect(() => {
    const L = LRef.current;
    const map = mapRef.current;
    if (!L || !map) return;
    const seen = new Set<string>();

    drivers.forEach((d) => {
      if (d.current_lat == null || d.current_lng == null) return;
      seen.add(d.id);
      const colour = DRIVER_STATUS_META[d.status].marker;
      const active = selectedId === d.id;
      const inner = photos[d.id]
        ? `<img src="${photos[d.id]}" style="width:100%;height:100%;object-fit:cover" alt="" />`
        : `<span style="font:600 13px/1 system-ui;color:${colour}">${initials(d.full_name)}</span>`;
      const html = `<div style="
        width:${active ? 46 : 38}px;height:${active ? 46 : 38}px;border-radius:50%;
        border:3px solid ${colour};background:#fff;overflow:hidden;
        display:grid;place-items:center;
        box-shadow:0 4px 14px rgba(0,0,0,.25)${active ? `,0 0 0 6px ${colour}33` : ""};
      ">${inner}</div>`;
      const size = active ? 46 : 38;
      const icon = L.divIcon({ html, className: "", iconSize: [size, size], iconAnchor: [size / 2, size / 2] });

      let m = markers.current.get(d.id);
      if (m) {
        m.setLatLng([d.current_lat, d.current_lng]);
        m.setIcon(icon);
      } else {
        m = L.marker([d.current_lat, d.current_lng], { icon }).addTo(map);
        m.on("click", () => onSelect?.(d.id));
        markers.current.set(d.id, m);
      }
      m.bindTooltip(`${d.full_name} · ${DRIVER_STATUS_META[d.status].label}`, { direction: "top", offset: [0, -22] });
    });

    markers.current.forEach((m, id) => {
      if (!seen.has(id)) { map.removeLayer(m); markers.current.delete(id); }
    });
  }, [drivers, selectedId, photos, onSelect]);

  return <div ref={containerRef} className={className ?? "absolute inset-0"} style={{ background: "#eef2f5" }} />;
}
