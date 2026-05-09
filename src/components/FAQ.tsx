import { useState } from "react";
import { Plus, Minus } from "lucide-react";

const faqs = [
  { q: "Where is LoadLink available?", a: "We've launched in Nairobi, Mombasa and Kisumu, with active expansion across Kenya, Uganda, Tanzania and Rwanda." },
  { q: "How is pricing calculated?", a: "Our AI quote engine considers distance, machine weight, truck class, fuel, road conditions, tolls and any waiting time — shown to you upfront." },
  { q: "How do I pay?", a: "M-Pesa, Airtel Money, debit/credit cards, and bank transfer. Escrow holds funds until your load is delivered safely." },
  { q: "Are operators verified?", a: "Yes. Every driver passes KYC, licence and insurance checks. Trucks must pass inspection before going live on the network." },
  { q: "Can I manage a fleet?", a: "Absolutely — companies get a dedicated dashboard for dispatch, driver assignment, earnings and live fleet tracking." },
];

export function FAQ() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="py-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <div className="text-xs font-mono tracking-widest text-primary mb-3 text-center">// FAQ</div>
        <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-center mb-12">
          Questions, answered.
        </h2>
        <div className="space-y-3">
          {faqs.map((f, i) => (
            <div key={i} className="glass rounded-2xl overflow-hidden">
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full flex items-center justify-between p-5 text-left"
              >
                <span className="font-medium">{f.q}</span>
                {open === i ? <Minus className="h-4 w-4 text-primary" /> : <Plus className="h-4 w-4 text-primary" />}
              </button>
              {open === i && (
                <div className="px-5 pb-5 text-sm text-muted-foreground -mt-1">{f.a}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
