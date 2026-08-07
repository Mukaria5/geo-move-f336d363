import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft, Loader2, MapPin, Package, Truck as TruckIcon, User as UserIcon,
  Phone, Mail, FileText, Upload, XCircle, Copy, Archive, Cloud, Fuel, Navigation, Receipt,
  Camera, Check,
} from "lucide-react";
import { toast } from "sonner";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { LeafletMap } from "@/components/LeafletMap";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import {
  ORDER_STATUS_META, ORDER_TIMELINE, type OrderRow, type OrderStatus, ksh, computeTotal,
} from "@/lib/orders-data";

export const Route = createFileRoute("/_protected/dashboard/orders/$orderId")({
  component: OrderDetails,
});

type EventRow = { id: string; order_id: string; actor_id: string | null; status: OrderStatus; note: string | null; created_at: string };
type DocRow = { id: string; order_id: string; kind: string; file_path: string; label: string | null; created_at: string; uploaded_by: string | null };

function OrderDetails() {
  const { orderId } = Route.useParams();
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const [order, setOrder] = useState<OrderRow | null>(null);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [truck, setTruck] = useState<any>(null);
  const [driverName, setDriverName] = useState<string | null>(null);
  const [driverRowId, setDriverRowId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data: o } = await supabase.from("orders").select("*").eq("id", orderId).maybeSingle();
    setOrder((o as OrderRow) ?? null);
    if (o) {
      const [{ data: ev }, { data: dc }] = await Promise.all([
        supabase.from("order_events").select("*").eq("order_id", orderId).order("created_at", { ascending: true }),
        supabase.from("order_documents").select("*").eq("order_id", orderId).order("created_at", { ascending: false }),
      ]);
      setEvents((ev as EventRow[]) ?? []);
      setDocs((dc as DocRow[]) ?? []);
      if (o.truck_id) {
        const { data: t } = await supabase.from("trucks").select("*").eq("id", o.truck_id).maybeSingle();
        setTruck(t);
      } else setTruck(null);
      if (o.driver_id) {
        const [{ data: p }, { data: dr }] = await Promise.all([
          supabase.from("profiles").select("full_name").eq("id", o.driver_id).maybeSingle(),
          supabase.from("drivers").select("id").eq("user_id", o.driver_id).maybeSingle(),
        ]);
        setDriverName(p?.full_name ?? null);
        setDriverRowId((dr as any)?.id ?? null);
      }
    }

    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel(`order-${orderId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `id=eq.${orderId}` }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "order_events", filter: `order_id=eq.${orderId}` }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "order_documents", filter: `order_id=eq.${orderId}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  const canManage = role === "admin" || role === "fleet" || role === "dispatcher" || order?.created_by === user?.id;
  const canDriverUpdate = role === "driver" && order?.driver_id === user?.id;
  const canUpdateStatus = canManage || canDriverUpdate;

  const total = useMemo(() => order ? computeTotal(order) : 0, [order]);

  async function setStatus(next: OrderStatus) {
    if (!order) return;
    const { error } = await supabase.from("orders").update({ status: next }).eq("id", order.id);
    if (error) toast.error(error.message);
    else toast.success(`Status → ${ORDER_STATUS_META[next].label}`);
  }

  async function cancelOrder() {
    if (!order) return;
    if (!confirm("Cancel this order?")) return;
    await setStatus("cancelled");
  }

  async function archiveOrder() {
    if (!order) return;
    const { error } = await supabase.from("orders").update({ archived: true }).eq("id", order.id);
    if (error) toast.error(error.message);
    else { toast.success("Archived"); navigate({ to: "/dashboard/orders" }); }
  }

  async function duplicate() {
    if (!order || !user) return;
    const { id, order_number, created_at, updated_at, status, archived, final_total, ...copy } = order as any;
    const { data, error } = await supabase.from("orders").insert({ ...copy, created_by: user.id, status: "pending" }).select("id").single();
    if (error) toast.error(error.message);
    else { toast.success("Duplicated"); navigate({ to: "/dashboard/orders/$orderId", params: { orderId: data.id } }); }
  }

  async function uploadDoc(files: FileList | null, kind: string) {
    if (!files || files.length === 0 || !user || !order) return;
    const f = files[0];
    const path = `${order.id}/${Date.now()}_${f.name}`;
    const { error: upErr } = await supabase.storage.from("trip-photos").upload(path, f);
    if (upErr) { toast.error(upErr.message); return; }
    const { error } = await supabase.from("order_documents").insert({
      order_id: order.id, uploaded_by: user.id, kind, file_path: path, label: f.name,
    });
    if (error) toast.error(error.message);
    else toast.success("Document uploaded");
  }

  if (loading) {
    return (
      <DashboardShell title="Order" role="Orders">
        <div className="py-20 grid place-items-center"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
      </DashboardShell>
    );
  }
  if (!order) {
    return (
      <DashboardShell title="Order" role="Orders">
        <div className="glass rounded-2xl p-10 text-center">
          <div className="text-sm text-muted-foreground">Order not found or you don't have access.</div>
          <Link to="/dashboard/orders" className="mt-3 inline-flex text-sm text-primary">Back to orders</Link>
        </div>
      </DashboardShell>
    );
  }

  const currIdx = ORDER_TIMELINE.indexOf(order.status);
  const meta = ORDER_STATUS_META[order.status];

  return (
    <DashboardShell title={order.order_number} role="Order Details">
      <div className="flex items-center gap-2 mb-3">
        <Link to="/dashboard/orders" className="tap h-9 w-9 grid place-items-center rounded-xl border border-border bg-white/60">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          <div className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground">{order.order_number}</div>
          <div className="text-sm font-semibold">{order.client_name}</div>
        </div>
        <span className={`inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider px-2 py-1 rounded-full ${meta.color}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
          {meta.label}
        </span>
      </div>

      {/* Live map */}
      <div className="relative h-56 rounded-2xl overflow-hidden border border-border mb-3">
        <LeafletMap
          center={
            order.pickup_lat && order.pickup_lng
              ? { lat: order.pickup_lat, lng: order.pickup_lng }
              : undefined
          }
          zoom={12}
          pickup={order.pickup_lat && order.pickup_lng ? { lat: order.pickup_lat, lng: order.pickup_lng } : null}
          dropoff={order.dropoff_lat && order.dropoff_lng ? { lat: order.dropoff_lat, lng: order.dropoff_lng } : null}
          showRoute={!!(order.pickup_lat && order.dropoff_lat)}
          driverPos={
            truck?.current_lat && truck?.current_lng ? { lat: truck.current_lat, lng: truck.current_lng } : null
          }
        />
      </div>

      {/* Timeline */}
      <div className="glass rounded-2xl p-4 mb-3">
        <div className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground mb-3">Timeline</div>
        <ol className="space-y-2">
          {ORDER_TIMELINE.map((st, i) => {
            const done = i <= currIdx && order.status !== "cancelled";
            const active = i === currIdx;
            const stMeta = ORDER_STATUS_META[st];
            const evt = events.find((e) => e.status === st);
            return (
              <li key={st} className="flex items-start gap-3">
                <div className={`h-6 w-6 rounded-full grid place-items-center shrink-0 ${
                  done ? "bg-emerald-500 text-white" : active ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                }`}>
                  {done ? <Check className="h-3 w-3" /> : <span className="text-[10px] font-mono">{i + 1}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm ${active ? "font-semibold" : done ? "" : "text-muted-foreground"}`}>{stMeta.label}</div>
                  {evt && (
                    <div className="text-[10px] font-mono text-muted-foreground">
                      {new Date(evt.created_at).toLocaleString()}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
        {order.status === "cancelled" && (
          <div className="mt-3 text-xs status-urgent px-3 py-2 rounded-lg inline-flex items-center gap-1">
            <XCircle className="h-3 w-3" /> Order cancelled
          </div>
        )}
      </div>

      {/* Status update */}
      {canUpdateStatus && order.status !== "completed" && order.status !== "cancelled" && (
        <div className="glass rounded-2xl p-4 mb-3">
          <div className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground mb-2">Update status</div>
          <div className="flex flex-wrap gap-1.5">
            {ORDER_TIMELINE.slice(currIdx + 1).slice(0, 4).map((st) => (
              <button
                key={st}
                onClick={() => setStatus(st)}
                className="tap text-xs px-3 h-8 rounded-full bg-primary text-primary-foreground font-semibold"
              >
                → {ORDER_STATUS_META[st].label}
              </button>
            ))}
            {(["delayed"] as OrderStatus[]).map((st) => (
              <button
                key={st}
                onClick={() => setStatus(st)}
                className="tap text-xs px-3 h-8 rounded-full bg-orange-100 text-orange-800 font-semibold"
              >
                Mark delayed
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {/* Pickup / Delivery */}
        <div className="glass rounded-2xl p-4">
          <div className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1">
            <MapPin className="h-3 w-3" /> Pickup
          </div>
          <div className="text-sm font-semibold">{order.pickup_address}</div>
          {order.pickup_contact_name && <div className="text-xs mt-1">{order.pickup_contact_name}</div>}
          {order.pickup_contact_phone && (
            <a href={`tel:${order.pickup_contact_phone}`} className="text-xs text-primary inline-flex items-center gap-1 mt-0.5">
              <Phone className="h-3 w-3" /> {order.pickup_contact_phone}
            </a>
          )}
          {order.pickup_at && <div className="text-[11px] text-muted-foreground font-mono mt-1">{new Date(order.pickup_at).toLocaleString()}</div>}
          {order.pickup_notes && <div className="text-xs text-muted-foreground mt-1">{order.pickup_notes}</div>}
        </div>
        <div className="glass rounded-2xl p-4">
          <div className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1">
            <Navigation className="h-3 w-3" /> Delivery
          </div>
          <div className="text-sm font-semibold">{order.dropoff_address}</div>
          {order.dropoff_contact_name && <div className="text-xs mt-1">{order.dropoff_contact_name}</div>}
          {order.dropoff_contact_phone && (
            <a href={`tel:${order.dropoff_contact_phone}`} className="text-xs text-primary inline-flex items-center gap-1 mt-0.5">
              <Phone className="h-3 w-3" /> {order.dropoff_contact_phone}
            </a>
          )}
          {order.dropoff_at && <div className="text-[11px] text-muted-foreground font-mono mt-1">{new Date(order.dropoff_at).toLocaleString()}</div>}
          {order.dropoff_notes && <div className="text-xs text-muted-foreground mt-1">{order.dropoff_notes}</div>}
        </div>
      </div>

      {/* Cargo & assignment */}
      <div className="grid gap-3 sm:grid-cols-2 mt-3">
        <div className="glass rounded-2xl p-4">
          <div className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1">
            <Package className="h-3 w-3" /> Cargo
          </div>
          <div className="text-sm font-semibold">{order.cargo_name || "—"}</div>
          <div className="text-xs text-muted-foreground mt-1">
            {order.cargo_category} · {order.cargo_weight_tons ?? "—"} T · Qty {order.cargo_quantity ?? 1}
          </div>
          {order.cargo_dimensions && <div className="text-[11px] text-muted-foreground font-mono mt-0.5">{order.cargo_dimensions}</div>}
          {order.special_instructions && <div className="text-xs mt-2 rounded-lg bg-secondary/60 p-2">{order.special_instructions}</div>}
        </div>
        <div className="glass rounded-2xl p-4">
          <div className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1">
            <TruckIcon className="h-3 w-3" /> Assignment
          </div>
          <div className="text-sm flex items-center gap-1">
            <span className="text-muted-foreground">Vehicle: </span>
            {truck ? (
              <Link
                to="/dashboard/fleet/vehicles/$vehicleId"
                params={{ vehicleId: truck.id }}
                className="font-semibold text-primary press inline-flex items-center gap-0.5"
              >
                {truck.truck_model} · {truck.plate} <ChevronRight className="h-3 w-3" />
              </Link>
            ) : (
              <span className="font-semibold">Unassigned</span>
            )}
          </div>
          <div className="text-sm mt-1 flex items-center gap-1">
            <span className="text-muted-foreground">Driver: </span>
            {driverRowId ? (
              <Link
                to="/dashboard/fleet/drivers/$driverId"
                params={{ driverId: driverRowId }}
                className="font-semibold text-primary press inline-flex items-center gap-0.5"
              >
                {driverName ?? "Assigned"} <ChevronRight className="h-3 w-3" />
              </Link>
            ) : (
              <span className="font-semibold">{driverName ?? (order.driver_id ? "Assigned" : "Unassigned")}</span>
            )}
          </div>
          <div className="text-sm mt-1 flex items-center gap-1">
            <span className="text-muted-foreground">Client: </span>
            {order.client_id ? (
              <Link
                to="/dashboard/fleet/clients/$clientId"
                params={{ clientId: order.client_id }}
                className="font-semibold text-primary press inline-flex items-center gap-0.5"
              >
                {order.client_name} <ChevronRight className="h-3 w-3" />
              </Link>
            ) : (
              <span className="font-semibold">{order.client_name || "—"}</span>
            )}
          </div>
          <div className="text-[11px] text-muted-foreground font-mono mt-2">
            Distance {order.distance_km ? `${Number(order.distance_km).toFixed(1)} km` : "—"} · ETA {order.eta_minutes ?? "—"} min
          </div>
          {canManage && (
            <Link
              to="/dashboard/fleet/invoices/new"
              search={{ order: order.id }}
              className="mt-3 h-10 w-full rounded-2xl bg-primary text-primary-foreground text-xs font-semibold inline-flex items-center justify-center gap-1.5 press"
            >
              <ReceiptIcon className="h-3.5 w-3.5" /> Create invoice for this order
            </Link>
          )}
        </div>

      </div>

      {/* Cost breakdown (managers only) */}
      {canManage && (
        <div className="glass rounded-2xl p-4 mt-3">
          <div className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground mb-2">Cost breakdown</div>
          <div className="text-sm space-y-1">
            <Row k="Distance charge" v={ksh(Number(order.distance_km ?? 0) * Number(order.price_per_km ?? 0))} />
            <Row k="Base" v={ksh(order.base_charge)} />
            <Row k="Fuel surcharge" v={ksh(order.fuel_surcharge)} />
            <Row k="Tolls" v={ksh(order.toll_charges)} />
            <Row k="Loading" v={ksh(order.loading_fee)} />
            <Row k="Offloading" v={ksh(order.offloading_fee)} />
            <Row k="Extra" v={ksh(order.extra_charges)} />
            <div className="h-px bg-border my-1" />
            <Row k="Grand total" v={ksh(order.final_total ?? total)} bold />
          </div>
        </div>
      )}

      {/* Client info */}
      <div className="glass rounded-2xl p-4 mt-3">
        <div className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1">
          <UserIcon className="h-3 w-3" /> Client
        </div>
        <div className="text-sm font-semibold">{order.client_name}</div>
        <div className="flex flex-col gap-0.5 mt-1 text-xs">
          {order.client_phone && (
            <a href={`tel:${order.client_phone}`} className="text-primary inline-flex items-center gap-1">
              <Phone className="h-3 w-3" /> {order.client_phone}
            </a>
          )}
          {order.client_email && (
            <a href={`mailto:${order.client_email}`} className="text-primary inline-flex items-center gap-1">
              <Mail className="h-3 w-3" /> {order.client_email}
            </a>
          )}
        </div>
      </div>

      {/* Documents */}
      <div className="glass rounded-2xl p-4 mt-3">
        <div className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1">
          <FileText className="h-3 w-3" /> Documents ({docs.length})
        </div>
        {docs.length === 0 && (
          <div className="text-xs text-muted-foreground mb-2">No documents uploaded yet.</div>
        )}
        <ul className="space-y-1 mb-2">
          {docs.map((d) => (
            <li key={d.id} className="text-xs flex items-center justify-between rounded-lg bg-white/60 border border-border px-2 py-1.5">
              <span className="truncate">{d.label || d.file_path.split("/").pop()}</span>
              <span className="font-mono text-[10px] text-muted-foreground">{d.kind}</span>
            </li>
          ))}
        </ul>
        {(canManage || canDriverUpdate) && (
          <div className="flex flex-wrap gap-2">
            {[
              { kind: "photo", label: "Photo", icon: Camera },
              { kind: "delivery_note", label: "Delivery Note", icon: FileText },
              { kind: "invoice", label: "Invoice", icon: Receipt },
              { kind: "permit", label: "Permit", icon: FileText },
              { kind: "epod", label: "ePOD", icon: Check },
            ].map((k) => (
              <label key={k.kind} className="tap inline-flex items-center gap-1 text-xs px-3 h-8 rounded-full border border-border bg-white/60 cursor-pointer">
                <Upload className="h-3 w-3" /> {k.label}
                <input type="file" className="hidden" onChange={(e) => uploadDoc(e.target.files, k.kind)} />
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Integration placeholders */}
      <div className="rounded-2xl border border-dashed border-border p-3 mt-3 text-xs text-muted-foreground grid grid-cols-2 gap-2">
        <div className="flex items-center gap-1"><Cloud className="h-3 w-3" /> Weather (soon)</div>
        <div className="flex items-center gap-1"><Navigation className="h-3 w-3" /> Live GPS (soon)</div>
        <div className="flex items-center gap-1"><Fuel className="h-3 w-3" /> Fuel estimation (soon)</div>
        <div className="flex items-center gap-1"><Receipt className="h-3 w-3" /> Toll calc (soon)</div>
      </div>

      {/* Actions */}
      {canManage && (
        <div className="flex flex-wrap gap-2 mt-4 mb-4">
          <button onClick={duplicate} className="tap inline-flex items-center gap-1 text-xs px-3 h-9 rounded-xl border border-border bg-white/60">
            <Copy className="h-3 w-3" /> Duplicate
          </button>
          <button onClick={archiveOrder} className="tap inline-flex items-center gap-1 text-xs px-3 h-9 rounded-xl border border-border bg-white/60">
            <Archive className="h-3 w-3" /> Archive
          </button>
          {order.status !== "cancelled" && order.status !== "completed" && (
            <button onClick={cancelOrder} className="tap inline-flex items-center gap-1 text-xs px-3 h-9 rounded-xl status-urgent">
              <XCircle className="h-3 w-3" /> Cancel order
            </button>
          )}
        </div>
      )}
    </DashboardShell>
  );
}

function Row({ k, v, bold }: { k: string; v: string; bold?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <div className="text-muted-foreground">{k}</div>
      <div className={`text-right font-mono ${bold ? "font-bold text-base" : ""}`}>{v}</div>
    </div>
  );
}
