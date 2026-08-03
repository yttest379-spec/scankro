import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";

export default async function ShortRedirectPage({
  params,
}: {
  params: Promise<{ shortId: string }>;
}) {
  const { shortId } = await params;
  const branch = await prisma.branch.findFirst({
    where: {
      OR: [{ shortId }, { shortId: { startsWith: shortId } }],
    },
  });
  if (!branch) notFound();
  redirect(`/${branch.slug}`);
}
