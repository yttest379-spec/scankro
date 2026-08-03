import { NextRequest, NextResponse } from "next/server";
import { getWorkspace, hasMinRole } from "@/lib/workspace";
import { prisma } from "@/lib/db";
import { revalidateMenu } from "@/lib/cache";
import { z } from "zod";

const reorderSchema = z.object({
  orderedIds: z.array(z.string()).min(1),
  branchId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = reorderSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const ws = await getWorkspace(parsed.data.branchId);
  if (!ws) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasMinRole(ws.role, "manager"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.$transaction(
    parsed.data.orderedIds.map((id, index) =>
      prisma.category.updateMany({
        where: { id, branchId: ws.branchId },
        data: { sortOrder: index },
      })
    )
  );

  revalidateMenu(ws.branchId);
  return NextResponse.json({ ok: true });
}
