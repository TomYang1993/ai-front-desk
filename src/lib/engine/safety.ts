/**
 * Keyword screen that runs before any AI. It only catches the clearest
 * cases; the language model's sensitive-topic flags back it up.
 */

export type SafetyHit = "emergency" | "custody" | "abuse";

const RULES: Record<SafetyHit, RegExp[]> = {
  emergency: [
    /\b(not|isn'?t|can'?t|cannot|trouble|difficulty|hard time|struggling to|stopped) breath/i,
    /\bnot breathing\b/i,
    /\bseizure|convuls/i,
    /\bunconscious|unresponsive|passed out|won'?t wake/i,
    /\bchoking\b/i,
    /\banaphyla|epipen|epi-pen|lips? (are |is )?swell|swollen (lips|throat|tongue)|throat (is )?(closing|swelling)/i,
    /\bturning blue|blue lips\b/i,
    /\bwon'?t stop bleeding|bleeding (a lot|heavily)/i,
    /\bswallowed (a )?(battery|magnet|pill|medicine|bleach|detergent|poison)/i,
    /no (puede )?respira|dificultad para respirar|convulsi|inconsciente|se est[aá] ahogando|labios hinchados|sangra mucho/i,
    /不能呼吸|呼吸困难|喘不过气|抽搐|昏迷|失去意识|窒息|嘴唇肿|过敏性休克/,
    /सा[ँं]स (नहीं|लेने में (दिक्कत|तकलीफ़?|परेशानी))|दौरा पड़|बेहोश|होंठ सूज|गला सूज|दम घुट|खून (बंद नहीं|बहुत)/,
    /\bsaa?ns (nahi|nahin|lene me(in)? (dikkat|takleef|pareshani))|\bbehosh\b|\bdaura pad/i,
  ],
  custody: [
    /\bcustody|court order|restraining order|protective order|parenting plan|visitation\b/i,
    /\bmy ex\b|ex-?(husband|wife|partner)|\bdivorc/i,
    /\bnot allowed to (pick|see|take|contact)/i,
    /custodia|orden de (restricci[oó]n|protecci[oó]n)|mi ex\b|divorcio/i,
    /监护权|抚养权|限制令|保护令|离婚|前夫|前妻/,
    /कस्टडी|अदालत(ी)? (का )?आदेश|कोर्ट (का )?(आदेश|ऑर्डर)|तलाक|पूर्व (पति|पत्नी)|मेरे एक्स\b|मेरी एक्स\b/,
  ],
  abuse: [
    /\babus(e|ed|ing)\b|\bneglect/i,
    /\b(teacher|staff|someone)\b.{0,40}\b(hit|hurt|grabbed|slapped|shook|touched)\b/i,
    /\btouched (him|her|them|my (son|daughter|child|kid)) inappropriately/i,
    /abuso|maltrato|negligencia/i,
    /虐待|打了我(的)?孩子|性侵/,
    /दुर्व्यवहार|शोषण|(टीचर|शिक्षक|स्टाफ़?|किसी) ने .{0,30}(मारा|थप्पड़|धक्का दिया|गलत तरीके से छुआ)/,
  ],
};

export function screen(message: string): SafetyHit | null {
  for (const hit of ["emergency", "abuse", "custody"] as SafetyHit[]) {
    if (RULES[hit].some((re) => re.test(message))) return hit;
  }
  return null;
}
