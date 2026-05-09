import { Truck } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border/60 mt-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-10">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary grid place-items-center">
              <Truck className="h-4 w-4 text-primary-foreground" strokeWidth={2.5} />
            </div>
            <span className="font-display font-bold text-lg">Load<span className="text-gradient-safety">Link</span></span>
          </div>
          <p className="text-sm text-muted-foreground mt-4 max-w-xs">
            On-demand low-loader transport for heavy machinery across East Africa.
          </p>
        </div>
        {[
          { t: "Platform", l: ["For Clients", "For Drivers", "For Fleets", "Pricing"] },
          { t: "Company", l: ["About", "Careers", "Press", "Contact"] },
          { t: "Legal", l: ["Terms", "Privacy", "Insurance", "Safety"] },
        ].map((c) => (
          <div key={c.t}>
            <div className="font-display font-semibold mb-4">{c.t}</div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {c.l.map((x) => <li key={x}><a href="#" className="hover:text-foreground transition-colors">{x}</a></li>)}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-border/60">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-5 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
          <div>© {new Date().getFullYear()} LoadLink Logistics Ltd. Nairobi, Kenya.</div>
          <div className="font-mono">Built for the builders of East Africa.</div>
        </div>
      </div>
    </footer>
  );
}
