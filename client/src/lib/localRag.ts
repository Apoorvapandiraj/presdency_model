/**
 * Fully client-side RAG fallback — answers from `src/lib/vectorStore.ts`
 * entirely in the browser when the backend cannot be reached (network down,
 * deployment sleeping, etc.). Mirrors the server's slang normalization so
 * students get the same clause-grounded answer offline.
 *
 * Verbatim handbook text is NEVER returned here — only paraphrased summaries
 * plus citation metadata; the drawer shows verbatim text on demand.
 */

import type { RegulationTopic } from '../../../server/corpus';
import type {
  ApiSuccess,
  AskResponseData,
  AskResult,
  Citation,
  IntentCategory,
  Lang,
  StudentProfile,
} from '../types';
import { searchCorpus, type ScoredChunk } from './vectorStore';

/** FIX 3: retrieval confidence floor — weak matches now refuse instead. */
const MIN_SCORE = 0.10;
const TOP_K = 3;

/** Slang → canonical concept map (mirrors server/queryAnalyzer.ts). */
const SLANG_RULES: Array<{
  pattern: RegExp;
  canonical: string;
  intent: IntentCategory;
}> = [
  {
    pattern: /\b(year[\s-]?backs?|detain\w*|not[\s-]?promoted|promot\w*)\b/i,
    canonical: 'Academic Progression Promotion Failure',
    intent: 'promotion',
  },
  {
    pattern: /\b(pointers?|gpa|cgpa|sgpa)\b/i,
    canonical: 'CGPA grade point average pointer',
    intent: 'cgpa',
  },
  {
    pattern:
      /\b(revals?\w*|re-?check|paper[\s-]?seeing|answer[\s-]?scripts?|photocop\w*|grade[\s-]?review)\b/i,
    canonical: 'Answer Script Photocopy Grade Review',
    intent: 'grade-review',
  },
  {
    pattern:
      /\b(makeups?|make[\s-]?ups?|supply|supplementary|backlogs?|arrears?)\b/i,
    canonical: 'Make-Up Examination',
    intent: 'makeup',
  },
  {
    pattern: /\b(attendance|condon\w*|shortage|absent)\b/i,
    canonical: 'Attendance Shortage Condonation',
    intent: 'attendance',
  },
  {
    // Client mirror of the server schedule rule (incl. common typos).
    pattern:
      /\b(saturdays?|sataday|satrday|saturady|weekends?|holidays?|working[\s-]?days?|college[\s-]?(?:is |was )?(?:open|closed|off|on)|open on|closed on|public[\s-]?holidays?|government[\s-]?holidays?|leaves?|leave[\s-]?schedule|academic[\s-]?calendar|registrar|college timings?|timetable)\b|ಶನಿವಾರ|ರಜೆ|शनिवार|छुट्टी/i,
    canonical: 'Academic Calendar Working Days Saturdays Holidays',
    intent: 'schedule',
  },
];

const REFUSALS: Record<Lang, { direct: string; explain: string }> = {
  en: {
    direct:
      'The backend is unreachable and I could not ground that question in the indexed clauses, so I will not guess.',
    explain:
      'Check your connection and try again — for attendance, promotion, make-up or grade-review questions I can answer offline from the local index.',
  },
  hi: {
    direct:
      'बैकएंड अनुपलब्ध है और यह प्रश्न अनुक्रमित क्लॉज़ में आधारित नहीं हो सका, इसलिए मैं अनुमान नहीं लगाऊँगा।',
    explain:
      'कनेक्शन जाँचकर फिर प्रयास करें — उपस्थिति, पदोन्नति, मेक-अप या ग्रेड समीक्षा पर मैं स्थानीय सूची से ऑफ़लाइन उत्तर दे सकता हूँ।',
  },
  kn: {
    direct:
      'ಬ್ಯಾಕ್‌ಎಂಡ್ ಲಭ್ಯವಿಲ್ಲ ಮತ್ತು ಈ ಪ್ರಶ್ನೆಯನ್ನು ಸೂಚಿತ ಕ್ಲಾಸ್‌ಗಳಲ್ಲಿ ಆಧಾರಿತಗೊಳಿಸಲಾಗಲಿಲ್ಲ, ಆದ್ದರಿಂದ ನಾನು ಊಹಿಸುವುದಿಲ್ಲ.',
    explain:
      'ಸಂಪರ್ಕ ಪರಿಶೀಲಿಸಿ ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ — ಹಾಜರಾತಿ, ಪದೋನ್ನತಿ, ಮೇಕ್-ಅಪ್ ಅಥವಾ ಗ್ರೇಡ್ ಪರಿಶೀಲನೆಯಲ್ಲಿ ನಾನು ಸ್ಥಳೀಯ ಪಟ್ಟಿಯಿಂದ ಆಫ್‌ಲೈನ್ ಉತ್ತರಿಸಬಲ್ಲೆ.',
  },
};

