/**
 * Reports data layer — role-scoped react-query hook.
 *
 * Reuses the module tables that already exist (orders, trucks, drivers,
 * clients, invoices, payments, expenses, vehicle_fuel_logs). Staff roles
 * (admin / fleet owner / dispatcher) read the operational dataset; drivers
 * read only their own trips and profile; clients read only their own orders,
 * invoices and payments. RLS is the hard boundary — these queries only add
 * convenience scoping.
 */
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, type AppRole } from "@/lib/auth-context";
import type { OrderRow } from "@/lib/orders-data";
import type { VehicleRow } from "@/lib/fleet-data";
import type { DriverRow } from "@/lib/driver-data-model";
import type { ClientRow } from "@/lib/crm-data";
import type { InvoiceRow, PaymentRow, ExpenseRow } from "@/lib/finance-data";
import { EMPTY_DATASET, type FuelLogRow, type ReportDataset } from "@/lib/reports-data";

const STALE = 30_000;
const LIMIT = 500;

type AnySelect = PromiseLike<{ data: unknown; error: { message: string } | null }>;

/** A read that never breaks the whole report: an error (e.g. RLS) yields []. */
async function safe<T>(p: AnySelect): Promise<T[]> {
  const { data, error } = await p;
  if (error) {
    console.warn("[reports] read skipped:", error.message);
    return [];
  }
  return (data as T[]) ?? [];
}

const isStaffRole = (r: AppRole | null) => r === "admin" || r === "fleet" || r === "dispatcher";

export function useReportsDataset() {
  const { user, role } = useAuth();
  const qc = useQueryClient();
  const uid = user?.id ?? null;
  const staff = isStaffRole(role);

  const q = useQuery({
    queryKey: ["reports", "dataset", uid, role],
    enabled: !!uid,
    staleTime: STALE,
    queryFn: async (): Promise<ReportDataset> => {
      if (!staff) {
        // Driver: own trips + own profile only. No company finance data.
        if (role === "driver") {
          const [orders, drivers] = await Promise.all([
            safe<OrderRow>(supabase.from("orders").select("*").eq("driver_id", uid!)
              .eq("archived", false).order("created_at", { ascending: false }).limit(LIMIT)),
            safe<DriverRow>(supabase.from("drivers").select("*").eq("user_id", uid!).limit(5)),
          ]);
          return { ...EMPTY_DATASET, orders, drivers };
        }
        // Client: own orders, invoices and payments. RLS enforces the scope.
        const [orders, invoices, payments] = await Promise.all([
          safe<OrderRow>(supabase.from("orders").select("*").eq("created_by", uid!)
            .eq("archived", false).order("created_at", { ascending: false }).limit(LIMIT)),
          safe<InvoiceRow>(supabase.from("invoices").select("*").order("issue_date", { ascending: false }).limit(LIMIT)),
          safe<PaymentRow>(supabase.from("payments").select("*").order("payment_date", { ascending: false }).limit(LIMIT)),
        ]);
        return { ...EMPTY_DATASET, orders, invoices, payments };
      }

      // Staff: operational dataset. Fleet owners are scoped to their own
      // vehicles and drivers; admin / dispatcher see the whole operation.
      let truckQ = supabase.from("trucks").select("*");
      let driverQ = supabase.from("drivers").select("*");
      if (role === "fleet") {
        truckQ = truckQ.eq("owner_id", uid!);
        driverQ = driverQ.eq("owner_id", uid!);
      }

      const [orders, vehicles, drivers, clients, invoices, payments, expenses, fuel] = await Promise.all([
        safe<OrderRow>(supabase.from("orders").select("*").eq("archived", false)
          .order("created_at", { ascending: false }).limit(LIMIT)),
        safe<VehicleRow>(truckQ),
        safe<DriverRow>(driverQ),
        safe<ClientRow>(supabase.from("clients").select("*").order("created_at", { ascending: false }).limit(300)),
        safe<InvoiceRow>(supabase.from("invoices").select("*").order("issue_date", { ascending: false }).limit(LIMIT)),
        safe<PaymentRow>(supabase.from("payments").select("*").order("payment_date", { ascending: false }).limit(LIMIT)),
        safe<ExpenseRow>(supabase.from("expenses").select("*").order("expense_date", { ascending: false }).limit(LIMIT)),
        safe<FuelLogRow>(supabase.from("vehicle_fuel_logs").select("*").order("filled_at", { ascending: false }).limit(LIMIT)),
      ]);
      return { orders, vehicles, drivers, clients, invoices, payments, expenses, fuel };
    },
  });

  // One realtime channel for the whole module: any change to a source table
  // invalidates the dataset cache instead of polling.
  useEffect(() => {
    if (!uid) return;
    const tables = ["orders", "trucks", "drivers", "clients", "invoices", "payments", "expenses", "vehicle_fuel_logs"];
    const channel = supabase.channel("reports-bi").on(
      "postgres_changes",
      { event: "*", schema: "public" },
      (msg) => {
        if (tables.includes((msg as { table?: string }).table ?? "")) {
          qc.invalidateQueries({ queryKey: ["reports", "dataset"] });
        }
      },
    ).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [uid, qc]);

  return {
    dataset: q.data ?? EMPTY_DATASET,
    loading: q.isLoading,
    refetch: q.refetch,
  };
}
