import type { Center, Child, Family, Handoff, Lang, Topic } from "@/content";
import { formatTime, officeAvailability, openStatus, weekdayName } from "../facts/calendar";
import { addDays, zonedParts } from "../time";
import { usd } from "../facts/money";
import { assistant, director, leadTeacher } from "./compose";
import type { ReplyMode } from "./types";

export type HandoffKind =
  | "not_covered"
  | "low_confidence"
  | "pickup"
  | "custody"
  | "abuse"
  | "incident"
  | "staff_complaint"
  | "behavior"
  | "billing_dispute"
  | "child_day"
  | "running_late"
  | "outage"
  | "person"
  | "emergency";

const SPEC: Record<HandoffKind, { to: "director" | "teacher"; priority: "urgent" | "normal"; mode: ReplyMode; reason: string; topic: Topic }> = {
  not_covered: { to: "director", priority: "normal", mode: "handoff", reason: "Not covered by the handbook", topic: "other" },
  low_confidence: { to: "director", priority: "normal", mode: "handoff", reason: "Maple wasn't sure", topic: "other" },
  pickup: { to: "director", priority: "urgent", mode: "handoff", reason: "Pickup permission needs staff", topic: "pickup" },
  custody: { to: "director", priority: "urgent", mode: "urgent", reason: "Custody concern", topic: "custody" },
  abuse: { to: "director", priority: "urgent", mode: "urgent", reason: "Possible abuse or neglect concern", topic: "incident" },
  incident: { to: "director", priority: "urgent", mode: "handoff", reason: "Injury or incident question", topic: "incident" },
  staff_complaint: { to: "director", priority: "urgent", mode: "handoff", reason: "Concern about staff", topic: "other" },
  behavior: { to: "teacher", priority: "normal", mode: "handoff", reason: "Behavior question for the teacher", topic: "behavior" },
  billing_dispute: { to: "director", priority: "normal", mode: "handoff", reason: "Billing question needs review", topic: "billing" },
  child_day: { to: "teacher", priority: "normal", mode: "handoff", reason: "Only the teacher knows", topic: "child_day" },
  running_late: { to: "director", priority: "urgent", mode: "handoff", reason: "Parent running late for pickup", topic: "pickup" },
  outage: { to: "director", priority: "normal", mode: "handoff", reason: "AI unavailable", topic: "other" },
  person: { to: "director", priority: "normal", mode: "handoff", reason: "Parent asked to talk to a person", topic: "other" },
  emergency: { to: "director", priority: "urgent", mode: "emergency", reason: "Possible emergency", topic: "incident" },
};

export const handoffSpec = (kind: HandoffKind) => SPEC[kind];
const first = (name: string) => name.split(" ")[0];

/* When someone will reply, in the parent's language. */

const DAY_NAMES: Record<Lang, string[]> = {
  en: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
  es: ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"],
  zh: ["星期一", "星期二", "星期三", "星期四", "星期五", "星期六", "星期日"],
  hi: ["सोमवार", "मंगलवार", "बुधवार", "गुरुवार", "शुक्रवार", "शनिवार", "रविवार"],
};

function dayWord(date: string, today: string, lang: Lang) {
  if (date === today) return { en: "today", es: "hoy", zh: "今天", hi: "आज" }[lang];
  if (date === addDays(today, 1)) return { en: "tomorrow", es: "mañana", zh: "明天", hi: "कल" }[lang];
  const idx = DAY_NAMES.en.indexOf(weekdayName(date));
  return { en: weekdayName(date), es: `el ${DAY_NAMES.es[idx]}`, zh: DAY_NAMES.zh[idx], hi: `${DAY_NAMES.hi[idx]} को` }[lang];
}

/** A predicate such as "usually replies within about 2 hours". */
export function etaPhrase(center: Center, now: Date, to: "director" | "teacher", lang: Lang): string {
  const today = zonedParts(now, center.timeZone).date;
  if (to === "teacher") {
    const open = openStatus(center, now);
    if (open.openNow) return { en: "will reply at the next break", es: "le responderá en el próximo descanso", zh: "会在下次休息时回复您", hi: "अगले ब्रेक में जवाब देंगे" }[lang];
    const when = dayWord(open.nextOpen.date, today, lang);
    const time = formatTime(open.nextOpen.time);
    return { en: `will reply after the classroom opens ${when} at ${time}`, es: `le responderá cuando abra el salón ${when} a las ${time}`, zh: `会在${when}${time}开门后回复您`, hi: `${when} ${time} पर कक्षा खुलने के बाद जवाब देंगे` }[lang];
  }
  const office = officeAvailability(center, now);
  const hours = Math.round(center.officeHours.typicalReplyMinutes / 60);
  if (office.inOfficeHours) return { en: `usually replies within about ${hours} hours`, es: `normalmente responde en unas ${hours} horas`, zh: `通常会在大约${hours}小时内回复`, hi: `आमतौर पर लगभग ${hours} घंटे में जवाब देते हैं` }[lang];
  const next = zonedParts(office.next, center.timeZone);
  const when = dayWord(next.date, today, lang);
  const time = formatTime(center.officeHours.start);
  return { en: `will reply after ${time} ${when}`, es: `le responderá después de las ${time} ${when}`, zh: `会在${when}${time}之后回复`, hi: `${when} ${time} के बाद जवाब देंगे` }[lang];
}

