/**
 * STAGE 1 — Intent & Terminology Normalization.
 *
 * Translates student slang into formal administrative concepts *before*
 * retrieval runs, so vector search executes against canonical vocabulary:
 *
 *   "pointer" / "gpa"        ➔ CGPA                                (Clause 9.1)
 *   "year back" / "detain"   ➔ Academic Progression & Promotion    (Clause 14.1)
 *   "reval" / "paper seeing" ➔ Answer Script Photocopy & Grade Review (Clause 12.2)
 *   "makeup" / "supply"      ➔ Make-Up Examination                 (Clause 13.1)
 *
 * It also runs the off-scope refusal guard and greeting detection so the RAG
 * engine never spends an LLM call on questions it must decline.
 */

import { isProfileComplete } from './sessionStore.js';
import type { AnalyzedQuery, IntentCategory, Lang, StudentProfile } from './types.js';

export const MAX_QUERY_LENGTH = 600;

export interface TerminologyRule {
  /** Student-slang pattern. */
  pattern: RegExp;
  intent: IntentCategory;
  /** Canonical administrative concept. */
  canonical: string;
  /** Clause hint attached to the normalized query. */
  clauseId: string;
}

/** Ordered: first match wins the intent; every match enriches the query.
 *  Patterns cover English student slang plus Hindi (Devanagari) and Kannada
 *  (Kannada script) equivalents so trilingual queries normalize identically. */
export const TERMINOLOGY_MAP: TerminologyRule[] = [
  {
    // "year back" / "detain" ➔ Academic Progression & Promotion Failure
    pattern:
      /\b(year[\s-]?backs?|yearback|back[\s-]?year|detain(ed|ment)?|detained|not[\s-]?promoted|promot(?:ed|ion|ion[\s-]?failure)?|academic[\s-]?progression|repeat(?:ing)?[\s-]?(?:the[\s-]?year|year)|stuck[\s-]?in[\s-]?year)\b|पदोन्नति|साल\s?बैक|वर्ष\s?बैक|अटक\s?गया|पीछे\s?रह\s?गया|ಈಯರ್\s?ಬ್ಯಾಕ್|ಪದೋನ್ನತಿ|ವರ್ಷ\s?ಬ್ಯಾಕ್|ಫೇಲ್\s?ಆಗ/i,
    intent: 'promotion',
    canonical: 'Academic Progression & Promotion Failure',
    clauseId: 'Clause 14.1',
  },
  {
    // "pointer" / "gpa" ➔ CGPA
    pattern:
      /\b(pointers?|gpa|cgpa|sgpa|cumulative[\s-]?grade)\b|पॉइंटर|सीजीपीए|जीपीए|ಗೆಜ್ಜ?|ಪಾಯಿಂಟರ್|ಸಿಜಿಪಿಎ|ಜಿಪಿಎ/i,
    intent: 'cgpa',
    canonical: 'CGPA',
    clauseId: 'Clause 9.1',
  },
  {
    // "reval" / "paper seeing" ➔ Answer Script Photocopy & Grade Review
    pattern:
      /\b(revals?(?:uation)?|re-?check|recheck|paper[\s-]?seeing|seeing[\s-]?paper|see(?:ing)?[\s-]?paper|answer[\s-]?scripts?|photocop(?:y|ies)|grade[\s-]?review|review[\s-]?of[\s-]?grade|challenge[\s-]?evaluation|grievance[\s-]?about[\s-]?grade|re[\s-]?evaluation)\b|री-?वैल्यू|पेपर\s?देख|उत्तर\s?पुस्तिका|रಿವ್ಯಾಲ್ಯೂ|ರೀ-ವ್ಯಾಲ್ಯೂ|ಪೇಪರ್\s?ನೋಡ|ಉತ್ತರ\s?ಪುಸ್ತಿಕೆ/i,
    intent: 'grade-review',
    canonical: 'Answer Script Photocopy & Grade Review',
    clauseId: 'Clause 12.2',
  },
  {
    // "makeup" / "supply" ➔ Make-Up Examination
    pattern:
      /\b(make[\s-]?ups?|makeup|make[\s-]?up[\s-]?exams?|supply|supplementary|suply|arrears?|backlogs?|re[\s-]?appear)\b|मेक-?अप|सप्लाई|पूरक\s?परीक्षा|ಮೇಕ್-?ಅಪ್|ಸಪ್ಲೈ|ಪೂರಕ\s?ಪರೀಕ್ಷೆ/i,
    intent: 'makeup',
    canonical: 'Make-Up Examination',
    clauseId: 'Clause 13.1',
  },
  {
    // attendance shortage / condonation
    pattern:
      /\b(attendance|attending|absent|condon(?:e|ed|ation)|shortage|75\s?%|65\s?%|np\b|not[\s-]?permitted)\b|उपस्थिति|हाज़री|हाजरी|हाजिरी|गैर-हाज़िरी|ಹಾಜರಾತಿ|ಗೈರು|ಕಂಡೋನೇಶನ್/i,
    intent: 'attendance',
    canonical: 'Attendance Shortage Condonation',
    clauseId: 'Clause 7.3',
  },
  {
    // failing courses / grade scale
    pattern:
      /\b(fail(?:ed|ure|ing)?|f[\s-]?grade|grades?|marks?|result|end[\s-]?term|internal[s]?)\b|फेल|ग्रेड|अंक|ಪಾಸ್|ಗ್ರೇಡ್|ಅಂಕ|ಫೇಲ್/i,
    intent: 'grading',
    canonical: 'Letter Grades & Minimum Performance',
    clauseId: 'Clause 8.8',
  },
  {
    // program time limits
    pattern:
      /\b(maximum[\s-]?duration|time[\s-]?limit|how[\s-]?long|years?[\s-]?to[\s-]?complete|duration)\b|अधिकतम\s?अवधि|कितने\s?साल|ಗರಿಷ್ಠ\s?ಅವಧಿ|ಎಷ್ಟು\s?ವರ್ಷ/i,
    intent: 'duration',
    canonical: 'Maximum Duration for Completion',
    clauseId: 'Clause 19.1',
  },
  {
    // working days / Saturdays / holidays / academic calendar (incl. typos)
    pattern:
      /\b(saturdays?|sataday|satrday|saturady|weekends?|holidays?|working[\s-]?days?|working[\s-]?hours?|college[\s-]?(?:is |was )?(?:open|closed|off|on)|open on|closed on|public[\s-]?holidays?|government[\s-]?holidays?|gazetted[\s-]?holidays?|leaves?|leave[\s-]?schedule|academic[\s-]?calendar|registrar|non-?instructional|is today a holiday|today (?:a )?holiday|college timings?|timetable|opening hours)\b|ಶನಿವಾರ|ರಜೆ|ಕ್ಯಾಲೆಂಡರ್|शनिवार|छुट्टी|अवकाश|कैलेंडर/i,
    intent: 'schedule',
    canonical: 'Academic Calendar Working Days Saturdays Holidays',
    clauseId: 'Clause 2.1',
  },
];

