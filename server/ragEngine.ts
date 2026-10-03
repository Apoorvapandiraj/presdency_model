/**
 * STAGE 2 — Hybrid Retrieval + LLM Generation.
 *
 * Pipeline: analyzeQuery (Stage 1) -> hybrid retrieval (Atlas Vector /
 * local TF-IDF) -> Gemini 2.5 Flash completion at temperature 0.0 ->
 * verbatim-leak guard -> structured AskResult.
 *
 * Resiliency: any failure (no API key, quota, network, invalid JSON, or an
 * answer that copies the PDF verbatim) falls back to the local RAG answer
 * built from curated clause summaries — the API never 500s because of the LLM.
 */

import type { RegulationChunk, RegulationTopic } from './corpus.js';
import type {
  AnalyzedQuery,
  AskResult,
  ChatTurn,
  Citation,
  IntentCategory,
  Lang,
  RetrievalHit,
  ScoredChunk,
  StudentProfile,
} from './types.js';
import { generateGroundedAnswer } from './geminiClient.js';
import { describeProfile, isProfileComplete } from './sessionStore.js';
import { retrieve } from './vectorStore.js';

const TOP_K = 4;
/** Cosine similarity below this = nothing genuinely matched the question. */
const MIN_SCORE = 0.10;
/** An answer sharing a 12-word run with a snippet counts as verbatim leak. */
const VERBATIM_WINDOW = 12;

interface LocalizedTexts {
  offScope: string;
  offScopeExplain: string;
  ungrounded: string;
  ungroundedExplain: string;
  greeting: string;
  greetingExplain: string;
  localExplanation: string;
  onboardingAsk: string;
  onboardingExplain: string;
}

/** FIX: exact off-topic refusal format required by the verification suite. */
const OFF_TOPIC_REFUSAL =
  'Hello! I am your AI Academic Regulations Instructor for Presidency University. ' +
  'The question which you asked is not related to Academic Regulations and rules.';