/* Fixed replies for paths that must work without any AI. */

type Fill = { center: string; phone: string; director: string; directorFirst: string; eta: string };
const FIXED: Record<"emergency" | "custody" | "abuse" | "outage" | "person", Record<Lang, (f: Fill) => string>> = {
  person: {
    en: (f) => `Of course. I've passed this to ${f.director}, and ${f.directorFirst} ${f.eta}. For anything urgent, call ${f.phone}.`,
    es: (f) => `Por supuesto. Le pasé esto a ${f.director}, y ${f.directorFirst} ${f.eta}. Para algo urgente, llame al ${f.phone}.`,
    zh: (f) => `好的。我已经把这件事转给了${f.director}，${f.directorFirst}${f.eta}。如有紧急情况，请致电${f.phone}。`,
    hi: (f) => `ज़रूर। मैंने यह ${f.director} को भेज दिया है, और ${f.directorFirst} ${f.eta}। कुछ भी ज़रूरी हो तो ${f.phone} पर कॉल करें।`,
  },
  emergency: {
    en: (f) => `If this is an emergency, call 911 now. Then call ${f.center} at ${f.phone}. I've alerted ${f.director} too.`,
    es: (f) => `Si es una emergencia, llame al 911 ahora. Después llame a ${f.center} al ${f.phone}. También le avisé a ${f.director}.`,
    zh: (f) => `如果这是紧急情况，请立即拨打911。然后致电${f.center}：${f.phone}。我也已经通知了${f.director}。`,
    hi: (f) => `अगर यह आपात स्थिति है, तो अभी 911 पर कॉल करें। फिर ${f.center} को ${f.phone} पर कॉल करें। मैंने ${f.director} को भी सूचित कर दिया है।`,
  },
  custody: {
    en: (f) => `Thank you for telling us. This needs a person, so I've alerted ${f.director} right away. ${f.center} follows the custody documents on file, so if there's a court order, please share a copy with ${f.directorFirst}. For anything urgent today, call ${f.phone}.`,
    es: (f) => `Gracias por avisarnos. Esto lo debe atender una persona, así que le avisé a ${f.director} de inmediato. ${f.center} sigue los documentos de custodia que tiene en su expediente; si hay una orden judicial, por favor comparta una copia con ${f.directorFirst}. Para algo urgente hoy, llame al ${f.phone}.`,
    zh: (f) => `谢谢您告诉我们。这件事需要由工作人员处理，我已经立即通知了${f.director}。${f.center}只遵循存档的监护文件；如果有法院命令，请将副本交给${f.directorFirst}。如有紧急情况，请致电${f.phone}。`,
    hi: (f) => `हमें बताने के लिए धन्यवाद। इसे एक व्यक्ति को ही संभालना चाहिए, इसलिए मैंने तुरंत ${f.director} को सूचित कर दिया है। ${f.center} फ़ाइल में मौजूद कस्टडी दस्तावेज़ों का पालन करता है, इसलिए अगर कोई अदालती आदेश है, तो कृपया उसकी एक कॉपी ${f.directorFirst} को दें। आज कुछ भी ज़रूरी हो तो ${f.phone} पर कॉल करें।`,
  },
  abuse: {
    en: (f) => `Thank you for raising this. I've alerted ${f.director} right away, and ${f.directorFirst} will follow up with you directly. If a child is in danger right now, call 911.`,
    es: (f) => `Gracias por decírnoslo. Le avisé a ${f.director} de inmediato y ${f.directorFirst} se comunicará con usted directamente. Si un niño está en peligro ahora mismo, llame al 911.`,
    zh: (f) => `谢谢您告诉我们。我已经立即通知了${f.director}，${f.directorFirst}会直接与您联系。如果孩子现在有危险，请拨打911。`,
    hi: (f) => `यह बताने के लिए धन्यवाद। मैंने तुरंत ${f.director} को सूचित कर दिया है, और ${f.directorFirst} सीधे आपसे संपर्क करेंगे। अगर कोई बच्चा अभी खतरे में है, तो 911 पर कॉल करें।`,
  },
  outage: {
    en: (f) => `I'm having trouble answering right now, so I've passed your question to the ${f.center} team. ${f.directorFirst} ${f.eta}. For anything urgent, call ${f.phone}.`,
    es: (f) => `Estoy teniendo problemas para responder en este momento, así que pasé su pregunta al equipo de ${f.center}. ${f.directorFirst} ${f.eta}. Para algo urgente, llame al ${f.phone}.`,
    zh: (f) => `我现在暂时无法回答，已经把您的问题转给了${f.center}的工作人员。${f.directorFirst}${f.eta}。如有紧急情况，请致电${f.phone}。`,
    hi: (f) => `मुझे अभी जवाब देने में दिक्कत हो रही है, इसलिए मैंने आपका सवाल ${f.center} टीम को भेज दिया है। ${f.directorFirst} ${f.eta}। कुछ भी ज़रूरी हो तो ${f.phone} पर कॉल करें।`,
  },
};

