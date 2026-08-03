import type { Plan } from "@prisma/client";

export type PlanId = Plan;

export type PlanLimits = {
  maxItems: number | null;
  maxBranches: number;
  maxMembers: number;
  customBranding: boolean;
  removePoweredBy: boolean;
  qrFormats: ("png" | "svg" | "pdf")[];
  unlimitedQr: boolean;
  analytics: boolean;
  multiLanguage: boolean;
  specials: boolean;
  seasonal: boolean;
  promotions: boolean;
  tableQrs: boolean;
  multiBranch: boolean;
  multiUser: boolean;
  prioritySupport: boolean;
};

export const PLANS: Record<
  PlanId,
  {
    id: PlanId;
    name: string;
    priceMonthlyInr: number;
    description: string;
    limits: PlanLimits;
  }
> = {
  free: {
    id: "free",
    name: "Free",
    priceMonthlyInr: 0,
    description: "Try Scankro with a small menu",
    limits: {
      maxItems: 20,
      maxBranches: 1,
      maxMembers: 1,
      customBranding: false,
      removePoweredBy: false,
      qrFormats: ["png"],
      unlimitedQr: false,
      analytics: false,
      multiLanguage: false,
      specials: false,
      seasonal: false,
      promotions: false,
      tableQrs: false,
      multiBranch: false,
      multiUser: false,
      prioritySupport: false,
    },
  },
  starter: {
    id: "starter",
    name: "Starter",
    priceMonthlyInr: 399,
    description: "Unlimited menu, branding, unlimited QR downloads",
    limits: {
      maxItems: null,
      maxBranches: 1,
      maxMembers: 1,
      customBranding: true,
      removePoweredBy: true,
      qrFormats: ["png", "svg", "pdf"],
      unlimitedQr: true,
      analytics: false,
      multiLanguage: false,
      specials: false,
      seasonal: false,
      promotions: false,
      tableQrs: false,
      multiBranch: false,
      multiUser: false,
      prioritySupport: false,
    },
  },
  pro: {
    id: "pro",
    name: "Pro",
    priceMonthlyInr: 999,
    description: "Analytics, multi-branch, team, promotions, and more",
    limits: {
      maxItems: null,
      maxBranches: 50,
      maxMembers: 25,
      customBranding: true,
      removePoweredBy: true,
      qrFormats: ["png", "svg", "pdf"],
      unlimitedQr: true,
      analytics: true,
      multiLanguage: true,
      specials: true,
      seasonal: true,
      promotions: true,
      tableQrs: true,
      multiBranch: true,
      multiUser: true,
      prioritySupport: true,
    },
  },
};

export function getPlanLimits(plan: PlanId): PlanLimits {
  return PLANS[plan]?.limits ?? PLANS.free.limits;
}

export function canUse(plan: PlanId, feature: keyof PlanLimits): boolean {
  const limits = getPlanLimits(plan);
  const value = limits[feature];
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value > 0;
  if (Array.isArray(value)) return value.length > 0;
  return value === null; // unlimited items
}

export function canAddMenuItem(plan: PlanId, currentCount: number): boolean {
  const max = getPlanLimits(plan).maxItems;
  if (max === null) return true;
  return currentCount < max;
}

export function canAddBranch(plan: PlanId, currentCount: number): boolean {
  return currentCount < getPlanLimits(plan).maxBranches;
}

export function canAddMember(plan: PlanId, currentCount: number): boolean {
  return currentCount < getPlanLimits(plan).maxMembers;
}
