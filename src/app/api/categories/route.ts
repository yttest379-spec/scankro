import { NextRequest, NextResponse } from "next/server";
import { getWorkspace, hasMinRole } from "@/lib/workspace";
import { prisma } from "@/lib/db";
import { revalidateMenu } from "@/lib/cache";
import { z } from "zod";

export async function GET(req: NextRequest) {
  const branchId = req.nextUrl.searchParams.get("branch");
  const ws = await getWorkspace(branchId);
  if (!ws) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const categories = await prisma.category.findMany({
    where: { branchId: ws.branchId, deletedAt: null },
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { items: true } } },
  });

  return NextResponse.json({ categories });
}

const createSchema = z.object({
  name: z.string().min(1).max(80),
  branchId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const ws = await getWorkspace(parsed.data.branchId);
  if (!ws) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasMinRole(ws.role, "manager"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const maxOrder = await prisma.category.aggregate({
    where: { branchId: ws.branchId },
    _max: { sortOrder: true },
  });

  const category = await prisma.category.create({
    data: {
      name: parsed.data.name,
      branchId: ws.branchId,
      sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
    },
  });

  revalidateMenu(ws.branchId);
  return NextResponse.json({ category });
}
