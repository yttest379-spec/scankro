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
    assertFeature(ws.plan, "seasonal");
  } catch (e) {
    if (e instanceof PlanError)
      return NextResponse.json({ error: e.message, menus: [] }, { status: 402 });
  }
  const menus = await prisma.seasonalMenu.findMany({
    where: { branchId: ws.branchId },
    include: { categories: true, items: true },
    orderBy: { startAt: "desc" },
  });
  return NextResponse.json({ menus });
}

const schema = z.object({
  name: z.string().min(1).max(120),
  startAt: z.string(),
  endAt: z.string(),
  categoryIds: z.array(z.string()).optional(),
  itemIds: z.array(z.string()).optional(),
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
    assertFeature(ws.plan, "seasonal");

    const menu = await prisma.seasonalMenu.create({
      data: {
        branchId: ws.branchId,
        name: parsed.data.name,
        startAt: new Date(parsed.data.startAt),
        endAt: new Date(parsed.data.endAt),
        isActive: parsed.data.isActive ?? true,
        categories: {
          create: (parsed.data.categoryIds || []).map((categoryId) => ({
            categoryId,
          })),
        },
        items: {
          create: (parsed.data.itemIds || []).map((menuItemId) => ({
            menuItemId,
          })),
        },
      },
      include: { categories: true, items: true },
    });
    revalidateMenu(ws.branchId);
    return NextResponse.json({ menu });
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
  await prisma.seasonalMenu.deleteMany({
    where: { id: id || "", branchId: ws.branchId },
  });
  revalidateMenu(ws.branchId);
  return NextResponse.json({ ok: true });
}
