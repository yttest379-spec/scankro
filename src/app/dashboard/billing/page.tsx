"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { PLANS } from "@/lib/plans";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Plan } from "@prisma/client";

export default function BillingPage() {
  const [plan, setPlan] = useState<Plan>("free");
  const [status, setStatus] = useState("pending");
  const [loading, setLoading] = useState<string | null>(null);

  function load() {
    fetch("/api/billing")
      .then((r) => r.json())
      .then((data) => {
        setPlan(data.plan || "free");
        setStatus(data.status || "pending");
      });
  }

  useEffect(() => {
    load();
  }, []);

  async function choose(next: Plan) {
    setLoading(next);
    const res = await fetch("/api/billing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan: next, manual: true }),
    });
    const data = await res.json();
    setLoading(null);
    if (!res.ok) {
      toast.error(data.error || "Failed");
      return;
    }
    if (data.mode === "razorpay" && data.shortUrl) {
      window.location.href = data.shortUrl;
      return;
    }
    toast.success(data.message || `Switched to ${next}`);
    load();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Billing</h1>
        <p className="text-sm text-stone-500">
          Current plan: <span className="capitalize font-medium text-stone-800">{plan}</span>
          {status !== "pending" && ` · ${status}`}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {Object.values(PLANS).map((p) => (
          <Card key={p.id} className={plan === p.id ? "border-teal-600 ring-1 ring-teal-600" : ""}>
            <CardHeader>
              <CardTitle className="capitalize">{p.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-2xl font-semibold">
                {p.priceMonthlyInr === 0 ? "₹0" : `₹${p.priceMonthlyInr}`}
                <span className="text-sm font-normal text-stone-500">/mo</span>
              </p>
              <p className="text-sm text-stone-600">{p.description}</p>
              <Button
                className="w-full"
                variant={plan === p.id ? "secondary" : "default"}
                disabled={plan === p.id || loading === p.id}
                onClick={() => choose(p.id)}
              >
                {plan === p.id ? "Current" : loading === p.id ? "…" : "Choose"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="text-xs text-stone-400">
        Live payments use Razorpay Subscriptions when `RAZORPAY_*` env vars are set. In development,
        plan changes apply immediately (manual mode).
      </p>
    </div>
  );
}
