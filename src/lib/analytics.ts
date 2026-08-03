import crypto from "crypto";
import { prisma } from "./db";
import type { AnalyticsEventType } from "@prisma/client";

export function hashVisitor(ip: string | null, ua: string | null) {
  const salt = process.env.ANALYTICS_SALT || "scankro";
  return crypto
    .createHash("sha256")
    .update(`${salt}|${ip || "unknown"}|${ua || "unknown"}`)
    .digest("hex")
    .slice(0, 32);
}

export async function trackEvent(input: {
  type: AnalyticsEventType;
  branchId: string;
  tableNumber?: number | null;
  itemId?: string | null;
  categoryId?: string | null;
  visitorHash: string;
}) {
  const now = new Date();
  const dayBucket = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const hour = now.getUTCHours();

  await prisma.analyticsEvent.create({
    data: {
      type: input.type,
      branchId: input.branchId,
      tableNumber: input.tableNumber ?? undefined,
      itemId: input.itemId ?? undefined,
      categoryId: input.categoryId ?? undefined,
      visitorHash: input.visitorHash,
      hour,
      dayBucket,
    },
  });
}

export async function rollupAnalytics(branchId: string, day: Date) {
  const dayBucket = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate()));
  const nextDay = new Date(dayBucket);
  nextDay.setUTCDate(nextDay.getUTCDate() + 1);

  const events = await prisma.analyticsEvent.findMany({
    where: {
      branchId,
      dayBucket: { gte: dayBucket, lt: nextDay },
    },
  });

  const hourBuckets: Record<string, number> = {};
  const itemCounts: Record<string, number> = {};
  const categoryCounts: Record<string, number> = {};
  const visitors = new Set<string>();
  let scans = 0;
  let itemViews = 0;
  let categoryViews = 0;

  for (const e of events) {
    visitors.add(e.visitorHash);
    hourBuckets[String(e.hour)] = (hourBuckets[String(e.hour)] || 0) + 1;
    if (e.type === "scan") scans += 1;
    if (e.type === "item_view") {
      itemViews += 1;
      if (e.itemId) itemCounts[e.itemId] = (itemCounts[e.itemId] || 0) + 1;
    }
    if (e.type === "category_view") {
      categoryViews += 1;
      if (e.categoryId)
        categoryCounts[e.categoryId] = (categoryCounts[e.categoryId] || 0) + 1;
    }
  }

  // Returning: visitors who also had events on a previous day for this branch
  let returningVisitors = 0;
  if (visitors.size > 0) {
    const prev = await prisma.analyticsEvent.findMany({
      where: {
        branchId,
        dayBucket: { lt: dayBucket },
        visitorHash: { in: [...visitors] },
      },
      select: { visitorHash: true },
      distinct: ["visitorHash"],
    });
    returningVisitors = prev.length;
  }

  const topItems = Object.entries(itemCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([id, count]) => ({ id, count }));

  const topCategories = Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([id, count]) => ({ id, count }));

  await prisma.analyticsDaily.upsert({
    where: {
      branchId_dayBucket: { branchId, dayBucket },
    },
    create: {
      branchId,
      dayBucket,
      scans,
      itemViews,
      categoryViews,
      uniqueVisitors: visitors.size,
      returningVisitors,
      hourBuckets,
      topItems,
      topCategories,
    },
    update: {
      scans,
      itemViews,
      categoryViews,
      uniqueVisitors: visitors.size,
      returningVisitors,
      hourBuckets,
      topItems,
      topCategories,
    },
  });
}
