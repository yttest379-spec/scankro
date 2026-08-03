import { revalidateTag } from "next/cache";

export function menuTag(branchId: string) {
  return `menu:${branchId}`;
}

export function revalidateMenu(branchId: string) {
  revalidateTag(menuTag(branchId));
}
