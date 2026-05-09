import { motion } from "framer-motion";
import { ArrowRight, MapPin, Shield, Zap } from "lucide-react";
import heroImg from "@/assets/hero-truck.jpg";

export function Hero() {
  return (
    <section className="relative pt-32 pb-20 overflow-hidden">
      <div className="absolute inset-0 grid-bg opacity-40 [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 relative">
        <div className="grid lg:grid-cols-12 gap-10 items-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="lg:col-span-6"
          >
            <div className="inline-flex items-center gap-2 glass rounded-full px-3 py-1 text-xs font-mono tracking-wide text-muted-foreground mb-6">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-75 animate-ping" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
              </span>
              LIVE IN NAIROBI · MOMBASA · KISUMU
            </div>

            <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-bold leading-[0.95] tracking-tight">
              Move heavy <br />
              equipment, <span className="text-gradient-safety">smarter.</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-xl">
              LoadLink is the on-demand low-loader network for East Africa. Book verified
              trucks for excavators, bulldozers, cranes and machinery — track every move
              in real time.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/book" className="group h-12 px-6 rounded-xl bg-primary text-primary-foreground font-semibold inline-flex items-center gap-2 glow-safety hover:translate-y-[-1px] transition">
                Request a low loader
                <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition" />
              </Link>
              <button className="h-12 px-6 rounded-xl glass-strong font-medium hover:bg-white/5 transition">
                Become a transporter
              </button>
            </div>

            <div className="mt-10 grid grid-cols-3 gap-4 max-w-lg">
              {[
                { v: "1,200+", l: "Verified trucks" },
                { v: "18 min", l: "Avg dispatch" },
                { v: "4.9★", l: "Operator rating" },
              ].map((s) => (
                <div key={s.l} className="glass rounded-xl p-4">
                  <div className="font-display text-2xl font-bold">{s.v}</div>
                  <div className="text-xs text-muted-foreground mt-1">{s.l}</div>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.15 }}
            className="lg:col-span-6 relative"
          >
            <div className="relative rounded-3xl overflow-hidden glass-strong p-2">
              <img
                src={heroImg}
                alt="Low loader truck transporting an excavator at dusk in Kenya"
                width={1920}
                height={1080}
                className="w-full h-auto rounded-2xl object-cover"
              />
              <div className="absolute inset-2 rounded-2xl bg-gradient-to-t from-background/90 via-transparent to-transparent pointer-events-none" />

              {/* Floating booking card */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="absolute left-4 right-4 bottom-4 sm:left-6 sm:right-6 sm:bottom-6 glass-strong rounded-2xl p-4"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xs font-mono text-muted-foreground">QUOTE · 28T EXCAVATOR</div>
                  <div className="text-xs px-2 py-0.5 rounded-md bg-primary/15 text-primary font-semibold">3 nearby</div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex flex-col items-center pt-1">
                    <div className="h-2.5 w-2.5 rounded-full bg-primary" />
                    <div className="w-px h-8 bg-border" />
                    <div className="h-2.5 w-2.5 rounded-sm bg-foreground" />
                  </div>
                  <div className="flex-1 text-sm">
                    <div className="font-medium">Mlolongo Yard, Nairobi</div>
                    <div className="text-muted-foreground mt-1">Naivasha Geothermal Site</div>
                  </div>
                  <div className="text-right">
                    <div className="font-display text-2xl font-bold">KSh 84k</div>
                    <div className="text-xs text-muted-foreground">~2h 40m</div>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* floating badges */}
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ repeat: Infinity, duration: 4 }}
              className="hidden sm:flex absolute -left-4 top-10 glass-strong rounded-xl p-3 items-center gap-2 text-sm"
            >
              <Shield className="h-4 w-4 text-primary" /> KYC verified
            </motion.div>
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ repeat: Infinity, duration: 5 }}
              className="hidden sm:flex absolute -right-4 top-32 glass-strong rounded-xl p-3 items-center gap-2 text-sm"
            >
              <Zap className="h-4 w-4 text-primary" /> Instant dispatch
            </motion.div>
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ repeat: Infinity, duration: 4.5 }}
              className="hidden sm:flex absolute right-6 -bottom-4 glass-strong rounded-xl p-3 items-center gap-2 text-sm"
            >
              <MapPin className="h-4 w-4 text-primary" /> Live GPS
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
