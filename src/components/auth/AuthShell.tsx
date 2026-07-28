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
    <main className="min-h-screen flex flex-col">
      <header className="px-4 sm:px-6 pt-5">
        <Link to="/" className="inline-flex items-center gap-2 group">
          <div className="h-8 w-8 rounded-lg bg-primary grid place-items-center">
            <Truck className="h-4 w-4 text-primary-foreground" strokeWidth={2.5} />
          </div>
          <span className="font-display font-bold text-lg">
            Load<span className="text-gradient-safety">Link</span>
          </span>
        </Link>
      </header>
      <div className="flex-1 grid place-items-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="text-xs font-mono tracking-widest text-primary mb-3">// LOADLINK</div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight">{title}</h1>
          {subtitle && <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>}
          <div className="mt-7 glass-strong rounded-2xl p-5 sm:p-6">{children}</div>
          {footer && <div className="mt-5 text-sm text-center text-muted-foreground">{footer}</div>}
        </div>
      </div>
    </main>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">{label}</span>
      <div className="mt-1.5">{children}</div>
      {hint && <span className="text-xs text-muted-foreground mt-1 block">{hint}</span>}
    </label>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={"w-full h-11 px-3 rounded-lg bg-secondary/60 border border-border focus:border-primary/60 outline-none text-sm transition " + (props.className ?? "")}
    />
  );
}

export function PrimaryButton({ children, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      className={"w-full h-11 rounded-lg bg-primary text-primary-foreground font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed glow-safety " + (rest.className ?? "")}
    >
      {children}
    </button>
  );
}

export function GhostButton({ children, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      className={"w-full h-11 rounded-lg glass font-medium hover:bg-secondary/60 inline-flex items-center justify-center gap-2 " + (rest.className ?? "")}
    />
  );
}
