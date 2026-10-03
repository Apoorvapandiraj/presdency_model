/**
 * PUARAI regulation corpus — the single source of truth for grounding.
 *
 * Every chunk carries:
 *   • clauseId / sectionTitle / page  → citation drawer metadata
 *   • snippet  → verbatim excerpt of the official handbook for verification
 *   • summary  → independent plain-language paraphrase used by the local
 *                (LLM-free) fallback so primary answers are never verbatim.
 *
 * Snippets are excerpts of the official Presidency University Academic
 * Regulations (Reg. No. PU/AC-13/16/11_2020, presidencyuniversity.in), with
 * only whitespace/typography normalised. Clause numbering follows the PUARAI
 * handbook scheme (Clause 14.1 promotion, Clause 12.2 answer-script review,
 * Clause 13.1 make-up examinations). Re-index real PDF pages when your
 * edition differs — see `npm run seed` and README “Corpus” section.
 */

export type RegulationTopic =
  | 'attendance'
  | 'promotion'
  | 'grade-review'
  | 'makeup'
  | 'cgpa'
  | 'grading'
  | 'duration'
  | 'summer'
  | 'schedule';

export interface RegulationChunk {
  id: string;
  clauseId: string;
  sectionTitle: string;
  topic: RegulationTopic;
  /** 1-based page number of the snippet in the official PDF. */
  page: number;
  document: string;
  /** Verbatim handbook text (spacing normalised) — shown only in the drawer. */
  snippet: string;
  /** Plain-language paraphrase — safe to surface in the conversation. */
  summary: string;
  /** Synonyms / retrieval boosters (student slang included). */
  keywords: string[];
}

export const REGULATION_DOCUMENT =
  'Presidency University — Academic Regulations (Reg. No. PU/AC-13/16/11_2020)';

export const CALENDAR_DOCUMENT =
  'Presidency University — Academic Calendar (Office of the Registrar)';

