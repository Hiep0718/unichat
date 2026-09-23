/**
 * Studio Content Generator — Intelligent client-side parsing of AI responses
 * to generate dynamic content for each Knowledge Studio tool.
 *
 * Parses markdown-structured AI answers into structured data for:
 * Podcast, Flashcards, Quiz, Mindmap, Slides, and Report tools.
 */

import { CitationItem } from '../chat-api';

/* ─── Shared Types ─── */

export interface ParsedSection {
  heading: string;
  body: string;
  bullets: string[];
}

export interface PodcastLine {
  host: string;
  avatar: string;
  text: string;
}

export interface FlashcardData {
  id: number;
  term: string;
  definition: string;
  example: string;
}

export interface QuizQuestionData {
  id: number;
  question: string;
  options: string[];
  correctAnswerIdx: number;
  explanation: string;
}

export interface SlideData {
  id: number;
  title: string;
  subtitle: string;
  points: string[];
  speakerNotes: string;
}

export interface ReportSection {
  heading: string;
  content: string;
}

/* ─── Internal Parsing Helpers ─── */

/** Strip markdown formatting (bold, italic, links, images) from text. */
function stripMarkdown(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\s*\[\d+\]/g, '')
    .trim();
}

/** Extract bold terms and their surrounding context as key-value pairs. */
function extractBoldTerms(text: string): Array<{ term: string; context: string }> {
  const results: Array<{ term: string; context: string }> = [];
  const regex = /\*\*([^*]{2,80})\*\*/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const term = match[1]?.trim();
    if (!term || term.length < 2) continue;

    // Grab the sentence or line surrounding this bold term
    const afterStart = match.index + match[0].length;
    const afterText = text.slice(afterStart, afterStart + 300);
    const sentenceEnd = afterText.search(/[.!?\n]/);
    const context = sentenceEnd > 0
      ? afterText.slice(0, sentenceEnd + 1).replace(/^[:\s—–-]+/, '').trim()
      : afterText.slice(0, 120).replace(/^[:\s—–-]+/, '').trim();

    if (context.length > 5) {
      results.push({ term, context: stripMarkdown(context) });
    }
  }

  return results;
}