/**
 * Pure greetings and starter inputs — checked FIRST, before terminology
 * matching, off-scope scoring or any retrieval. Includes common typos/slang
 * ("hlo", "hey there", "greetings", "yo", …).
 */
const GREETING_PATTERN =
  /^(hi|hlo|helo|hii|hello|hey|hey there|yo|greetings|welcome|start|namaste|namaskara|good\s+(morning|afternoon|evening|day)|how\s+are\s+you|who\s+are\s+you|thanks?|thank\s+you|ok\s+thanks)[.!?\s]*$/i;

/**
 * Phase 2: warm-onboarding prompts — the student opens with a greeting or
 * asks for general advice without naming a specific regulation topic yet.
 * Specific-topic questions (attendance, grades, …) never match because the
 * intent must still be `general`.
 */
const ONBOARDING_PATTERN =
  /\b(quick advice|need (?:some |your )?(?:advice|help|guidance)|want (?:to |your )?(?:advice|ask|know)|before i (?:start|apply|begin)|how do i (?:start|begin)|advice about|asking for advice|introduce yourself)\b/i;

/**
 * Clearly out-of-scope intents. Combined with the academic-signal check below
 * so "attendance in football class" does not get refused.
 */
const OFF_SCOPE_PATTERNS: RegExp[] = [
  /\b(cricket|football|ipl|fifa|world cup|olympics|kabaddi|tennis score)\b/i,
  /\b(movie|movies|film|actor|actress|celebrity|bollywood|hollywood|netflix|song lyrics?)\b/i,
  /\b(recipe|cooking|biryani|restaurant|menu|food court menu)\b/i,
  /\b(bitcoin|crypto|stock|shares?|share market|nifty|sensex|trading)\b/i,
  /\b(weather|rain today|temperature today|news headlines?|politics|election|prime minister|cm of)\b/i,
  /\b(jokes?|funny|meme|girlfriend|boyfriend|love story|horoscope|astrology)\b/i,
  /\b(python|javascript|typescript|react js|node js|coding|programming|debug|compiler|software engineer)\b/i,
  /\b(vtu|mumbai university|delhi university|anna university|bangalore university|visvesvaraya)\b/i,
  // FIX 3: campus facilities are NOT academic-regulation topics — the
  // "Buddy" refusal router handles them instead of the RAG pathway.
  /\b(library|libraries|mess( menu)?|canteen|cafeteria|shuttle|bus (timings?|routes?|schedule|stop))\b/i,
];

/**
 * FIX 3: prompt-injection / out-of-domain task requests. These are always
 * off-scope — even when the wording mentions words like "regulations" or
 * "instructions" that would otherwise look academic.
 */
const TASK_REQUEST_PATTERN =
  /ignore (all |previous |prior |above )*(instructions?|prompts?)|you are now|act as a|new persona|roleplay as|jailbreak|web scraping|scrape (a |the )?website|write (a |the |me )?(python|javascript|java|node|code|script)|python script/i;

