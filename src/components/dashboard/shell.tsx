"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  LayoutDashboard,
  UtensilsCrossed,
  FolderTree,
  Palette,
  QrCode,
  BarChart3,
  Languages,
  Sparkles,
  Megaphone,
  CalendarRange,
  Users,
  Building2,
  CreditCard,
  LogOut,
  ExternalLink,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { authClient } from "@/lib/auth-client";
import { useMemo, useState } from "react";
import type { Plan } from "@prisma/client";

const nav = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/restaurant", label: "Restaurant", icon: Building2 },
  { href: "/dashboard/menu/categories", label: "Categories", icon: FolderTree },
  { href: "/dashboard/menu/items", label: "Menu items", icon: UtensilsCrossed },
  { href: "/dashboard/appearance", label: "Appearance", icon: Palette },
  { href: "/dashboard/qr", label: "QR codes", icon: QrCode },
  { href: "/dashboard/specials", label: "Daily specials", icon: Sparkles, pro: true },
  { href: "/dashboard/promotions", label: "Promotions", icon: Megaphone, pro: true },
  { href: "/dashboard/seasonal", label: "Seasonal", icon: CalendarRange, pro: true },
  { href: "/dashboard/languages", label: "Languages", icon: Languages, pro: true },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3, pro: true },
  { href: "/dashboard/team", label: "Team", icon: Users, pro: true },
  { href: "/dashboard/branches", label: "Branches", icon: Building2, pro: true },
  { href: "/dashboard/billing", label: "Billing", icon: CreditCard },
];

export function DashboardShell({
  children,
  plan,
  branches,
  branchId: defaultBranchId,
  orgName,
  role,
}: {
  children: React.ReactNode;
  plan: Plan;
  branchId: string;
  orgName: string;
  role: string;
  branches: { id: string; name: string; slug: string }[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);

  const branchId = searchParams.get("branch") || defaultBranchId;
  const currentBranch = useMemo(
    () => branches.find((b) => b.id === branchId) || branches[0],
    [branches, branchId]
  );

  async function signOut() {
    await authClient.signOut();
    router.push("/login");
  }

  function withBranch(href: string) {
    const sp = new URLSearchParams(searchParams.toString());
    if (currentBranch?.id) sp.set("branch", currentBranch.id);
    const q = sp.toString();
    return q ? `${href}?${q}` : href;
  }

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="border-b border-stone-200 px-4 py-5">
        <Link href="/dashboard" className="font-semibold tracking-tight text-teal-800 text-lg">
          Scankro
        </Link>
        <p className="mt-1 truncate text-xs text-stone-500">{orgName}</p>
        <p className="mt-2 text-[10px] uppercase tracking-wide text-stone-400">
          {role} · {plan}
        </p>
      </div>

      {branches.length > 1 && (
        <div className="border-b border-stone-200 px-3 py-3">
          <label className="text-[10px] uppercase tracking-wide text-stone-400">Branch</label>
          <select
            className="mt-1 w-full rounded-md border border-stone-200 bg-white px-2 py-1.5 text-sm"
            value={currentBranch?.id}
            onChange={(e) => {
              const sp = new URLSearchParams(searchParams.toString());
              sp.set("branch", e.target.value);
              router.push(`${pathname}?${sp.toString()}`);
            }}
          >
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
        {nav.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={withBranch(item.href)}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-teal-50 text-teal-900 font-medium"
                  : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0 opacity-70" />
              <span className="flex-1">{item.label}</span>
              {item.pro && plan !== "pro" && (
                <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">
                  Pro
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-1 border-t border-stone-200 p-2">
        <a
          href={currentBranch ? `/${currentBranch.slug}` : "#"}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-stone-600 hover:bg-stone-100"
        >
          <ExternalLink className="h-4 w-4" />
          View live menu
        </a>
        <button
          onClick={signOut}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-stone-600 hover:bg-stone-100"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="lg:hidden sticky top-0 z-40 flex items-center justify-between border-b border-stone-200 bg-white px-4 py-3">
        <span className="font-semibold text-teal-800">Scankro</span>
        <button onClick={() => setOpen(!open)} className="rounded-md p-2 hover:bg-stone-100">
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      {open && (
        <div className="fixed inset-0 z-30 overflow-y-auto bg-white lg:hidden">{sidebar}</div>
      )}
      <div className="mx-auto flex max-w-[1400px]">
        <aside className="sticky top-0 hidden h-screen w-60 shrink-0 border-r border-stone-200 bg-white lg:block">
          {sidebar}
        </aside>
        <main className="min-w-0 flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
