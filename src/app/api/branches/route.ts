import { NextRequest, NextResponse } from "next/server";
import { getWorkspace, hasMinRole } from "@/lib/workspace";
import { prisma } from "@/lib/db";
import { assertFeature, PlanError } from "@/lib/guards";
import { canAddBranch } from "@/lib/plans";
import { isReservedSlug, slugify } from "@/lib/utils";
import { nanoid } from "nanoid";
import { z } from "zod";

export async function GET() {
  const ws = await getWorkspace();
  if (!ws) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const branches = await prisma.branch.findMany({
    where: { organizationId: ws.organizationId },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ branches, plan: ws.plan });
}

const schema = z.object({
  name: z.string().min(1).max(120),
  slug: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    const ws = await getWorkspace();
    if (!ws) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasMinRole(ws.role, "owner"))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    assertFeature(ws.plan, "multiBranch");

    const count = await prisma.branch.count({
      where: { organizationId: ws.organizationId },
    });
    if (!canAddBranch(ws.plan, count)) {
      return NextResponse.json({ error: "Branch limit reached" }, { status: 402 });
    }

    let slug = slugify(parsed.data.slug || parsed.data.name) || `branch-${nanoid(6)}`;
    if (isReservedSlug(slug)) slug = `${slug}-${nanoid(4)}`;
    let candidate = slug;
    let i = 0;
    while (await prisma.branch.findUnique({ where: { slug: candidate } })) {
      i += 1;
      candidate = `${slug}-${i}`;
    }

    const branch = await prisma.branch.create({
      data: {
        name: parsed.data.name,
        slug: candidate,
        organizationId: ws.organizationId,
        theme: {
          primaryColor: "#0F766E",
          accentColor: "#F59E0B",
          font: "geist",
        },
        hours: {},
        socials: {},
        locales: ["en"],
      },
    });

    return NextResponse.json({ branch });
  } catch (e) {
    if (e instanceof PlanError)
      return NextResponse.json({ error: e.message }, { status: 402 });
    throw e;
  }
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  const ws = await getWorkspace();
  if (!ws) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasMinRole(ws.role, "owner"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const count = await prisma.branch.count({
    where: { organizationId: ws.organizationId },
  });
  if (count <= 1)
    return NextResponse.json({ error: "Cannot delete the last branch" }, { status: 400 });

  await prisma.branch.deleteMany({
    where: { id: id || "", organizationId: ws.organizationId },
  });
  return NextResponse.json({ ok: true });
}
