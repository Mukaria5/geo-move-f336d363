import { Link } from "@tanstack/react-router";
import { Truck, Menu } from "lucide-react";
import { useState } from "react";

export function Navbar() {
  const [open, setOpen] = useState(false);
  const links = [
    { to: "/#features", label: "Features" },
    { to: "/#how", label: "How it works" },
    { to: "/#fleet", label: "For Fleets" },
    { to: "/#faq", label: "FAQ" },
  ];
  return (
    <header className="fixed top-0 inset-x-0 z-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 mt-3">
        <div className="glass-strong rounded-2xl flex items-center justify-between px-4 sm:px-5 h-14">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="relative h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <Truck className="h-4 w-4 text-primary-foreground" strokeWidth={2.5} />
            </div>
            <span className="font-display font-bold text-lg tracking-tight">
              Load<span className="text-gradient-safety">Link</span>
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-7 text-sm text-muted-foreground">
            {links.map((l) => (
              <a key={l.to} href={l.to} className="hover:text-foreground transition-colors">{l.label}</a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <button className="hidden sm:inline-flex h-9 px-4 text-sm rounded-lg text-foreground/90 hover:text-foreground transition-colors">
              Sign in
            </button>
            <Link to="/book" className="h-9 px-4 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition shadow-[0_0_20px_-4px_var(--safety-glow)] inline-flex items-center">
              Book a truck
            </Link>
            <button onClick={() => setOpen(!open)} className="md:hidden h-9 w-9 grid place-items-center rounded-lg glass">
              <Menu className="h-4 w-4" />
            </button>
          </div>
        </div>
        {open && (
          <div className="md:hidden glass-strong rounded-2xl mt-2 p-4 flex flex-col gap-3 text-sm">
            {links.map((l) => (
              <a key={l.to} href={l.to} onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">{l.label}</a>
            ))}
          </div>
        )}
      </div>
    </header>
  );
}
