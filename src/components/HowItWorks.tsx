import { motion } from "framer-motion";
import mapImg from "@/assets/map-preview.jpg";

const steps = [
  { n: "01", t: "Set pickup & drop", d: "Pin both locations and pick your machine type — excavator, dozer, crane, container." },
  { n: "02", t: "Get instant quotes", d: "Nearby low loaders surface on the map with capacity, ETA and a transparent fare." },
  { n: "03", t: "Book & track live", d: "Confirm in one tap. Watch your truck roll in, chat with the operator, sign on delivery." },
];

export function HowItWorks() {
  return (
    <section id="how" className="py-24 relative">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="relative order-2 lg:order-1">
            <div className="relative rounded-3xl overflow-hidden glass-strong p-2">
              <img src={mapImg} alt="Live logistics map preview" loading="lazy" width={1280} height={1280}
                   className="w-full h-auto rounded-2xl" />
              <div className="absolute top-6 left-6 glass-strong rounded-xl px-3 py-2 text-xs font-mono">
                <span className="text-primary">●</span> 47 trucks online
              </div>
              <div className="absolute bottom-6 right-6 glass-strong rounded-xl px-3 py-2 text-xs font-mono">
                Heatmap: Industrial Area
              </div>
            </div>
          </div>

          <div className="order-1 lg:order-2">
            <div className="text-xs font-mono tracking-widest text-primary mb-3">// HOW IT WORKS</div>
            <h2 className="text-4xl sm:text-5xl font-bold tracking-tight mb-10">
              From request to delivery in three taps.
            </h2>
            <div className="space-y-4">
              {steps.map((s, i) => (
                <motion.div
                  key={s.n}
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="glass rounded-2xl p-5 flex gap-5"
                >
                  <div className="font-mono text-primary text-sm pt-1">{s.n}</div>
                  <div>
                    <div className="font-display text-xl font-semibold">{s.t}</div>
                    <p className="text-sm text-muted-foreground mt-1">{s.d}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
