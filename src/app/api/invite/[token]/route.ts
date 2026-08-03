import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/workspace";
import { prisma } from "@/lib/db";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const session = await getSession();
  if (!session?.user)
    return NextResponse.json({ error: "Sign in to accept invite" }, { status: 401 });

  const invite = await prisma.invite.findUnique({
    where: { token },
  });
  if (!invite || invite.acceptedAt)
    return NextResponse.json({ error: "Invalid invite" }, { status: 404 });
  if (invite.expiresAt < new Date())
    return NextResponse.json({ error: "Invite expired" }, { status: 410 });
  if (invite.email.toLowerCase() !== session.user.email.toLowerCase())
    return NextResponse.json(
      { error: "Invite email does not match your account" },
      { status: 403 }
    );

  await prisma.$transaction([
    prisma.member.upsert({
      where: {
        userId_organizationId: {
          userId: session.user.id,
          organizationId: invite.organizationId,
        },
      },
      create: {
        userId: session.user.id,
        organizationId: invite.organizationId,
        role: invite.role,
      },
      update: { role: invite.role },
    }),
    prisma.invite.update({
      where: { id: invite.id },
      data: { acceptedAt: new Date() },
    }),
  ]);

  return NextResponse.json({ ok: true });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const invite = await prisma.invite.findUnique({
    where: { token },
    include: { organization: { select: { name: true } } },
  });
  if (!invite || invite.acceptedAt)
    return NextResponse.json({ error: "Invalid" }, { status: 404 });
  return NextResponse.json({
    email: invite.email,
    role: invite.role,
    organizationName: invite.organization.name,
    expiresAt: invite.expiresAt,
  });
}
