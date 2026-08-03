import { NextRequest, NextResponse } from "next/server";
import { applyPlanFromWebhook, verifyWebhookSignature } from "@/lib/razorpay";
import type { Plan } from "@prisma/client";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("x-razorpay-signature") || "";

  if (!verifyWebhookSignature(body, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const event = JSON.parse(body) as {
    event: string;
    payload: {
      subscription?: {
        entity: {
          id: string;
          status: string;
          notes?: { organizationId?: string; plan?: string };
        };
      };
    };
  };

  const sub = event.payload.subscription?.entity;
  if (!sub) return NextResponse.json({ ok: true });

  const organizationId = sub.notes?.organizationId;
  const plan = (sub.notes?.plan as Plan) || undefined;

  const statusMap: Record<string, "active" | "halted" | "cancelled" | "past_due" | "pending"> = {
    active: "active",
    authenticated: "active",
    charged: "active",
    halted: "halted",
    cancelled: "cancelled",
    completed: "cancelled",
    pending: "pending",
  };

  if (
    event.event === "subscription.activated" ||
    event.event === "subscription.charged"
  ) {
    await applyPlanFromWebhook({
      organizationId,
      subscriptionId: sub.id,
      plan: plan || "starter",
      status: "active",
    });
  } else if (
    event.event === "subscription.halted" ||
    event.event === "subscription.cancelled" ||
    event.event === "subscription.completed"
  ) {
    await applyPlanFromWebhook({
      organizationId,
      subscriptionId: sub.id,
      plan: "free",
      status: statusMap[sub.status] || "cancelled",
    });
  } else if (event.event === "subscription.pending") {
    await applyPlanFromWebhook({
      organizationId,
      subscriptionId: sub.id,
      status: "pending",
    });
  }

  return NextResponse.json({ ok: true });
}