const TEXTS: Record<Lang, LocalizedTexts> = {
  en: {
    offScope: OFF_TOPIC_REFUSAL,
    offScopeExplain:
      'For anything else (news, sports, coding, other universities) I would only guess, so I politely decline. Ask me a regulation question instead.',
    ungrounded:
      "I could not find that rule in the regulations I have indexed, so I will not guess at it.",
    ungroundedExplain:
      'Try rephrasing with exam, attendance, grade or promotion wording — or open the official handbook link in the footer to verify directly.',
    greeting:
      "Hi! I'm PUARAI, your Presidency University regulations assistant.",
    greetingExplain:
      'Ask me about attendance shortage condonation, year-back / promotion rules, make-up (supply) exams, revaluation or how CGPA is calculated.',
    localExplanation:
      'This grounded answer comes from the retrieved clause summary rather than the live model — open the citation drawer to verify the exact handbook wording.',
    onboardingAsk:
      'Hello! I am your AI Academic Regulations Instructor for Presidency University.\n\n' +
      'To assist you accurately with university regulations, please share:\n' +
      '1. Student Name\n' +
      '2. Program & Department (e.g., B.Tech CSE)\n' +
      '3. Current Semester\n\n' +
      'Please also state your academic query or concern!',
    onboardingExplain:
      'Once you share these details, I will remember them for this session and cite the exact clause for every answer.',
  },
  hi: {
    offScope:
      'नमस्ते! मैं प्रेसिडेंसी यूनिवर्सिटी के लिए आपका AI शैक्षणिक नियम प्रशिक्षक हूँ। जो प्रश्न आपने पूछा है वह शैक्षणिक नियमों और विनियमों से संबंधित नहीं है।',
    offScopeExplain:
      'अन्य विषयों (खेल, समाचार, कोडिंग, अन्य विश्वविद्यालय) पर मैं केवल अनुमान लगाऊँगा, इसलिए विनम्रतापूर्वक मना कर रहा हूँ। कृपया नियम से जुड़ा प्रश्न पूछें।',
    ungrounded:
      'मुझे यह नियम अनुक्रमित (indexed) विनियमों में नहीं मिला, इसलिए मैं अनुमान नहीं लगाऊँगा।',
    ungroundedExplain:
      'परीक्षा, उपस्थिति, ग्रेड या पदोन्नति के शब्दों के साथ दोबारा पूछें, या फुटर की आधिकारिक हैंडबुक लिंक से स्वयं जाँचें।',
    greeting:
      'नमस्ते! मैं PUARAI हूँ — प्रेसिडेंसी यूनिवर्सिटी नियम सहायक।',
    greetingExplain:
      'उपस्थिति शॉर्टेज कंडोनेशन, ईयर-बैक / पदोन्नति, मेक-अप (सप्लाई) परीक्षा, री-वैल्यूएशन या सीजीपीए की गणना के बारे में पूछें।',
    localExplanation:
      'यह उत्तर लाइव मॉडल के बजाय प्राप्त खंड (clause) के सारांश से बना है — सटीक शब्दों की पुष्टि हेतु सिटेशन ड्रॉर खोलें।',
    onboardingAsk:
      'नमस्ते! मैं प्रेसिडेंसी यूनिवर्सिटी के लिए आपका AI शैक्षणिक नियम प्रशिक्षक हूँ।\n\n' +
      'मैं आपकी सटीक सहायता के लिए कृपया साझा करें:\n' +
      '1. छात्र का नाम\n' +
      '2. कार्यक्रम और विभाग (जैसे, B.Tech CSE)\n' +
      '3. वर्तमान सेमेस्टर\n\n' +
      'कृपया अपना शैक्षणिक प्रश्न या चिंता भी बताएं!',
    onboardingExplain:
      'ये विवरण साझा करने के बाद, मैं उन्हें इस सत्र के लिए याद रखूँगा और हर उत्तर में सही क्लॉज़ का संदर्भ दूँगा।',
  },
  kn: {
    offScope:
      'ನಮಸ್ಕಾರ! ನಾನು ಪ್ರೆಸಿಡೆನ್ಸಿ ವಿಶ್ವವಿದ್ಯಾಲಯಕ್ಕಾಗಿ ನಿಮ್ಮ AI ಶೈಕ್ಷಣಿಕ ನಿಯಮ ಶಿಕ್ಷಕರು. ನೀವು ಕೇಳಿದ ಪ್ರಶ್ನೆ ಶೈಕ್ಷಣಿಕ ನಿಯಮಗಳು ಮತ್ತು ವಿನಿಯಮಗಳಿಗೆ ಸಂಬಂಧಿಸಿಲ್ಲ.',
    offScopeExplain:
      'ಇತರ ವಿಷಯಗಳಲ್ಲಿ (ಸುದ್ದಿ, ಕ್ರೀಡೆ, ಕೋಡಿಂಗ್, ಇತರ ವಿಶ್ವವಿದ್ಯಾಲಯಗಳು) ನಾನು ಊಹಿಸುತ್ತೇನೆ ಆದ್ದರಿಂದ ವಿನಯತೆಯಿಂದ ನಿರಾಕರಿಸುತ್ತೇನೆ. ದಯವಿಟ್ಟು ನಿಯಮದ ಪ್ರಶ್ನೆ ಕೇಳಿ.',
    ungrounded:
      'ಈ ನಿಯಮ ನಾನು ಸೂಚಿಸಿರುವ (indexed) ವಿನಿಯಮಗಳಲ್ಲಿ ಸಿಗಲಿಲ್ಲ, ಆದ್ದರಿಂದ ನಾನು ಊಹಿಸುವುದಿಲ್ಲ.',
    ungroundedExplain:
      'ಪರೀಕ್ಷೆ, ಹಾಜರಾತಿ, ಗ್ರೇಡ್ ಅಥವಾ ಪದೋನ್ನತಿ ಪದಗಳೊಂದಿಗೆ ಮತ್ತೆ ಕೇಳಿ, ಅಥವಾ ಫುಟರ್‌ನ ಅಧಿಕೃತ ಹ್ಯಾಂಡ್‌ಬುಕ್ ಲಿಂಕ್‌ನಲ್ಲಿ ನೇರವಾಗಿ ಪರಿಶೀಲಿಸಿ.',
    greeting:
      'ನಮಸ್ಕಾರ! ನಾನು PUARAI — ಪ್ರೆಸಿಡೆನ್ಸಿ ವಿಶ್ವವಿದ್ಯಾಲಯ ನಿಯಮ ಸಹಾಯಕ.',
    greetingExplain:
      'ಹಾಜರಾತಿ ಶಾರ್ಟೇಜ್ ಕಂಡೋನೇಶನ್, ಈಯರ್-ಬ್ಯಾಕ್ / ಪದೋನ್ನತಿ, ಮೇಕ್-ಅಪ್ (ಸಪ್ಲೈ) ಪರೀಕ್ಷೆ, ರೀ-ವ್ಯಾಲ್ಯೂಯೇಶನ್ ಅಥವಾ ಸಿಜಿಪಿಎ ಲೆಕ್ಕಾಚಾರದ ಬಗ್ಗೆ ಕೇಳಿ.',
    localExplanation:
      'ಈ ಉತ್ತರ ಲೈವ್ ಮಾಡೆಲ್ ಬದಲು ಪಡೆದ ಕ್ಲಾಸ್ ಸಾರಾಂಶದಿಂದ ಬಂದಿದೆ — ನಿಖರ ಪದಗಳಿಗಾಗಿ ಸಿಟೇಶನ್ ಡ್ರಾವರ್ ತೆರೆಯಿರಿ.',
    onboardingAsk:
      'ನಮಸ್ಕಾರ! ನಾನು ಪ್ರೆಸಿಡೆನ್ಸಿ ವಿಶ್ವವಿದ್ಯಾಲಯಕ್ಕಾಗಿ ನಿಮ್ಮ AI ಶೈಕ್ಷಣಿಕ ನಿಯಮ ಶಿಕ್ಷಕರು.\n\n' +
      'ನಿಖರ ಸಹಾಯಕ್ಕೆ ದಯವಿಟ್ಟು ಹಂಚಿಕೊಳ್ಳಿ:\n' +
      '1. ವಿದ್ಯಾರ್ಥಿಯ ಹೆಸರು\n' +
      '2. ಕಾರ್ಯಕ್ರಮ ಮತ್ತು ವಿಭಾಗ (ಉದಾ, B.Tech CSE)\n' +
      '3. ಪ್ರಸ್ತುತ ಸೆಮಿಸ್ಟರ್\n\n' +
      'ನಿಮ್ಮ ಶೈಕ್ಷಣಿಕ ಪ್ರಶ್ನೆ ಅಥವಾ ಆಶಂಕೆಯನ್ನೂ ಸಹ ತಿಳಿಸಿ!',
    onboardingExplain:
      'ಈ ವಿವರಗಳನ್ನು ಹಂಚಿಕೊಳ್ಳಿದ ನಂತರ, ನಾನು ಅವುಗಳನ್ನು ಈ ಸೆಷನ್‌ಗಾಗಿ ನೆನಪಿಡಿದು, ಪ್ರತಿ ಉತ್ತರದಲ್ಲಿ ಸರಿಯಾದ ಕ್ಲಾಸ್ ಉಲ್ಲೇಖಿಸುತ್ತೇನೆ.',
  },
};
/* ── Helpers ──────────────────────────────────────────────────────────────── */

function normalizeWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9%]+/g, ' ')
    .split(' ')
    .filter(Boolean);
}

/**
 * Zero-plagiarism guard: detects any VERBATIM_WINDOW-word run from a source
 * snippet inside the candidate answer (LLM output is rejected if it leaks).
 */
export function containsVerbatim(answer: string, snippets: string[]): boolean {
  const answerWords = normalizeWords(answer);
  if (answerWords.length < VERBATIM_WINDOW) return false;

  const answerGrams = new Set<string>();
  for (let i = 0; i + VERBATIM_WINDOW <= answerWords.length; i += 1) {
    answerGrams.add(answerWords.slice(i, i + VERBATIM_WINDOW).join(' '));
  }

  for (const snippet of snippets) {
    const words = normalizeWords(snippet);
    for (let i = 0; i + VERBATIM_WINDOW <= words.length; i += 1) {
      if (answerGrams.has(words.slice(i, i + VERBATIM_WINDOW).join(' '))) {
        return true;
      }
    }
  }
  return false;
}

function toCitation(hit: { chunk: RegulationChunk; score: number }): Citation {
  return {
    clauseId: hit.chunk.clauseId,
    sectionTitle: hit.chunk.sectionTitle,
    page: hit.chunk.page,
    document: hit.chunk.document,
    snippet: hit.chunk.snippet,
    topic: hit.chunk.topic,
    score: Math.round(Math.min(1, Math.max(0, hit.score)) * 1000) / 1000,
  };
}

