import { NextRequest, NextResponse } from "next/server";
import { getWorkspace } from "@/lib/workspace";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const ws = await getWorkspace(req.nextUrl.searchParams.get("branch"));
  if (!ws) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tables = await prisma.tableQr.findMany({
    where: { branchId: ws.branchId },
    orderBy: { tableNumber: "asc" },
  });
  return NextResponse.json({ tables });
}
