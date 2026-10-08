import type { CenterId, Lane, Lang, Topic } from "@/content";
import type { TourSlot } from "../facts/tours";

export type ReplyMode =
  /** A direct answer with sources. */
  | "answer"
  /** Maple needs one more detail before answering. */
  | "clarify"
  /** A person will follow up; includes who and when. */
  | "handoff"
  /** Sensitive topic handed to a person right away, in calm mode. */
  | "urgent"
  /** Emergency guidance first, then a person. */
  | "emergency"
  /** Maple can't share this. */
  | "declined";

export interface Source {
  id: string;
  label: string;
  updatedAt?: string;
  updatedBy?: string;
  excerpt?: string;
}

export type Action =
  | { type: "log_absence"; childId: string; childName: string; dates: string[]; reason: string }
  | { type: "order_backup_lunch"; childId: string; childName: string; item: string; price: number; date: string }
  | { type: "book_tour"; slots: TourSlot[] }
  | { type: "call_center"; phone: string };

export type ChipId = "today_lunch" | "hours" | "next_closure" | "tuition" | "tours";

export interface HistoryTurn {
  role: "parent" | "maple";
  text: string;
}

export interface AskRequest {
  centerId: CenterId;
  familyId: string | null;
  message?: string;
  chip?: ChipId;
  history?: HistoryTurn[];
  /** Pinned clock for tests and recordings. Ignored in production. */
  now?: Date;
  /** Pretend the AI is down. Ignored in production. */
  simulateOutage?: boolean;
  /** Skip the answer cache, for the scorecard. Ignored in production. */
  noCache?: boolean;
  /** Answer without logging, creating handoffs or caching: the director's test box. */
  dryRun?: boolean;
}

export interface AskReply {
  mode: ReplyMode;
  text: string;
  language: Lang;
  sources: Source[];
  actions: Action[];
  /** Quick replies to offer, such as which child a question is about. */
  options?: string[];
  handoff?: { id: string; to: "director" | "teacher"; staffName: string; eta: string };
  /** Maple's calm mode: no bouncing, plain copy. */
  calm: boolean;
  topic: Topic;
  lanes: Lane[];
  tokens: number;
  models: string[];
  ms: number;
  cached?: boolean;
  logId: string;
}
