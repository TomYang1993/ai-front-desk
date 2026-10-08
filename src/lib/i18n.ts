import type { Lang } from "@/content/types";
import type { ChipId } from "./engine/types";

/** Interface text for the parent app. Maple's replies are translated by the engine. */
type Strings = {
  chips: Record<ChipId, string>;
  placeholder: string;
  send: string;
  aiLabel: string;
  status: { ready: string; listening: string; reading: string; checking: string; handoff: (name: string) => string; calm: string; done: string };
  greetingFamily: (parent: string, center: string) => string;
  greetingVisitor: (center: string) => string;
  sources: string;
  updated: (date: string, by?: string) => string;
  helpful: string;
  thanks: string;
  how: Record<"facts" | "lookup" | "saved" | "handbook" | "person" | "safety", string>;
  seconds: (s: string) => string;
  sentTo: (name: string) => string;
  call: (phone: string) => string;
  call911: string;
  logAbsence: (child: string, dates: string) => string;
  absenceLogged: (child: string, dates: string, teacher: string) => string;
  orderLunch: (item: string, child: string, price: string) => string;
  lunchOrdered: (item: string, child: string, price: string) => string;
  pickTour: string;
  yourName: string;
  tourBooked: (when: string) => string;
  actionFailed: string;
  board: { today: string; meals: string; nextClosure: string; notices: string; requests: string; noRequests: string; waiting: (name: string) => string; replied: (name: string) => string; absence: (child: string, dates: string) => string; lunch: (item: string, child: string) => string; tour: (when: string) => string; children: string };
  startOver: string;
  signOut: string;
  error: string;
};

const en: Strings = {
  chips: { today_lunch: "Today's food", hours: "Hours", next_closure: "Next closure", tuition: "Tuition", tours: "Book a tour" },
  placeholder: "Ask Maple anything about the center",
  send: "Send",
  aiLabel: "AI front desk assistant",
  status: {
    ready: "Here to help",
    listening: "Listening",
    reading: "Reading your message…",
    checking: "Checking the handbook…",
    handoff: (n) => `Passed to ${n}`,
    calm: "A person is on it",
    done: "Done",
  },
  greetingFamily: (p, c) => `Hi ${p}, I'm Maple, ${c}'s AI front desk assistant. I can answer from the family handbook, check today's food and the calendar, and pass anything else to the right person.`,
  greetingVisitor: (c) => `Hi, I'm Maple, ${c}'s AI front desk assistant. I can help with tuition, the waitlist, tours and our policies, and pass anything else to the team.`,
  sources: "Sources",
  updated: (d, by) => `Updated ${d}${by ? ` by ${by}` : ""}`,
  helpful: "Was this helpful?",
  thanks: "Thanks for the feedback",
  how: {
    facts: "From the center's data, no AI",
    lookup: "AI read your message, then the answer was looked up in the center's data",
    saved: "A saved answer from staff",
    handbook: "Read in the family handbook and double-checked against it",
    person: "Passed to a person",
    safety: "Handled by the safety check, no AI",
  },
  seconds: (s) => `${s} s`,
  sentTo: (n) => `Sent to ${n}`,
  call: (p) => `Call ${p}`,
  call911: "Call 911",
  logAbsence: (c, d) => `Log ${c}'s absence: ${d}`,
  absenceLogged: (c, d, t) => `Absence logged for ${c}: ${d}. ${t} will see it.`,
  orderLunch: (i, c, p) => `Order ${i} for ${c}, ${p}`,
  lunchOrdered: (i, c, p) => `Ordered ${i} for ${c}. ${p} was added to your account.`,
  pickTour: "Pick a time",
  yourName: "Your name",
  tourBooked: (w) => `Tour booked for ${w}. See you then!`,
  actionFailed: "That didn't go through. Please try again or call the front desk.",
  board: {
    today: "Today",
    meals: "Food",
    nextClosure: "Next closure",
    notices: "Notices",
    requests: "Your requests",
    noRequests: "Nothing open right now.",
    waiting: (n) => `Waiting for ${n}`,
    replied: (n) => `${n} replied`,
    absence: (c, d) => `Absence logged for ${c}: ${d}`,
    lunch: (i, c) => `Backup lunch for ${c}: ${i}`,
    tour: (w) => `Tour: ${w}`,
    children: "Your children",
  },
  startOver: "Start over",
  signOut: "Sign out",
  error: "Something went wrong. Please try again, or call the front desk.",
};

