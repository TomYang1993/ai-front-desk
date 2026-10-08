import type { Center, Family, LedgerItem, Program, Room } from "../../content/types";

export const usd = (n: number) => `$${n.toLocaleString("en-US")}`;

export const roomForProgram = (center: Center, program: Program): Room | undefined =>
  center.rooms.find((r) => r.program === program) ??
  // A "twos" question at a center without a twos room maps to its toddler room.
  (program === "twos" ? center.rooms.find((r) => r.program === "toddler") : undefined);

export const balanceOf = (ledger: LedgerItem[]) => ledger.reduce((sum, item) => sum + item.amount, 0);

/** The most recent charge matching an amount, for "why was I charged $8?" */
export function findCharge(family: Family, amount: number): LedgerItem | undefined {
  return [...family.billing.ledger].reverse().find((l) => l.amount === amount);
}

export const recentCharges = (family: Family, limit = 3) =>
  family.billing.ledger.filter((l) => l.amount > 0).slice(-limit);