/** Signals that keep a query inside academic-regulation scope (all 3 languages). */
const ACADEMIC_SIGNAL_PATTERN =
  /(attend|exam|grade|cgpa|gpa|pointer|semester|credit|course|mark|result|promot|detain|reval|makeup|make-up|supply|backlog|arrear|regulation|clause|handbook|summer term|transcript|degree|provisional|bonafide|convocation|scholarship|attendance|answer script|reappear|fail|pass|year back|internal|end term|hod|dean|coe|evaluation|academic|study|programme|program|syllabus|fee|placement|intern|saturday|holiday|working day|academic calendar|registrar|leave|उपस्थिति|परीक्षा|ग्रेड|पदोन्नति|नियम|अंक|सीजीपीए|हाज़री|उपस्थिति|शनिवार|छुट्टी|ಹಾಜರಾತಿ|ಪರೀಕ್ಷೆ|ಗ್ರೇಡ್|ಪದೋನ್ನತಿ|ನಿಯಮ|ಅಂಕ|ಸಿಜಿಪಿಎ|ಶನಿವಾರ|ರಜೆ)/i;

/** Collapses whitespace and strips C0/C1 control characters. */
function sanitize(raw: string): string {
  return raw
    .replace(/\s+/g, ' ')
    .replace(/\p{Cc}+/gu, '')
    .trim()
    .slice(0, MAX_QUERY_LENGTH);
}

/**
 * Stage 1: normalize a raw student query into a structured, retrieval-ready
 * analyzed query. Never throws - malformed input degrades gracefully.
 */
export function analyzeQuery(
  rawQuery: string,
  language: Lang,
  profile?: StudentProfile,
): AnalyzedQuery {
  const original = sanitize(String(rawQuery ?? ''));
  const normalized = original.toLowerCase();

  /* ── ROUTING PRECEDENCE: pure greetings/starter inputs decided FIRST ─────
   * No terminology map, no off-scope scoring, no vector search — if the
   * request has no profile (or an incomplete one) it is onboarding. */
  const greetingFirst = GREETING_PATTERN.test(original);
  if (greetingFirst && !isProfileComplete(profile)) {
    return {
      original,
      normalized,
      expandedQuery: original,
      intent: 'onboarding',
      canonicalTerms: [],
      suggestedClauseId: undefined,
      language,
      hasAcademicTerms: false,
      offScope: false,
      greeting: true,
    };
  }

  const canonicalTerms: string[] = [];
  const clauseHints: string[] = [];
  let intent: IntentCategory = 'general';
  let intentResolved = false;

  for (const rule of TERMINOLOGY_MAP) {
    if (rule.pattern.test(original)) {
      if (!canonicalTerms.includes(rule.canonical)) canonicalTerms.push(rule.canonical);
      if (!clauseHints.includes(rule.clauseId)) clauseHints.push(rule.clauseId);
      if (!intentResolved) {
        intent = rule.intent;
        intentResolved = true;
      }
    }
  }

  const greeting = greetingFirst;
  const academicSignal = ACADEMIC_SIGNAL_PATTERN.test(original);
  const offScopeMatch = OFF_SCOPE_PATTERNS.some((p) => p.test(original));
  // FIX 3: facility questions and injection/task requests are always
  // off-scope, even when they contain academic-looking rescue words.
  const taskRequest = TASK_REQUEST_PATTERN.test(original);
  const offScope = !greeting && offScopeMatch && (!academicSignal || taskRequest);

  // Phase 2: onboarding — advice-seeking without a regulation topic while
  // the profile is still incomplete (greetings are handled above, first).
  const onboarding =
    intent === 'general' &&
    !offScope &&
    !greeting &&
    !isProfileComplete(profile) &&
    ONBOARDING_PATTERN.test(original);

  if (offScope) intent = 'off-scope';
  else if (onboarding) intent = 'onboarding';
  else if (greeting) intent = 'greeting';

  // Retrieval query = student wording + canonical terms + clause hints, so
  // TF-IDF / vector search runs against normalized administrative vocabulary.
  const expandedQuery = [original, ...canonicalTerms, ...clauseHints]
    .filter(Boolean)
    .join(' ')
    .trim();

  return {
    original,
    normalized,
    expandedQuery: expandedQuery || original,
    intent,
    canonicalTerms,
    suggestedClauseId: clauseHints[0],
    language,
    hasAcademicTerms: academicSignal || canonicalTerms.length > 0,
    offScope,
    greeting,
  };
}

/** Human-readable label for an intent (used in logs + API diagnostics). */
export const INTENT_LABELS: Record<IntentCategory, string> = {
  attendance: 'Attendance & Condonation',
  promotion: 'Academic Progression & Promotion Failure',
  'grade-review': 'Answer Script Photocopy & Grade Review',
  makeup: 'Make-Up Examination',
  cgpa: 'CGPA & Academic Performance Indices',
  grading: 'Grading & Minimum Performance',
  duration: 'Maximum Program Duration',
  general: 'General Regulation Query',
  greeting: 'Greeting',
  onboarding: 'Student Onboarding',
  'schedule': 'Academic Calendar & Working Days',
  'off-scope': 'Off-scope (refused)',
};