/** Split markdown text into sections based on headings. */
function parseIntoSections(markdown: string): ParsedSection[] {
  const lines = markdown.split('\n');
  const sections: ParsedSection[] = [];
  let current: ParsedSection | null = null;
  const bodyLines: string[] = [];

  const flushBody = () => {
    if (current) {
      current.body = bodyLines.join('\n').trim();
      bodyLines.length = 0;
    }
  };

  for (const line of lines) {
    const headingMatch = line.match(/^#{1,4}\s+(.+)/);
    if (headingMatch && headingMatch[1]) {
      flushBody();
      if (current) sections.push(current);
      bodyLines.length = 0;
      current = {
        heading: stripMarkdown(headingMatch[1]),
        body: '',
        bullets: [],
      };
    } else if (current) {
      const bulletMatch = line.match(/^\s*[-*]\s+(.+)/);
      if (bulletMatch && bulletMatch[1]) {
        current.bullets.push(stripMarkdown(bulletMatch[1]));
      }
      bodyLines.push(line);
    } else {
      bodyLines.push(line);
    }
  }

  flushBody();
  if (current) sections.push(current);

  // If no headings found, treat entire text as one section
  if (sections.length === 0 && markdown.trim()) {
    const allBullets: string[] = [];
    for (const line of lines) {
      const bulletMatch = line.match(/^\s*[-*]\s+(.+)/);
      if (bulletMatch && bulletMatch[1]) {
        allBullets.push(stripMarkdown(bulletMatch[1]));
      }
    }
    sections.push({
      heading: 'Nội dung chính',
      body: markdown.trim(),
      bullets: allBullets,
    });
  }

  return sections;
}

/** Extract first N sentences from text. */
function firstSentences(text: string, count: number): string {
  const clean = stripMarkdown(text);
  const sentences = clean.split(/(?<=[.!?])\s+/).filter(Boolean);
  return sentences.slice(0, count).join(' ');
}

/* ─── Public Generator Functions ─── */

/**
 * Generate podcast dialog from AI answer content.
 * Splits the answer into conversational segments between two hosts.
 */
export function generatePodcastDialog(
  answerContent: string,
  workspaceName: string
): PodcastLine[] {
  const sections = parseIntoSections(answerContent);
  const lines: PodcastLine[] = [];

  lines.push({
    host: 'Host A (Nam)',
    avatar: 'record_voice_over',
    text: `Chào mừng các bạn đến với Podcast Tri Thức UniChat! Hôm nay chúng ta sẽ cùng khám phá nội dung quan trọng từ ${workspaceName}.`,
  });

  for (let i = 0; i < Math.min(sections.length, 5); i++) {
    const section = sections[i];
    if (!section) continue;
    const isHostA = i % 2 === 0;

    if (section.heading !== 'Nội dung chính') {
      lines.push({
        host: isHostA ? 'Host A (Nam)' : 'Host B (Nữ)',
        avatar: isHostA ? 'record_voice_over' : 'graphic_eq',
        text: `Bây giờ hãy nói về "${section.heading}".`,
      });
    }

    const summary = section.bullets.length > 0
      ? section.bullets.slice(0, 3).join('. ') + '.'
      : firstSentences(section.body, 2);

    if (summary) {
      lines.push({
        host: isHostA ? 'Host B (Nữ)' : 'Host A (Nam)',
        avatar: isHostA ? 'graphic_eq' : 'record_voice_over',
        text: stripMarkdown(summary),
      });
    }
  }

  lines.push({
    host: 'Host A (Nam)',
    avatar: 'record_voice_over',
    text: 'Đó là những điểm chính hôm nay. Cảm ơn các bạn đã theo dõi chương trình!',
  });

  return lines.length > 2 ? lines : getFallbackPodcast(workspaceName);
}

/** Generate flashcards from bold terms and key concepts in the answer. */
export function generateFlashcards(answerContent: string): FlashcardData[] {
  const boldTerms = extractBoldTerms(answerContent);
  const cards: FlashcardData[] = [];
  const seenTerms = new Set<string>();

  // Extract code blocks to attach as examples
  const codeBlocks: string[] = [];
  const codeRegex = /```[\w]*\n([\s\S]*?)```/g;
  let codeMatch: RegExpExecArray | null;
  while ((codeMatch = codeRegex.exec(answerContent)) !== null) {
    if (codeMatch[1] && codeMatch[1].trim().length > 5) {
      codeBlocks.push(codeMatch[1].trim().slice(0, 120));
    }
  }

  for (const { term, context } of boldTerms) {
    const normalizedTerm = term.toLowerCase();
    if (seenTerms.has(normalizedTerm)) continue;
    seenTerms.add(normalizedTerm);

    // Try to find a code example that mentions the term
    const relatedCode = codeBlocks.find((c) => c.toLowerCase().includes(normalizedTerm.slice(0, 8)));

    cards.push({
      id: cards.length + 1,
      term,
      definition: context,
      example: relatedCode || '',
    });

    if (cards.length >= 10) break;
  }

  // If not enough bold terms, extract from bullet points
  if (cards.length < 3) {
    const sections = parseIntoSections(answerContent);
    for (const section of sections) {
      for (const bullet of section.bullets) {
        if (cards.length >= 10) break;
        const colonIdx = bullet.indexOf(':');
        if (colonIdx > 0 && colonIdx < 60) {
          const term = bullet.slice(0, colonIdx).trim();
          const def = bullet.slice(colonIdx + 1).trim();
          const normalizedTerm = term.toLowerCase();
          if (!seenTerms.has(normalizedTerm) && def.length > 5) {
            seenTerms.add(normalizedTerm);
            cards.push({ id: cards.length + 1, term, definition: def, example: '' });
          }
        }
      }
    }
  }

  return cards.length >= 2 ? cards : getFallbackFlashcards();
}

/** Generate quiz questions from factual statements in the answer. */
export function generateQuizQuestions(answerContent: string): QuizQuestionData[] {
  const sections = parseIntoSections(answerContent);
  const questions: QuizQuestionData[] = [];

  // Collect bullets with their section context
  const bulletEntries: Array<{ bullet: string; sectionHeading: string }> = [];
  for (const section of sections) {
    for (const bullet of section.bullets) {
      if (bullet.length >= 15) {
        bulletEntries.push({ bullet, sectionHeading: section.heading });
      }
    }
  }

  // Question templates for variety
  const questionTemplates = [
    (heading: string) => `Theo phần "${heading}", phát biểu nào sau đây là chính xác?`,
    (_: string) => `Nội dung nào sau đây được đề cập trong tài liệu?`,
    (heading: string) => `Về "${heading}", điều nào sau đây đúng?`,
    (_: string) => `Phát biểu nào dưới đây phản ánh chính xác nội dung phân tích?`,
    (heading: string) => `Trong phần "${heading}", thông tin nào sau đây là chính xác?`,
  ];

  for (let i = 0; i < Math.min(bulletEntries.length, 5); i++) {
    const entry = bulletEntries[i];
    if (!entry) continue;

    const truncate = (s: string) => (s.length > 80 ? s.slice(0, 77) + '...' : s);
    const correctOption = truncate(entry.bullet);

    // Build wrong options, deduplicated and different from correct
    const wrongCandidates = bulletEntries
      .filter((_, idx) => idx !== i)
      .map((e) => truncate(e.bullet))
      .filter((opt) => opt !== correctOption);

    // Deduplicate
    const uniqueWrong = [...new Set(wrongCandidates)].slice(0, 3);
    if (uniqueWrong.length < 2) continue;

    const correctIdx = i % Math.min(uniqueWrong.length + 1, 4);
    const options = [...uniqueWrong];
    options.splice(correctIdx, 0, correctOption);

    const templateFn = questionTemplates[i % questionTemplates.length];
    const questionText = templateFn
      ? templateFn(entry.sectionHeading)
      : `Phát biểu nào sau đây là chính xác?`;

    questions.push({
      id: questions.length + 1,
      question: questionText,
      options: options.slice(0, 4),
      correctAnswerIdx: correctIdx,
      explanation: `Đáp án đúng: "${correctOption}" — trích từ phần "${entry.sectionHeading}".`,
    });

    if (questions.length >= 5) break;
  }

  return questions.length >= 2 ? questions : getFallbackQuiz();
}

/** Generate mermaid mindmap code from the answer's heading/bullet structure. */
export function generateMindmapCode(
  answerContent: string,
  workspaceName: string
): string {
  const sections = parseIntoSections(answerContent);

  if (sections.length === 0) return getFallbackMindmap(workspaceName);

  const lines: string[] = [`mindmap`, `  root(("${sanitizeMermaid(workspaceName)}"))`];

  for (const section of sections.slice(0, 6)) {
    lines.push(`    "${sanitizeMermaid(section.heading)}"`);
    for (const bullet of section.bullets.slice(0, 4)) {
      const shortBullet = bullet.length > 45 ? bullet.slice(0, 42) + '...' : bullet;
      lines.push(`      "${sanitizeMermaid(shortBullet)}"`);
    }
  }

  return lines.join('\n');
}

/** Generate slide outlines from the answer's section structure. */
export function generateSlides(
  answerContent: string,
  workspaceName: string
): SlideData[] {
  const sections = parseIntoSections(answerContent);
  const slides: SlideData[] = [];

  // Title slide
  slides.push({
    id: 1,
    title: `Tổng quan: ${workspaceName}`,
    subtitle: 'Nội dung chính từ phân tích tri thức AI',
    points: sections.slice(0, 3).map((s) => s.heading),
    speakerNotes: `Bài thuyết trình tóm tắt ${sections.length} chủ đề chính được AI phân tích từ tài liệu.`,
  });

  // Content slides from sections
  for (let i = 0; i < Math.min(sections.length, 5); i++) {
    const section = sections[i];
    if (!section) continue;

    slides.push({
      id: slides.length + 1,
      title: section.heading,
      subtitle: firstSentences(section.body, 1) || '',
      points: section.bullets.length > 0
        ? section.bullets.slice(0, 5)
        : [stripMarkdown(firstSentences(section.body, 3))].filter(Boolean),
      speakerNotes: stripMarkdown(firstSentences(section.body, 2)),
    });
  }

  return slides.length >= 2 ? slides : getFallbackSlides(workspaceName);
}

/** Generate structured report sections with real citations. */
export function generateReportSections(
  answerContent: string,
  citations: CitationItem[],
  workspaceName: string
): {
  title: string;
  meta: string;
  sections: ReportSection[];
  citations: Array<{ label: string; detail: string }>;
} {
  const parsedSections = parseIntoSections(answerContent);
  const cleanAnswer = stripMarkdown(answerContent);

  const reportSections: ReportSection[] = [
    {
      heading: 'Tóm Tắt Tổng Quan',
      content: firstSentences(cleanAnswer, 4) || 'Nội dung tổng quan từ phân tích tri thức.',
    },
  ];

  for (const section of parsedSections.slice(0, 4)) {
    const sectionContent = section.bullets.length > 0
      ? section.bullets.map((b) => `• ${b}`).join('\n')
      : stripMarkdown(section.body).slice(0, 400);

    reportSections.push({
      heading: section.heading,
      content: sectionContent,
    });
  }

  const citationEntries = citations.map((c, i) => ({
    label: `[${i + 1}]`,
    detail: `${c.fileName || 'Tài liệu'} — ${c.locator || 'N/A'} (Độ tin cậy ${Math.round(c.score * 100)}%)`,
  }));

  return {
    title: `Báo Cáo Tổng Hợp: ${workspaceName}`,
    meta: `Ngày lập: ${new Date().toLocaleDateString('vi-VN')} | UniChat Knowledge Engine`,
    sections: reportSections,
    citations: citationEntries,
  };
}

/* ─── Mermaid Sanitizer ─── */

function sanitizeMermaid(text: string): string {
  return text
    .replace(/[()[\]{}"|#>:;%`~]/g, '')
    .replace(/'/g, '')
    .replace(/---+/g, '-')
    .trim()
    .slice(0, 50);
}

/* ─── Fallbacks (khi answer quá ngắn hoặc không có cấu trúc) ─── */

function getFallbackPodcast(name: string): PodcastLine[] {
  return [
    { host: 'Host A (Nam)', avatar: 'record_voice_over', text: `Chào mừng đến Podcast Tri Thức! Hôm nay chúng ta tìm hiểu về ${name}.` },
    { host: 'Host B (Nữ)', avatar: 'graphic_eq', text: 'Hãy gửi thêm câu hỏi chi tiết để tôi có thể tạo nội dung phong phú hơn cho podcast!' },
  ];
}

function getFallbackFlashcards(): FlashcardData[] {
  return [
    { id: 1, term: 'Chưa đủ nội dung', definition: 'Hãy gửi câu hỏi chi tiết hơn để AI tạo thẻ ghi nhớ từ nội dung trả lời.', example: '' },
  ];
}

function getFallbackQuiz(): QuizQuestionData[] {
  return [
    { id: 1, question: 'Chưa đủ nội dung để tạo câu hỏi trắc nghiệm. Hãy hỏi thêm để có bài kiểm tra.', options: ['Đã hiểu'], correctAnswerIdx: 0, explanation: '' },
  ];
}

function getFallbackMindmap(name: string): string {
  return [
    'mindmap',
    `  root(("${sanitizeMermaid(name)}"))`,
    '    "Hãy gửi câu hỏi để tạo sơ đồ tư duy"',
  ].join('\n');
}

function getFallbackSlides(name: string): SlideData[] {
  return [
    { id: 1, title: name, subtitle: 'Chưa đủ nội dung', points: ['Hãy gửi câu hỏi chi tiết hơn để tạo slide thuyết trình.'], speakerNotes: '' },
  ];
}
