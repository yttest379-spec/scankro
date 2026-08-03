import { requireWorkspace } from "@/lib/workspace";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { absoluteUrl } from "@/lib/utils";
import { getPlanLimits } from "@/lib/plans";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ branch?: string }>;
}) {
  const sp = await searchParams;
  const ws = await requireWorkspace(sp.branch);
  const limits = getPlanLimits(ws.plan);

  const [itemCount, categoryCount, branch] = await Promise.all([
    prisma.menuItem.count({ where: { branchId: ws.branchId, deletedAt: null } }),
    prisma.category.count({ where: { branchId: ws.branchId, deletedAt: null } }),
    prisma.branch.findUnique({ where: { id: ws.branchId } }),
  ]);

  const menuUrl = absoluteUrl(`/${ws.branchSlug}`);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
        <p className="text-sm text-stone-500">
          {ws.branchName} · Plan: <span className="capitalize">{ws.plan}</span>
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-stone-500">Menu items</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">
              {itemCount}
              <span className="text-base font-normal text-stone-400">
                /{limits.maxItems ?? "∞"}
              </span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-stone-500">Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{categoryCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-stone-500">Public URL</CardTitle>
          </CardHeader>
          <CardContent>
            <a href={menuUrl} target="_blank" className="break-all text-sm text-teal-700 underline">
              {menuUrl}
            </a>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-stone-500">Short link</CardTitle>
          </CardHeader>
          <CardContent>
            <a
              href={absoluteUrl(`/r/${branch?.shortId}`)}
              target="_blank"
              className="break-all text-sm text-teal-700 underline"
            >
              /r/{branch?.shortId?.slice(0, 8)}…
            </a>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link href={`/dashboard/menu/items?branch=${ws.branchId}`}>
          <Button>Manage menu</Button>
        </Link>
        <Link href={`/dashboard/qr?branch=${ws.branchId}`}>
          <Button variant="outline">Download QR</Button>
        </Link>
        <Link href={`/dashboard/appearance?branch=${ws.branchId}`}>
          <Button variant="outline">Customize look</Button>
        </Link>
      </div>

      {ws.plan === "free" && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-5 text-sm text-amber-950">
            Free plan includes up to 20 items and “Powered by Scankro” branding.{" "}
            <Link href="/dashboard/billing" className="font-medium underline">
              Upgrade to Starter or Pro
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
