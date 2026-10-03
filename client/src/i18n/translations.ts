import type { Lang } from '../types';

/**
 * Trilingual UI strings (English / हिन्दी / ಕನ್ನಡ).
 * `hi` and `kn` are typed against `typeof en`, so the compiler enforces
 * complete key parity — a missing translation fails `npm run typecheck`.
 */

const en = {
  nav: {
    brand: 'PUARAI',
    tagline: 'Academic Regulations AI',
    ask: 'Ask AI',
    features: 'Features',
    pipeline: 'Pipeline',
    voice: 'Voice',
  },
  hero: {
    badge: 'Grounded · temperature 0.0 · verbatim citations',
    title: 'Ask your regulations.',
    titleAccent: 'Get the truth.',
    subtitle:
      'Direct, human answers about attendance condonation, year-back rules, make-up exams and grade review — every claim linked to the exact clause, page and handbook text.',
    statClauses: 'Indexed clauses',
    statClausesHint: 'grounded sources',
    statLangs: 'Languages',
    statLangsHint: 'EN · ಕನ್ನಡ · हिन्दी',
    statFallback: 'Offline fallback',
    statFallbackHint: 'works without the LLM',
  },
  search: {
    placeholder: 'e.g. My attendance is 72% — can I still write the exam?',
    submit: 'Ask',
    micLabel: 'Ask by voice',
    ariaLabel: 'Ask a regulation question',
  },
  chips: {
    label: 'Popular questions',
    attendance: 'Attendance Shortage Condonation',
    promotion: 'CGPA 2nd Year Promotion',
    makeup: 'Make-Up Exam Grade Cap',
    reval: 'Revaluation & Paper Seeing',
    cgpa: 'How is my pointer calculated?',
  },
  welcome: {
    title: 'Ask anything about the PU academic regulations.',
    body: 'I answer in plain language first, then show the rule logic. Verbatim handbook text stays inside the citation drawer, so you can verify every claim yourself.',
  },
  chat: {
    placeholder: 'Ask a regulation question…',
    send: 'Send',
    directAnswer: 'Direct answer',
    why: 'Why — the rule logic',
    refusal: 'Scope notice',
    greeting: 'Getting started',
    onboarding: 'Getting to know you',
    thinking: 'Grounding your question in the handbook…',
    sources: 'Citations',
    engineGemini: 'Gemini 2.5 Flash · grounded',
    engineLocal: 'Local RAG fallback',
    engineGuard: 'Refusal guard',
    errorTitle: 'Something went wrong',
    retry: 'Retry',
    rateLimited:
      'You hit the 40 requests/minute limit. Try again in {seconds}s.',
    networkError:
      'Could not reach the PUARAI backend — the answer below was built locally from the indexed clauses.',
    followups: 'Try asking',
    suggestion1: 'What happens if my CGPA is below 4.00?',
    suggestion2: 'How many days do I have for a grade review?',
    suggestion3: 'What documents do I need for a make-up exam?',
    you: 'You',
    assistant: 'PUARAI',
  },
  drawer: {
    title: 'Citations',
    subtitle: 'Verbatim source text for verification',
    clause: 'Clause',
    page: 'Page',
    document: 'Document',
    match: 'Match',
    verbatimLabel: 'Verbatim handbook snippet',
    copy: 'Copy',
    copied: 'Copied!',
    close: 'Close citation drawer',
    none: 'No citations attached to this response.',
    disclaimer:
      'Verbatim text appears only here — the conversation itself always paraphrases the rule.',
  },
  voice: {
    open: 'Voice assistant',
    title: 'Voice Assistant',
    close: 'Close voice assistant',
    idle: 'Tap the mic and ask your question',
    listening: 'Listening…',
    processing: 'Thinking…',
    speaking: 'Speaking…',
    transcript: 'You said',
    notSupported:
      'This browser does not support the Web Speech API — please type your question instead.',
    denied:
      'Microphone access was denied. Allow the microphone in your browser settings and try again.',
    start: 'Start listening',
    stop: 'Stop listening',
    mute: 'Stop speaking',
    hint: 'English · ಕನ್ನಡ · हिन्दी supported',
  },
  features: {
    title: 'Built for zero-hallucination answers',
    subtitle: 'Every response passes four safety layers before it reaches you.',
    card1Title: 'Direct answer first',
    card1Body:
      'One to three plain sentences up front — no regulation-speak, no paragraphs pasted from the PDF.',
    card2Title: 'Strict grounding',
    card2Body:
      'temperature 0.0, retrieve-then-answer, and an automatic refusal whenever the handbook is silent.',
    card3Title: 'Verbatim citation drawer',
    card3Body:
      'Clause ID, section title, page number and the exact handbook snippet — one click away for verification.',
    card4Title: 'Trilingual + voice',
    card4Body:
      'English, ಕನ್ನಡ and हिन्दी with real-time voice input, live waveform and spoken answers.',
  },
  pipeline: {
    title: 'How the answer is produced',
    subtitle: 'The same four stages run for every single question.',
    stage1Title: '1 · Terminology normalization',
    stage1Body:
      'Slang like “pointer”, “year back”, “reval” and “supply” is mapped to canonical clause concepts before retrieval.',
    stage2Title: '2 · Hybrid retrieval',
    stage2Body:
      'MongoDB Atlas Vector Search when configured; in-memory TF-IDF + cosine over the curated corpus otherwise.',
    stage3Title: '3 · Grounded generation',
    stage3Body:
      'Gemini 2.5 Flash at temperature 0.0 answers strictly from the retrieved clauses, in your language.',
    stage4Title: '4 · Safety + citations',
    stage4Body:
      'Verbatim-leak guard, off-scope refusal and a 40 req/min token bucket — then citations are attached.',
  },
  footer: {
    disclaimer:
      'PUARAI is an academic aid, not an official ruling. Always verify against the current handbook — every answer links its source.',
    source: 'Source: Presidency University Academic Regulations',
    product: 'Product',
    resources: 'Resources',
    linkFeatures: 'Features',
    linkPipeline: 'Pipeline',
    linkAsk: 'Ask AI',
    linkHandbook: 'Official handbook (PDF)',
    rights: '© 2026 Presidency University Academic Regulations AI · Built for students.',
    engineStatus: 'Engine status',
  },
  lang: {
    label: 'Language',
    en: 'English',
    hi: 'हिन्दी',
    kn: 'ಕನ್ನಡ',
  },
  errors: {
    boundaryTitle: 'The interface crashed',
    boundaryBody:
      'Something unexpected happened while rendering. Reload the page — no conversation data is stored on a server.',
    reload: 'Reload page',
    generic: 'Unexpected error.',
  },
};

