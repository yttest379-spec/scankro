"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UpgradeBanner } from "@/components/dashboard/upgrade-banner";
import { toast } from "sonner";
import type { Plan } from "@prisma/client";

export default function BranchesPage() {
  const [plan, setPlan] = useState<Plan>("free");
  const [branches, setBranches] = useState<
    Array<{ id: string; name: string; slug: string }>
  >([]);
  const [name, setName] = useState("");

  async function load() {
    const res = await fetch("/api/branches");
    const data = await res.json();
    setPlan(data.plan || "free");
    setBranches(data.branches || []);
  }

  useEffect(() => {
    load();
  }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/branches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error || "Failed");
      return;
    }
    toast.success("Branch created");
    setName("");
    load();
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Branches</h1>
        <p className="text-sm text-stone-500">Multiple locations on Pro</p>
      </div>
      {plan !== "pro" && <UpgradeBanner plan={plan} feature="Multiple branches" />}

      <form onSubmit={add} className="flex gap-2">
        <div className="flex-1 space-y-2">
          <Label>New branch name</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={plan !== "pro"}
            required
          />
        </div>
        <Button type="submit" className="mt-7" disabled={plan !== "pro"}>
          Add
        </Button>
      </form>

      <ul className="space-y-2">
        {branches.map((b) => (
          <li
            key={b.id}
            className="flex items-center justify-between rounded-lg border bg-white px-3 py-2 text-sm"
          >
            <span>
              {b.name} · /{b.slug}
            </span>
            {branches.length > 1 && (
              <Button
                size="sm"
                variant="ghost"
                onClick={async () => {
                  if (!confirm("Delete this branch and its menu?")) return;
                  const res = await fetch(`/api/branches?id=${b.id}`, { method: "DELETE" });
                  if (!res.ok) {
                    const data = await res.json();
                    toast.error(data.error || "Failed");
                    return;
                  }
                  load();
                }}
              >
                Delete
              </Button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
