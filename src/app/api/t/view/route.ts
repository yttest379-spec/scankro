import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashVisitor, trackEvent } from "@/lib/analytics";
import { rateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const schema = z.object({
  type: z.enum(["scan", "item_view", "category_view"]),
  branchId: z.string(),
  tableNumber: z.number().int().optional().nullable(),
  itemId: z.string().optional().nullable(),
  categoryId: z.string().optional().nullable(),
});

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  const ua = req.headers.get("user-agent") || "";

  if (/bot|crawl|spider|slurp|preview/i.test(ua)) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const rl = rateLimit(`view:${ip}`, 120, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Rate limited" }, { status: 429 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid" }, { status: 400 });

  const branch = await prisma.branch.findUnique({
    where: { id: parsed.data.branchId },
    select: { id: true },
  });
  if (!branch) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const visitorHash = hashVisitor(ip, ua);
  await trackEvent({
    type: parsed.data.type,
    branchId: parsed.data.branchId,
    tableNumber: parsed.data.tableNumber,
    itemId: parsed.data.itemId,
    categoryId: parsed.data.categoryId,
    visitorHash,
  });

  return NextResponse.json({ ok: true });
}
