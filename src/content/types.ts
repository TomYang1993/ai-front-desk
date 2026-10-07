/**
 * Data shapes for the fictional centers. Content files in this folder are
 * plain data with no server imports, so scripts can load them directly.
 */

export type CenterId = "pinon-grove" | "quail-ridge";
export type Lang = "en" | "es" | "zh";

export type Allergen =
  | "dairy"
  | "egg"
  | "wheat"
  | "soy"
  | "peanut"
  | "tree_nut"
  | "fish"
  | "shellfish"
  | "sesame";

export interface Staff {
  id: string;
  name: string;
  role: "director" | "assistant_director" | "lead_teacher";
  title: string;
  roomId?: string;
}

export type Program = "infant" | "toddler" | "twos" | "preschool" | "prek";

export interface Room {
  id: string;
  name: string;
  program: Program;
  ages: string;
  ratio: string;
  leadTeacherId: string;
  /** Full-time monthly tuition in dollars. */
  tuitionMonthly: number;
  /** Part-time monthly tuition, when offered. */
  partTimeMonthly?: number;
  partTimeSchedule?: string;
  waitlist: string;
}

export interface Closure {
  /** First closed day, YYYY-MM-DD. */
  date: string;
  /** Last closed day when the closure spans several days. */
  endDate?: string;
  name: string;
  kind: "holiday" | "break" | "training";
}

export interface CalendarEvent {
  date: string;
  endDate?: string;
  name: string;
  note: string;
}

export interface MenuItem {
  name: string;
  allergens: Allergen[];
}

export interface MenuDay {
  breakfast?: MenuItem;
  lunch?: MenuItem;
  amSnack?: MenuItem;
  pmSnack?: MenuItem;
  /** Pack-lunch centers keep a backup lunch and an allergy-friendly alternative. */
  backupLunch?: { main: MenuItem; alternative: MenuItem };
}

export interface Menu {
  /** A Monday, YYYY-MM-DD, when week 1 of the cycle starts. */
  cycleStart: string;
  /** weeks[week][weekday], weekday 0 = Monday through 4 = Friday. */
  weeks: MenuDay[][];
  infantNote: string;
}

export interface TourRule {
  /** 1 = Monday through 5 = Friday. */
  weekday: number;
  /** Local time, HH:MM, 24-hour. */
  time: string;
}

export interface Announcement {
  id: string;
  postedAt: string;
  postedBy: string;
  title: string;
  body: string;
  /** Inclusive date range when the announcement is shown, YYYY-MM-DD. */
  showFrom: string;
  showUntil: string;
}

export interface SavedAnswer {
  id: string;
  question: string;
  answer: string;
  savedBy: string;
  savedAt: string;
  /** Short phrases that help match future questions. */
  keywords: string[];
}

export interface IllnessPolicy {
  /** Fever at or above this temperature, in °F, triggers the rule. */
  feverThresholdF: number;
  /** Lower threshold for infants under 2 months, if the center sets one. */
  youngInfantThresholdF?: number;
  /** True when a fever only excludes a child together with other symptoms. */
  feverRequiresOtherSymptoms: boolean;
  /** Hours fever-free, without fever reducers, before returning. */
  feverFreeHoursToReturn: number;
  /** Hours symptom-free after vomiting or diarrhea before returning. */
  vomitDiarrheaHoursToReturn: number;
  /** Hours on antibiotics before returning, when the center sets a rule. */
  antibioticHoursToReturn?: number;
}

export interface Fees {
  registration: number | null;
  registrationNote: string;
  waitlistFee: number | null;
  siblingDiscountPct: number | null;
  latePickupPerMinute: number | null;
  backupLunch: number | null;
}

export interface Center {
  id: CenterId;
  name: string;
  shortName: string;
  city: string;
  state: string;
  timeZone: string;
  address: string;
  phone: string;
  email: string;
  languages: Lang[];
  hours: { open: string; close: string; days: string };
  /** When the office answers handoffs, local time. */
  officeHours: { start: string; end: string; typicalReplyMinutes: number };
  meals: "provided" | "pack_lunch";
  staff: Staff[];
  rooms: Room[];
  fees: Fees;
  assistance: { name: string; summary: string };
  closures: Closure[];
  events: CalendarEvent[];
  menu: Menu;
  tours: TourRule[];
  tourMinutes: number;
  illness: IllnessPolicy;
  announcements: Announcement[];
  savedAnswers: SavedAnswer[];
}

export interface Child {
  id: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  roomId: string;
  allergies: Allergen[];
  allergyNote?: string;
}

export interface LedgerItem {
  date: string;
  description: string;
  /** Positive is a charge, negative is a payment or credit. */
  amount: number;
}

export interface Family {
  id: string;
  centerId: CenterId;
  parentName: string;
  parentFirstName: string;
  preferredLanguage: Lang;
  authorizedPickup: { name: string; relation: string }[];
  emergencyContacts: { name: string; relation: string }[];
  children: Child[];
  billing: {
    plan: string;
    monthlyAmount: number;
    autopay: boolean;
    ledger: LedgerItem[];
  };
  /** Things on file that staff know about, never shown to other families. */
  notesOnFile: string[];
}

export interface HandbookSection {
  id: string;
  title: string;
  body: string;
  updatedAt: string;
  updatedBy: string;
}

export type Topic =
  | "hours"
  | "closures"
  | "weather"
  | "illness"
  | "medication"
  | "meals"
  | "allergies"
  | "tuition"
  | "billing"
  | "enrollment"
  | "tours"
  | "pickup"
  | "absence"
  | "schedule"
  | "toileting"
  | "clothing"
  | "celebrations"
  | "outdoor"
  | "events"
  | "custody"
  | "behavior"
  | "incident"
  | "child_day"
  | "other";

export type Lane =
  | "safety"
  | "quick_facts"
  | "understand"
  | "lookup"
  | "handbook"
  | "double_check"
  | "person";

export type Outcome = "answered" | "handoff" | "declined" | "emergency";

export interface QuestionLog {
  id: string;
  centerId: CenterId;
  familyId: string | null;
  /** Display label for askers who are not demo families, such as "Visitor". */
  askedBy?: string;
  askedAt: string;
  language: Lang;
  text: string;
  topic: Topic;
  lanes: Lane[];
  outcome: Outcome;
  handoffTo?: "director" | "teacher";
  sources: string[];
  tokens: number;
  feedback?: "up" | "down";
  afterHours: boolean;
}

export interface Handoff {
  id: string;
  centerId: CenterId;
  familyId: string | null;
  askedBy?: string;
  childId?: string;
  createdAt: string;
  language: Lang;
  text: string;
  topic: Topic;
  reason: string;
  priority: "urgent" | "normal";
  to: "director" | "teacher";
  status: "open" | "answered";
  reply?: { text: string; by: string; at: string };
}
