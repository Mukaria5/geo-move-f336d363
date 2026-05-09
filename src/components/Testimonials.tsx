const items = [
  { q: "We moved 14 excavators across three sites in a week. Zero downtime, zero stress.", a: "Brian M.", r: "Site Manager, Epco Builders" },
  { q: "Best dispatch rates I've ever seen. My trucks are full all month.", a: "Wanjiku N.", r: "Fleet Owner, 12 trucks" },
  { q: "The escrow and M-Pesa flow is genius. Pay only when the load arrives.", a: "Kevin O.", r: "Procurement, Tarmac Co." },
];

export function Testimonials() {
  return (
    <section className="py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="text-xs font-mono tracking-widest text-primary mb-3">// TRUSTED BY OPERATORS</div>
        <h2 className="text-4xl sm:text-5xl font-bold tracking-tight max-w-2xl mb-12">
          The new standard for heavy haulage in East Africa.
        </h2>
        <div className="grid md:grid-cols-3 gap-4">
          {items.map((t, i) => (
            <div key={i} className="glass rounded-2xl p-6">
              <div className="text-primary font-display text-3xl leading-none mb-3">"</div>
              <p className="text-sm leading-relaxed">{t.q}</p>
              <div className="mt-6 pt-4 border-t border-border/60">
                <div className="font-semibold text-sm">{t.a}</div>
                <div className="text-xs text-muted-foreground">{t.r}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
