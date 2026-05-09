import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { Features } from "@/components/Features";
import { HowItWorks } from "@/components/HowItWorks";
import { Machinery } from "@/components/Machinery";
import { FleetCTA } from "@/components/FleetCTA";
import { Testimonials } from "@/components/Testimonials";
import { FAQ } from "@/components/FAQ";
import { Footer } from "@/components/Footer";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "LoadLink — On-demand low loader transport for East Africa" },
      { name: "description", content: "Book verified low-loader trucks for excavators, bulldozers and heavy machinery. Live GPS tracking, M-Pesa payments, instant dispatch across Kenya." },
      { property: "og:title", content: "LoadLink — Move heavy equipment, smarter." },
      { property: "og:description", content: "On-demand low-loader logistics network for East Africa." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <main className="min-h-screen">
      <Navbar />
      <Hero />
      <Features />
      <HowItWorks />
      <Machinery />
      <FleetCTA />
      <Testimonials />
      <FAQ />
      <Footer />
    </main>
  );
}