/** Topic-level local answer templates for Hindi / Kannada fallbacks. */
const TOPIC_TEMPLATES: Record<Lang, Partial<Record<RegulationTopic | 'default', string>>> = {
  en: {},
  hi: {
    attendance:
      '{clause} के अनुसार हर पाठ्यक्रण में कम से कम 75% उपस्थिति अनिवार्य है; अस्पताल, आघात या संक्रामक रोग की स्थिति में ही डीन की सिफ़ारिश पर वाइस चांसलर 65% तक की छूट दे सकते हैं।',
    promotion:
      '{clause} के अनुसार शैक्षणिक वर्ष के अंत में सीजीपीए 4.00 से कम होने पर पदोन्नति नहीं मिलती; आप पूरा वर्ष दोहरा सकते हैं या चुनिंदा पाठ्यक्रम पुनः पंजीकृत करके पात्रता बना सकते हैं।',
    'grade-review':
      '{clause} के अनुसार उत्तरपुस्तिका अधिसूचित तिथि पर देखी जा सकती है; ग्रेड समीक्षा का लिखित अनुरोध परिणाम घोषणा के पाँच कार्यदिवसों के भीतर होडीन/डीन को देना होगा, तथा असंतुष्टि पर AAB में अपील की जा सकती है।',
    makeup:
      '{clause} के अनुसार मेक-अप परीक्षा केवल "F" या "I" ग्रेड वाले पाठ्यक्रणों के लिए है; चिकित्सा कारण से छूटी परीक्षा पर BOE की अनुमति, दस्तावेज़ और समय पर शुल्क अनिवार्य है।',
    cgpa:
      '{clause} के अनुसार सीजीपीए क्रेडिट-वेटेड ग्रेड-पॉइंट्स का औसत है और दो दशमलव स्थानों तक गणना होती है।',
    grading:
      '{clause} के अनुसार ग्रेड O(10) से D(4, उत्तीर्ण) तक हैं; एंड-टर्म में 30% या कुल 40% से कम पर "F" ग्रेड मिलता है।',
    duration:
      '{clause} के अनुसार प्रोग्राम पूरा करने की अधिकतम अवधि सामान्य अवधि की दोगुनी है, और ग्रेड सुधार में लगा समय भी इसी में गिना जाता है।',
    summer:
      '{clause} के अनुसार ग्रीष्मकालीन सत्र (Summer Term) में अधिकतम 12 क्रेडिट तक पंजीकरण किया जा सकता है।',
    schedule: '{clause} के अनुसार शैक्षणिक कैलेंडर (रजिस्ट्रार द्वारा जारी) कार्य दिवसों, शनिवारों और छुट्टियों को निर्धारित करता है। मानक कार्य दिवस लागू होते हैं, जब तक कि कोई दिन छुट्टी घोषित न हो, शनिवार गैर-शिक्षण न हो, या यह आधिकारिक छुट्टी सूचना में सूचीबद्ध न हो — सटीक समय-सारणी हमेशा वर्तमान शैक्षणिक कैलेंडर में देखें।',
    default:
      '{clause} के अनुसार संबंधित नियम लागू है — शब्दशः पाठ हेतु सिटेशन ड्रॉर खोलें।',
  },
  kn: {
    attendance:
      '{clause} ಪ್ರಕಾರ ಪ್ರತಿ ಕೋರ್ಸ್‌ನಲ್ಲಿ ಕನಿಷ್ಠ 75% ಹಾಜರಾತಿ ಕಡ್ಡಾಯ; ಆಸ್ಪತ್ರೆ, ಆಘಾತ ಅಥವಾ ಸೋಂಕಿನ ಕಾಯಿಲೆಯ ಸಂದರ್ಭದಲ್ಲಿ ಮಾತ್ರ ಡೀನ್ ಶಿಫಾರಸಿನ ಮೇಲೆ ಕುಲಪತಿ 65% ವರೆಗೆ ವಿನಾಯಿತಿ ನೀಡಬಹುದು.',
    promotion:
      '{clause} ಪ್ರಕಾರ ಶೈಕ್ಷಣಿಕ ವರ್ಷದ ಕೊನೆಯಲ್ಲಿ ಸಿಜಿಪಿಎ 4.00 ಕ್ಕಿಂತ ಕಡಿಮೆಯಾದರೆ ಪದೋನ್ನತಿ ಸಿಗುವುದಿಲ್ಲ; ಇಡೀ ವರ್ಷ ಪುನರಾವರ್ತಿಸಬಹುದು ಅಥವಾ ಆಯ್ದ ಕೋರ್ಸ್‌ಗಳನ್ನು ಮರು-ನೋಂದಣಿ ಮಾಡಿ ಅರ್ಹತೆ ಪಡೆಯಬಹುದು.',
    'grade-review':
      '{clause} ಪ್ರಕಾರ ಉತ್ತರಪುಸ್ತಿಕೆಯನ್ನು ಅಧಿಸೂಚಿತ ದಿನಾಂಕದಂದು ನೋಡಬಹುದು; ಗ್ರೇಡ್ ಪರಿಶೀಲನೆಯ ಬರವಣಿಗೆ ವಿನಂತಿಯನ್ನು ಫಲಿತಾಂಶ ಘೋಷಣೆಯ ಐದು ಕೆಲಸದ ದಿನಗಳೊಳಗೆ ಹೋಡಿ/ಡೀನ್‌ಗೆ ನೀಡಬೇಕು; ತೃಪ್ತಿಯಿಲ್ಲದಿದ್ದರೆ AAB‌ಗೆ ಮೇಲ್ಮನವಿ ಮಾಡಬಹುದು.',
    makeup:
      '{clause} ಪ್ರಕಾರ ಮೇಕ್-ಅಪ್ ಪರೀಕ್ಷೆ ಕೇವಲ "F" ಅಥವಾ "I" ಗ್ರೇಡ್ ಇರುವ ಕೋರ್ಸ್‌ಗಳಿಗೆ ಮಾತ್ರ; ವೈದ್ಯಕೀಯ ಕಾರಣದ ಗೈರುಹಾಜರಿಗೆ BOE ಅನುಮತಿ, ದಾಖಲೆಗಳು ಮತ್ತು ಸಮಯಕ್ಕೆ ಶುಲ್ಕ ಕಡ್ಡಾಯ.',
    cgpa:
      '{clause} ಪ್ರಕಾರ ಸಿಜಿಪಿಎ ಕ್ರೆಡಿಟ್-ವೆಯ್ಟೆಡ್ ಗ್ರೇಡ್-ಪಾಯಿಂಟ್‌ಗಳ ಸರಾಸರಿ ಮತ್ತು ಎರಡು ದಶಾಂಶ ಸ್ಥಳಗಳವರೆಗೆ ಲೆಕ್ಕಹಾಕಲಾಗುತ್ತದೆ.',
    grading:
      '{clause} ಪ್ರಕಾರ ಗ್ರೇಡ್‌ಗಳು O(10) ರಿಂದ D(4, ಉತ್ತೀರ್ಣ) ವರೆಗೆ ಇವೆ; ಎಂಡ್-ಟರ್ಮ್‌ನಲ್ಲಿ 30% ಅಥವಾ ಒಟ್ಟು 40% ಕ್ಕಿಂತ ಕಡಿಮೆಯಾದರೆ "F" ಗ್ರೇಡ್.',
    duration:
      '{clause} ಪ್ರಕಾರ ಕಾರ್ಯಕ್ರಮ ಪೂರ್ಣಗೊಳಿಸಲು ಗರಿಷ್ಠ ಅವಧಿ ಸಾಮಾನ್ಯ ಅವಧಿಯ ದ್ವಿಗುಣ; ಗ್ರೇಡ್ ಸುಧಾರಣೆಗೆ ತೆಗೆದುಕೊಂಡ ಸಮಯವೂ ಇದರಲ್ಲಿ ಲೆಕ್ಕಕ್ಕೆ ಬರುತ್ತದೆ.',
    summer:
      '{clause} ಪ್ರಕಾರ ಬೇಸಿಗೆ ಅವಧಿಯಲ್ಲಿ ಗರಿಷ್ಠ 12 ಕ್ರೆಡಿಟ್‌ಗಳನ್ನು ನೋಂದಾಯಿಸಬಹುದು.',
    schedule: '{clause} ಪ್ರಕಾರ ಶೈಕ್ಷಣಿಕ ಕ್ಯಾಲೆಂಡರ್ (ರಿಜಿಸ್ಟ್ರಾರ್ ಹೊರಡಿಸಿದ್ದು) ಕೆಲಸದ ದಿನಗಳು, ಶನಿವಾರಗಳು ಮತ್ತು ರಜೆಗಳನ್ನು ನಿಗದಿಪಡಿಸುತ್ತದೆ. ದಿನವು ರಜೆ ಎಂದು ಘೋಷಿಸಲ್ಪಡದ ಹೊರತು, ಶನಿವಾರ ಬೋಧನೇತರವಾಗಿರದ ಹೊರತು, ಅಥವಾ ಅಧಿಕೃತ ರಜೆ ಸೂಚನೆಯಲ್ಲಿ ಪಟ್ಟಿ ಮಾಡದ ಹೊರತು ಪ್ರಮಾಣಿತ ಕೆಲಸದ ದಿನಗಳು ಅನ್ವಯ — ನಿಖರ ವೇಳಾಪಟ್ಟಿಗಾಗಿ ಪ್ರಸ್ತುತ ಶೈಕ್ಷಣಿಕ ಕ್ಯಾಲೆಂಡರ್ ನೋಡಿ.',
    default:
      '{clause} ಪ್ರಕಾರ ಸಂಬಂಧಿತ ನಿಯಮ ಅನ್ವಯ — ನಿಖರ ಪದಗಳಿಗಾಗಿ ಸಿಟೇಶನ್ ಡ್ರಾವರ್ ತೆರೆಯಿರಿ.',
  },
};

