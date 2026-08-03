import { NextRequest, NextResponse } from "next/server";
import { getWorkspace, hasMinRole } from "@/lib/workspace";
import { prisma } from "@/lib/db";
import { assertFeature, PlanError } from "@/lib/guards";
import { revalidateMenu } from "@/lib/cache";
import { SUPPORTED_LOCALES } from "@/lib/types";
import { z } from "zod";

export async function GET(req: NextRequest) {
  const ws = await getWorkspace(req.nextUrl.searchParams.get("branch"));
  if (!ws) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const branch = await prisma.branch.findUnique({ where: { id: ws.branchId } });
  const categories = await prisma.category.findMany({
    where: { branchId: ws.branchId, deletedAt: null },
    include: { translations: true, items: { where: { deletedAt: null }, include: { translations: true } } },
    orderBy: { sortOrder: "asc" },
  });

  return NextResponse.json({
    locales: branch?.locales || ["en"],
    supported: SUPPORTED_LOCALES,
    categories,
    plan: ws.plan,
  });
}

const localesSchema = z.object({
  locales: z.array(z.string()).min(1),
  branchId: z.string().optional(),
});

const translationSchema = z.object({
  type: z.enum(["category", "item"]),
  entityId: z.string(),
  locale: z.string(),
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  branchId: z.string().optional(),
});

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const ws = await getWorkspace(body.branchId);
    if (!ws) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasMinRole(ws.role, "manager"))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    assertFeature(ws.plan, "multiLanguage");

    if (body.locales) {
      const parsed = localesSchema.safeParse(body);
      if (!parsed.success)
        return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
      const locales = parsed.data.locales.filter((l) =>
        (SUPPORTED_LOCALES as readonly string[]).includes(l)
      );
      if (!locales.includes("en")) locales.unshift("en");
      await prisma.branch.update({
        where: { id: ws.branchId },
        data: { locales },
      });
      revalidateMenu(ws.branchId);
      return NextResponse.json({ locales });
    }

    const parsed = translationSchema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    if (parsed.data.type === "category") {
      await prisma.categoryTranslation.upsert({
        where: {
          categoryId_locale: {
            categoryId: parsed.data.entityId,
            locale: parsed.data.locale,
          },
        },
        create: {
          categoryId: parsed.data.entityId,
          branchId: ws.branchId,
          locale: parsed.data.locale,
          name: parsed.data.name,
        },
        update: { name: parsed.data.name },
      });
    } else {
      await prisma.menuItemTranslation.upsert({
        where: {
          menuItemId_locale: {
            menuItemId: parsed.data.entityId,
            locale: parsed.data.locale,
          },
        },
        create: {
          menuItemId: parsed.data.entityId,
          branchId: ws.branchId,
          locale: parsed.data.locale,
          name: parsed.data.name,
          description: parsed.data.description || null,
        },
        update: {
          name: parsed.data.name,
          description: parsed.data.description || null,
        },
      });
    }
    revalidateMenu(ws.branchId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof PlanError)
      return NextResponse.json({ error: e.message }, { status: 402 });
    throw e;
  }
}
