"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UpgradeBanner } from "@/components/dashboard/upgrade-banner";
import { localeLabel } from "@/lib/types";
import { toast } from "sonner";
import type { Plan } from "@prisma/client";

export default function LanguagesPage() {
  const searchParams = useSearchParams();
  const branch = searchParams.get("branch") || undefined;
  const [plan, setPlan] = useState<Plan>("free");
  const [locales, setLocales] = useState<string[]>(["en"]);
  const [supported, setSupported] = useState<string[]>([]);
  const [categories, setCategories] = useState<
    Array<{
      id: string;
      name: string;
      translations: Array<{ locale: string; name: string }>;
      items: Array<{
        id: string;
        name: string;
        description: string | null;
        translations: Array<{ locale: string; name: string; description: string | null }>;
      }>;
    }>
  >([]);
  const [editLocale, setEditLocale] = useState("hi");

  async function load() {
    const res = await fetch(`/api/languages?branch=${branch || ""}`);
    const data = await res.json();
    setPlan(data.plan || "free");
    setLocales(data.locales || ["en"]);
    setSupported(data.supported || []);
    setCategories(data.categories || []);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branch]);

  async function toggleLocale(code: string) {
    let next = locales.includes(code)
      ? locales.filter((l) => l !== code)
      : [...locales, code];
    if (!next.includes("en")) next = ["en", ...next];
    const res = await fetch("/api/languages", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locales: next, branchId: branch }),
    });
    if (!res.ok) {
      const data = await res.json();
      toast.error(data.error || "Failed");
      return;
    }
    setLocales(next);
    toast.success("Locales updated");
  }

  async function saveTranslation(
    type: "category" | "item",
    entityId: string,
    name: string,
    description?: string
  ) {
    const res = await fetch("/api/languages", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        entityId,
        locale: editLocale,
        name,
        description,
        branchId: branch,
      }),
    });
    if (!res.ok) {
      toast.error("Save failed");
      return;
    }
    toast.success("Translation saved");
    load();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Languages</h1>
        <p className="text-sm text-stone-500">English, Hindi, Kannada, Tamil, Telugu</p>
      </div>
      {plan !== "pro" && <UpgradeBanner plan={plan} feature="Multi-language menus" />}

      <div className="flex flex-wrap gap-2">
        {supported.map((code) => (
          <button
            key={code}
            type="button"
            disabled={plan !== "pro" || code === "en"}
            onClick={() => toggleLocale(code)}
            className={`rounded-full px-3 py-1.5 text-sm ${
              locales.includes(code)
                ? "bg-teal-700 text-white"
                : "bg-stone-100 text-stone-700"
            }`}
          >
            {localeLabel(code)}
          </button>
        ))}
      </div>

      {locales.filter((l) => l !== "en").length > 0 && plan === "pro" && (
        <>
          <div className="space-y-2">
            <Label>Editing language</Label>
            <select
              className="h-10 rounded-lg border border-stone-300 px-3 text-sm"
              value={editLocale}
              onChange={(e) => setEditLocale(e.target.value)}
            >
              {locales
                .filter((l) => l !== "en")
                .map((l) => (
                  <option key={l} value={l}>
                    {localeLabel(l)}
                  </option>
                ))}
            </select>
          </div>

          <div className="space-y-4">
            {categories.map((cat) => {
              const existing = cat.translations.find((t) => t.locale === editLocale);
              return (
                <div key={cat.id} className="rounded-xl border bg-white p-4">
                  <p className="text-xs text-stone-400">Category · EN: {cat.name}</p>
                  <div className="mt-2 flex gap-2">
                    <Input
                      defaultValue={existing?.name || ""}
                      placeholder={`${localeLabel(editLocale)} name`}
                      id={`cat-${cat.id}`}
                    />
                    <Button
                      size="sm"
                      onClick={() => {
                        const el = document.getElementById(
                          `cat-${cat.id}`
                        ) as HTMLInputElement;
                        saveTranslation("category", cat.id, el.value);
                      }}
                    >
                      Save
                    </Button>
                  </div>
                  <div className="mt-4 space-y-3 border-t pt-3">
                    {cat.items.map((item) => {
                      const tr = item.translations.find((t) => t.locale === editLocale);
                      return (
                        <div key={item.id} className="grid gap-2 sm:grid-cols-2">
                          <div>
                            <p className="text-xs text-stone-400">EN: {item.name}</p>
                            <Input
                              defaultValue={tr?.name || ""}
                              placeholder="Translated name"
                              id={`item-n-${item.id}`}
                            />
                          </div>
                          <div>
                            <p className="text-xs text-stone-400">Description</p>
                            <div className="flex gap-2">
                              <Input
                                defaultValue={tr?.description || ""}
                                placeholder="Translated description"
                                id={`item-d-${item.id}`}
                              />
                              <Button
                                size="sm"
                                onClick={() => {
                                  const n = document.getElementById(
                                    `item-n-${item.id}`
                                  ) as HTMLInputElement;
                                  const d = document.getElementById(
                                    `item-d-${item.id}`
                                  ) as HTMLInputElement;
                                  saveTranslation("item", item.id, n.value, d.value);
                                }}
                              >
                                Save
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
