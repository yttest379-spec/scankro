import { NextRequest, NextResponse } from "next/server";
import { getWorkspace, hasMinRole } from "@/lib/workspace";
import { prisma } from "@/lib/db";
import { revalidateMenu } from "@/lib/cache";
import { getPlanLimits } from "@/lib/plans";
import { z } from "zod";
import { isReservedSlug, slugify } from "@/lib/utils";

const branchSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  slug: z.string().min(2).max(48).optional(),
  logoUrl: z.string().optional().nullable(),
  coverUrl: z.string().optional().nullable(),
  backgroundUrl: z.string().optional().nullable(),
  address: z.string().max(300).optional().nullable(),
  phone: z.string().max(30).optional().nullable(),
  hours: z.record(z.string(), z.any()).optional(),
  socials: z.record(z.string(), z.any()).optional(),
  theme: z.record(z.string(), z.any()).optional(),
  locales: z.array(z.string()).optional(),
  timezone: z.string().optional(),
  branchId: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const branchId = req.nextUrl.searchParams.get("branch");
  const ws = await getWorkspace(branchId);
  if (!ws) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const branch = await prisma.branch.findUnique({ where: { id: ws.branchId } });
  return NextResponse.json({ branch, plan: ws.plan, limits: getPlanLimits(ws.plan) });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const parsed = branchSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const ws = await getWorkspace(parsed.data.branchId);
  if (!ws) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasMinRole(ws.role, "manager"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const data: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) data.name = parsed.data.name;
  if (parsed.data.address !== undefined) data.address = parsed.data.address;
  if (parsed.data.phone !== undefined) data.phone = parsed.data.phone;
  if (parsed.data.hours !== undefined) data.hours = parsed.data.hours;
  if (parsed.data.socials !== undefined) data.socials = parsed.data.socials;
  if (parsed.data.timezone !== undefined) data.timezone = parsed.data.timezone;
  if (parsed.data.logoUrl !== undefined) data.logoUrl = parsed.data.logoUrl;
  if (parsed.data.coverUrl !== undefined) data.coverUrl = parsed.data.coverUrl;
  if (parsed.data.backgroundUrl !== undefined)
    data.backgroundUrl = parsed.data.backgroundUrl;

  const limits = getPlanLimits(ws.plan);
  if (parsed.data.theme !== undefined) {
    if (!limits.customBranding) {
      // free: only allow primaryColor limited
      const current = await prisma.branch.findUnique({ where: { id: ws.branchId } });
      const theme = {
        ...((current?.theme as object) || {}),
        primaryColor: parsed.data.theme.primaryColor,
      };
      data.theme = theme;
    } else {
      data.theme = parsed.data.theme;
    }
  }

  if (parsed.data.locales !== undefined) {
    if (!limits.multiLanguage) {
      return NextResponse.json(
        { error: "Multi-language requires Pro plan" },
        { status: 402 }
      );
    }
    data.locales = parsed.data.locales;
  }

  if (parsed.data.slug !== undefined) {
    const slug = slugify(parsed.data.slug);
    if (!slug || isReservedSlug(slug)) {
      return NextResponse.json({ error: "Invalid slug" }, { status: 400 });
    }
    const exists = await prisma.branch.findFirst({
      where: { slug, NOT: { id: ws.branchId } },
    });
    if (exists)
      return NextResponse.json({ error: "Slug already taken" }, { status: 409 });
    data.slug = slug;
  }

  const branch = await prisma.branch.update({
    where: { id: ws.branchId },
    data,
  });

  // keep org name loosely in sync for single-branch
  if (parsed.data.name) {
    await prisma.organization.update({
      where: { id: ws.organizationId },
      data: { name: parsed.data.name },
    });
  }

  revalidateMenu(ws.branchId);
  return NextResponse.json({ branch });
}