const hi: typeof en = {
  nav: {
    brand: 'PUARAI',
    tagline: 'शैक्षणिक नियम AI',
    ask: 'AI से पूछें',
    features: 'विशेषताएँ',
    pipeline: 'पाइपलाइन',
    voice: 'आवाज़',
  },
  hero: {
    badge: 'आधारित · temperature 0.0 · शब्दशः संदर्भ',
    title: 'अपने नियम पूछिए।',
    titleAccent: 'सच्चाई पाइए।',
    subtitle:
      'उपस्थिति कंडोनेशन, ईयर-बैक नियम, मेक-अप परीक्षा और ग्रेड समीक्षा के बारे में सीधे, सरल उत्तर — हर दावा सही क्लॉज़, पृष्ठ और हैंडबुक पाठ से जुड़ा हुआ।',
    statClauses: 'अनुक्रमित क्लॉज़',
    statClausesHint: 'आधारित स्रोत',
    statLangs: 'भाषाएँ',
    statLangsHint: 'EN · ಕನ್ನಡ · हिन्दी',
    statFallback: 'ऑफ़लाइन फ़ॉलबैक',
    statFallbackHint: 'बिना LLM भी काम करता है',
  },
  search: {
    placeholder: 'जैसे मेरी उपस्थिति 72% है — क्या मैं परीक्षा दे सकता हूँ?',
    submit: 'पूछें',
    micLabel: 'आवाज़ से पूछें',
    ariaLabel: 'नियम से जुड़ा प्रश्न पूछें',
  },
  chips: {
    label: 'लोकप्रिय प्रश्न',
    attendance: 'उपस्थिति शॉर्टेज कंडोनेशन',
    promotion: 'सीजीपीए द्वितीय वर्ष पदोन्नति',
    makeup: 'मेक-अप एग्ज़ाम ग्रेड कैप',
    reval: 'री-वैल्यूएशन व पेपर देखना',
    cgpa: 'मेरा पॉइंटर कैसे गणना होता है?',
  },
  welcome: {
    title: 'पीयू शैक्षणिक नियमों के बारे में कुछ भी पूछिए।',
    body: 'मैं पहले सरल भाषा में उत्तर देता हूँ, फिर नियम का तर्क दिखाता हूँ। शब्दशः हैंडबुक पाठ केवल सिटेशन ड्रॉर में रहता है ताकि आप स्वयं जाँच सकें।',
  },
  chat: {
    placeholder: 'नियम से जुड़ा प्रश्न पूछें…',
    send: 'भेजें',
    directAnswer: 'सीधा उत्तर',
    why: 'क्यों — नियम का तर्क',
    refusal: 'सीमा सूचना',
    greeting: 'शुरुआत',
    onboarding: 'परिचय',
    thinking: 'हैंडबुक में आपका प्रश्न खोजा जा रहा है…',
    sources: 'संदर्भ',
    engineGemini: 'Gemini 2.5 Flash · आधारित',
    engineLocal: 'लोकल RAG फ़ॉलबैक',
    engineGuard: 'अस्वीकार गार्ड',
    errorTitle: 'कुछ गड़बड़ हुई',
    retry: 'पुनः प्रयास',
    rateLimited: 'आप 40 प्रति मिनट की सीमा तक पहुँच गए। {seconds} सेकंड में फिर प्रयास करें।',
    networkError:
      'PUARAI बैकएंड से संपर्क नहीं हो पाया — नीचे का उत्तर अनुक्रमित क्लॉज़ से स्थानीय रूप से बनाया गया है।',
    followups: 'यह भी पूछें',
    suggestion1: 'सीजीपीए 4.00 से कम हो तो क्या होगा?',
    suggestion2: 'ग्रेड समीक्षा के लिए कितने दिन हैं?',
    suggestion3: 'मेक-अप परीक्षा के लिए कौन-से दस्तावेज़ चाहिए?',
    you: 'आप',
    assistant: 'PUARAI',
  },
  drawer: {
    title: 'संदर्भ',
    subtitle: 'जाँच हेतु शब्दशः स्रोत पाठ',
    clause: 'क्लॉज़',
    page: 'पृष्ठ',
    document: 'दस्तावेज़',
    match: 'मैच',
    verbatimLabel: 'शब्दशः हैंडबुक अंश',
    copy: 'कॉपी',
    copied: 'कॉपी हो गया!',
    close: 'सिटेशन ड्रॉर बंद करें',
    none: 'इस उत्तर से कोई संदर्भ नहीं जुड़ा है।',
    disclaimer:
      'शब्दशः पाठ केवल यहाँ दिखता है — वार्तालाप में नियम हमेशा अपने शब्दों में समझाया जाता है।',
  },
  voice: {
    open: 'वॉइस असिस्टेंट',
    title: 'वॉइस असिस्टेंट',
    close: 'वॉइस असिस्टेंट बंद करें',
    idle: 'माइक दबाकर अपना प्रश्न पूछें',
    listening: 'सुन रहा है…',
    processing: 'सोच रहा है…',
    speaking: 'बोल रहा है…',
    transcript: 'आपने कहा',
    notSupported:
      'इस ब्राउज़र में वेब स्पीच API समर्थित नहीं है — कृपया अपना प्रश्न टाइप करें।',
    denied:
      'माइक्रोफ़ोन अनुमति अस्वीकृत है। ब्राउज़र सेटिंग्स में माइक्रोफ़ोन की अनुमति दें और फिर प्रयास करें।',
    start: 'सुनना शुरू करें',
    stop: 'सुनना बंद करें',
    mute: 'बोलना बंद करें',
    hint: 'English · ಕನ್ನಡ · हिन्दी समर्थित',
  },
  features: {
    title: 'शून्य-हॉल्यूसिनेशन उत्तरों के लिए बनाया गया',
    subtitle: 'हर उत्तर आप तक पहुँचने से पहले चार सुरक्षा परतों से गुज़रता है।',
    card1Title: 'पहले सीधा उत्तर',
    card1Body:
      'शुरुआत में एक से तीन सरल वाक्य — न नियम-भरी भाषा, न पीडीएफ से चिपके पैराग्राफ़।',
    card2Title: 'कड़ा आधारण',
    card2Body:
      'temperature 0.0, पहले खोजो-फिर उत्तर दो, और जहाँ हैंडबुक चुप हो वहाँ स्वतः अस्वीकार।',
    card3Title: 'शब्दशः सिटेशन ड्रॉर',
    card3Body:
      'क्लॉज़ आईडी, खंड शीर्षक, पृष्ठ संख्या और सटीक हैंडबुक अंश — सत्यापन हेतु एक क्लिक दूर।',
    card4Title: 'त्रिभाषी + वॉइस',
    card4Body:
      'English, ಕನ್ನಡ और हिन्दी — रीयल-टाइम वॉइस इनपुट, लाइव वेवफ़ॉर्म और बोले जाने वाले उत्तर के साथ।',
  },
  pipeline: {
    title: 'उत्तर कैसे बनता है',
    subtitle: 'हर प्रश्न के लिए वही चार चरण चलते हैं।',
    stage1Title: '1 · परिभाषा सामान्यीकरण',
    stage1Body:
      '“pointer”, “year back”, “reval”, “supply” जैसी ज़ुबान को खोज से पहले कैनॉनिकल क्लॉज़ अवधारणाओं में बदला जाता है।',
    stage2Title: '2 · हाइब्रिड रिट्रीवल',
    stage2Body:
      'कॉन्फ़िगर होने पर MongoDB Atlas Vector Search; अन्यथा कर्यूरेटेड कॉर्पस पर इन-मेमोरी TF-IDF + कोसाइन।',
    stage3Title: '3 · आधारित जनरेशन',
    stage3Body:
      'Gemini 2.5 Flash temperature 0.0 पर केवल प्राप्त क्लॉज़ से, आपकी भाषा में उत्तर देता है।',
    stage4Title: '4 · सुरक्षा + संदर्भ',
    stage4Body:
      'शब्दशः-लीक गार्ड, गैर-विषय अस्वीकार और 40 req/min टोकन बकेट — फिर संदर्भ जोड़े जाते हैं।',
  },
  footer: {
    disclaimer:
      'PUARAI एक शैक्षणिक सहायक है, आधिकारिक निर्णय नहीं। हमेशा वर्तमान हैंडबुक से मिलाएँ — हर उत्तर अपना स्रोत जोड़ता है।',
    source: 'स्रोत: प्रेसिडेंसी यूनिवर्सिटी शैक्षणिक विनियम',
    product: 'उत्पाद',
    resources: 'संसाधन',
    linkFeatures: 'विशेषताएँ',
    linkPipeline: 'पाइपलाइन',
    linkAsk: 'AI से पूछें',
    linkHandbook: 'आधिकारिक हैंडबुक (PDF)',
    rights: '© 2026 प्रेसिडेंसी यूनिवर्सिटी शैक्षणिक नियम AI · छात्रों के लिए।',
    engineStatus: 'इंजन स्थिति',
  },
  lang: {
    label: 'भाषा',
    en: 'English',
    hi: 'हिन्दी',
    kn: 'ಕನ್ನಡ',
  },
  errors: {
    boundaryTitle: 'इंटरफ़ेस क्रैश हो गया',
    boundaryBody:
      'रेंडर करते समय कुछ अप्रत्याशित हुआ। पेज रीलोड करें — कोई वार्तालाप डेटा सर्वर पर संग्रहीत नहीं होता।',
    reload: 'पेज रीलोड करें',
    generic: 'अप्रत्याशित त्रुटि।',
  },
};

