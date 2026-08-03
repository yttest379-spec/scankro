import { notFound } from "next/navigation";
import { getPublicMenuBySlug } from "@/lib/public-menu";
import { PublicMenuView } from "@/components/menu-public/public-menu-view";
import { cookies, headers } from "next/headers";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; table: string }>;
}): Promise<Metadata> {
  const { slug, table } = await params;
  const branch = await prisma.branch.findUnique({
    where: { slug },
    select: { name: true },
  });
  if (!branch) return { title: "Menu not found" };
  return { title: `${branch.name} · Table ${table}` };
}

export default async function TableMenuPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; table: string }>;
  searchParams: Promise<{ lang?: string }>;
}) {
  const { slug, table } = await params;
  const tableNumber = Number(table);
  if (!Number.isFinite(tableNumber) || tableNumber < 1) notFound();

  const sp = await searchParams;
  const cookieStore = await cookies();
  const hdrs = await headers();
  const accept = hdrs.get("accept-language") || "en";
  const preferred =
    sp.lang ||
    cookieStore.get("menu_locale")?.value ||
    accept.split(",")[0]?.slice(0, 2) ||
    "en";

  const data = await getPublicMenuBySlug(slug, preferred, tableNumber);
  if (!data) notFound();

  return <PublicMenuView data={data} />;
}