export const REGULATION_CORPUS: RegulationChunk[] = [
  /* ── ATTENDANCE ─────────────────────────────────────────────────────────── */
  {
    id: 'att-7-2-minimum',
    clauseId: 'Clause 7.2',
    sectionTitle: 'Attendance Requirements — 75% Minimum',
    topic: 'attendance',
    page: 9,
    document: REGULATION_DOCUMENT,
    snippet:
      "To account for approved leave of absence (for instance, representing the University in State/National/International Competitions/Events/Conferences, etc.) and/or other contingencies like medical emergencies, the attendance requirement shall be a minimum of 75% of the classes actually conducted in every Course the student has registered for in the Academic Term.",
    summary:
      "You must attend at least 75% of the classes actually conducted in every course you registered for that semester; approved leave and genuine emergencies are what the rule is designed to accommodate.",
    keywords: [
      'attendance', '75', 'seventy five', 'minimum', 'classes', 'percent',
      'shortage', 'absent', 'less attendance', 'attendance shortage',
    ],
  },
  {
    id: 'att-7-3-condonation',
    clauseId: 'Clause 7.3',
    sectionTitle: 'Attendance Shortage Condonation (Relaxation up to 65%)',
    topic: 'attendance',
    page: 9,
    document: REGULATION_DOCUMENT,
    snippet:
      "Further, if a student suffers serious medical exigencies of hospitalization, trauma or contagious disease only, the concerned student may be given relaxation in attendance requirement (in the Course(s) where there is a shortage) by the Vice Chancellor on the recommendations of the Dean of the School concerned. However, on no account whatsoever, shall the minimum requirement of attendance be less than 65% of the classes actually conducted in every Course the student has registered for in the Academic Term. The student shall not be eligible for this special provision if she/he fails to produce authentic medical certificates and relevant documents in support of the medical exigency.",
    summary:
      "Shortage can be condoned only for hospitalisation, trauma or contagious disease: the Vice Chancellor, on the Dean's recommendation, may relax attendance in the affected courses — but never below 65%, and only against authentic medical certificates.",
    keywords: [
      'condonation', 'condone', 'condonation letter', 'shortage', 'medical',
      'hospitalisation', 'hospitalization', 'relaxation', '65', 'dean',
      'vice chancellor', 'certificate', 'medical grounds', 'attendance shortage condonation',
    ],
  },
  {
    id: 'att-7-6-np',
    clauseId: 'Clause 7.6',
    sectionTitle: 'Shortage of Attendance — “NP” (Not Permitted)',
    topic: 'attendance',
    page: 10,
    document: REGULATION_DOCUMENT,
    snippet:
      "A student with shortage of attendance (i.e., less than 75% of the classes actually conducted in every Course in the concerned Academic Term as prescribed by Clause 7.2, and other conditions as applicable under Clauses 7.3 to 7.5), shall not be permitted to appear in the End Term Final Examinations of the Course(s) in which the attendance shortfall exists, irrespective of the student's academic performance in the other components of Continuous Assessments. The student shall be given a placeholder grade “NP” (Not Permitted) to indicate that the student has not been permitted to appear for the End Term Final Examinations due to shortage of attendance during the Academic Term in the concerned Course(s).",
    summary:
      "If attendance in a course drops below 75% you cannot write that course's End Term exam — regardless of how well you did in internals — and the course shows a placeholder “NP” (Not Permitted).",
    keywords: [
      'NP', 'not permitted', 'detain', 'detained', 'barred', 'debarred',
      'shortage', 'end term', 'exam', 'not allowed', 'internal marks',
    ],
  },
  {
    id: 'att-7-7-recover',
    clauseId: 'Clause 7.7',
    sectionTitle: 'Recovering from “NP” — Summer Term & Risk of Losing a Year',
    topic: 'attendance',
    page: 10,
    document: REGULATION_DOCUMENT,
    snippet:
      "Further, a student who has shortage of attendance (received placeholder grade “NP”) in a Course in the concerned Semester, shall be eligible to re-register for the concerned Course in the following Summer Term, subject to all the conditions stated in Clauses 15.4 and 15.5. The student is cautioned that this may result in the loss of an Academic Year for the student. It is the sole responsibility of the student to ensure that she/he earns the required mandatory credits as prescribed by the concerned Program Regulations and Curriculum.",
    summary:
      "An “NP” course can be recovered by re-registering it in the following Summer Term, but that may cost you an academic year — the regulation explicitly puts the responsibility of still earning required credits on you.",
    keywords: [
      'summer term', 're-register', 'reregister', 'NP', 'backlog', 'recover',
      'loss of year', 'year back', 'credits', 'clear attendance',
    ],
  },

  /* ── ACADEMIC PROGRESSION & PROMOTION ───────────────────────────────────── */
  {
    id: 'promo-14-1-cgpa',
    clauseId: 'Clause 14.1',
    sectionTitle: 'Academic Progression & Promotion Failure',
    topic: 'promotion',
    page: 19,
    document: REGULATION_DOCUMENT,
    snippet:
      "Yearly promotion of a student to the next Academic Year of the Program of study after the end of an Academic Year (i.e., promotion of a student after the 2nd Semester, 4th Semester, and so on, to the 3rd Semester, 5th Semester, and so on, respectively) is subject to the following condition: The student must have secured a CGPA of at least 4.00 at the end of the concerned Academic Year after considering the results of the End Term Final Examinations (of the Semester/Summer Term, as applicable) and the Make–Up Examinations, as applicable.",
    summary:
      "To move into the next year you need a CGPA of at least 4.00 at the end of the academic year, counting end-term results plus any make-up exams — fall short and you are not promoted (the familiar “year back” / detention outcome).",
    keywords: [
      'promotion', 'promote', 'year back', 'yearback', 'back year', 'detain',
      'detention', 'CGPA', '4.00', '4.0', 'progression', 'next year',
      'failed year', 'not eligible', 'pointer', 'gpa',
    ],
  },
  {
    id: 'promo-14-2-options',
    clauseId: 'Clause 14.2',
    sectionTitle: 'If Promotion Fails — Repeat the Year or Re-register Select Courses',
    topic: 'promotion',
    page: 20,
    document: REGULATION_DOCUMENT,
    snippet:
      "Further, if a student is not eligible for promotion to the next Academic Year of the Program of study due to not fulfilling the condition stipulated in Clause 14.1 above, he/she shall choose one of the following provisions to continue with the Program of study. The student may opt to “repeat” the concerned Academic Year (both Odd and Even Semesters) of the Program of study, in the next Academic Year of the University by registering in the concerned Odd Semester for all the concerned Courses prescribed by the concerned Program Regulations and Curriculum, and by registering in the following Even Semester for all the concerned Courses.",
    summary:
      "Missing the promotion CGPA does not end your program: you choose between repeating the whole year (both semesters) or re-registering only selected courses to rebuild the credits and CGPA you need.",
    keywords: [
      'repeat year', 'repeat', 're-register select courses', 'options',
      'not eligible', 'continue program', 'backlog', 'reappear', 'arrear',
    ],
  },
  {
    id: 'promo-14-2-1-consequences',
    clauseId: 'Clause 14.2.1',
    sectionTitle: 'Consequences — Withdrawn Credits, Fee & Rebuilding CGPA',
    topic: 'promotion',
    page: 20,
    document: REGULATION_DOCUMENT,
    snippet:
      "Further, if a student opts for the provision of repeating the concerned Academic Year of the Program of study, the credits earned, as applicable, and Grades previously obtained in all the Courses registered in the concerned Academic Year of the Program of study shall stand withdrawn and declared null and void. Further, the student shall remit the Annual University Fee prescribed by the University for the concerned Program of study and clear any other dues, to be eligible to register in concerned Academic Year. Alternatively, a student may opt to re-register in the next Academic Year for only the specific Courses to earn the mandatory Credits and the CGPA required for promotion to the following Academic Year.",
    summary:
      "Repeating a year voids every credit and grade of that year and the annual fee is payable again; re-registering select courses voids only those courses' earlier grades — either way the fresh grades replace the old ones to rebuild your promotion eligibility.",
    keywords: [
      'withdrawn', 'null and void', 'fee', 'annual fee', 'credits',
      'improve CGPA', 'repeat year consequences', 'grades replaced', 'dues',
    ],
  },

  /* ── ANSWER SCRIPTS & GRADE REVIEW ──────────────────────────────────────── */
  {
    id: 'review-12-2-scripts',
    clauseId: 'Clause 12.2',
    sectionTitle: 'Answer Script Photocopy & Grade Review',
    topic: 'grade-review',
    page: 16,
    document: REGULATION_DOCUMENT,
    snippet:
      "Answer scripts of End Term Final Examinations of the Program shall be shared with the students on pre-notified date(s) in the Department/School concerned. Answer books shall be shown to the students by the Faculty/Course Instructor of the Department as per the schedule announced by the COE; Students shall be entitled to check whether all answers have been evaluated and marked, and, the marks have been correctly totaled. If the student finds any discrepancy, he/she shall bring the same into the notice of the Faculty/Course Instructor concerned. The Faculty/Course Instructor, in turn, shall report the matter to the HOD/Dean of the Department/School with a report for rectification, if applicable, of the discrepancy.",
    summary:
      "You may inspect your evaluated answer script on the notified date — verify every answer was marked and totals are correct; any discrepancy is reported by your course instructor to the HOD/Dean for rectification.",
    keywords: [
      'revaluation', 'reval', 're-check', 'recheck', 'paper seeing',
      'seeing paper', 'photocopy', 'answer script', 'answer book', 'discrepancy',
      'totaling', 'marks', 'review', 'challenge', 'see paper',
    ],
  },
  {
    id: 'review-12-3-five-days',
    clauseId: 'Clause 12.3',
    sectionTitle: 'Grade Review Request — Within Five Working Days',
    topic: 'grade-review',
    page: 16,
    document: REGULATION_DOCUMENT,
    snippet:
      "In case of a grievance about the grade(s) awarded, a student shall first approach the concerned HOD/Dean with a written request for review of the grade awarded in a Course (or Courses) within five (05) University working days from the date of declaration of the results of the End Term Final Examinations. No request for review of grade(s) shall be admissible after five (05) University working days from the date of declaration of the results. The HOD/Dean shall arrange, within five (05) University working days of the receipt of the student's request, for the concerned Faculty/Course Instructor(s) and one or two more faculty members who are familiar with the Course(s) concerned to clarify to the student concerned why she/he was awarded the particular grade.",
    summary:
      "Submit a written grade-review request to the HOD/Dean within five working days of result declaration; the department then convenes faculty to explain exactly why that grade was awarded — late requests are not accepted.",
    keywords: [
      'review', 'grievance', 'grade review', 'revaluation', 'recheck',
      'five days', '5 days', 'working days', 'HOD', 'Dean', 'written request',
      'paper seeing', 'reval',
    ],
  },
  {
    id: 'review-12-4-aab',
    clauseId: 'Clause 12.4',
    sectionTitle: 'Appeal to the Academic Appeals Board (AAB)',
    topic: 'grade-review',
    page: 17,
    document: REGULATION_DOCUMENT,
    snippet:
      "In case, the student is not satisfied with the explanation/written report, the student may then appeal to the Academic Appeals Board (AAB) within five (05) University working days. The student shall submit her/his appeal for review of grade(s) to the COE. The appeal will be submitted along with the prescribed fee as fixed by the University from time to time. The AAB shall submit its report and recommendation to the Vice Chancellor within seven (07) University working days from the date of appeal. The approval and decision of the Vice Chancellor shall be final and binding on all concerned.",
    summary:
      "If the faculty explanation doesn't satisfy you, appeal to the Academic Appeals Board through the COE within five working days with the prescribed fee; the AAB recommends within seven days and the Vice Chancellor's decision is final.",
    keywords: [
      'appeal', 'AAB', 'academic appeals board', 'COE', 'fee', 'vice chancellor',
      'final decision', 'not satisfied', 'revaluation', 'review of grade',
    ],
  },

  /* ── MAKE-UP EXAMINATIONS ───────────────────────────────────────────────── */
  {
    id: 'makeup-13-1-eligibility',
    clauseId: 'Clause 13.1',
    sectionTitle: 'Make-Up Examination',
    topic: 'makeup',
    page: 17,
    document: REGULATION_DOCUMENT,
    snippet:
      "Make-Up Examinations is a provision for a student to complete a Course (or Courses) where she/he received an “F” grade, or, was given the placeholder grade “I” to reappear in the End Term Final Examination component of a Course (or Courses), subject to the conditions mentioned below. In no other circumstances, Make-Up Examinations shall be available to the student.",
    summary:
      "A make-up exam exists only for a course where you hold an “F” or an “I” (incomplete) placeholder in the End Term component — no other circumstance qualifies, so “supply” attempts are strictly conditional.",
    keywords: [
      'makeup', 'make-up', 'make up exam', 'supply', 'supplementary',
      'F grade', 'I grade', 'incomplete', 'reappear', 'backlog exam', 'arrear',
    ],
  },
  {
    id: 'makeup-13-2-process',
    clauseId: 'Clause 13.2',
    sectionTitle: 'Make-Up Eligibility — Medical Exigency & BOE Approval',
    topic: 'makeup',
    page: 17,
    document: REGULATION_DOCUMENT,
    snippet:
      "A student who fails to appear in the End Term Final Examinations, in some or all Courses, due to medical exigencies, specifically hospitalization, trauma or contagious disease only, and, the said student informs the HOD/Dean concerned timely (i.e., on or before the last date of the said End Term Final Examinations), may submit a request to the concerned HOD/Dean for the provision of the Make-Up Examinations. Provided further, the student must submit, along with the registration form for the Make-Up Examinations, the medical certificates, medical prescriptions, hospital discharge report, medical fitness report and all such relevant documents duly attested by the concerned registered medical officer. On approval of the BOE, the student shall submit the application form for the Make-Up Examinations to the Examination Department of the University within the duly notified dates, along with the prescribed fee for the Make-Up Examinations.",
    summary:
      "To sit a make-up you must have missed the end-term only due to hospitalisation, trauma or contagious disease, informed the HOD/Dean by the exam's last date, submitted attested medical documents, obtained Board of Examinations approval, and paid the fee within the notified dates.",
    keywords: [
      'medical', 'hospital', 'exigency', 'BOE', 'board of examinations',
      'deadline', 'documents', 'fee', 'absent', 'how to apply', 'process',
      'registration form',
    ],
  },
  {
    id: 'makeup-13-3-grade-ceiling',
    clauseId: 'Clause 13.3',
    sectionTitle: 'Grade Earned in Make-Up Examination (Grade Ceiling)',
    topic: 'makeup',
    page: 18,
    document: REGULATION_DOCUMENT,
    snippet:
      "On the basis of the student's performance in the Make-Up Examinations and considering the marks obtained by the student in all other Continuous Assessments as prescribed by the concerned Program Regulations and Curriculum, the final letter grade awarded will replace the placeholder grade “I”. A student with “F” Grade in one or more Courses and/or who secured “D” Grade in one or more Courses, may avail the benefit of the Make-Up Examinations to pass the failed Course(s) and/or improve her/his CGPA. Further, if the student fails in the Course(s) attempted in the Make-Up Examinations, the student will be awarded “F” grade in the Course(s) and will have to re-appear for the corresponding Make-Up Examinations or the regular End Term Final Examinations.",
    summary:
      "In a make-up, your final letter grade — computed with your carried-forward internal marks — simply replaces the “I” or “F”, so the normal 10-point scale applies, but improvement is capped at two grade levels — an “F” can rise at most to a “C” per Clause 13.3.2; a failed attempt, however, reverts the course to “F”.",
    keywords: [
      'grade cap', 'grade ceiling', 'maximum grade', 'cap on grade', 'makeup grade',
      'improve grade', 'replace I', 'D grade', 'CGPA improve', 'fail again',
      'internal marks carried forward',
    ],
  },
  {
    id: 'makeup-13-4-limits',
    clauseId: 'Clause 13.4',
    sectionTitle: 'Courses Excluded & Schedule of Make-Up Exams',
    topic: 'makeup',
    page: 18,
    document: REGULATION_DOCUMENT,
    snippet:
      "The provision of Make-Up Examinations shall not be available for practice/laboratory/skill-based Courses. If a student has secured an “F” Grade in such a Course, the student shall complete the concerned Courses only by repeating the Courses in the Semester when they become available for registration. Make-Up Examinations may be scheduled at the end of each Semester. The COE shall announce the schedule of the Make-Up Examinations at least two (02) calendar weeks before the commencement of the Make-Up Examinations.",
    summary:
      "Practical, laboratory and skill-based courses never get make-ups — you repeat them when next offered; other make-ups run at the end of each semester with the schedule published at least two weeks in advance.",
    keywords: [
      'lab', 'practical', 'skill', 'excluded', 'schedule', 'two weeks',
      'COE', 'dates', 'when make-up', 'not available',
    ],
  },
  /* ── CGPA, GRADING & DURATION ───────────────────────────────────────────── */
  {
    id: 'cgpa-9-1-definition',
    clauseId: 'Clause 9.1',
    sectionTitle: 'SGPA & CGPA — How They Are Calculated',
    topic: 'cgpa',
    page: 15,
    document: REGULATION_DOCUMENT,
    snippet:
      "The overall academic performance of a student shall be measured by two indices: SGPA which is the “Semester Grade Point Average” and CGPA which is the “Cumulative Grade Point Average”. The SGPA is the weighted average of the grade points secured in all the concerned Courses registered by the student during that Semester. The Cumulative Grade Point Average indicates overall academic performance of a student in all the Courses registered up to and including the latest completed semester. The SGPA and CGPA are calculated to TWO decimal places.",
    summary:
      "Your pointer (CGPA) is the credit-weighted average of grade points across every course up to your latest completed semester — SGPA covers one semester, both are reported to two decimal places.",
    keywords: [
      'CGPA', 'SGPA', 'pointer', 'gpa', 'calculation', 'weighted average',
      'grade points', 'credits', 'two decimal', 'semester grade', 'how to calculate',
    ],
  },
  {
    id: 'grading-8-4-scale',
    clauseId: 'Clause 8.4',
    sectionTitle: 'Letter Grades & Grade Points (10-Point Scale)',
    topic: 'grading',
    page: 11,
    document: REGULATION_DOCUMENT,
    snippet:
      "The University follows the system of Letter Grades with associated Grade Points on a scale of 10. The Letter Grades and associated Grade Points along with a brief qualitative description are summarized in Table 1: O 10 Outstanding; A+ 9 Excellent; A 8 Very Good; B+ 7 Good; B 6 Above Average; C 5 Average; D 4 Pass; F 0 Fail; NE 0 Not Eligible; NP 0 Not Permitted; S – Satisfactorily Completed; NC – Not Completed; U – Audited Satisfactorily; I – Incomplete.",
    summary:
      "Grades run from O(10) down to D(4 = pass); F, NE and NP carry zero grade points, while “I” means incomplete until a make-up or re-exam resolves it.",
    keywords: [
      'grades', 'grade points', 'scale', 'O grade', 'A+', 'pass', 'fail',
      'pointer', 'NE', 'NP', 'I grade', 'qualitative',
    ],
  },
  {
    id: 'grading-8-8-fail',
    clauseId: 'Clause 8.8',
    sectionTitle: 'When You Are Declared “Failed” (F Grade)',
    topic: 'grading',
    page: 12,
    document: REGULATION_DOCUMENT,
    snippet:
      "A student failing to get the minimum requirement of 30% of the total marks/weightage assigned for the End Term Final Examination OR fails to secure the minimum requirement of 40% of the AGGREGATE marks of the components of the Continuous Assessments and the End Term Final Examination in a Course, shall be declared as “Failed” and given “F” Grade, regardless of the marks obtained in the other components of Continuous Assessments in the concerned Course. The student shall have to re-appear in the “Make-Up Examinations” as scheduled by the University, or, re-appear in the End Term Final Examination of the same Course when it is scheduled at the end of the following Semester or Summer Term, if offered.",
    summary:
      "You fail a course when you score below 30% in the end-term or below 40% aggregate — then you retake it through a make-up exam or the next scheduled end-term/summer offering, with your internal marks carried forward.",
    keywords: [
      'fail', 'F grade', '30%', '40%', 'aggregate', 're-appear', 'reappear',
      'carry forward', 'internal marks', 'passing', 'minimum marks',
    ],
  },
  {
    id: 'duration-19-1-max',
    clauseId: 'Clause 19.1',
    sectionTitle: 'Maximum Duration for Completion of a Program',
    topic: 'duration',
    page: 22,
    document: REGULATION_DOCUMENT,
    snippet:
      "The permissible maximum duration (number of years) for completion of a Program, is twice the prescribed duration of the Program. The time taken by the student to improve Grades/CGPA shall be counted in permissible maximum duration for completion of a program.",
    summary:
      "You get at most twice the program's normal duration to finish, and any time spent improving grades or CGPA counts against that limit.",
    keywords: [
      'duration', 'maximum years', 'extension', 'time limit', 'improvement',
      'backlog years', 'how long', 'deadline to finish',
    ],
  },

  /* ── FIX 1: REQUIRED CLAUSE ADDITIONS (grade ceiling, medical 'I', summer) ─ */
  {
    id: 'makeup-13-3-2-grade-cap',
    clauseId: 'Clause 13.3.2',
    sectionTitle: 'Make-Up Examination Grade Ceiling (Two-Grade Cap)',
    topic: 'makeup',
    page: 18,
    document: REGULATION_DOCUMENT,
    snippet:
      "Clause 13.3.2: Students appearing for Make-Up Examinations can improve only by two grade levels. This means that an 'F' grade can be improved to a 'C' grade at most.",
    summary:
      "In a Make-Up Examination you can improve by at most two grade levels: an 'F' can rise only to a 'C' at most — so even scoring 90% in the make-up cannot earn you an 'A' or 'O' grade.",
    keywords: [
      'makeup exam', 'make-up exam', 'grade cap', 'grade ceiling',
      'f grade improvement', 'max grade makeup', 'score 90', 'improve grade',
      'A or O grade', 'two grade levels',
    ],
  },
  {
    id: 'makeup-13-2-medical-placeholder',
    clauseId: 'Clause 13.2',
    sectionTitle: 'Medical Exigencies → Placeholder “I” & Certification',
    topic: 'makeup',
    page: 17,
    document: REGULATION_DOCUMENT,
    snippet:
      "Clause 13.2: Absence at End Term Examination due to medical exigencies (hospitalization, trauma, contagious disease) results in placeholder grade 'I'. The student must submit authentic medical certificates to apply for Make-Up Examinations.",
    summary:
      "Missing the End Term because of hospitalisation, trauma or contagious disease gives you an 'I' (Incomplete) placeholder instead of a fail: submit authentic medical certificates within the notified dates to apply for the Make-Up Examination — this provision exists exactly for medical emergencies, so you are not going to fail by default.",
    keywords: [
      'hospitalized', 'hospitalisation', 'sick', 'fever', 'missed exam',
      'absent', 'illness', 'stress', 'worried', 'will i fail',
      'medical certificate', 'placeholder I',
    ],
  },
  {
    id: 'summer-15-5-2-credit-limit',
    clauseId: 'Clause 15.5.2',
    sectionTitle: 'Summer Term Credit Limit',
    topic: 'summer',
    page: 19,
    document: REGULATION_DOCUMENT,
    snippet:
      'Clause 15.5.2: A student can register for a maximum of 12 Credits during the Summer Term.',
    summary:
      'During the Summer Term you can register for a maximum of 12 credits — plan your backlog and improvement courses so they fit within that credit limit.',
    keywords: [
      'summer term', 'summer credits', 'max credits summer', '12 credits',
      'summer course limit', 'register credits', 'summer registration',
    ],
  },

  /* ── ACADEMIC CALENDAR, WORKING DAYS & HOLIDAYS ────────────────────────── */
  {
    id: 'schedule-2-1-calendar',
    clauseId: 'Clause 2.1',
    sectionTitle: 'Academic Calendar — Working Days, Saturdays & Holidays',
    topic: 'schedule',
    page: 4,
    document: CALENDAR_DOCUMENT,
    snippet:
      'Academic Calendar: The official working days, Saturday schedules, and declared holidays of the University are published in the Academic Calendar issued by the Registrar on behalf of the University Administration. Standard working days apply for all academic activities unless a day is declared a holiday, a Saturday is specified as non-instructional, or the day is listed under official University or Government leave notifications.',
    summary:
      'Working days, Saturday operations and holidays all come from the official Academic Calendar issued by the Registrar/University Administration — classes run on standard working days unless the day is declared a holiday, a Saturday is marked non-instructional, or it appears in an official University/Government leave notification. So always confirm the exact schedule in the current Academic Calendar.',
    keywords: [
      'saturday', 'saturdays', 'sataday', 'satrday', 'weekend', 'holiday',
      'holidays', 'working day', 'working days', 'college open',
      'college closed', 'public holiday', 'government holiday',
      'gazetted holiday', 'leave', 'leaves', 'leave schedule',
      'academic calendar', 'registrar', 'non-instructional',
      'is today a holiday', 'college timing', 'timings', 'working hours',
      'collage', 'saturday college open', 'vacation',
    ],
  },
];

/** Lightweight corpus statistics for /api/health and the seed script. */
export function getCorpusStats(): {
  chunks: number;
  topics: RegulationTopic[];
  clauses: string[];
} {
  const topics = [...new Set(REGULATION_CORPUS.map((c) => c.topic))];
  const clauses = [...new Set(REGULATION_CORPUS.map((c) => c.clauseId))];
  return { chunks: REGULATION_CORPUS.length, topics, clauses };
}

