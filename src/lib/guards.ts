import type { Plan } from "@prisma/client";
import { canUse, type PlanLimits } from "./plans";

export class PlanError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PlanError";
  }
}

export function assertFeature(plan: Plan, feature: keyof PlanLimits, message?: string) {
  if (!canUse(plan, feature)) {
    throw new PlanError(message || `Upgrade required for ${feature}`);
  }
}
