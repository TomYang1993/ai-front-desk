import type { CenterId } from "./types";

/**
 * Demo sign-in accounts. Sign-in is simulated: every account shares one
 * published password, and the sign-in page lists them for reviewers.
 * Emails use example.com, which is reserved and never delivers mail.
 */
export interface DemoAccount {
  email: string;
  name: string;
  role: "parent" | "director";
  centerId: CenterId;
  /** Set for parents. */
  familyId?: string;
  /** Set for directors. */
  staffId?: string;
}

export const DEMO_PASSWORD = "maple-demo";

export const accounts: DemoAccount[] = [
  { email: "ana.martinez@example.com", name: "Ana Martínez", role: "parent", centerId: "pinon-grove", familyId: "martinez" },
  { email: "rosa.chavez@example.com", name: "Rosa Chávez", role: "parent", centerId: "pinon-grove", familyId: "chavez" },
  { email: "elena.vigil@example.com", name: "Elena Vigil", role: "director", centerId: "pinon-grove", staffId: "elena-vigil" },
  { email: "priya.raman@example.com", name: "Priya Raman", role: "parent", centerId: "quail-ridge", familyId: "raman" },
  { email: "wei.chen@example.com", name: "Wei Chen", role: "parent", centerId: "quail-ridge", familyId: "chen" },
  { email: "meera.sharma@example.com", name: "Meera Sharma", role: "parent", centerId: "quail-ridge", familyId: "sharma" },
  { email: "hannah.lindqvist@example.com", name: "Hannah Lindqvist", role: "director", centerId: "quail-ridge", staffId: "hannah-lindqvist" },
];

export const findAccount = (email: string) => accounts.find((a) => a.email === email.trim().toLowerCase());
