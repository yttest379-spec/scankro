"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UpgradeBanner } from "@/components/dashboard/upgrade-banner";
import { toast } from "sonner";
import type { Plan } from "@prisma/client";

export default function SeasonalPage() {
  const searchParams = useSearchParams();
  const branch = searchParams.get("branch") || undefined;
  const [plan, setPlan] = useState<Plan>("free");
  const [menus, setMenus] = useState<Array<Record<string, unknown>>>([]);
  const [name, setName] = useState("Festival Menu");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [selected, setSelected] = useState<string[]>([]);

  async function load() {
    const [m, c, b] = await Promise.all([
      fetch(`/api/seasonal?branch=${branch || ""}`),
      fetch(`/api/categories?branch=${branch || ""}`),
      fetch(`/api/branch?branch=${branch || ""}`),
    ]);
    setMenus((await m.json()).menus || []);
    setCategories((await c.json()).categories || []);
    setPlan((await b.json()).plan || "free");
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branch]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/seasonal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        startAt: new Date(startAt).toISOString(),
        endAt: new Date(endAt).toISOString(),
        categoryIds: selected,
        branchId: branch,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error || "Failed");
      return;
    }
    toast.success("Seasonal menu created");
    load();
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Seasonal menus</h1>
        <p className="text-sm text-stone-500">Schedule special category sets (Diwali, Christmas…)</p>
      </div>
      {plan !== "pro" && <UpgradeBanner plan={plan} feature="Seasonal menus" />}

      <form onSubmit={add} className="space-y-3 rounded-xl border bg-white p-4">
        <div className="space-y-2">
          <Label>Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} disabled={plan !== "pro"} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Starts</Label>
            <Input
              type="datetime-local"
              value={startAt}
              onChange={(e) => setStartAt(e.target.value)}
              disabled={plan !== "pro"}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Ends</Label>
            <Input
              type="datetime-local"
              value={endAt}
              onChange={(e) => setEndAt(e.target.value)}
              disabled={plan !== "pro"}
              required
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Include categories (optional filter)</Label>
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => {
              const on = selected.includes(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  disabled={plan !== "pro"}
                  onClick={() =>
                    setSelected((s) =>
                      on ? s.filter((x) => x !== c.id) : [...s, c.id]
                    )
                  }
                  className={`rounded-full px-3 py-1 text-xs ${
                    on ? "bg-teal-700 text-white" : "bg-stone-100 text-stone-700"
                  }`}
                >
                  {c.name}
                </button>
              );
            })}
          </div>
        </div>
        <Button type="submit" disabled={plan !== "pro"}>
          Create
        </Button>
      </form>

      <div className="space-y-2">
        {menus.map((m) => (
          <div
            key={String(m.id)}
            className="flex items-center justify-between rounded-lg border bg-white px-3 py-2 text-sm"
          >
            <span>
              {String(m.name)} · {String(m.startAt).slice(0, 10)} → {String(m.endAt).slice(0, 10)}
            </span>
            <Button
              size="sm"
              variant="ghost"
              onClick={async () => {
                await fetch(`/api/seasonal?id=${m.id}&branch=${branch || ""}`, {
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