const NETWORK_NOTES: Record<Lang, string> = {
  en: 'The PUARAI backend could not be reached, so this answer was retrieved locally in your browser from the indexed clauses — verify the exact wording in the citation drawer.',
  hi: 'PUARAI बैकएंड से संपर्क नहीं हो पाया, इसलिए यह उत्तर आपके ब्राउज़र में अनुक्रमित क्लॉज़ से स्थानीय रूप से बनाया गया है — सटीक शब्द सिटेशन ड्रॉर में जाँचें।',
  kn: 'PUARAI ಬ್ಯಾಕ್‌ಎಂಡ್‌ಗೆ ಸಂಪರ್ಕವಾಗಲಿಲ್ಲ, ಆದ್ದರಿಂದ ಈ ಉತ್ತರ ನಿಮ್ಮ ಬ್ರೌಸರ್‌ನಲ್ಲಿ ಸೂಚಿತ ಕ್ಲಾಸ್‌ಗಳಿಂದ ಸ್ಥಳೀಯವಾಗಿ ರಚಿಸಲಾಗಿದೆ — ನಿಖರ ಪದಗಳನ್ನು ಸಿಟೇಶನ್ ಡ್ರಾವರ್‌ನಲ್ಲಿ ಪರಿಶೀಲಿಸಿ.',
};

/* ── Phase 2 — offline parity: onboarding + contextual greeting ───────────── */

/** Exact off-topic refusal parity (mirrors server/ragEngine.ts OFF_TOPIC_REFUSAL). */
export const OFF_TOPIC_REFUSALS: Record<Lang, string> = {
  en: 'Hello! I am your AI Academic Regulations Instructor for Presidency University. The question which you asked is not related to Academic Regulations and rules.',
  hi: 'नमस्ते! मैं प्रेसिडेंसी यूनिवर्सिटी के लिए आपका AI शैक्षणिक नियम प्रशिक्षक हूँ। जो प्रश्न आपने पूछा है वह शैक्षणिक नियमों और विनियमों से संबंधित नहीं है।',
  kn: 'ನಮಸ್ಕಾರ! ನಾನು ಪ್ರೆಸಿಡೆನ್ಸಿ ವಿಶ್ವವಿದ್ಯಾಲಯಕ್ಕಾಗಿ ನಿಮ್ಮ AI ಶೈಕ್ಷಣಿಕ ನಿಯಮ ಶಿಕ್ಷಕರು. ನೀವು ಕೇಳಿದ ಪ್ರಶ್ನೆ ಶೈಕ್ಷಣಿಕ ನಿಯಮಗಳು ಮತ್ತು ವಿನಿಯಮಗಳಿಗೆ ಸಂಬಂಧಿಸಿಲ್ಲ.',
};