const es: Strings = {
  ...en,
  chips: { today_lunch: "Comida de hoy", hours: "Horario", next_closure: "Próximo cierre", tuition: "Colegiatura", tours: "Agendar visita" },
  placeholder: "Pregúntale a Maple sobre el centro",
  send: "Enviar",
  aiLabel: "Asistente de recepción con IA",
  status: {
    ready: "Lista para ayudar",
    listening: "Escuchando",
    reading: "Leyendo su mensaje…",
    checking: "Revisando el manual…",
    handoff: (n) => `Enviado a ${n}`,
    calm: "Una persona lo está atendiendo",
    done: "Listo",
  },
  greetingFamily: (p, c) => `Hola ${p}, soy Maple, la asistente de recepción con IA de ${c}. Puedo responder con el manual para familias, revisar la comida y el calendario de hoy, y pasar todo lo demás a la persona indicada.`,
  sources: "Fuentes",
  updated: (d, by) => `Actualizado ${d}${by ? ` por ${by}` : ""}`,
  helpful: "¿Le ayudó?",
  thanks: "Gracias por su opinión",
  how: {
    facts: "De los datos del centro, sin IA",
    lookup: "La IA leyó su mensaje y la respuesta salió de los datos del centro",
    saved: "Una respuesta guardada por el personal",
    handbook: "Leído en el manual para familias y verificado",
    person: "Enviado a una persona",
    safety: "Atendido por el filtro de seguridad, sin IA",
  },
  sentTo: (n) => `Enviado a ${n}`,
  call: (p) => `Llamar al ${p}`,
  call911: "Llamar al 911",
  logAbsence: (c, d) => `Registrar ausencia de ${c}: ${d}`,
  absenceLogged: (c, d, t) => `Ausencia registrada para ${c}: ${d}. ${t} lo verá.`,
  actionFailed: "No se pudo completar. Intente de nuevo o llame a la recepción.",
  board: {
    ...en.board,
    today: "Hoy",
    meals: "Comida",
    nextClosure: "Próximo cierre",
    notices: "Avisos",
    requests: "Sus solicitudes",
    noRequests: "No hay nada pendiente.",
    waiting: (n) => `Esperando a ${n}`,
    replied: (n) => `${n} respondió`,
    absence: (c, d) => `Ausencia registrada para ${c}: ${d}`,
    children: "Sus hijos",
  },
  startOver: "Empezar de nuevo",
  signOut: "Cerrar sesión",
  error: "Algo salió mal. Intente de nuevo o llame a la recepción.",
};

const zh: Strings = {
  ...en,
  chips: { today_lunch: "今天的餐点", hours: "开放时间", next_closure: "下次休园", tuition: "学费", tours: "预约参观" },
  placeholder: "向 Maple 询问任何关于中心的问题",
  send: "发送",
  aiLabel: "AI 前台助手",
  status: {
    ready: "随时为您服务",
    listening: "正在听",
    reading: "正在阅读您的消息…",
    checking: "正在查阅手册…",
    handoff: (n) => `已转给 ${n}`,
    calm: "工作人员正在处理",
    done: "完成",
  },
  greetingFamily: (p, c) => `${p}您好，我是 Maple，${c} 的 AI 前台助手。我可以根据家长手册回答问题，查看今天的餐点和日历，其他事情我会转给合适的工作人员。`,
  sources: "来源",
  updated: (d, by) => `${d} 更新${by ? `，更新人 ${by}` : ""}`,
  helpful: "这个回答有帮助吗？",
  thanks: "谢谢您的反馈",
  how: {
    facts: "来自中心的数据，未使用 AI",
    lookup: "AI 理解您的消息后，从中心的数据中查到答案",
    saved: "工作人员保存的回答",
    handbook: "查阅家长手册并核对过",
    person: "已转给工作人员",
    safety: "由安全检查处理，未使用 AI",
  },
  sentTo: (n) => `已发送给 ${n}`,
  call: (p) => `致电 ${p}`,
  call911: "拨打 911",
  actionFailed: "操作未成功。请重试或致电前台。",
  board: {
    ...en.board,
    today: "今天",
    meals: "餐点",
    nextClosure: "下次休园",
    notices: "通知",
    requests: "您的请求",
    noRequests: "目前没有待处理的事项。",
    waiting: (n) => `等待 ${n} 回复`,
    replied: (n) => `${n} 已回复`,
    children: "您的孩子",
  },
  startOver: "重新开始",
  signOut: "退出登录",
  error: "出错了。请重试或致电前台。",
};

export const STRINGS: Record<Lang, Strings> = { en, es, zh };
export type { Strings };
