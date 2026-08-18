/**
 * Dispatch data layer.
 *
 * Single source of truth for the Tracking module: it reads the EXISTING
 * orders / trucks / drivers / clients tables (no tracking-specific records)
 * and keeps them fresh with one realtime channel that invalidates the cache
 * instead of refetching on a timer.
 */
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import type { OrderRow } from "@/lib/orders-data";
import type { VehicleRow } from "@/lib/fleet-data";
import type { DriverRow } from "@/lib/driver-data-model";

const STALE = 30_000;

export type DispatchData = {
  orders: OrderRow[];
  vehicles: VehicleRow[];
  drivers: DriverRow[];
  loading: boolean;
  refetch: () => void;
};

/** Staff (fleet owner / manager / dispatcher / admin) dispatch dataset. */
export function useDispatchData(): DispatchData {
  const { user, role } = useAuth();
  const qc = useQueryClient();
  const uid = user?.id ?? null;
  const scoped = role !== "admin" && role !== "dispatcher";

  const ordersQ = useQuery({
    queryKey: ["dispatch", "orders", uid],
    enabled: !!uid,
    staleTime: STALE,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("archived", false)
        .order("created_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      return (data ?? []) as unknown as OrderRow[];
    },
  });

  const vehiclesQ = useQuery({
    queryKey: ["dispatch", "vehicles", uid, scoped],
    enabled: !!uid,
    staleTime: STALE,
    queryFn: async () => {
      let q = supabase.from("trucks").select("*");
      if (scoped && uid) q = q.eq("owner_id", uid);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as VehicleRow[];
    },
  });

  const driversQ = useQuery({
    queryKey: ["dispatch", "drivers", uid, scoped],
    enabled: !!uid,
    staleTime: STALE,
    queryFn: async () => {
      let q = supabase.from("drivers").select("*");
      if (scoped && uid) q = q.eq("owner_id", uid);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as DriverRow[];
    },
  });

  // One channel for the whole module — changes anywhere (orders, fleet,
  // drivers) invalidate only the affected slice.
  useEffect(() => {
    if (!uid) return;
    const channel = supabase
      .channel("dispatch-center")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () =>
        qc.invalidateQueries({ queryKey: ["dispatch", "orders"] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "trucks" }, () =>
        qc.invalidateQueries({ queryKey: ["dispatch", "vehicles"] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "drivers" }, () =>
        qc.invalidateQueries({ queryKey: ["dispatch", "drivers"] }))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [uid, qc]);

  return {
    orders: ordersQ.data ?? [],
    vehicles: vehiclesQ.data ?? [],
    drivers: driversQ.data ?? [],
    loading: ordersQ.isLoading || vehiclesQ.isLoading || driversQ.isLoading,
    refetch: () => {
      ordersQ.refetch();
      vehiclesQ.refetch();
      driversQ.refetch();
    },
  };
}

/** Orders visible to the signed-in client or driver (RLS does the filtering). */
export function useMyOrders(kind: "client" | "driver") {
  const { user } = useAuth();
  const qc = useQueryClient();
  const uid = user?.id ?? null;

  const q = useQuery({
    queryKey: ["dispatch", "my-orders", kind, uid],
    enabled: !!uid,
    staleTime: STALE,
    queryFn: async () => {
      let query = supabase.from("orders").select("*").eq("archived", false);
      query = kind === "driver" ? query.eq("driver_id", uid!) : query.eq("created_by", uid!);
      const { data, error } = await query.order("created_at", { ascending: false }).limit(60);
      if (error) throw error;
      return (data ?? []) as unknown as OrderRow[];
    },
  });

  useEffect(() => {
    if (!uid) return;
    const channel = supabase
      .channel(`my-orders-${kind}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () =>
        qc.invalidateQueries({ queryKey: ["dispatch", "my-orders"] }))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [uid, kind, qc]);

  return { orders: q.data ?? [], loading: q.isLoading, refetch: q.refetch };
}

/** Vehicle + driver attached to a single order, for route/detail views. */
export function useOrderUnits(truckId: string | null, driverUserId: string | null) {
  const vehicleQ = useQuery({
    queryKey: ["dispatch", "order-vehicle", truckId],
    enabled: !!truckId,
    staleTime: STALE,
    queryFn: async () => {
      const { data } = await supabase.from("trucks").select("*").eq("id", truckId!).maybeSingle();
      return (data ?? null) as unknown as VehicleRow | null;
    },
  });

  const driverQ = useQuery({
    queryKey: ["dispatch", "order-driver", driverUserId],
    enabled: !!driverUserId,
    staleTime: STALE,
    queryFn: async () => {
      const { data } = await supabase.from("drivers").select("*").eq("user_id", driverUserId!).maybeSingle();
      return (data ?? null) as unknown as DriverRow | null;
    },
  });

  return { vehicle: vehicleQ.data ?? null, driver: driverQ.data ?? null };
}