const ONBOARDING: Record<Lang, { ask: string; explain: string }> = {
  en: {
    ask:
      'Hello! I am your AI Academic Regulations Instructor for Presidency University.\n\n' +
      'To assist you accurately with university regulations, please share:\n' +
      '1. Student Name\n' +
      '2. Program & Department (e.g., B.Tech CSE)\n' +
      '3. Current Semester\n\n' +
      'Please also state your academic query or concern!',
    explain:
      'Once you share these details, I will remember them for this session and cite the exact clause for every answer.',
  },
  hi: {
    ask:
      'नमस्ते! मैं प्रेसिडेंसी यूनिवर्सिटी के लिए आपका AI शैक्षणिक नियम प्रशिक्षक हूँ।\n\n' +
      'मैं आपकी सटीक सहायता के लिए कृपया साझा करें:\n' +
      '1. छात्र का नाम\n' +
      '2. कार्यक्रम और विभाग (जैसे, B.Tech CSE)\n' +
      '3. वर्तमान सेमेस्टर\n\n' +
      'कृपया अपना शैक्षणिक प्रश्न या चिंता भी बताएं!',
    explain:
      'जैसे “आरव, 3rd Year B.Tech, 5th Semester” लिखकर अपना प्रश्न पूछें — मैं इस सत्र में याद रखूँगा।',
  },
  kn: {
    ask:
      'ನಮಸ್ಕಾರ! ನಾನು ಪ್ರೆಸಿಡೆನ್ಸಿ ವಿಶ್ವವಿದ್ಯಾಲಯಕ್ಕಾಗಿ ನಿಮ್ಮ AI ಶೈಕ್ಷಣಿಕ ನಿಯಮ ಶಿಕ್ಷಕರು.\n\n' +
      'ನಿಖರ ಸಹಾಯಕ್ಕೆ ದಯವಿಟ್ಟು ಹಂಚಿಕೊಳ್ಳಿ:\n' +
      '1. ವಿದ್ಯಾರ್ಥಿಯ ಹೆಸರು\n' +
      '2. ಕಾರ್ಯಕ್ರಮ ಮತ್ತು ವಿಭಾಗ (ಉದಾ, B.Tech CSE)\n' +
      '3. ಪ್ರಸ್ತುತ ಸೆಮಿಸ್ಟರ್\n\n' +
      'ನಿಮ್ಮ ಶೈಕ್ಷಣಿಕ ಪ್ರಶ್ನೆ ಅಥವಾ ಆಶಂಕೆಯನ್ನೂ ಸಹ ತಿಳಿಸಿ!',
    explain:
      'ಉದಾ: “ಆರವ್, 3rd Year B.Tech, 5th Semester” ಎಂದು ಬರೆದು ನಿಮ್ಮ ಪ್ರಶ್ನೆ ಕೇಳಿ — ಈ ಸೆಷನ್‌ನಲ್ಲಿ ನಾನು ನೆನಪಿಟ್ಟುಕೊಳ್ಳುತ್ತೇನೆ.',
  },
};

const ONBOARDING_PATTERN =
  /\b(quick advice|need (?:some |your )?(?:advice|help|guidance)|want (?:to |your )?(?:advice|ask|know)|before i (?:start|apply|begin)|how do i (?:start|begin)|advice about|asking for advice|introduce yourself)\b/i;

const GREETING_ONLY_PATTERN =
  /^(hi|hlo|helo|hii|hello|hey|hey there|yo|greetings|welcome|start|namaste|namaskara|good\s+(morning|afternoon|evening|day))[.!?\s]*$/i;

/** Standard greeting — mirrors server/ragEngine.ts TEXTS.greeting. */
const GREETING: Record<Lang, { ask: string; explain: string }> = {
  en: {
    ask: "Hi! I'm PUARAI, your Presidency University regulations assistant.",
    explain:
      'Ask me about attendance shortage condonation, year-back / promotion rules, make-up (supply) exams, revaluation or how CGPA is calculated.',
  },
  hi: {
    ask: 'नमस्ते! मैं PUARAI हूँ — प्रेसिडेंसी यूनिवर्सिटी नियम सहायक।',
    explain:
      'उपस्थिति शॉर्टेज कंडोनेशन, ईयर-बैक / पदोन्नति, मेक-अप (सप्लाई) परीक्षा, री-वैल्यूएशन या सीजीपीए की गणना के बारे में पूछें।',
  },
  kn: {
    ask: 'ನಮಸ್ಕಾರ! ನಾನು PUARAI — ಪ್ರೆಸಿಡೆನ್ಸಿ ವಿಶ್ವವಿದ್ಯಾಲಯ ನಿಯಮ ಸಹಾಯಕ.',
    explain:
      'ಹಾಜರಾತಿ ಶಾರ್ಟೇಜ್ ಕಂಡೋನೇಶನ್, ಈಯರ್-ಬ್ಯಾಕ್ / ಪದೋನ್ನತಿ, ಮೇಕ್-ಅಪ್ (ಸಪ್ಲೈ) ಪರೀಕ್ಷೆ, ರೀ-ವ್ಯಾಲ್ಯೂಯೇಶನ್ ಅಥವಾ ಸಿಜಿಪಿಎ ಲೆಕ್ಕಾಚಾರದ ಬಗ್ಗೆ ಕೇಳಿ.',
  },
};