const kn: typeof en = {
  nav: {
    brand: 'PUARAI',
    tagline: 'ಶೈಕ್ಷಣಿಕ ನಿಯಮ AI',
    ask: 'AI ಗೆ ಕೇಳಿ',
    features: 'ವೈಶಿಷ್ಟ್ಯಗಳು',
    pipeline: 'ಪೈಪ್‌ಲೈನ್',
    voice: 'ಧ್ವನಿ',
  },
  hero: {
    badge: 'ಆಧಾರಿತ · temperature 0.0 · ಪದಶಃ ಉಲ್ಲೇಖಗಳು',
    title: 'ನಿಮ್ಮ ನಿಯಮಗಳನ್ನು ಕೇಳಿ.',
    titleAccent: 'ಸತ್ಯ ಪಡೆಯಿರಿ.',
    subtitle:
      'ಹಾಜರಾತಿ ಕಂಡೋನೇಶನ್, ಈಯರ್-ಬ್ಯಾಕ್ ನಿಯಮಗಳು, ಮೇಕ್-ಅಪ್ ಪರೀಕ್ಷೆ ಮತ್ತು ಗ್ರೇಡ್ ಪರಿಶೀಲನೆ ಬಗ್ಗೆ ನೇರ, ಸರಳ ಉತ್ತರಗಳು — ಪ್ರತಿ ಹೇಳಿಕೆ ಸರಿಯಾದ ಕ್ಲಾಸ್, ಪುಟ ಮತ್ತು ಹ್ಯಾಂಡ್‌ಬುಕ್ ಪಠ್ಯಕ್ಕೆ ಸಂಪರ್ಕಿತ.',
    statClauses: 'ಸೂಚಿತ ಕ್ಲಾಸ್‌ಗಳು',
    statClausesHint: 'ಆಧಾರಿತ ಮೂಲಗಳು',
    statLangs: 'ಭಾಷೆಗಳು',
    statLangsHint: 'EN · ಕನ್ನಡ · हिन्दी',
    statFallback: 'ಆಫ್‌ಲೈನ್ ಫಾಲ್‌ಬ್ಯಾಕ್',
    statFallbackHint: 'LLM ಇಲ್ಲದೆಯೂ ಕೆಲಸ ಮಾಡುತ್ತದೆ',
  },
  search: {
    placeholder: 'ಉದಾ: ನನ್ನ ಹಾಜರಾತಿ 72% — ಇನ್ನೂ ಪರೀಕ್ಷೆ ಬರೆಯಬಹುದೇ?',
    submit: 'ಕೇಳಿ',
    micLabel: 'ಧ್ವನಿಯ ಮೂಲಕ ಕೇಳಿ',
    ariaLabel: 'ನಿಯಮದ ಪ್ರಶ್ನೆ ಕೇಳಿ',
  },
  chips: {
    label: 'ಜನಪ್ರಿಯ ಪ್ರಶ್ನೆಗಳು',
    attendance: 'ಹಾಜರಾತಿ ಶಾರ್ಟೇಜ್ ಕಂಡೋನೇಶನ್',
    promotion: 'ಸಿಜಿಪಿಎ ದ್ವಿತೀಯ ವರ್ಷ ಪದೋನ್ನತಿ',
    makeup: 'ಮೇಕ್-ಅಪ್ ಪರೀಕ್ಷೆ ಗ್ರೇಡ್ ಕ್ಯಾಪ್',
    reval: 'ರೀ-ವ್ಯಾಲ್ಯೂಯೇಶನ್ ಮತ್ತು ಪೇಪರ್ ನೋಡುವುದು',
    cgpa: 'ನನ್ನ ಪಾಯಿಂಟರ್ ಹೇಗೆ ಲೆಕ್ಕಹಾಕಲಾಗುತ್ತದೆ?',
  },
  welcome: {
    title: 'ಪಿಯು ಶೈಕ್ಷಣಿಕ ನಿಯಮಗಳ ಬಗ್ಗೆ ಏನನ್ನೂ ಕೇಳಿ.',
    body: 'ಮೊದಲು ಸರಳ ಭಾಷೆಯಲ್ಲಿ ಉತ್ತರಿಸುತ್ತೇನೆ, ನಂತರ ನಿಯಮದ ತರ್ಕ ತೋರಿಸುತ್ತೇನೆ. ಪದಶಃ ಹ್ಯಾಂಡ್‌ಬುಕ್ ಪಠ್ಯ ಸಿಟೇಶನ್ ಡ್ರಾವರ್‌ನಲ್ಲಿ ಮಾತ್ರ ಇರುತ್ತದೆ — ನೀವೇ ಪರಿಶೀಲಿಸಬಹುದು.',
  },
  chat: {
    placeholder: 'ನಿಯಮದ ಪ್ರಶ್ನೆ ಕೇಳಿ…',
    send: 'ಕಳುಹಿಸಿ',
    directAnswer: 'ನೇರ ಉತ್ತರ',
    why: 'ಏಕೆ — ನಿಯಮದ ತರ್ಕ',
    refusal: 'ವ್ಯಾಪ್ತಿ ಸೂಚನೆ',
    greeting: 'ಆರಂಭ',
    onboarding: 'ಪರಿಚಯ',
    thinking: 'ಹ್ಯಾಂಡ್‌ಬುಕ್‌ನಲ್ಲಿ ನಿಮ್ಮ ಪ್ರಶ್ನೆಯನ್ನು ಹುಡುಕಲಾಗುತ್ತಿದೆ…',
    sources: 'ಉಲ್ಲೇಖಗಳು',
    engineGemini: 'Gemini 2.5 Flash · ಆಧಾರಿತ',
    engineLocal: 'ಲೋಕಲ್ RAG ಫಾಲ್‌ಬ್ಯಾಕ್',
    engineGuard: 'ನಿರಾಕರಣೆ ಗಾರ್ಡ್',
    errorTitle: 'ಏನೋ ತಪ್ಪಾಗಿದೆ',
    retry: 'ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ',
    rateLimited: 'ನೀವು ನಿಮಿಷಕ್ಕೆ 40 ವಿನಂತಿಗಳ ಮಿತಿ ತಲುಪಿದ್ದೀರಿ. {seconds} ಸೆಕೆಂಡಿನಲ್ಲಿ ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.',
    networkError:
      'PUARAI ಬ್ಯಾಕ್‌ಎಂಡ್‌ಗೆ ಸಂಪರ್ಕವಾಗಲಿಲ್ಲ — ಕೆಳಗಿನ ಉತ್ತರ ಸೂಚಿತ ಕ್ಲಾಸ್‌ಗಳಿಂದ ಸ್ಥಳೀಯವಾಗಿ ರಚಿಸಲಾಗಿದೆ.',
    followups: 'ಇವೂ ಕೇಳಿ',
    suggestion1: 'ಸಿಜಿಪಿಎ 4.00 ಕ್ಕಿಂತ ಕಡಿಮೆಯಾದರೆ ಏನಾಗುತ್ತದೆ?',
    suggestion2: 'ಗ್ರೇಡ್ ಪರಿಶೀಲನೆಗೆ ಎಷ್ಟು ದಿನಗಳಿವೆ?',
    suggestion3: 'ಮೇಕ್-ಅಪ್ ಪರೀಕ್ಷೆಗೆ ಯಾವ ದಾಖಲೆಗಳು ಬೇಕು?',
    you: 'ನೀವು',
    assistant: 'PUARAI',
  },
  drawer: {
    title: 'ಉಲ್ಲೇಖಗಳು',
    subtitle: 'ಪರಿಶೀಲನೆಗಾಗಿ ಪದಶಃ ಮೂಲ ಪಠ್ಯ',
    clause: 'ಕ್ಲಾಸ್',
    page: 'ಪುಟ',
    document: 'ದಸ್ತಾವೇಜು',
    match: 'ಹೊಂದಾಣಿಕೆ',
    verbatimLabel: 'ಪದಶಃ ಹ್ಯಾಂಡ್‌ಬುಕ್ ತುಣುಕು',
    copy: 'ಕಾಪಿ',
    copied: 'ಕಾಪಿ ಆಯಿತು!',
    close: 'ಸಿಟೇಶನ್ ಡ್ರಾವರ್ ಮುಚ್ಚಿ',
    none: 'ಈ ಉತ್ತರಕ್ಕೆ ಯಾವುದೇ ಉಲ್ಲೇಖ ಸಂಲಗ್ನವಾಗಿಲ್ಲ.',
    disclaimer:
      'ಪದಶಃ ಪಠ್ಯ ಕೇವಲ ಇಲ್ಲಿ ಕಾಣಿಸುತ್ತದೆ — ಸಂಭಾಷಣೆಯಲ್ಲಿ ನಿಯಮವನ್ನು ಯಾವಾಗಲೂ ನಮ್ಮ ಪದಗಳಲ್ಲಿ ವಿವರಿಸಲಾಗುತ್ತದೆ.',
  },
  voice: {
    open: 'ಧ್ವನಿ ಸಹಾಯಕ',
    title: 'ಧ್ವನಿ ಸಹಾಯಕ',
    close: 'ಧ್ವನಿ ಸಹಾಯಕ ಮುಚ್ಚಿ',
    idle: 'ಮೈಕ್ ಒತ್ತಿ ನಿಮ್ಮ ಪ್ರಶ್ನೆ ಕೇಳಿ',
    listening: 'ಕೇಳುತ್ತಿದೆ…',
    processing: 'ಯೋಚಿಸುತ್ತಿದೆ…',
    speaking: 'ಮಾತನಾಡುತ್ತಿದೆ…',
    transcript: 'ನೀವು ಹೇಳಿದ್ದು',
    notSupported:
      'ಈ ಬ್ರೌಸರ್ Web Speech API ಅನ್ನು ಬೆಂಬಲಿಸುವುದಿಲ್ಲ — ದಯವಿಟ್ಟು ಪ್ರಶ್ನೆಯನ್ನು ಟೈಪ್ ಮಾಡಿ.',
    denied:
      'ಮೈಕ್ರೋಫೋನ್ ಅನುಮತಿ ನಿರಾಕರಿಸಲಾಗಿದೆ. ಬ್ರೌಸರ್ ಸೆಟ್ಟಿಂಗ್‌ಗಳಲ್ಲಿ ಮೈಕ್ರೋಫೋನ್‌ಗೆ ಅನುಮತಿ ನೀಡಿ ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.',
    start: 'ಕೇಳುವುದು ಪ್ರಾರಂಭಿಸಿ',
    stop: 'ಕೇಳುವುದು ನಿಲ್ಲಿಸಿ',
    mute: 'ಮಾತನಾಡುವುದು ನಿಲ್ಲಿಸಿ',
    hint: 'English · ಕನ್ನಡ · हिन्दी ಬೆಂಬಲಿತ',
  },
  features: {
    title: 'ಶೂನ್ಯ-ಹಾಲುಸಿನೇಶನ್ ಉತ್ತರಗಳಿಗಾಗಿ ರಚಿಸಲಾಗಿದೆ',
    subtitle: 'ಪ್ರತಿ ಉತ್ತರ ನಿಮ್ಮನ್ನು ತಲುಪುವ ಮೊದಲು ನಾಲ್ಕು ಸುರಕ್ಷಾ ಪದರಗಳನ್ನು ದಾಟುತ್ತದೆ.',
    card1Title: 'ಮೊದಲು ನೇರ ಉತ್ತರ',
    card1Body:
      'ಮೊದಲಿಗೆ ಒಂದರಿಂದ ಮೂರು ಸರಳ ವಾಕ್ಯಗಳು — ನಿಯಮದ ಭಾಷೆಯೂ ಇಲ್ಲ, ಪಿಡಿಎಫ್‌ನಿಂದ ಅಂಟಿಸಿದ ಪ್ಯಾರಾಗ್ರಾಫ್‌ಗಳೂ ಇಲ್ಲ.',
    card2Title: 'ಕಠಿಣ ಆಧಾರ',
    card2Body:
      'temperature 0.0, ಮೊದಲು ಹುಡುಕಿ ನಂತರ ಉತ್ತರಿಸಿ, ಮತ್ತು ಹ್ಯಾಂಡ್‌ಬುಕ್ ಮೌನವಾಗಿದ್ದರೆ ಸ್ವಯಂಚಾಲಿತ ನಿರಾಕರಣೆ.',
    card3Title: 'ಪದಶಃ ಸಿಟೇಶನ್ ಡ್ರಾವರ್',
    card3Body:
      'ಕ್ಲಾಸ್ ಐಡಿ, ವಿಭಾಗದ ಶೀರ್ಷಿಕೆ, ಪುಟ ಸಂಖ್ಯೆ ಮತ್ತು ನಿಖರ ಹ್ಯಾಂಡ್‌ಬುಕ್ ತುಣುಕು — ಪರಿಶೀಲನೆಗೆ ಒಂದೇ ಕ್ಲಿಕ್ ದೂರ.',
    card4Title: 'ತ್ರಿಭಾಷಾ + ಧ್ವನಿ',
    card4Body:
      'English, ಕನ್ನಡ ಮತ್ತು हिन्दी — ರಿಯಲ್-ಟೈಮ್ ಧ್ವನಿ ಇನ್ಪುಟ್, ಲೈವ್ ವೇವ್‌ಫಾರ್ಮ್ ಮತ್ತು ಮಾತನಾಡುವ ಉತ್ತರಗಳೊಂದಿಗೆ.',
  },
  pipeline: {
    title: 'ಉತ್ತರ ಹೇಗೆ ರಚನೆಯಾಗುತ್ತದೆ',
    subtitle: 'ಪ್ರತಿ ಪ್ರಶ್ನೆಗೂ ಅದೇ ನಾಲ್ಕು ಹಂತಗಳು ನಡೆಯುತ್ತವೆ.',
    stage1Title: '1 · ಪರಿಭಾಷೆ ಮಾನಕೀಕರಣ',
    stage1Body:
      '“pointer”, “year back”, “reval”, “supply” ಮುಂತಾದ ವಿದ್ಯಾರ್ಥಿ ಪದಗಳನ್ನು ಹುಡುಕಾಟದ ಮೊದಲು ಕ್ಯಾನಾನಿಕಲ್ ಕ್ಲಾಸ್ ಪರಿಕಲ್ಪನೆಗಳಿಗೆ ಬದಲಾಯಿಸಲಾಗುತ್ತದೆ.',
    stage2Title: '2 · ಹೈಬ್ರಿಡ್ ಪುನರ್ಪ್ರಾಪ್ತಿ',
    stage2Body:
      'ಕಾನ್ಫಿಗರ್ ಆದಾಗ MongoDB Atlas Vector Search; ಇಲ್ಲದಿದ್ದರೆ ಕ್ಯೂರೇಟೆಡ್ ಕಾರ್ಪಸ್‌ನ ಇನ್-ಮೆಮೊರಿ TF-IDF + ಕೋಸೈನ್.',
    stage3Title: '3 · ಆಧಾರಿತ ಉತ್ಪಾದನೆ',
    stage3Body:
      'Gemini 2.5 Flash temperature 0.0 ರಲ್ಲಿ ಕೇವಲ ಪ್ರಾಪ್ತ ಕ್ಲಾಸ್‌ಗಳಿಂದ, ನಿಮ್ಮ ಭಾಷೆಯಲ್ಲಿ ಉತ್ತರಿಸುತ್ತದೆ.',
    stage4Title: '4 · ಸುರಕ್ಷತೆ + ಉಲ್ಲೇಖಗಳು',
    stage4Body:
      'ಪದಶಃ-ಲೀಕ್ ಗಾರ್ಡ್, ವಿಷಯೇತರ ನಿರಾಕರಣೆ ಮತ್ತು 40 req/min ಟೋಕನ್ ಬಕೆಟ್ — ನಂತರ ಉಲ್ಲೇಖಗಳನ್ನು ಸೇರಿಸಲಾಗುತ್ತದೆ.',
  },
  footer: {
    disclaimer:
      'PUARAI ಶೈಕ್ಷಣಿಕ ಸಹಾಯಕ, ಅಧಿಕೃತ ತೀರ್ಪಲ್ಲ. ಯಾವಾಗಲೂ ಪ್ರಸ್ತುತ ಹ್ಯಾಂಡ್‌ಬುಕ್‌ನೊಂದಿಗೆ ಪರಿಶೀಲಿಸಿ — ಪ್ರತಿ ಉತ್ತರ ತನ್ನ ಮೂಲವನ್ನು ಸಂಪರ್ಕಿಸುತ್ತದೆ.',
    source: 'ಮೂಲ: ಪ್ರೆಸಿಡೆನ್ಸಿ ವಿಶ್ವವಿದ್ಯಾಲಯ ಶೈಕ್ಷಣಿಕ ನಿಯಮಗಳು',
    product: 'ಉತ್ಪನ್ನ',
    resources: 'ಸಂಪನ್ಮೂಲಗಳು',
    linkFeatures: 'ವೈಶಿಷ್ಟ್ಯಗಳು',
    linkPipeline: 'ಪೈಪ್‌ಲೈನ್',
    linkAsk: 'AI ಗೆ ಕೇಳಿ',
    linkHandbook: 'ಅಧಿಕೃತ ಹ್ಯಾಂಡ್‌ಬುಕ್ (PDF)',
    rights: '© 2026 ಪ್ರೆಸಿಡೆನ್ಸಿ ವಿಶ್ವವಿದ್ಯಾಲಯ ಶೈಕ್ಷಣಿಕ ನಿಯಮ AI · ವಿದ್ಯಾರ್ಥಿಗಳಿಗಾಗಿ.',
    engineStatus: 'ಎಂಜಿನ್ ಸ್ಥಿತಿ',
  },
  lang: {
    label: 'ಭಾಷೆ',
    en: 'English',
    hi: 'हिन्दी',
    kn: 'ಕನ್ನಡ',
  },
  errors: {
    boundaryTitle: 'ಇಂಟರ್‌ಫೇಸ್ ಕ್ರ್ಯಾಶ್ ಆಗಿದೆ',
    boundaryBody:
      'ರೆಂಡರ್ ಮಾಡುವಾಗ ಅನಿರೀಕ್ಷಿತ ಏನೋ ಸಂಭವಿಸಿದೆ. ಪುಟವನ್ನು ಮರುಲೋಡಿಸಿ — ಯಾವುದೇ ಸಂಭಾಷಣಾ ಡೇಟಾ ಸರ್ವರ್‌ನಲ್ಲಿ ಸಂಗ್ರಹಿತವಾಗಿಲ್ಲ.',
    reload: 'ಪುಟವನ್ನು ಮರುಲೋಡಿಸಿ',
    generic: 'ಅನಿರೀಕ್ಷಿತ ದೋಷ.',
  },
};

/* ── Lookup helpers ───────────────────────────────────────────────────────── */

type TranslationTree = Record<string, unknown>;

function resolvePath(tree: TranslationTree, path: string): unknown {
  return path
    .split('.')
    .reduce<unknown>(
      (node, key) =>
        node && typeof node === 'object'
          ? (node as TranslationTree)[key]
          : undefined,
      tree,
    );
}

/** Dot-paths of every string leaf in the English dictionary. */
export type DotPaths<T> = T extends string
  ? never
  : {
      [K in keyof T & string]: T[K] extends string
        ? K
        : K | `${K}.${DotPaths<T[K]>}`;
    }[keyof T & string];

export type TranslationKey = DotPaths<typeof en>;

export type Translations = Record<Lang, typeof en>;

export const translations: Translations = { en, hi, kn };

export const VOICE_LANGS: Record<Lang, string> = {
  en: 'en-IN',
  hi: 'hi-IN',
  kn: 'kn-IN',
};

export const LANG_ORDER: Lang[] = ['en', 'hi', 'kn'];




