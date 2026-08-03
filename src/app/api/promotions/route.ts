import { NextRequest, NextResponse } from "next/server";
import { getWorkspace, hasMinRole } from "@/lib/workspace";
import { prisma } from "@/lib/db";
import { assertFeature, PlanError } from "@/lib/guards";
import { revalidateMenu } from "@/lib/cache";
import { z } from "zod";

export async function GET(req: NextRequest) {
  const ws = await getWorkspace(req.nextUrl.searchParams.get("branch"));
  if (!ws) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    assertFeature(ws.plan, "promotions");
  } catch (e) {
    if (e instanceof PlanError)
      return NextResponse.json({ error: e.message, promotions: [] }, { status: 402 });
  }
  const promotions = await prisma.promotion.findMany({
    where: { branchId: ws.branchId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ promotions });
}

const schema = z.object({
  type: z.enum(["happy_hour", "bogo", "banner"]),
  title: z.string().min(1).max(120),
  description: z.string().max(300).optional().nullable(),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  isActive: z.boolean().optional(),
  branchId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    const ws = await getWorkspace(parsed.data.branchId);
    if (!ws) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasMinRole(ws.role, "manager"))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    assertFeature(ws.plan, "promotions");

    const promotion = await prisma.promotion.create({
      data: {
        branchId: ws.branchId,
        type: parsed.data.type,
        title: parsed.data.title,
        description: parsed.data.description || null,
        daysOfWeek: parsed.data.daysOfWeek || [0, 1, 2, 3, 4, 5, 6],
        startTime: parsed.data.startTime || "00:00",
        endTime: parsed.data.endTime || "23:59",
        isActive: parsed.data.isActive ?? true,
      },
    });
    revalidateMenu(ws.branchId);
    return NextResponse.json({ promotion });
  } catch (e) {
    if (e instanceof PlanError)
      return NextResponse.json({ error: e.message }, { status: 402 });
    throw e;
  }
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  const ws = await getWorkspace(req.nextUrl.searchParams.get("branch"));
  if (!ws) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasMinRole(ws.role, "manager"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  await prisma.promotion.deleteMany({
    where: { id: id || "", branchId: ws.branchId },
  });
  revalidateMenu(ws.branchId);
  return NextResponse.json({ ok: true });
}