export function isProfileComplete(profile?: StudentProfile): boolean {
  return Boolean(profile?.name && profile?.program && profile?.semester);
}

/** Phase 2 — "Hi Aarav! …" greeting injection (mirrors server/ragEngine.ts). */
function injectGreeting(
  profile: StudentProfile | undefined,
  text: string,
  lang: Lang,
): string {
  const name = profile?.name?.trim();
  if (!name) return text;
  const prefix =
    lang === 'hi'
      ? `नमस्ते ${name}! `
      : lang === 'kn'
        ? `ನಮಸ್ಕಾರ ${name}! `
        : `Hi ${name}! `;
  return prefix + text;
}

/** Topic-level fallback phrasing for Hindi / Kannada (English uses summaries). */
const TOPIC_TEMPLATES: Partial<
  Record<RegulationTopic, Partial<Record<Lang, string>>>
> = {
  attendance: {
    hi: '{clause} के अनुसार हर पाठ्यक्रण में कम से कम 75% उपस्थिति अनिवार्य है; चिकित्सा कारणों पर ही 65% तक की छूट मिल सकती है।',
    kn: '{clause} ಪ್ರಕಾರ ಪ್ರತಿ ಕೋರ್ಸ್‌ನಲ್ಲಿ ಕನಿಷ್ಠ 75% ಹಾಜರಾತಿ ಕಡ್ಡಾಯ; ವೈದ್ಯಕೀಯ ಕಾರಣಗಳಿಗೆ ಮಾತ್ರ 65% ವರೆಗೆ ವಿನಾಯಿತಿ ಸಿಗಬಹುದು.',
  },
  promotion: {
    hi: '{clause} के अनुसार शैक्षणिक वर्ष के अंत में सीजीपीए 4.00 से कम होने पर पदोन्नति नहीं मिलती; पूरा वर्ष दोहराना या चुनिंदा पाठ्यक्रम पुनः लेना होगा।',
    kn: '{clause} ಪ್ರಕಾರ ವರ್ಷದ ಕೊನೆಯಲ್ಲಿ ಸಿಜಿಪಿಎ 4.00 ಕ್ಕಿಂತ ಕಡಿಮೆಯಾದರೆ ಪದೋನ್ನತಿ ಸಿಗುವುದಿಲ್ಲ; ಇಡೀ ವರ್ಷ ಪುನರಾವರ್ತಿಸಬೇಕು ಅಥವಾ ಆಯ್ದ ಕೋರ್ಸ್ ಮರು-ನೋಂದಣಿ ಮಾಡಬೇಕು.',
  },
  'grade-review': {
    hi: '{clause} के अनुसार उत्तरपुस्तिका अधिसूचित तिथि पर देखी जा सकती है; ग्रेड समीक्षा का लिखित अनुरोध परिणाम के पाँच कार्यदिवसों में देना होगा।',
    kn: '{clause} ಪ್ರಕಾರ ಉತ್ತರಪುಸ್ತಿಕೆ ಅಧಿಸೂಚಿತ ದಿನಾಂಕದಂದು ನೋಡಬಹುದು; ಗ್ರೇಡ್ ಪರಿಶೀಲನೆಯ ಬರವಣಿಗೆ ವಿನಂತಿ ಫಲಿತಾಂಶದ ಐದು ಕೆಲಸದ ದಿನಗಳೊಳಗೆ ಸಲ್ಲಿಸಬೇಕು.',
  },
  makeup: {
    hi: '{clause} के अनुसार मेक-अप परीक्षा केवल "F" या "I" ग्रेड वाले पाठ्यक्रणों के लिए है, चिकित्सा कारण से छूटी परीक्षा पर BOE अनुमति आवश्यक है।',
    kn: '{clause} ಪ್ರಕಾರ ಮೇಕ್-ಅಪ್ ಪರೀಕ್ಷೆ ಕೇವಲ "F" ಅಥವಾ "I" ಗ್ರೇಡ್ ಇರುವ ಕೋರ್ಸ್‌ಗಳಿಗೆ; ವೈದ್ಯಕೀಯ ಕಾರಣದ ಗೈರುಹಾಜರಿಗೆ BOE ಅನುಮತಿ ಕಡ್ಡಾಯ.',
  },
  cgpa: {
    hi: '{clause} के अनुसार सीजीपीए क्रेडिट-वेटेड ग्रेड-पॉइंट्स का औसत है, दो दशमलव स्थानों तक गणना होती है।',
    kn: '{clause} ಪ್ರಕಾರ ಸಿಜಿಪಿಎ ಕ್ರೆಡಿಟ್-ವೆಯ್ಟೆಡ್ ಗ್ರೇಡ್-ಪಾಯಿಂಟ್‌ಗಳ ಸರಾಸರಿ, ಎರಡು ದಶಾಂಶ ಸ್ಥಳಗಳವರೆಗೆ ಲೆಕ್ಕ.',
  },
  summer: {
    hi: '{clause} के अनुसार ग्रीष्मकालीन सत्र में अधिकतम 12 क्रेडिट तक पंजीकरण किया जा सकता है।',
    kn: '{clause} ಪ್ರಕಾರ ಬೇಸಿಗೆ ಅವಧಿಯಲ್ಲಿ ಗರಿಷ್ಠ 12 ಕ್ರೆಡಿಟ್‌ಗಳನ್ನು ನೋಂದಾಯಿಸಬಹುದು.',
  },
  schedule: {
    hi: '{clause} के अनुसार शैक्षणिक कैलेंडर (रजिस्ट्रार द्वारा जारी) कार्य दिवसों, शनिवारों और छुट्टियों को निर्धारित करता है। मानक कार्य दिवस लागू होते हैं, जब तक कि कोई दिन छुट्टी घोषित न हो, शनिवार गैर-शिक्षण न हो, या यह आधिकारिक छुट्टी सूचना में सूचीबद्ध न हो।',
    kn: '{clause} ಪ್ರಕಾರ ಶೈಕ್ಷಣಿಕ ಕ್ಯಾಲೆಂಡರ್ (ರಿಜಿಸ್ಟ್ರಾರ್ ಹೊರಡಿಸಿದ್ದು) ಕೆಲಸದ ದಿನಗಳು, ಶನಿವಾರಗಳು ಮತ್ತು ರಜೆಗಳನ್ನು ನಿಗದಿಪಡಿಸುತ್ತದೆ. ದಿನವು ರಜೆ ಎಂದು ಘೋಷಿಸಲ್ಪಡದ ಹೊರತು, ಶನಿವಾರ ಬೋಧನೇತರವಾಗಿರದ ಹೊರತು, ಅಥವಾ ಅಧಿಕೃತ ರಜೆ ಸೂಚನೆಯಲ್ಲಿ ಪಟ್ಟಿ ಮಾಡದ ಹೊರತು ಪ್ರಮಾಣಿತ ಕೆಲಸದ ದಿನಗಳು ಅನ್ವಯ.',
  },
};

