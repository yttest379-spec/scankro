import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PLANS } from "@/lib/plans";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#f6f3ee] text-stone-900">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,_#d6ebe6_0%,_transparent_55%),radial-gradient(ellipse_at_bottom_right,_#fde68a33_0%,_transparent_40%)]" />

      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <span className="text-xl font-semibold tracking-tight text-teal-900">Scankro</span>
        <nav className="flex items-center gap-3">
          <Link href="/pricing" className="hidden text-sm text-stone-600 hover:text-stone-900 sm:inline">
            Pricing
          </Link>
          <Link href="/login">
            <Button variant="ghost" size="sm">
              Log in
            </Button>
          </Link>
          <Link href="/signup">
            <Button size="sm">Start free</Button>
          </Link>
        </nav>
      </header>

      <main className="relative z-10">
        <section className="mx-auto grid max-w-6xl gap-10 px-6 pb-20 pt-10 md:grid-cols-2 md:items-center md:pt-16">
          <div>
            <p className="animate-fade-up text-sm font-medium uppercase tracking-[0.2em] text-teal-800/80">
              QR menu platform
            </p>
            <h1 className="animate-fade-up-delay mt-4 font-serif text-5xl leading-[1.05] tracking-tight text-stone-900 md:text-6xl">
              Scankro
            </h1>
            <p className="animate-fade-up-delay-2 mt-5 max-w-md text-lg text-stone-600">
              Replace printed menus with a live digital menu. Update prices, mark dishes out of stock,
              and let guests scan a QR code—no app required.
            </p>
            <div className="animate-fade-up-delay-2 mt-8 flex flex-wrap gap-3">
              <Link href="/signup">
                <Button size="lg">Create your menu</Button>
              </Link>
              <Link href="/pricing">
                <Button size="lg" variant="outline">
                  See pricing
                </Button>
              </Link>
            </div>
          </div>

          <div className="animate-fade-up-delay relative mx-auto w-full max-w-sm">
            <div className="absolute -inset-6 rounded-[2rem] bg-gradient-to-br from-teal-200/50 to-amber-100/40 blur-2xl" />
            <div className="relative overflow-hidden rounded-[1.75rem] border border-stone-200/80 bg-white shadow-xl shadow-stone-900/10">
              <div className="bg-teal-800 px-5 py-8 text-white">
                <p className="text-xs uppercase tracking-widest text-teal-100">Cafe Royal</p>
                <p className="mt-2 text-2xl font-semibold">Today&apos;s menu</p>
              </div>
              <div className="space-y-3 p-5">
                {[
                  { name: "Paneer Tikka", price: "₹299", tag: "Popular" },
                  { name: "Chicken Biryani", price: "₹199", tag: "Special" },
                  { name: "Masala Chai", price: "₹49", tag: "" },
                ].map((item) => (
                  <div
                    key={item.name}
                    className="flex items-center justify-between rounded-xl border border-stone-100 bg-stone-50 px-4 py-3"
                  >
                    <div>
                      <p className="font-medium">{item.name}</p>
                      {item.tag && (
                        <p className="text-xs text-amber-700">{item.tag}</p>
                      )}
                    </div>
                    <p className="font-semibold text-teal-800">{item.price}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-stone-200/80 bg-white/60 py-16">
          <div className="mx-auto max-w-6xl px-6">
            <h2 className="text-2xl font-semibold tracking-tight">Built for restaurants that change often</h2>
            <p className="mt-2 max-w-2xl text-stone-600">
              Price changes, stock-outs, and seasonal specials go live the moment you save—every table sees the latest menu.
            </p>
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {[
                {
                  title: "One QR, live menu",
                  body: "Print once. Update forever. Guests open the menu in their browser.",
                },
                {
                  title: "Owner dashboard",
                  body: "Categories, items, photos, veg/non-veg, spicy level, and availability.",
                },
                {
                  title: "Grow into Pro",
                  body: "Analytics, multi-branch, team access, languages, and promotions.",
                },
              ].map((f) => (
                <div key={f.title} className="rounded-2xl border border-stone-200 bg-white p-6">
                  <h3 className="font-semibold text-stone-900">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-stone-600">{f.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16">
          <div className="mx-auto max-w-6xl px-6">
            <h2 className="text-2xl font-semibold">Simple pricing</h2>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {Object.values(PLANS).map((plan) => (
                <div
                  key={plan.id}
                  className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm"
                >
                  <p className="text-sm font-medium text-teal-800">{plan.name}</p>
                  <p className="mt-2 text-3xl font-semibold">
                    {plan.priceMonthlyInr === 0 ? "₹0" : `₹${plan.priceMonthlyInr}`}
                    <span className="text-sm font-normal text-stone-500">/mo</span>
                  </p>
                  <p className="mt-2 text-sm text-stone-600">{plan.description}</p>
                </div>
              ))}
            </div>
            <div className="mt-8">
              <Link href="/signup">
                <Button size="lg">Start free — 20 menu items</Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-stone-200 py-8 text-center text-sm text-stone-500">
        © {new Date().getFullYear()} Scankro
      </footer>
    </div>
  );
}
