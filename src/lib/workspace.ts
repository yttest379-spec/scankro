import { headers } from "next/headers";
import { auth } from "./auth";
import { prisma } from "./db";
import type { MemberRole, Plan } from "@prisma/client";
import { redirect } from "next/navigation";

export async function getSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return session;
}

export async function requireSession() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

export type Workspace = {
  userId: string;
  organizationId: string;
  orgName: string;
  plan: Plan;
  role: MemberRole;
  branchId: string;
  branchName: string;
  branchSlug: string;
  branches: { id: string; name: string; slug: string }[];
};

export async function getWorkspace(branchId?: string | null): Promise<Workspace | null> {
  const session = await getSession();
  if (!session?.user) return null;

  const membership = await prisma.member.findFirst({
    where: { userId: session.user.id },
    include: {
      organization: {
        include: {
          branches: {
            orderBy: { createdAt: "asc" },
            select: { id: true, name: true, slug: true },
          },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  if (!membership) return null;

  const branches = membership.organization.branches;
  if (branches.length === 0) return null;

  const selected =
    (branchId && branches.find((b) => b.id === branchId)) || branches[0];

  return {
    userId: session.user.id,
    organizationId: membership.organizationId,
    orgName: membership.organization.name,
    plan: membership.organization.plan,
    role: membership.role,
    branchId: selected.id,
    branchName: selected.name,
    branchSlug: selected.slug,
    branches,
  };
}

export async function requireWorkspace(branchId?: string | null) {
  const ws = await getWorkspace(branchId);
  if (!ws) redirect("/login");
  return ws;
}

const ROLE_RANK: Record<MemberRole, number> = {
  staff: 1,
  manager: 2,
  owner: 3,
};

export function hasMinRole(role: MemberRole, min: MemberRole) {
  return ROLE_RANK[role] >= ROLE_RANK[min];
}
