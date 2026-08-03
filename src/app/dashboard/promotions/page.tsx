"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { UpgradeBanner } from "@/components/dashboard/upgrade-banner";
import { toast } from "sonner";
import type { Plan } from "@prisma/client";

export default function PromotionsPage() {
  const searchParams = useSearchParams();
  const branch = searchParams.get("branch") || undefined;
  const [plan, setPlan] = useState<Plan>("free");
  const [promotions, setPromotions] = useState<Array<Record<string, unknown>>>([]);
  const [type, setType] = useState("happy_hour");
  const [title, setTitle] = useState("Happy Hour");
  const [description, setDescription] = useState("Buy 1 Get 1");
  const [startTime, setStartTime] = useState("16:00");
  const [endTime, setEndTime] = useState("19:00");

  async function load() {
    const [p, b] = await Promise.all([
      fetch(`/api/promotions?branch=${branch || ""}`),
      fetch(`/api/branch?branch=${branch || ""}`),
    ]);
    setPromotions((await p.json()).promotions || []);
    setPlan((await b.json()).plan || "free");
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branch]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/promotions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        title,
        description,
        startTime,
        endTime,
        daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
        branchId: branch,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error || "Failed");
      return;
    }
    toast.success("Promotion created");
    load();
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Promotions</h1>
        <p className="text-sm text-stone-500">Happy hour, BOGO, and banners by schedule</p>
      </div>
      {plan !== "pro" && <UpgradeBanner plan={plan} feature="Promotions" />}

      <form onSubmit={add} className="space-y-3 rounded-xl border bg-white p-4">
        <div className="space-y-2">
          <Label>Type</Label>
          <Select value={type} onChange={(e) => setType(e.target.value)} disabled={plan !== "pro"}>
            <option value="happy_hour">Happy hour</option>
            <option value="bogo">Buy 1 Get 1</option>
            <option value="banner">Banner</option>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Title</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} disabled={plan !== "pro"} />
        </div>
        <div className="space-y-2">
          <Label>Description</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={plan !== "pro"}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Start</Label>
            <Input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              disabled={plan !== "pro"}
            />
          </div>
          <div className="space-y-2">
            <Label>End</Label>
            <Input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              disabled={plan !== "pro"}
            />
          </div>
        </div>
        <Button type="submit" disabled={plan !== "pro"}>
          Add promotion
        </Button>
      </form>

      <div className="space-y-2">
        {promotions.map((p) => (
          <div
            key={String(p.id)}
            className="flex items-center justify-between rounded-lg border bg-white px-3 py-2 text-sm"
          >
            <span>
              {String(p.title)} · {String(p.startTime)}–{String(p.endTime)}
            </span>
            <Button
              size="sm"
              variant="ghost"
              onClick={async () => {
                await fetch(`/api/promotions?id=${p.id}&branch=${branch || ""}`, {
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
