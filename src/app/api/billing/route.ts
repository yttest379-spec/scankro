import { NextRequest, NextResponse } from "next/server";
import { getWorkspace, hasMinRole } from "@/lib/workspace";
import {
  activatePlanManually,
  getRazorpay,
  getRazorpayPlanId,
} from "@/lib/razorpay";
import { prisma } from "@/lib/db";
import { PLANS } from "@/lib/plans";
import type { Plan } from "@prisma/client";
import { z } from "zod";
import { nanoid } from "nanoid";

export async function GET() {
  const ws = await getWorkspace();
  if (!ws) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const org = await prisma.organization.findUnique({
    where: { id: ws.organizationId },
  });
  return NextResponse.json({
    plan: org?.plan,
    status: org?.subscriptionStatus,
    plans: Object.values(PLANS),
    razorpayConfigured: !!getRazorpay(),
  });
}

const subSchema = z.object({
  plan: z.enum(["free", "starter", "pro"]),
  /** Dev fallback when Razorpay keys missing */
  manual: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = subSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const ws = await getWorkspace();
  if (!ws) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasMinRole(ws.role, "owner"))
    return NextResponse.json({ error: "Only owner can manage billing" }, { status: 403 });

  const plan = parsed.data.plan as Plan;

  if (plan === "free") {
    await activatePlanManually(ws.organizationId, "free");
    return NextResponse.json({ ok: true, plan: "free" });
  }

  const rz = getRazorpay();
  const planId = getRazorpayPlanId(plan);

  if (!rz || !planId || parsed.data.manual || process.env.NODE_ENV === "development") {
    // Manual upgrade path for local/dev or when Razorpay not configured
    await activatePlanManually(ws.organizationId, plan);
    return NextResponse.json({
      ok: true,
      plan,
      mode: "manual",
      message: "Plan activated (manual/dev mode). Configure Razorpay for live billing.",
    });
  }

  const org = await prisma.organization.findUnique({
    where: { id: ws.organizationId },
  });

  let customerId = org?.razorpayCustomerId;
  if (!customerId) {
    const customer = await rz.customers.create({
      name: org?.name || "Restaurant",
      email: undefined,
      notes: { organizationId: ws.organizationId },
    });
    customerId = customer.id;
    await prisma.organization.update({
      where: { id: ws.organizationId },
      data: { razorpayCustomerId: customerId },
    });
  }

  const subscription = await rz.subscriptions.create({
    plan_id: planId,
    total_count: 120,
    customer_notify: 1,
    notes: {
      organizationId: ws.organizationId,
      plan,
      ref: nanoid(8),
    },
  });

  await prisma.organization.update({
    where: { id: ws.organizationId },
    data: {
      razorpaySubscriptionId: subscription.id,
      subscriptionStatus: "pending",
    },
  });

  await prisma.subscription.create({
    data: {
      organizationId: ws.organizationId,
      plan,
      status: "pending",
      razorpaySubscriptionId: subscription.id,
      razorpayPlanId: planId,
    },
  });

  return NextResponse.json({
    ok: true,
    mode: "razorpay",
    subscriptionId: subscription.id,
    shortUrl: (subscription as { short_url?: string }).short_url,
    keyId: process.env.RAZORPAY_KEY_ID,
  });
}