export function fixedReply(kind: "emergency" | "custody" | "abuse" | "outage" | "person", center: Center, now: Date, lang: Lang) {
  const d = director(center);
  return FIXED[kind][lang]({
    center: center.shortName,
    phone: center.phone,
    director: d.name,
    directorFirst: first(d.name),
    eta: etaPhrase(center, now, "director", lang),
  });
}

/** English handoff replies; the engine translates them when needed. */
export function handoffText(
  kind: Exclude<HandoffKind, "emergency" | "custody" | "abuse" | "outage" | "person">,
  center: Center,
  now: Date,
  child: Child | undefined,
  partial = "",
): { text: string; staffName: string } {
  const d = director(center);
  const a = assistant(center);
  const teacher = leadTeacher(center, child);
  const eta = etaPhrase(center, now, "director", "en");
  const teacherEta = etaPhrase(center, now, "teacher", "en");
  const lead = "";
  switch (kind) {
    case "not_covered":
      return partial
        ? { text: `I've asked ${d.name}, the director, to confirm the rest. ${first(d.name)} ${eta}.`, staffName: d.name }
        : { text: `I don't see that in ${center.shortName}'s handbook, so I've asked ${d.name}, the director. ${first(d.name)} ${eta}.`, staffName: d.name };
    case "low_confidence":
      return { text: `${lead}I want to be sure this is right, so I've asked ${d.name}, the director. ${first(d.name)} ${eta}.`, staffName: d.name };
    case "pickup": {
      const passport = center.id === "quail-ridge" ? " A passport works as ID." : "";
      return {
        text: `${center.shortName} releases children only to adults 18 or older on the authorized pickup list, and staff check photo ID.${passport} To add someone, add their name to the pickup list in the app. A same-day change also needs a phone call with ${first(d.name)} or ${first(a.name)}. I can't approve pickups myself, so I've let ${first(d.name)} know, and the office will confirm with you.`,
        staffName: d.name,
      };
    }
    case "incident":
      return {
        text: `I'm sorry, I don't have details about what happened. I've asked ${teacher ? `${teacher.name} and ` : ""}${d.name} to follow up with you. ${center.shortName} writes an incident report for every injury and shares it with families the same day.`,
        staffName: d.name,
      };
    case "staff_complaint":
      return { text: `Thank you for telling us. I've passed this to ${d.name}, the director, who will follow up with you personally. ${first(d.name)} ${eta}.`, staffName: d.name };
    case "behavior":
      return {
        text: `Thanks for sharing that. ${teacher ? `${teacher.name} sees ${child!.firstName} every day` : "The teacher sees the class every day"}, so I've passed your question along. ${teacher ? first(teacher.name) : "The teacher"} ${teacherEta}.`,
        staffName: teacher?.name ?? d.name,
      };
    case "billing_dispute":
      return { text: `I've passed this to ${a.name}, who handles billing, so the charge can be reviewed. ${first(a.name)} ${eta}.`, staffName: a.name };
    case "child_day":
      return {
        text: `${teacher ? `${teacher.name}, ${child!.firstName}'s lead teacher,` : "Your child's teacher"} knows how today is going. I've passed your question along, and ${teacher ? first(teacher.name) : "the teacher"} ${teacherEta}.`,
        staffName: teacher?.name ?? d.name,
      };
    case "running_late": {
      const fee = center.fees.latePickupPerMinute ? ` Late pickups are ${usd(center.fees.latePickupPerMinute)} per minute after ${formatTime(center.hours.close)}.` : "";
      return {
        text: `Thanks for the heads-up. I've told the front desk so ${child ? `${child.firstName}'s teacher can let ${child.firstName}` : "the teacher can let your child"} know you're on the way. ${center.shortName} closes at ${formatTime(center.hours.close)}.${fee} If you can, call ${center.phone} with your arrival time.`,
        staffName: d.name,
      };
    }
  }
}

export function newHandoff(args: {
  kind: HandoffKind;
  center: Center;
  family: Family | undefined;
  child: Child | undefined;
  text: string;
  language: Lang;
  now: Date;
  topic?: Topic;
}): Handoff {
  const spec = SPEC[args.kind];
  const teacherKnown = spec.to === "teacher" && leadTeacher(args.center, args.child);
  return {
    id: `${args.center.id === "pinon-grove" ? "pg" : "qr"}-h-live-${args.now.getTime().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    centerId: args.center.id,
    familyId: args.family?.id ?? null,
    askedBy: args.family ? undefined : "Visitor",
    childId: args.child?.id,
    createdAt: args.now.toISOString(),
    language: args.language,
    text: args.text,
    topic: args.topic ?? spec.topic,
    reason: spec.reason,
    priority: spec.priority,
    to: teacherKnown ? "teacher" : "director",
    status: "open",
  };
}
