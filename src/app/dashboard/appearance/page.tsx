"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { FONT_OPTIONS } from "@/lib/types";
// client-safe font options
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AppearancePage() {
  const searchParams = useSearchParams();
  const branch = searchParams.get("branch") || undefined;
  const [theme, setTheme] = useState({
    primaryColor: "#0F766E",
    accentColor: "#F59E0B",
    font: "geist",
  });
  const [logoUrl, setLogoUrl] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [backgroundUrl, setBackgroundUrl] = useState("");
  const [customBranding, setCustomBranding] = useState(false);

  useEffect(() => {
    fetch(`/api/branch?branch=${branch || ""}`)
      .then((r) => r.json())
      .then((data) => {
        if (!data.branch) return;
        const t = (data.branch.theme || {}) as typeof theme;
        setTheme({
          primaryColor: t.primaryColor || "#0F766E",
          accentColor: t.accentColor || "#F59E0B",
          font: t.font || "geist",
        });
        setLogoUrl(data.branch.logoUrl || "");
        setCoverUrl(data.branch.coverUrl || "");
        setBackgroundUrl(data.branch.backgroundUrl || "");
        setCustomBranding(!!data.limits?.customBranding);
      });
  }, [branch]);

  async function upload(file: File, field: "logoUrl" | "coverUrl" | "backgroundUrl") {
    const prep = await fetch("/api/uploads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contentType: file.type, folder: "brand" }),
    });
    const { uploadUrl, publicUrl, mode } = await prep.json();
    let url = publicUrl;
    if (mode === "local") {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(uploadUrl, { method: "POST", body: fd });
      const data = await res.json();
      url = data.publicUrl;
    } else {
      await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
    }
    if (field === "logoUrl") setLogoUrl(url);
    if (field === "coverUrl") setCoverUrl(url);
    if (field === "backgroundUrl") setBackgroundUrl(url);
    toast.success("Uploaded");
  }

  async function save() {
    const res = await fetch("/api/branch", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        theme,
        logoUrl,
        coverUrl,
        backgroundUrl,
        branchId: branch,
      }),
    });
    if (!res.ok) {
      toast.error("Failed to save");
      return;
    }
    toast.success("Appearance saved");
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Appearance</h1>
        <p className="text-sm text-stone-500">
          {customBranding
            ? "Brand your public menu"
            : "Free plan: primary color only. Upgrade for full branding."}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Colors & font</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Primary color</Label>
            <div className="flex gap-2">
              <Input
                type="color"
                className="h-10 w-14 p-1"
                value={theme.primaryColor}
                onChange={(e) => setTheme({ ...theme, primaryColor: e.target.value })}
              />
              <Input
                value={theme.primaryColor}
                onChange={(e) => setTheme({ ...theme, primaryColor: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Accent color</Label>
            <div className="flex gap-2">
              <Input
                type="color"
                className="h-10 w-14 p-1"
                disabled={!customBranding}
                value={theme.accentColor}
                onChange={(e) => setTheme({ ...theme, accentColor: e.target.value })}
              />
              <Input
                disabled={!customBranding}
                value={theme.accentColor}
                onChange={(e) => setTheme({ ...theme, accentColor: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Font</Label>
            <Select
              disabled={!customBranding}
              value={theme.font}
              onChange={(e) => setTheme({ ...theme, font: e.target.value })}
            >
              {FONT_OPTIONS.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Images</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {(
            [
              ["logoUrl", "Logo", logoUrl],
              ["coverUrl", "Cover photo", coverUrl],
              ["backgroundUrl", "Background image", backgroundUrl],
            ] as const
          ).map(([field, label, value]) => (
            <div key={field} className="space-y-2">
              <Label>{label}</Label>
              <Input
                type="file"
                accept="image/*"
                disabled={!customBranding && field !== "logoUrl"}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) upload(file, field);
                }}
              />
              {value && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={value} alt="" className="h-16 rounded-lg object-cover" />
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <div
        className="rounded-xl p-6 text-white"
        style={{ background: theme.primaryColor, fontFamily: "inherit" }}
      >
        <p className="text-sm opacity-80">Preview header</p>
        <p className="text-2xl font-semibold">Your restaurant</p>
        <span
          className="mt-2 inline-block rounded-md px-2 py-1 text-xs font-medium text-stone-900"
          style={{ background: theme.accentColor }}
        >
          Accent badge
        </span>
      </div>

      <Button onClick={save}>Save appearance</Button>
    </div>
  );
}
