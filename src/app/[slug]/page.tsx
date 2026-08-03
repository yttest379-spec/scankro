import { notFound } from "next/navigation";
import { getPublicMenuBySlug } from "@/lib/public-menu";
import { PublicMenuView } from "@/components/menu-public/public-menu-view";
import { cookies, headers } from "next/headers";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";

const RESERVED = new Set([
  "dashboard",
  "login",
  "signup",
  "pricing",
  "api",
  "r",
  "t",
  "invite",
  "uploads",
  "forgot-password",
]);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const branch = await prisma.branch.findUnique({
    where: { slug },
    select: { name: true, address: true },
  });
  if (!branch) return { title: "Menu not found" };
  return {
    title: `${branch.name} · Menu`,
    description: branch.address
      ? `Digital menu for ${branch.name} — ${branch.address}`
      : `Scan to view the live menu at ${branch.name}`,
  };
}

export default async function PublicMenuPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ lang?: string }>;
}) {
  const { slug } = await params;
  if (RESERVED.has(slug)) notFound();

  const sp = await searchParams;
  const cookieStore = await cookies();
  const hdrs = await headers();
  const accept = hdrs.get("accept-language") || "en";
  const preferred =
    sp.lang ||
    cookieStore.get("menu_locale")?.value ||
    accept.split(",")[0]?.slice(0, 2) ||
    "en";

  const data = await getPublicMenuBySlug(slug, preferred);
  if (!data) notFound();

  return <PublicMenuView data={data} />;
}