function toCitation(chunk: {
  clauseId: string;
  sectionTitle: string;
  page: number;
  document: string;
  snippet: string;
  topic: string;
}, score: number): Citation {
  return {
    clauseId: chunk.clauseId,
    sectionTitle: chunk.sectionTitle,
    page: chunk.page,
    document: chunk.document,
    snippet: chunk.snippet,
    topic: chunk.topic,
    score: Math.round(Math.min(1, Math.max(0, score)) * 1000) / 1000,
  };
}
/* FIX 2 — multi-chunk composition (mirrors server/ragEngine.ts) ----------- */

/** Clause order that makes the lead sentence answer the primary question. */
const TOPIC_LEAD_ORDER: Record<RegulationTopic, string[]> = {
  attendance: ['Clause 7.2', 'Clause 7.3', 'Clause 7.6', 'Clause 7.7'],
  promotion: ['Clause 14.1', 'Clause 14.2', 'Clause 14.2.1'],
  'grade-review': ['Clause 12.2', 'Clause 12.3', 'Clause 12.4'],
  makeup: [
    'Clause 13.1',
    'Clause 13.3.2',
    'Clause 13.3',
    'Clause 13.2',
    'Clause 13.4',
  ],
  cgpa: ['Clause 9.1'],
  grading: ['Clause 8.4', 'Clause 8.8'],
  duration: ['Clause 19.1'],
  summer: ['Clause 15.5.2'],
  schedule: ['Clause 2.1'],
}; // TOPIC_LEAD_ORDER (client)

