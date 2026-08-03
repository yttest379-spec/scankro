"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { UpgradeBanner } from "@/components/dashboard/upgrade-banner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Plan } from "@prisma/client";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Line,
  LineChart,
} from "recharts";

type Analytics = {
  scansToday: number;
  weekScans: number;
  monthScans: number;
  returningApprox: number;
  daily: Array<{ date: string; scans: number; uniqueVisitors: number }>;
  topItems: Array<{ name: string; count: number }>;
  topCategories: Array<{ name: string; count: number }>;
  peakHours: Array<{ hour: number; count: number }>;
};

export default function AnalyticsPage() {
  const searchParams = useSearchParams();
  const branch = searchParams.get("branch") || undefined;
  const [plan, setPlan] = useState<Plan>("free");
  const [data, setData] = useState<Analytics | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/branch?branch=${branch || ""}`)
      .then((r) => r.json())
      .then((d) => setPlan(d.plan || "free"));

    fetch(`/api/analytics?branch=${branch || ""}&days=30`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) {
          setError(d.error || "Unavailable");
          return;
        }
        setData(d);
      });
  }, [branch]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Analytics</h1>
        <p className="text-sm text-stone-500">QR scans, popular dishes, peak hours</p>
      </div>
      {plan !== "pro" && <UpgradeBanner plan={plan} feature="Analytics" />}
      {error && plan === "pro" && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      {data && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Scans today", data.scansToday],
              ["This week", data.weekScans],
              ["This month", data.monthScans],
              ["Returning (approx)", data.returningApprox],
            ].map(([label, value]) => (
              <Card key={String(label)}>
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-stone-500">
                    {label}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-semibold">{value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Scans over time</CardTitle>
            </CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={data.daily.map((d) => ({
                    ...d,
                    date: String(d.date).slice(5, 10),
                  }))}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Line type="monotone" dataKey="scans" stroke="#0f766e" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Peak hours (UTC events)</CardTitle>
              </CardHeader>
              <CardContent className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.peakHours}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" fontSize={12} />
                    <YAxis fontSize={12} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#0f766e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Top dishes</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  {data.topItems.length === 0 && (
                    <li className="text-stone-400">No item views yet</li>
                  )}
                  {data.topItems.map((i) => (
                    <li key={i.name} className="flex justify-between border-b border-stone-100 py-1">
                      <span>{i.name}</span>
                      <span className="text-stone-500">{i.count}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Top categories</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                {data.topCategories.map((c) => (
                  <li key={c.name} className="flex justify-between border-b border-stone-100 py-1">
                    <span>{c.name}</span>
                    <span className="text-stone-500">{c.count}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
