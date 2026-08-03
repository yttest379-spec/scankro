import { NextRequest, NextResponse } from "next/server";
import { getWorkspace, hasMinRole } from "@/lib/workspace";
import { prisma } from "@/lib/db";
import { revalidateMenu } from "@/lib/cache";
import { canAddMenuItem } from "@/lib/plans";
import { PlanError } from "@/lib/guards";
import { z } from "zod";

export async function GET(req: NextRequest) {
  const branchId = req.nextUrl.searchParams.get("branch");
  const ws = await getWorkspace(branchId);
  if (!ws) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const items = await prisma.menuItem.findMany({
    where: { branchId: ws.branchId, deletedAt: null },
    orderBy: [{ category: { sortOrder: "asc" } }, { sortOrder: "asc" }],
    include: { category: { select: { id: true, name: true } } },
  });

  const count = items.length;
  return NextResponse.json({ items, count, plan: ws.plan });
}

const createSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(1000).optional().nullable(),
  priceRupees: z.number().min(0),
  categoryId: z.string(),
  imageUrl: z.string().optional().nullable(),
  isVeg: z.boolean().optional(),
  spicyLevel: z.number().int().min(0).max(3).optional(),
  prepMinutes: z.number().int().min(0).max(600).optional().nullable(),
  isPopular: z.boolean().optional(),
  isAvailable: z.boolean().optional(),
  branchId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    const ws = await getWorkspace(parsed.data.branchId);
    if (!ws) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasMinRole(ws.role, "manager"))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const category = await prisma.category.findFirst({
      where: { id: parsed.data.categoryId, branchId: ws.branchId, deletedAt: null },
    });
    if (!category)
      return NextResponse.json({ error: "Category not found" }, { status: 404 });

    const count = await prisma.menuItem.count({
      where: { branchId: ws.branchId, deletedAt: null },
    });
    if (!canAddMenuItem(ws.plan, count)) {
      throw new PlanError("Free plan allows up to 20 menu items. Upgrade to add more.");
    }

    const maxOrder = await prisma.menuItem.aggregate({
      where: { categoryId: parsed.data.categoryId },
      _max: { sortOrder: true },
    });

    const item = await prisma.menuItem.create({
      data: {
        name: parsed.data.name,
        description: parsed.data.description || null,
        price: Math.round(parsed.data.priceRupees * 100),
        categoryId: parsed.data.categoryId,
        branchId: ws.branchId,
        imageUrl: parsed.data.imageUrl || null,
        isVeg: parsed.data.isVeg ?? true,
        spicyLevel: parsed.data.spicyLevel ?? 0,
        prepMinutes: parsed.data.prepMinutes ?? null,
        isPopular: parsed.data.isPopular ?? false,
        isAvailable: parsed.data.isAvailable ?? true,
        sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
      },
    });

    revalidateMenu(ws.branchId);
    return NextResponse.json({ item });
  } catch (e) {
    if (e instanceof PlanError)
      return NextResponse.json({ error: e.message }, { status: 402 });
    throw e;
  }
}
