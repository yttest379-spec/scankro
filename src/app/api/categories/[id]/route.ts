import { NextRequest, NextResponse } from "next/server";
import { getWorkspace, hasMinRole } from "@/lib/workspace";
import { prisma } from "@/lib/db";
import { revalidateMenu } from "@/lib/cache";
import { z } from "zod";

const patchSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  sortOrder: z.number().int().optional(),
});

async function getOwnedCategory(id: string) {
  const category = await prisma.category.findFirst({
    where: { id, deletedAt: null },
    include: { branch: true },
  });
  if (!category) return null;
  const ws = await getWorkspace(category.branchId);
  if (!ws || ws.organizationId !== category.branch.organizationId) return null;
  return { category, ws };
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const owned = await getOwnedCategory(id);
  if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!hasMinRole(owned.ws.role, "manager"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const category = await prisma.category.update({
    where: { id },
    data: parsed.data,
  });
  revalidateMenu(owned.ws.branchId);
  return NextResponse.json({ category });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const owned = await getOwnedCategory(id);
  if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!hasMinRole(owned.ws.role, "manager"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.category.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
  revalidateMenu(owned.ws.branchId);
  return NextResponse.json({ ok: true });
}
