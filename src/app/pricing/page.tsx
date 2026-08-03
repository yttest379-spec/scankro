import Link from "next/link";
import { PLANS } from "@/lib/plans";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Pricing" };

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-stone-50">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
        <Link href="/" className="font-semibold text-teal-800">
          Scankro
        </Link>
        <Link href="/signup">
          <Button size="sm">Start free</Button>
        </Link>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-12">
        <h1 className="text-3xl font-semibold tracking-tight">Pricing</h1>
        <p className="mt-2 text-stone-600">Start free. Upgrade when you need branding, analytics, or branches.</p>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {Object.values(PLANS).map((plan) => (
            <div
              key={plan.id}
              className={`rounded-2xl border bg-white p-6 shadow-sm ${
                plan.id === "starter" ? "border-teal-600 ring-1 ring-teal-600" : "border-stone-200"
              }`}
            >
              <p className="font-medium capitalize text-teal-800">{plan.name}</p>
              <p className="mt-3 text-4xl font-semibold">
                {plan.priceMonthlyInr === 0 ? "Free" : `₹${plan.priceMonthlyInr}`}
              </p>
              {plan.priceMonthlyInr > 0 && (
                <p className="text-sm text-stone-500">per month</p>
              )}
              <p className="mt-3 text-sm text-stone-600">{plan.description}</p>
              <ul className="mt-5 space-y-2 text-sm text-stone-700">
                <li>
                  · {plan.limits.maxItems === null ? "Unlimited" : plan.limits.maxItems} menu items
                </li>
                <li>· QR: {plan.limits.qrFormats.join(", ").toUpperCase()}</li>
                {!plan.limits.removePoweredBy && <li>· Powered-by branding</li>}
                {plan.limits.removePoweredBy && <li>· Remove branding</li>}
                {plan.limits.analytics && <li>· Analytics</li>}
                {plan.limits.multiLanguage && <li>· Multi-language</li>}
                {plan.limits.multiBranch && <li>· Multiple branches</li>}
                {plan.limits.multiUser && <li>· Team members</li>}
                {plan.limits.promotions && <li>· Promotions & specials</li>}
              </ul>
              <Link href="/signup" className="mt-6 block">
                <Button className="w-full" variant={plan.id === "starter" ? "default" : "outline"}>
                  Get started
                </Button>
              </Link>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
