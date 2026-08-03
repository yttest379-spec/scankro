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
    assertFeature(ws.plan, "specials");
  } catch (e) {
    if (e instanceof PlanError)
      return NextResponse.json({ error: e.message, specials: [] }, { status: 402 });
  }
  const specials = await prisma.dailySpecial.findMany({
    where: { branchId: ws.branchId },
    include: { menuItem: true },
    orderBy: { activeDate: "desc" },
  });
  return NextResponse.json({ specials });
}

const schema = z.object({
  title: z.string().max(80).optional().nullable(),
  menuItemId: z.string().optional().nullable(),
  customName: z.string().max(120).optional().nullable(),
  customPriceRupees: z.number().min(0).optional().nullable(),
  activeDate: z.string(), // ISO date
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
    assertFeature(ws.plan, "specials");

    const special = await prisma.dailySpecial.create({
      data: {
        branchId: ws.branchId,
        title: parsed.data.title || "Today's Special",
        menuItemId: parsed.data.menuItemId || null,
        customName: parsed.data.customName || null,
        customPrice: parsed.data.customPriceRupees != null
          ? Math.round(parsed.data.customPriceRupees * 100)
          : null,
        activeDate: new Date(parsed.data.activeDate),
        isActive: parsed.data.isActive ?? true,
      },
    });
    revalidateMenu(ws.branchId);
    return NextResponse.json({ special });
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

  await prisma.dailySpecial.deleteMany({
    where: { id: id || "", branchId: ws.branchId },
  });
  revalidateMenu(ws.branchId);
  return NextResponse.json({ ok: true });
}
