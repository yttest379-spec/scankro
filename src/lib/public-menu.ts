import { prisma } from "@/lib/db";
import { getPlanLimits } from "@/lib/plans";
import { isPromotionActiveNow, type PublicMenuData } from "@/lib/types";
import { unstable_cache } from "next/cache";
import { menuTag } from "@/lib/cache";

export async function getPublicMenuBySlug(
  slug: string,
  locale: string,
  tableNumber?: number | null
): Promise<PublicMenuData | null> {
  const branch = await prisma.branch.findUnique({
    where: { slug },
    include: {
      organization: { select: { plan: true } },
    },
  });
  if (!branch) return null;

  const load = unstable_cache(
    async () => fetchMenuPayload(branch.id),
    [`menu-payload-${branch.id}`],
    { tags: [menuTag(branch.id)], revalidate: 60 }
  );

  const payload = await load();
  const planLimits = getPlanLimits(branch.organization.plan);

  // apply locale translations
  const locales = branch.locales?.length ? branch.locales : ["en"];
  const activeLocale = locales.includes(locale) ? locale : locales[0];

  const catTransMap = new Map(
    payload.categoryTranslations
      .filter((t) => t.locale === activeLocale)
      .map((t) => [t.categoryId, t.name])
  );
  const itemTransMap = new Map(
    payload.itemTranslations
      .filter((t) => t.locale === activeLocale)
      .map((t) => [t.menuItemId, t])
  );

  const now = new Date();
  const activeSeasonal =
    payload.seasonalMenus.find(
      (s) => s.isActive && s.startAt <= now && s.endAt >= now
    ) || null;

  let categories = payload.categories.map((c) => ({
    ...c,
    displayName: catTransMap.get(c.id) || c.name,
    items: c.items.map((item) => {
      const tr = itemTransMap.get(item.id);
      return {
        ...item,
        name: tr?.name || item.name,
        description: tr?.description ?? item.description,
      };
    }),
  }));

  // Seasonal filter: if a seasonal menu is active and has attached items/categories, filter
  if (activeSeasonal) {
    const catIds = new Set(activeSeasonal.categories.map((c) => c.categoryId));
    const itemIds = new Set(activeSeasonal.items.map((i) => i.menuItemId));
    if (catIds.size > 0 || itemIds.size > 0) {
      categories = categories
        .filter((c) => catIds.size === 0 || catIds.has(c.id))
        .map((c) => ({
          ...c,
          items:
            itemIds.size === 0
              ? c.items
              : c.items.filter((i) => itemIds.has(i.id)),
        }))
        .filter((c) => c.items.length > 0 || catIds.has(c.id));
    }
  }

  const promotions = payload.promotions.filter((p) =>
    isPromotionActiveNow(p, branch.timezone)
  );

  // Today's specials
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const specials = payload.dailySpecials.filter((s) => {
    if (!s.isActive) return false;
    const d = new Date(s.activeDate);
    return (
      d.getFullYear() === todayStart.getFullYear() &&
      d.getMonth() === todayStart.getMonth() &&
      d.getDate() === todayStart.getDate()
    );
  });

  return {
    branch,
    planShowBranding: !planLimits.removePoweredBy,
    categories,
    specials,
    promotions,
    activeSeasonal,
    locale: activeLocale,
    locales,
    tableNumber: tableNumber ?? null,
  };
}

async function fetchMenuPayload(branchId: string) {
  const [categories, dailySpecials, promotions, seasonalMenus, categoryTranslations, itemTranslations] =
    await Promise.all([
      prisma.category.findMany({
        where: { branchId, deletedAt: null },
        orderBy: { sortOrder: "asc" },
        include: {
          items: {
            where: { deletedAt: null },
            orderBy: { sortOrder: "asc" },
          },
        },
      }),
      prisma.dailySpecial.findMany({
        where: { branchId, isActive: true },
        include: { menuItem: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.promotion.findMany({
        where: { branchId, isActive: true },
      }),
      prisma.seasonalMenu.findMany({
        where: { branchId, isActive: true },
        include: {
          categories: true,
          items: true,
        },
      }),
      prisma.categoryTranslation.findMany({ where: { branchId } }),
      prisma.menuItemTranslation.findMany({ where: { branchId } }),
    ]);

  return {
    categories,
    dailySpecials,
    promotions,
    seasonalMenus,
    categoryTranslations,
    itemTranslations,
  };
}