/* FIX 2 — multi-chunk composition for the local (LLM-free) fallback ------- */

type ScoredHit = ScoredChunk;

/** Order in which clauses of a topic should lead a composed fallback answer. */
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
};

const INTENT_TOPIC: Partial<Record<IntentCategory, RegulationTopic>> = {
  attendance: 'attendance',
  promotion: 'promotion',
  makeup: 'makeup',
  'grade-review': 'grade-review',
  cgpa: 'cgpa',
  grading: 'grading',
  duration: 'duration',
  schedule: 'schedule',
};

/** Grade-cap questions should lead with Clause 13.3.2, eligibility with 13.1. */
function wantsGradeCapLead(original: string): boolean {
  return (
    /\b(grade|score|cap|ceiling|90|improve|improvement)\b|['’]\s?[AO]\s?['’]/i.test(
      original,
    )
  );
}

/**
 * Synthesizes ONE grounded answer from the top-3 retrieved chunks:
 * chunks matching the primary intent are re-ordered by clause priority so the
 * lead sentence answers the primary question (75% baseline before the 65%
 * condonation floor; the 'C' grade cap first for grade-cap questions).
 */
export function composeLocalAnswer(
  hits: Array<ScoredHit | RetrievalHit>,
  lang: Lang,
  intent: IntentCategory,
  original: string,
): string {
  const top3 = hits.slice(0, 3);
  if (top3.length === 0) return '';

  const primary = INTENT_TOPIC[intent] ?? top3[0].chunk.topic;
  const order = [...(TOPIC_LEAD_ORDER[primary] ?? [])];
  if (primary === 'makeup' && wantsGradeCapLead(original)) {
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
    const template = TOPIC_TEMPLATES[lang][hit.chunk.topic];
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
/* ── Main entry point ─────────────────────────────────────────────────────── */

/** Phase 2 — per-request session context passed by server.ts. */
export interface AnswerContext {
  profile?: StudentProfile;
  history?: ChatTurn[];
}

/** Phase 2 — dynamic contextual greeting: "Hi Aarav! …" */
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

function formatHistory(history?: ChatTurn[]): string {
  if (!history || history.length === 0) return '';
  const lines = history
    .slice(-6)
    .map((t) => `${t.role === 'user' ? 'Student' : 'Buddy'}: ${t.text}`);
  return `RECENT CONVERSATION (context only, not regulation text):\n${lines.join('\n')}`;
}

/**
 * Runs the full Stage-2 pipeline for an already-analyzed query.
 * Never throws for LLM issues — falls back to local grounded answers.
 */
export async function answerQuery(
  analyzed: AnalyzedQuery,
  context: AnswerContext = {},
): Promise<AskResult> {
  const startedAt = Date.now();
  const lang = analyzed.language;
  const intent = {
    category: analyzed.intent,
    canonicalTerms: analyzed.canonicalTerms,
    suggestedClauseId: analyzed.suggestedClauseId,
  };
  const elapsed = () => Date.now() - startedAt;

  // Off-scope refusal guard — NO retrieval, no LLM spend, exact format.
  // Schedule-intent queries carry academic terms by construction, so the
  // refusal paths below never apply to them.
  if (analyzed.offScope && analyzed.intent !== 'schedule') {
    return {
      kind: 'refusal',
      directAnswer: TEXTS[lang].offScope,
      explanation: TEXTS[lang].offScopeExplain,
      citations: [],
      intent,
      engine: 'guard',
      language: lang,
      latencyMs: elapsed(),
    };
  }

  // Phase 2 — profiling onboarding: ask for name/program/semester first.
  // Onboarding — bypasses vector retrieval completely (intent === 'onboarding'
  // already means the profile is missing/incomplete).
  const wantsOnboarding =
    analyzed.intent === 'onboarding' ||
    (analyzed.greeting && !isProfileComplete(context.profile));
  if (wantsOnboarding) {
    return {
      kind: 'onboarding',
      directAnswer: TEXTS[lang].onboardingAsk,
      explanation: TEXTS[lang].onboardingExplain,
      citations: [],
      intent,
      engine: 'guard',
      language: lang,
      latencyMs: elapsed(),
    };
  }

  // Greeting — friendly onboarding without retrieval.
  if (analyzed.greeting) {
    return {
      kind: 'greeting',
      directAnswer: TEXTS[lang].greeting,
      explanation: TEXTS[lang].greetingExplain,
      citations: [],
      intent,
      engine: 'guard',
      language: lang,
      latencyMs: elapsed(),
    };
  }

  // SHORT-INPUT OVERRIDE: tiny non-academic inputs never reach retrieval and
  // never produce a refusal/nudge — incomplete profile gets the professional
  // welcome, complete profile gets the normal greeting.
  if (
    analyzed.original.trim().length < 4 &&
    analyzed.canonicalTerms.length === 0 &&
    analyzed.intent === 'general'
  ) {
    const incompleteProfile = !isProfileComplete(context.profile);
    return {
      kind: incompleteProfile ? 'onboarding' : 'greeting',
      directAnswer: incompleteProfile
        ? TEXTS[lang].onboardingAsk
        : TEXTS[lang].greeting,
      explanation: incompleteProfile
        ? TEXTS[lang].onboardingExplain
        : TEXTS[lang].greetingExplain,
      citations: [],
      intent,
      engine: 'guard',
      language: lang,
      latencyMs: elapsed(),
    };
  }

  // Hybrid retrieval over normalized terminology.
  const { hits } = await retrieve(analyzed.expandedQuery, TOP_K);
  const grounded = hits.filter((h) => h.score >= MIN_SCORE);

  if (grounded.length === 0) {
    const looksAcademic = analyzed.hasAcademicTerms;
    if (looksAcademic) {
      // No top chunk cleared the floor, but the vocabulary proves the query
      // IS academic: synthesize from whatever retrieval returned and keep
      // kind 'refusal' so the UI can still gate the (weak) answer.
      const fallbackAnswer = composeLocalAnswer(
        hits,
        lang,
        analyzed.intent,
        analyzed.original,
      );
      if (fallbackAnswer) {
        return {
          kind: 'refusal',
          directAnswer: fallbackAnswer,
          explanation: TEXTS[lang].localExplanation,
          citations: [],
          intent,
          engine: 'local-fallback',
          language: lang,
          latencyMs: elapsed(),
        };
      }
    }
    return {
      kind: 'refusal',
      directAnswer: TEXTS[lang].offScope,
      explanation: TEXTS[lang].offScopeExplain,
      citations: [],
      intent,
      engine: 'guard',
      language: lang,
      latencyMs: elapsed(),
    };
  }

  const citations = grounded.map(toCitation);
  const snippets = grounded.map((h) => h.chunk.snippet);

  // Phase 2 — inject student profile + recent history for contextual answers.
  const profileDesc = describeProfile(context.profile);
  const profileBlock = profileDesc
    ? `STUDENT CONTEXT (not regulation text — use only to address the student naturally):\n${profileDesc}`
    : '';
  const historyBlock = formatHistory(context.history);
  const contextBlock = [profileBlock, historyBlock, grounded
    .map(
      (h, i) =>
        `[${i + 1}] ${h.chunk.clauseId} — ${h.chunk.sectionTitle} ` +
        `(page ${h.chunk.page})\n${h.chunk.snippet}`,
    )
    .join('\n\n')]
    .filter(Boolean)
    .join('\n\n');

  // LLM completion at temperature 0.0 with strict grounding instructions.
  const draft = await generateGroundedAnswer({
    question: analyzed.original,
    language: lang,
    contextBlock,
  });

  if (draft && !containsVerbatim(draft.directAnswer, snippets)) {
    return {
      kind: 'answer',
      directAnswer: injectGreeting(context.profile, draft.directAnswer, lang),
      explanation: draft.explanation,
      citations,
      intent,
      engine: 'gemini',
      language: lang,
      latencyMs: elapsed(),
    };
  }

  // Local RAG fallback: LLM unavailable, quota-limited, or verbatim leak.
  return {
    kind: 'answer',
    directAnswer: injectGreeting(
      context.profile,
      composeLocalAnswer(grounded, lang, analyzed.intent, analyzed.original),
      lang,
    ),
    explanation: TEXTS[lang].localExplanation,
    citations,
    intent,
    engine: 'local-fallback',
    language: lang,
    latencyMs: elapsed(),
  };
}


