import { getPlanLimits } from "@/lib/plans";
import type { Plan } from "@prisma/client";
import { cn } from "@/lib/utils";
import Link from "next/link";

export function UpgradeBanner({
  plan,
  feature,
  className,
}: {
  plan: Plan;
  feature: string;
  className?: string;
}) {
  if (plan === "pro") return null;
  return (
    <div
      className={cn(
        "rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950",
        className
      )}
    >
      <span className="font-medium">{feature}</span> is available on higher plans.
      You are on <strong className="capitalize">{plan}</strong>.{" "}
      <Link href="/dashboard/billing" className="underline font-medium">
        Upgrade
      </Link>
    </div>
  );
}

export function PlanPill({ plan }: { plan: Plan }) {
  const limits = getPlanLimits(plan);
  return (
    <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium capitalize text-stone-700">
      {plan} · {limits.maxItems ?? "∞"} items
    </span>
  );
}
