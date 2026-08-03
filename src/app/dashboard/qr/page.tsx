"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { UpgradeBanner } from "@/components/dashboard/upgrade-banner";
import type { Plan } from "@prisma/client";

type TableQr = { id: string; tableNumber: number; label: string | null };

export default function QrPage() {
  const searchParams = useSearchParams();
  const branch = searchParams.get("branch") || undefined;
  const [slug, setSlug] = useState("");
  const [plan, setPlan] = useState<Plan>("free");
  const [tableNumber, setTableNumber] = useState("1");
  const [tables, setTables] = useState<TableQr[]>([]);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/branch?branch=${branch || ""}`)
      .then((r) => r.json())
      .then((data) => {
        setSlug(data.branch?.slug || "");
        setPlan(data.plan || "free");
      });
    // load tables via list from branch - fetch qr pages won't list; use branch tables from a dedicated call
    // We'll store tables by POSTing - need list. Reuse POST list from GET analytics-style.
    // Add simple load: hit /api/qr tables by fetching branch tables - implement via prisma in branch GET?
  }, [branch]);

  useEffect(() => {
    // pull tables from a lightweight fetch - extend branch? For now fetch via re-query after create
    async function loadTables() {
      // Hack: use POST not available. Add temporary GET list by fetching specials pattern
      // We'll store in state only after create; also call a custom endpoint
      const res = await fetch(`/api/qr/list?branch=${branch || ""}`);
      if (res.ok) {
        const data = await res.json();
        setTables(data.tables || []);
      }
    }
    loadTables();
  }, [branch]);

  useEffect(() => {
    if (!branch && !slug) return;
    setPreview(`/api/qr?format=png&branch=${branch || ""}`);
  }, [branch, slug]);

  function download(format: string, table?: number) {
    const params = new URLSearchParams({ format, branch: branch || "" });
    if (table) params.set("table", String(table));
    window.location.href = `/api/qr?${params.toString()}`;
  }

  async function addTable(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/qr", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tableNumber: Number(tableNumber),
        label: `Table ${tableNumber}`,
        branchId: branch,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error || "Failed");
      return;
    }
    toast.success("Table QR added");
    setTables((t) => {
      const rest = t.filter((x) => x.tableNumber !== data.table.tableNumber);
      return [...rest, data.table].sort((a, b) => a.tableNumber - b.tableNumber);
    });
  }

  async function removeTable(n: number) {
    await fetch(`/api/qr?tableNumber=${n}&branch=${branch || ""}`, { method: "DELETE" });
    setTables((t) => t.filter((x) => x.tableNumber !== n));
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">QR codes</h1>
        <p className="text-sm text-stone-500">
          Print and place on tables. Points to{" "}
          <span className="font-medium text-stone-700">/{slug}</span>
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Master QR</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-start gap-4 sm:flex-row">
          {preview && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview}
              alt="QR code"
              className="h-44 w-44 rounded-xl border border-stone-200 bg-white p-2"
            />
          )}
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => download("png")}>Download PNG</Button>
            <Button variant="outline" onClick={() => download("svg")}>
              SVG
            </Button>
            <Button variant="outline" onClick={() => download("pdf")}>
              PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-lg font-semibold">Table QRs</h2>
        <p className="text-sm text-stone-500">Pro: unique QR per table for analytics (and future ordering)</p>
        {plan !== "pro" && <UpgradeBanner plan={plan} feature="Table-level QR codes" className="mt-3" />}

        <form onSubmit={addTable} className="mt-4 flex gap-2">
          <Input
            type="number"
            min={1}
            value={tableNumber}
            onChange={(e) => setTableNumber(e.target.value)}
            className="w-28"
          />
          <Button type="submit" disabled={plan !== "pro"}>
            Add table
          </Button>
          {tables.length > 0 && plan === "pro" && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                window.location.href = `/api/qr?bulk=1&branch=${branch || ""}`;
              }}
            >
              Download all PDF ZIP
            </Button>
          )}
        </form>

        <div className="mt-4 space-y-2">
          {tables.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between rounded-lg border border-stone-200 bg-white px-3 py-2"
            >
              <span className="text-sm">
                {t.label || `Table ${t.tableNumber}`} · /t/{slug}/{t.tableNumber}
              </span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => download("png", t.tableNumber)}>
                  PNG
                </Button>
                <Button size="sm" variant="outline" onClick={() => download("pdf", t.tableNumber)}>
                  PDF
                </Button>
                <Button size="sm" variant="ghost" onClick={() => removeTable(t.tableNumber)}>
                  Remove
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
