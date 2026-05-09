import { motion } from "framer-motion";
import { Map, Wallet, MessageSquare, ShieldCheck, Activity, Truck } from "lucide-react";

const features = [
  { icon: Map, title: "Live tracking", desc: "Real-time GPS on every truck. Geo-fenced pickups, ETA precision down to the minute." },
  { icon: Wallet, title: "M-Pesa & cards", desc: "Pay via M-Pesa, Airtel Money, card or bank. Escrow keeps both sides protected." },
  { icon: ShieldCheck, title: "Verified operators", desc: "KYC, licence, insurance and inspection records on every driver and rig." },
  { icon: Activity, title: "Smart pricing", desc: "AI quotes account for weight, distance, road conditions, fuel and toll charges." },
  { icon: MessageSquare, title: "In-app comms", desc: "Chat, call, share photos and proof-of-delivery — all attached to the job." },
  { icon: Truck, title: "Fleet tools", desc: "Dispatch, assign drivers and monitor your whole fleet from one dashboard." },
];

export function Features() {
  return (
    <section id="features" className="py-24 relative">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="max-w-2xl mb-14">
          <div className="text-xs font-mono tracking-widest text-primary mb-3">// PLATFORM</div>
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight">
            Industrial-grade infrastructure for heavy haulage.
          </h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: i * 0.05 }}
              className="group glass rounded-2xl p-6 hover:border-primary/30 transition-all hover:translate-y-[-2px]"
            >
              <div className="h-11 w-11 rounded-xl bg-primary/15 grid place-items-center mb-5 group-hover:bg-primary/25 transition">
                <f.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-display text-xl font-semibold">{f.title}</h3>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
