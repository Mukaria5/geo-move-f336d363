import { CheckCircle2, ArrowRight } from "lucide-react";

const perks = [
  "Steady high-value jobs from verified clients",
  "Get paid in 24h via M-Pesa or bank",
  "Free fleet management dashboard",
  "Insurance & inspection support",
];

export function FleetCTA() {
  return (
    <section id="fleet" className="py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="relative rounded-3xl overflow-hidden glass-strong p-8 sm:p-12 grid lg:grid-cols-2 gap-10 items-center">
          <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
          <div className="relative">
            <div className="text-xs font-mono tracking-widest text-primary mb-3">// FOR FLEET OWNERS</div>
            <h2 className="text-4xl sm:text-5xl font-bold tracking-tight">
              Put your low loaders to work.
            </h2>
            <p className="text-muted-foreground mt-4 max-w-lg">
              Whether you own one truck or fifty, LoadLink keeps your fleet moving with
              high-paying machinery transport jobs across East Africa.
            </p>
            <button className="mt-7 h-12 px-6 rounded-xl bg-primary text-primary-foreground font-semibold inline-flex items-center gap-2 glow-safety hover:translate-y-[-1px] transition">
              Register your fleet <ArrowRight className="h-4 w-4" />
            </button>
          </div>
          <ul className="relative space-y-3">
            {perks.map((p) => (
              <li key={p} className="glass rounded-xl p-4 flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                <span className="text-sm">{p}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
