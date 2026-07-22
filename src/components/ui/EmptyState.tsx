import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function EmptyState({
  icon: Icon, title, description, action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="text-center py-14 px-6">
      <div className="relative mx-auto h-20 w-20 mb-4">
        <div className="absolute inset-0 rounded-full bg-primary-soft/60 blur-xl" />
        <div className="relative h-20 w-20 rounded-3xl bg-gradient-to-br from-primary-soft to-secondary grid place-items-center border border-border">
          <Icon className="h-8 w-8 text-primary" strokeWidth={1.8} />
        </div>
      </div>
      <div className="font-display text-lg font-semibold">{title}</div>
      {description && <div className="text-sm text-muted-foreground mt-1.5 max-w-xs mx-auto">{description}</div>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
