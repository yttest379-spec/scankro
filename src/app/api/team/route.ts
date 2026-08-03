import { NextRequest, NextResponse } from "next/server";
import { getWorkspace, hasMinRole } from "@/lib/workspace";
import { prisma } from "@/lib/db";
import { assertFeature, PlanError } from "@/lib/guards";
import { canAddMember } from "@/lib/plans";
import { nanoid } from "nanoid";
import { z } from "zod";

export async function GET() {
  const ws = await getWorkspace();
  if (!ws) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const members = await prisma.member.findMany({
    where: { organizationId: ws.organizationId },
    include: { user: { select: { id: true, name: true, email: true, image: true } } },
  });
  const invites = await prisma.invite.findMany({
    where: { organizationId: ws.organizationId, acceptedAt: null },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ members, invites, plan: ws.plan, role: ws.role });
}

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["manager", "staff"]).default("staff"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = inviteSchema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    const ws = await getWorkspace();
    if (!ws) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasMinRole(ws.role, "owner"))
      return NextResponse.json({ error: "Only owner can invite" }, { status: 403 });
    assertFeature(ws.plan, "multiUser");

    const memberCount = await prisma.member.count({
      where: { organizationId: ws.organizationId },
    });
    if (!canAddMember(ws.plan, memberCount)) {
      return NextResponse.json({ error: "Member limit reached" }, { status: 402 });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: parsed.data.email },
    });
    if (existingUser) {
      const already = await prisma.member.findUnique({
        where: {
          userId_organizationId: {
            userId: existingUser.id,
            organizationId: ws.organizationId,
          },
        },
      });
      if (already)
        return NextResponse.json({ error: "Already a member" }, { status: 409 });
    }

    const invite = await prisma.invite.create({
      data: {
        email: parsed.data.email.toLowerCase(),
        role: parsed.data.role,
        token: nanoid(32),
        organizationId: ws.organizationId,
        invitedById: ws.userId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    // Email optional — return invite link for now
    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invite/${invite.token}`;
    console.log("[invite]", inviteUrl);

    return NextResponse.json({ invite, inviteUrl });
  } catch (e) {
    if (e instanceof PlanError)
      return NextResponse.json({ error: e.message }, { status: 402 });
    throw e;
  }
}

export async function DELETE(req: NextRequest) {
  const memberId = req.nextUrl.searchParams.get("memberId");
  const inviteId = req.nextUrl.searchParams.get("inviteId");
  const ws = await getWorkspace();
  if (!ws) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasMinRole(ws.role, "owner"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (inviteId) {
    await prisma.invite.deleteMany({
      where: { id: inviteId, organizationId: ws.organizationId },
    });
  }
  if (memberId) {
    const member = await prisma.member.findFirst({
      where: { id: memberId, organizationId: ws.organizationId },
    });
    if (member?.role === "owner")
      return NextResponse.json({ error: "Cannot remove owner" }, { status: 400 });
    await prisma.member.deleteMany({
      where: { id: memberId, organizationId: ws.organizationId },
    });
  }
  return NextResponse.json({ ok: true });
}
