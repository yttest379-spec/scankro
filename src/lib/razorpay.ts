import Razorpay from "razorpay";
import crypto from "crypto";
import type { Plan } from "@prisma/client";
import { prisma } from "./db";

export function getRazorpay() {
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;
  if (!key_id || !key_secret) return null;
  return new Razorpay({ key_id, key_secret });
}

export function getRazorpayPlanId(plan: Exclude<Plan, "free">) {
  if (plan === "starter") return process.env.RAZORPAY_PLAN_STARTER || "";
  if (plan === "pro") return process.env.RAZORPAY_PLAN_PRO || "";
  return "";
}

export function verifyWebhookSignature(body: string, signature: string) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return false;
  const expected = crypto.createHmac("sha256", secret).update(body).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

export async function applyPlanFromWebhook(opts: {
  organizationId?: string;
  subscriptionId?: string;
  plan?: Plan;
  status: "active" | "halted" | "cancelled" | "past_due" | "pending";
}) {
  if (opts.organizationId) {
    await prisma.organization.update({
      where: { id: opts.organizationId },
      data: {
        plan: opts.plan || undefined,
        subscriptionStatus: opts.status,
        razorpaySubscriptionId: opts.subscriptionId || undefined,
      },
    });
    return;
  }

  if (opts.subscriptionId) {
    const org = await prisma.organization.findFirst({
      where: { razorpaySubscriptionId: opts.subscriptionId },
    });
    if (!org) return;
    await prisma.organization.update({
      where: { id: org.id },
      data: {
        plan: opts.plan || undefined,
        subscriptionStatus: opts.status,
      },
    });
  }
}

/** Dev / demo: activate a plan without Razorpay */
export async function activatePlanManually(organizationId: string, plan: Plan) {
  await prisma.organization.update({
    where: { id: organizationId },
    data: {
      plan,
      subscriptionStatus: plan === "free" ? "pending" : "active",
      razorpaySubscriptionId: plan === "free" ? null : `manual_${plan}_${Date.now()}`,
    },
  });
}
