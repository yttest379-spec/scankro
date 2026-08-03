"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

type Hours = Record<string, { open: string; close: string; closed?: boolean }>;

export default function RestaurantPage() {
  const searchParams = useSearchParams();
  const branch = searchParams.get("branch") || undefined;
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [hours, setHours] = useState<Hours>({});
  const [socials, setSocials] = useState({
    instagram: "",
    facebook: "",
    twitter: "",
    website: "",
  });
  const [timezone, setTimezone] = useState("Asia/Kolkata");

  useEffect(() => {
    fetch(`/api/branch?branch=${branch || ""}`)
      .then((r) => r.json())
      .then((data) => {
        if (!data.branch) return;
        const b = data.branch;
        setName(b.name || "");
        setSlug(b.slug || "");
        setAddress(b.address || "");
        setPhone(b.phone || "");
        setHours((b.hours as Hours) || {});
        setSocials({
          instagram: (b.socials as { instagram?: string })?.instagram || "",
          facebook: (b.socials as { facebook?: string })?.facebook || "",
          twitter: (b.socials as { twitter?: string })?.twitter || "",
          website: (b.socials as { website?: string })?.website || "",
        });
        setTimezone(b.timezone || "Asia/Kolkata");
      });
  }, [branch]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/branch", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        slug,
        address,
        phone,
        hours,
        socials,
        timezone,
        branchId: branch,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(typeof data.error === "string" ? data.error : "Save failed");
      return;
    }
    toast.success("Restaurant saved");
    if (data.branch?.slug) setSlug(data.branch.slug);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Restaurant</h1>
        <p className="text-sm text-stone-500">Profile shown on your public menu</p>
      </div>

      <form onSubmit={save} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Basics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>URL slug</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-stone-400">/</span>
                <Input value={slug} onChange={(e) => setSlug(e.target.value)} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Textarea value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Timezone</Label>
              <Input value={timezone} onChange={(e) => setTimezone(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Opening hours</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {DAYS.map((day) => {
              const row = hours[day] || { open: "10:00", close: "22:00", closed: false };
              return (
                <div key={day} className="grid grid-cols-4 items-center gap-2">
                  <span className="text-sm capitalize text-stone-600">{day}</span>
                  <Input
                    type="time"
                    value={row.open}
                    disabled={row.closed}
                    onChange={(e) =>
                      setHours({ ...hours, [day]: { ...row, open: e.target.value } })
                    }
                  />
                  <Input
                    type="time"
                    value={row.close}
                    disabled={row.closed}
                    onChange={(e) =>
                      setHours({ ...hours, [day]: { ...row, close: e.target.value } })
                    }
                  />
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={!!row.closed}
                      onChange={(e) =>
                        setHours({ ...hours, [day]: { ...row, closed: e.target.checked } })
                      }
                    />
                    Closed
                  </label>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Social links</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(["instagram", "facebook", "twitter", "website"] as const).map((key) => (
              <div key={key} className="space-y-1">
                <Label className="capitalize">{key}</Label>
                <Input
                  value={socials[key]}
                  onChange={(e) => setSocials({ ...socials, [key]: e.target.value })}
                  placeholder="https://"
                />
              </div>
            ))}
          </CardContent>
        </Card>

        <Button type="submit">Save restaurant</Button>
      </form>
    </div>
  );
}
