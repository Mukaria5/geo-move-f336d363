import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Users, Truck, Building2, FileText, ShieldAlert } from "lucide-react";
import { DashboardShell, StatCard } from "@/components/dashboard/DashboardShell";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/_protected/dashboard/admin")({ component: AdminDashboard });

function AdminDashboard() {
  const { role, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && role !== "admin") navigate({ to: "/" });
  }, [role, loading, navigate]);

  if (role !== "admin") return null;

  return (
    <DashboardShell title="Admin console" role="Admin">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        <StatCard label="Users" value="0" />
        <StatCard label="Trucks" value="0" />
        <StatCard label="Active jobs" value="0" />
        <StatCard label="Disputes" value="0" />
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <PanelCard icon={<Users className="h-4 w-4" />} title="Verify users" desc="Approve new clients, drivers and companies." />
        <PanelCard icon={<Truck className="h-4 w-4" />} title="Verify trucks" desc="Inspect logbooks, insurance, NTSA records." />
        <PanelCard icon={<FileText className="h-4 w-4" />} title="Review documents" desc="KYC and compliance uploads." />
        <PanelCard icon={<ShieldAlert className="h-4 w-4" />} title="Resolve disputes" desc="Open trip disputes and SOS alerts." />
      </div>
    </DashboardShell>
  );
}

function PanelCard({ icon, title, desc }: { icon: any; title: string; desc: string }) {
  return (
    <button className="glass rounded-2xl p-4 text-left hover:border-primary/40 transition">
      <div className="h-9 w-9 rounded-lg bg-primary/15 grid place-items-center mb-3 text-primary">{icon}</div>
      <div className="font-semibold">{title}</div>
      <div className="text-xs text-muted-foreground mt-1">{desc}</div>
    </button>
  );
}