const INTENT_TOPIC: Partial<Record<IntentCategory, RegulationTopic>> = {
  attendance: 'attendance',
  promotion: 'promotion',
  makeup: 'makeup',
  'grade-review': 'grade-review',
  cgpa: 'cgpa',
  grading: 'grading',
  duration: 'duration',
  schedule: 'schedule',
}; // INTENT_TOPIC (client)

/**
 * Synthesizes one answer from the top-3 retrieved chunks: primary-intent
 * chunks lead, re-ordered by clause priority (75% baseline → 65% condonation
 * floor → NP; grade-cap questions lead with Clause 13.3.2's max 'C').
 */
export function composeLocalAnswer(
  hits: ScoredChunk[],
  lang: Lang,
  intent: IntentCategory,
  original: string,
): string {
  const top3 = hits.slice(0, 3);
  if (top3.length === 0) return '';

  const primary = INTENT_TOPIC[intent] ?? top3[0].chunk.topic;
  const order = [...(TOPIC_LEAD_ORDER[primary] ?? [])];
  const wantsCapLead =
    /\b(grade|score|cap|ceiling|90|improve|improvement)\b|['’]\s?[AO]\s?['’]/i.test(
      original,
    );
  if (primary === 'makeup' && wantsCapLead) {
    const capIndex = order.indexOf('Clause 13.3.2');
    if (capIndex > 0) {
      order.splice(capIndex, 1);
      order.unshift('Clause 13.3.2');
    }
  }

  const rank = (clauseId: string): number => {
    const i = order.indexOf(clauseId);
    return i === -1 ? Number.MAX_SAFE_INTEGER : i;
  };

  const ordered = [...top3].sort((a, b) => {
    const ap = a.chunk.topic === primary ? 0 : 1;
    const bp = b.chunk.topic === primary ? 0 : 1;
    if (ap !== bp) return ap - bp;
    const ar = rank(a.chunk.clauseId);
    const br = rank(b.chunk.clauseId);
    if (ar !== br) return ar - br;
    return b.score - a.score;
  });

  if (lang === 'en') {
    return ordered.map((h) => h.chunk.summary).join(' ');
  }

  const parts: string[] = [];
  const seen = new Set<RegulationTopic>();
  for (const hit of ordered) {
    const template = TOPIC_TEMPLATES[hit.chunk.topic]?.[lang];
    if (template && !seen.has(hit.chunk.topic)) {
      parts.push(template.replace('{clause}', hit.chunk.clauseId));
      seen.add(hit.chunk.topic);
    }
  }
  if (parts.length === 0) {
    return `${ordered[0].chunk.clauseId} — ${ordered[0].chunk.sectionTitle}`;
  }
  return parts.join(' ');
}

