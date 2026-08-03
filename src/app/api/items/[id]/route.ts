import { NextRequest, NextResponse } from "next/server";
import { getWorkspace, hasMinRole } from "@/lib/workspace";
import { prisma } from "@/lib/db";
import { revalidateMenu } from "@/lib/cache";
import { z } from "zod";

const patchSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(1000).optional().nullable(),
  priceRupees: z.number().min(0).optional(),
  categoryId: z.string().optional(),
  imageUrl: z.string().optional().nullable(),
  isVeg: z.boolean().optional(),
  spicyLevel: z.number().int().min(0).max(3).optional(),
  prepMinutes: z.number().int().min(0).max(600).optional().nullable(),
  isPopular: z.boolean().optional(),
  isAvailable: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

async function getOwnedItem(id: string) {
  const item = await prisma.menuItem.findFirst({
    where: { id, deletedAt: null },
    include: { branch: true },
  });
  if (!item) return null;
  const ws = await getWorkspace(item.branchId);
  if (!ws || ws.organizationId !== item.branch.organizationId) return null;
  return { item, ws };
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const owned = await getOwnedItem(id);
  if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  // staff can only toggle availability
  const onlyAvailability =
    Object.keys(parsed.data).length === 1 && parsed.data.isAvailable !== undefined;
  if (!onlyAvailability && !hasMinRole(owned.ws.role, "manager"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (onlyAvailability && !hasMinRole(owned.ws.role, "staff"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const data: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.priceRupees !== undefined) {
    data.price = Math.round(parsed.data.priceRupees * 100);
    delete data.priceRupees;
  }

  const item = await prisma.menuItem.update({
    where: { id },
    data,
  });
  revalidateMenu(owned.ws.branchId);
  return NextResponse.json({ item });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const owned = await getOwnedItem(id);
  if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!hasMinRole(owned.ws.role, "manager"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.menuItem.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
  revalidateMenu(owned.ws.branchId);
  return NextResponse.json({ ok: true });
}
