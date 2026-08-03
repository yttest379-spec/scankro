import { NextRequest, NextResponse } from "next/server";
import { getWorkspace } from "@/lib/workspace";
import { prisma } from "@/lib/db";
import { assertFeature, PlanError } from "@/lib/guards";
import { rollupAnalytics } from "@/lib/analytics";
import { subDays, startOfDay } from "date-fns";

export async function GET(req: NextRequest) {
  try {
    const ws = await getWorkspace(req.nextUrl.searchParams.get("branch"));
    if (!ws) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    assertFeature(ws.plan, "analytics");

    const days = Number(req.nextUrl.searchParams.get("days") || "30");
    const since = startOfDay(subDays(new Date(), days));

    // Ensure recent days are rolled up
    for (let i = 0; i < Math.min(days, 14); i++) {
      await rollupAnalytics(ws.branchId, subDays(new Date(), i));
    }

    const daily = await prisma.analyticsDaily.findMany({
      where: { branchId: ws.branchId, dayBucket: { gte: since } },
      orderBy: { dayBucket: "asc" },
    });

    const events = await prisma.analyticsEvent.findMany({
      where: { branchId: ws.branchId, createdAt: { gte: since } },
      select: {
        type: true,
        itemId: true,
        categoryId: true,
        hour: true,
        visitorHash: true,
        dayBucket: true,
      },
    });

    const itemCounts: Record<string, number> = {};
    const categoryCounts: Record<string, number> = {};
    const hourCounts: Record<number, number> = {};
    let scansToday = 0;
    const today = startOfDay(new Date());

    for (const e of events) {
      hourCounts[e.hour] = (hourCounts[e.hour] || 0) + 1;
      if (e.type === "item_view" && e.itemId)
        itemCounts[e.itemId] = (itemCounts[e.itemId] || 0) + 1;
      if (e.type === "category_view" && e.categoryId)
        categoryCounts[e.categoryId] = (categoryCounts[e.categoryId] || 0) + 1;
      if (e.type === "scan" && e.dayBucket >= today) scansToday += 1;
    }

    const topItemIds = Object.entries(itemCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);
    const topCatIds = Object.entries(categoryCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);

    const items = await prisma.menuItem.findMany({
      where: { id: { in: topItemIds.map(([id]) => id) } },
      select: { id: true, name: true },
    });
    const cats = await prisma.category.findMany({
      where: { id: { in: topCatIds.map(([id]) => id) } },
      select: { id: true, name: true },
    });
    const itemName = Object.fromEntries(items.map((i) => [i.id, i.name]));
    const catName = Object.fromEntries(cats.map((c) => [c.id, c.name]));

    const weekScans = daily
      .filter((d) => d.dayBucket >= subDays(new Date(), 7))
      .reduce((s, d) => s + d.scans, 0);
    const monthScans = daily.reduce((s, d) => s + d.scans, 0);
    const returning = daily.reduce((s, d) => s + d.returningVisitors, 0);

    return NextResponse.json({
      scansToday,
      weekScans,
      monthScans,
      returningApprox: returning,
      daily: daily.map((d) => ({
        date: d.dayBucket,
        scans: d.scans,
        itemViews: d.itemViews,
        uniqueVisitors: d.uniqueVisitors,
        returningVisitors: d.returningVisitors,
      })),
      topItems: topItemIds.map(([id, count]) => ({
        id,
        name: itemName[id] || id,
        count,
      })),
      topCategories: topCatIds.map(([id, count]) => ({
        id,
        name: catName[id] || id,
        count,
      })),
      peakHours: Object.entries(hourCounts)
        .map(([h, count]) => ({ hour: Number(h), count }))
        .sort((a, b) => a.hour - b.hour),
    });
  } catch (e) {
    if (e instanceof PlanError)
      return NextResponse.json({ error: e.message }, { status: 402 });
    throw e;
  }
}
