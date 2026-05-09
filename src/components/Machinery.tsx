const items = [
  "Excavators", "Bulldozers", "Wheel Loaders", "Backhoes",
  "Rollers", "Cranes", "Generators", "Containers",
  "Tractors", "Drilling Rigs", "Graders", "Custom",
];

export function Machinery() {
  return (
    <section className="py-20 border-y border-border/60 bg-navy-deep/40">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div>
            <div className="text-xs font-mono tracking-widest text-primary mb-3">// WHAT WE MOVE</div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Built for every machine on site.</h2>
          </div>
          <div className="text-sm text-muted-foreground max-w-sm">
            From a 5-tonne backhoe to a 60-tonne crane — we match the right rig to your load.
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {items.map((i) => (
            <div key={i} className="glass rounded-xl px-4 py-5 text-center text-sm font-medium hover:border-primary/40 hover:bg-primary/5 transition cursor-pointer">
              {i}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
