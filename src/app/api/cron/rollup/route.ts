import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { rollupAnalytics } from "@/lib/analytics";
import { subDays } from "date-fns";

export async function GET() {
  const branches = await prisma.branch.findMany({ select: { id: true } });
  for (const b of branches) {
    for (let i = 0; i < 2; i++) {
      await rollupAnalytics(b.id, subDays(new Date(), i));
    }
  }
  return NextResponse.json({ ok: true, branches: branches.length });
}