/**
 * Answers a question completely offline: normalize slang → TF-IDF search →
 * paraphrased answer + citations. Returned as the same envelope the API
 * produces, so the chat UI renders identically.
 */
export function localAsk(
  query: string,
  language: Lang,
  profile?: StudentProfile,
  localRefusal?: boolean,
): ApiSuccess<AskResponseData> {
  const startedAt = Date.now();

  // FIX: totally non-academic offline input → exact refusal parity.

  // Phase 2 — offline onboarding parity with the server engine.
  const onboardingish =
    ONBOARDING_PATTERN.test(query) || GREETING_ONLY_PATTERN.test(query);
  if (onboardingish && !isProfileComplete(profile)) {
    const data: AskResult = {
      kind: 'onboarding',
      directAnswer: ONBOARDING[language].ask,
      explanation: ONBOARDING[language].explain,
      citations: [],
      intent: { category: 'onboarding', canonicalTerms: [] },
      engine: 'guard',
      language,
      latencyMs: Date.now() - startedAt,
    };
    return { success: true, data: { ...data, profile } };
  }

  if (localRefusal) {
    const data: AskResult = {
      kind: 'refusal',
      directAnswer: OFF_TOPIC_REFUSALS[language],
      explanation: NETWORK_NOTES[language],
      citations: [],
      intent: { category: 'off-scope', canonicalTerms: [] },
      engine: 'guard',
      language,
      latencyMs: Date.now() - startedAt,
    };
    return { success: true, data: { ...data, profile } };
  }

  // SHORT-INPUT OVERRIDE (offline parity): tiny conversational inputs never
  // produce a refusal or nudge — welcome when the profile is incomplete.
  if (
    query.trim().length < 4 &&
    !GREETING_ONLY_PATTERN.test(query) &&
    !SLANG_RULES.some((r) => r.pattern.test(query))
  ) {
    const incomplete = !isProfileComplete(profile);
    const data: AskResult = {
      kind: incomplete ? 'onboarding' : 'greeting',
      directAnswer: incomplete
        ? ONBOARDING[language].ask
        : GREETING[language].ask,
      explanation: incomplete
        ? ONBOARDING[language].explain
        : GREETING[language].explain,
      citations: [],
      intent: {
        category: incomplete ? 'onboarding' : 'greeting',
        canonicalTerms: [],
      },
      engine: 'guard',
      language,
      latencyMs: Date.now() - startedAt,
    };
    return { success: true, data: { ...data, profile } };
  }

  const canonicalTerms: string[] = [];
  let intent: IntentCategory = 'general';
  let resolved = false;
  for (const rule of SLANG_RULES) {
    if (rule.pattern.test(query)) {
      if (!canonicalTerms.includes(rule.canonical)) {
        canonicalTerms.push(rule.canonical);
      }
      if (!resolved) {
        intent = rule.intent;
        resolved = true;
      }
    }
  }

  const expanded = [query, ...canonicalTerms].join(' ');
  const hits = searchCorpus(expanded, TOP_K).filter(
    (h) => h.score >= MIN_SCORE,
  );

  const intentPayload = {
    category: intent,
    canonicalTerms,
    suggestedClauseId: undefined as string | undefined,
  };

  if (hits.length === 0) {
    const refusal = REFUSALS[language];
    const data: AskResult = {
      kind: 'refusal',
      directAnswer: refusal.direct,
      explanation: refusal.explain,
      citations: [],
      intent: intentPayload,
      engine: 'guard',
      language,
      latencyMs: Date.now() - startedAt,
    };
    return { success: true, data };
  }

  const directAnswer = injectGreeting(
    profile,
    composeLocalAnswer(hits, language, intent, query),
    language,
  );

  const data: AskResult = {
    kind: 'answer',
    directAnswer,
    explanation: NETWORK_NOTES[language],
    citations: hits.map((h) => toCitation(h.chunk, h.score)),
    intent: intentPayload,
    engine: 'local-fallback',
    language,
    latencyMs: Date.now() - startedAt,
  };
  return { success: true, data };
}

