import { Suspense } from "react";
import { requireWorkspace } from "@/lib/workspace";
import { DashboardShell } from "@/components/dashboard/shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ws = await requireWorkspace();

  return (
    <Suspense fallback={<div className="p-8">Loading…</div>}>
      <DashboardShell
        plan={ws.plan}
        branchId={ws.branchId}
        orgName={ws.orgName}
        role={ws.role}
        branches={ws.branches}
      >
        {children}
      </DashboardShell>
    </Suspense>
  );
}
