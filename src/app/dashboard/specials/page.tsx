"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { UpgradeBanner } from "@/components/dashboard/upgrade-banner";
import { toast } from "sonner";
import type { Plan } from "@prisma/client";
import { formatPrice } from "@/lib/utils";

export default function SpecialsPage() {
  const searchParams = useSearchParams();
  const branch = searchParams.get("branch") || undefined;
  const [plan, setPlan] = useState<Plan>("free");
  const [specials, setSpecials] = useState<Array<Record<string, unknown>>>([]);
  const [items, setItems] = useState<Array<{ id: string; name: string; price: number }>>([]);
  const [title, setTitle] = useState("Today's Special");
  const [menuItemId, setMenuItemId] = useState("");
  const [customName, setCustomName] = useState("");
  const [customPrice, setCustomPrice] = useState("");
  const [activeDate, setActiveDate] = useState(new Date().toISOString().slice(0, 10));

  async function load() {
    const [s, i, b] = await Promise.all([
      fetch(`/api/specials?branch=${branch || ""}`),
      fetch(`/api/items?branch=${branch || ""}`),
      fetch(`/api/branch?branch=${branch || ""}`),
    ]);
    const sd = await s.json();
    const id = await i.json();
    const bd = await b.json();
    setPlan(bd.plan || "free");
    setSpecials(sd.specials || []);
    setItems(id.items || []);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branch]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/specials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        menuItemId: menuItemId || null,
        customName: customName || null,
        customPriceRupees: customPrice ? Number(customPrice) : null,
        activeDate,
        branchId: branch,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error || "Failed");
      return;
    }
    toast.success("Special added");
    load();
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Daily specials</h1>
        <p className="text-sm text-stone-500">Featured at the top of the public menu</p>
      </div>
      {plan !== "pro" && <UpgradeBanner plan={plan} feature="Daily specials" />}

      <form onSubmit={add} className="space-y-3 rounded-xl border border-stone-200 bg-white p-4">
        <div className="space-y-2">
          <Label>Title</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} disabled={plan !== "pro"} />
        </div>
        <div className="space-y-2">
          <Label>Link menu item (optional)</Label>
          <Select
            value={menuItemId}
            onChange={(e) => setMenuItemId(e.target.value)}
            disabled={plan !== "pro"}
          >
            <option value="">Custom special…</option>
            {items.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name} ({formatPrice(i.price)})
              </option>
            ))}
          </Select>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Custom name</Label>
            <Input
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              disabled={plan !== "pro"}
            />
          </div>
          <div className="space-y-2">
            <Label>Custom price ₹</Label>
            <Input
              type="number"
              value={customPrice}
              onChange={(e) => setCustomPrice(e.target.value)}
              disabled={plan !== "pro"}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Date</Label>
          <Input
            type="date"
            value={activeDate}
            onChange={(e) => setActiveDate(e.target.value)}
            disabled={plan !== "pro"}
          />
        </div>
        <Button type="submit" disabled={plan !== "pro"}>
          Add special
        </Button>
      </form>

      <div className="space-y-2">
        {specials.map((s) => (
          <div
            key={String(s.id)}
            className="flex items-center justify-between rounded-lg border bg-white px-3 py-2 text-sm"
          >
            <span>
              {String(s.title || "Special")} ·{" "}
              {(s.menuItem as { name?: string } | null)?.name ||
                String(s.customName || "")}{" "}
              · {String(s.activeDate).slice(0, 10)}
            </span>
            <Button
              size="sm"
              variant="ghost"
              onClick={async () => {
                await fetch(`/api/specials?id=${s.id}&branch=${branch || ""}`, {
                  method: "DELETE",
                });
                load();
              }}
            >
              Delete
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
