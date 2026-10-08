import type { Allergen, Lang } from "@/content/types";
import type { ChipId } from "./engine/types";

/** Interface text for the parent app. Maple's replies are translated by the engine. */
export type DayPart = "morning" | "afternoon" | "evening";

type Strings = {
  chips: Record<ChipId, string>;
  placeholder: string;
  send: string;
  aiLabel: string;
  status: { ready: string; listening: string; reading: string; checking: string; handoff: (name: string) => string; calm: string; done: string };
  greetingFamily: (parent: string, center: string) => string;
  sources: string;
  updated: (date: string, by?: string) => string;
  helpful: string;
  thanks: string;
  how: Record<"facts" | "factsTranslated" | "lookup" | "saved" | "handbook" | "person" | "safety", string>;
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
  dayOver: string;
  lunchClosed: (phone: string) => string;
  board: {
    today: string;
    meals: string;
    nextClosure: string;
    notices: string;
    requests: string;
    noRequests: string;
    waiting: (name: string) => string;
    replied: (name: string) => string;
    absence: (child: string, dates: string) => string;
    lunch: (item: string, child: string) => string;
    tour: (when: string) => string;
    children: string;
    openUntil: (time: string) => string;
    closedOpens: (day: string, time: string) => string;
    todayWord: string;
    tomorrowWord: string;
    weekdays: string;
    hours: (days: string, open: string, close: string) => string;
    breakfast: string;
    lunchLabel: string;
    snack: string;
    morningSnack: string;
    afternoonSnack: string;
    backupLunch: (price: string) => string;
    or: string;
    closureRange: (from: string, to: string) => string;
    child: (name: string, age: string, room: string, teacher: string) => string;
    months: (n: number) => string;
    years: (n: number) => string;
    allergens: Record<Allergen, string>;
    allergy: (names: string[]) => string;
    translated: string;
    showOriginal: string;
    showTranslation: string;
  };
  startOver: string;
  signOut: string;
  home: {
    greeting: (name: string, part: DayPart) => string;
    bubble: string;
    replied: (name: string) => string;
    ask: string;
    close: string;
    chatWith: string;
    frontDesk: string;
    handbook: string;
  };
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
  sources: "Sources",
  updated: (d, by) => `Updated ${d}${by ? ` by ${by}` : ""}`,
  helpful: "Was this helpful?",
  thanks: "Thanks for the feedback",
  how: {
    facts: "From the center's data, no AI",
    factsTranslated: "From the center's data, translated by AI",
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
  dayOver: "That day is already over, so there's nothing to log. Tell Maple which day your child will be out.",
  lunchClosed: (p) => `Backup lunch orders have closed for today. Please call the front desk at ${p}.`,
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
    openUntil: (t) => `Open now until ${t}`,
    closedOpens: (d, t) => `Closed now. Opens ${d} at ${t}`,
    todayWord: "today",
    tomorrowWord: "tomorrow",
    weekdays: "Monday to Friday",
    hours: (d, o, c) => `${d}, ${o} to ${c}`,
    breakfast: "Breakfast",
    lunchLabel: "Lunch",
    snack: "Snack",
    morningSnack: "Morning snack",
    afternoonSnack: "Afternoon snack",
    backupLunch: (p) => `Backup lunch, ${p}`,
    or: "or",
    closureRange: (f, t) => `${f} through ${t}`,
    child: (n, a, r, t) => `${n}, ${a}, ${r} with ${t}`,
    months: (n) => `${n} months`,
    years: (n) => `${n} years`,
    allergens: { dairy: "dairy", egg: "egg", wheat: "wheat", soy: "soy", peanut: "peanut", tree_nut: "tree nut", fish: "fish", shellfish: "shellfish", sesame: "sesame" },
    allergy: (names) => {
      const list = names.join(" and ");
      return `${list.charAt(0).toUpperCase()}${list.slice(1)} allergy`;
    },
    translated: "",
    showOriginal: "",
    showTranslation: "",
  },
  startOver: "Start over",
  signOut: "Sign out",
  home: {
    greeting: (n, p) => `Good ${p}, ${n}`,
    bubble: "Hi! Tap me with any question.",
    replied: (n) => `${n} replied. Tap me to read it.`,
    ask: "Ask Maple anything…",
    close: "Close chat",
    chatWith: "Chat with Maple",
    frontDesk: "Front desk",
    handbook: "Handbook",
  },
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
    factsTranslated: "De los datos del centro, traducido con IA",
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
  orderLunch: (i, c, p) => `Pedir ${i} para ${c}, ${p}`,
  lunchOrdered: (i, c, p) => `Pedido: ${i} para ${c}. Se agregaron ${p} a su cuenta.`,
  pickTour: "Elija un horario",
  yourName: "Su nombre",
  tourBooked: (w) => `Visita reservada para el ${w}. ¡Lo esperamos!`,
  actionFailed: "No se pudo completar. Intente de nuevo o llame a la recepción.",
  dayOver: "Ese día ya terminó, así que no hay nada que registrar. Dígale a Maple qué día faltará su hijo.",
  lunchClosed: (p) => `Los pedidos de almuerzo de reserva ya cerraron por hoy. Llame a la recepción al ${p}.`,
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
    lunch: (i, c) => `Almuerzo de reserva para ${c}: ${i}`,
    tour: (w) => `Visita: ${w}`,
    children: "Sus hijos",
    openUntil: (t) => `Abierto ahora hasta las ${t}`,
    closedOpens: (d, t) => `Cerrado ahora. Abre ${d} a las ${t}`,
    todayWord: "hoy",
    tomorrowWord: "mañana",
    weekdays: "De lunes a viernes",
    hours: (d, o, c) => `${d}, de ${o} a ${c}`,
    breakfast: "Desayuno",
    lunchLabel: "Almuerzo",
    snack: "Merienda",
    morningSnack: "Merienda de la mañana",
    afternoonSnack: "Merienda de la tarde",
    backupLunch: (p) => `Almuerzo de reserva, ${p}`,
    or: "o",
    closureRange: (f, t) => `del ${f} al ${t}`,
    child: (n, a, r, t) => `${n}, ${a}, ${r} con ${t}`,
    months: (n) => `${n} meses`,
    years: (n) => `${n} años`,
    allergens: { dairy: "lácteos", egg: "huevo", wheat: "trigo", soy: "soya", peanut: "maní", tree_nut: "nueces", fish: "pescado", shellfish: "mariscos", sesame: "ajonjolí" },
    allergy: (names) => `Alergia: ${names.join(" y ")}`,
    translated: "Traducido por Maple",
    showOriginal: "Ver original",
    showTranslation: "Ver traducción",
  },
  startOver: "Empezar de nuevo",
  signOut: "Cerrar sesión",
  home: {
    greeting: (n, p) => `${p === "morning" ? "Buenos días" : p === "afternoon" ? "Buenas tardes" : "Buenas noches"}, ${n}`,
    bubble: "¡Hola! Tócame para preguntar.",
    replied: (n) => `${n} respondió. Tócame para leerlo.`,
    ask: "Pregúntale a Maple…",
    close: "Cerrar chat",
    chatWith: "Chatear con Maple",
    frontDesk: "Recepción",
    handbook: "Manual",
  },
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
    factsTranslated: "来自中心的数据，由 AI 翻译",
    lookup: "AI 理解您的消息后，从中心的数据中查到答案",
    saved: "工作人员保存的回答",
    handbook: "查阅家长手册并核对过",
    person: "已转给工作人员",
    safety: "由安全检查处理，未使用 AI",
  },
  sentTo: (n) => `已发送给 ${n}`,
  call: (p) => `致电 ${p}`,
  call911: "拨打 911",
  logAbsence: (c, d) => `登记${c}缺勤：${d}`,
  absenceLogged: (c, d, t) => `已为${c}登记缺勤：${d}。${t}会看到。`,
  orderLunch: (i, c, p) => `为${c}订购${i}，${p}`,
  lunchOrdered: (i, c, p) => `已为${c}订购${i}。${p}已计入您的账户。`,
  pickTour: "选择时间",
  yourName: "您的姓名",
  tourBooked: (w) => `已预约参观：${w}。到时见！`,
  actionFailed: "操作未成功。请重试或致电前台。",
  dayOver: "那一天已经过去，无需登记。请告诉 Maple 孩子哪天缺勤。",
  lunchClosed: (p) => `今天的备用午餐订购已截止。请致电前台 ${p}。`,
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
    absence: (c, d) => `已为${c}登记缺勤：${d}`,
    lunch: (i, c) => `${c}的备用午餐：${i}`,
    tour: (w) => `参观：${w}`,
    children: "您的孩子",
    openUntil: (t) => `正在开放，至${t}`,
    closedOpens: (d, t) => `现已关闭。${d}${t}开门`,
    todayWord: "今天",
    tomorrowWord: "明天",
    weekdays: "周一至周五",
    hours: (d, o, c) => `${d}，${o}至${c}`,
    breakfast: "早餐",
    lunchLabel: "午餐",
    snack: "点心",
    morningSnack: "上午点心",
    afternoonSnack: "下午点心",
    backupLunch: (p) => `备用午餐，${p}`,
    or: "或",
    closureRange: (f, t) => `${f}至${t}`,
    child: (n, a, r, t) => `${n}，${a}，${r}班，老师 ${t}`,
    months: (n) => `${n}个月`,
    years: (n) => `${n}岁`,
    allergens: { dairy: "乳制品", egg: "鸡蛋", wheat: "小麦", soy: "大豆", peanut: "花生", tree_nut: "坚果", fish: "鱼", shellfish: "贝类", sesame: "芝麻" },
    allergy: (names) => `${names.join("、")}过敏`,
    translated: "由 Maple 翻译",
    showOriginal: "查看原文",
    showTranslation: "查看译文",
  },
  startOver: "重新开始",
  signOut: "退出登录",
  home: {
    greeting: (n, p) => `${n}，${p === "morning" ? "早上好" : p === "afternoon" ? "下午好" : "晚上好"}`,
    bubble: "您好！有问题就点我。",
    replied: (n) => `${n}回复了您，点我查看。`,
    ask: "向 Maple 提问…",
    close: "关闭聊天",
    chatWith: "和 Maple 聊天",
    frontDesk: "前台",
    handbook: "家长手册",
  },
  error: "出错了。请重试或致电前台。",
};

export const STRINGS: Record<Lang, Strings> = { en, es, zh };
export type { Strings };
