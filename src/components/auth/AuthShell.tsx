import { Link } from "@tanstack/react-router";
import { Truck } from "lucide-react";
import type { ReactNode } from "react";

export function AuthShell({ title, subtitle, children, footer }: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <main
      className="min-h-[100dvh] flex flex-col relative overflow-hidden"
      style={{
        background:
          "radial-gradient(120% 60% at 50% -10%, color-mix(in oklab, var(--primary) 14%, var(--background)) 0%, var(--background) 55%)",
      }}
    >
      <div className="absolute -top-32 -right-24 h-72 w-72 rounded-full bg-gold/20 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-primary/15 blur-3xl pointer-events-none" />

      <header className="relative px-4 sm:px-6 pt-5 safe-top">
        <Link to="/" className="inline-flex items-center gap-2 group">
          <div className="h-9 w-9 rounded-2xl card-premium grid place-items-center shadow-soft">
            <Truck className="h-4 w-4 text-primary-foreground" strokeWidth={2.5} />
          </div>
          <span className="font-display font-bold text-lg">
            Load<span className="text-gradient-safety">Link</span>
          </span>
        </Link>
      </header>

      <div className="relative flex-1 grid place-items-center px-4 py-8">
        <div className="w-full max-w-md">
          <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-primary mb-3">// LoadLink</div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight">{title}</h1>
          {subtitle && <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>}
          <div className="mt-6 card-elevated p-5 sm:p-6">{children}</div>
          {footer && <div className="mt-5 text-sm text-center text-muted-foreground">{footer}</div>}
        </div>
      </div>
    </main>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground">{label}</span>
      <div className="mt-1.5">{children}</div>
      {hint && <span className="text-xs text-muted-foreground mt-1 block">{hint}</span>}
    </label>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={
        "w-full h-11 px-3 rounded-xl bg-secondary/60 border border-border focus:border-primary/60 focus:bg-card focus:ring-2 focus:ring-ring outline-none text-sm transition " +
        (props.className ?? "")
      }
    />
  );
}

export function PrimaryButton({ children, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      className={
        "w-full h-11 rounded-xl bg-primary text-primary-foreground font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-glow press " +
        (rest.className ?? "")
      }
    >
      {children}
    </button>
  );
}

export function GhostButton({ children, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      className={
        "w-full h-11 rounded-xl border border-border bg-card font-medium hover:bg-secondary inline-flex items-center justify-center gap-2 press " +
        (rest.className ?? "")
      }
    >
      {children}
    </button>
  );
}
