import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { MermaidDiagram } from './mermaid-diagram';
import { CitationItem } from '../chat-api';
import {
  generatePodcastDialog,
  generateFlashcards,
  generateQuizQuestions,
  generateMindmapCode,
  generateSlides,
  generateReportSections,
} from './studio-content-generator';
import './knowledge-studio-modal.css';


interface KnowledgeStudioModalProps {
  toolType: 'PODCAST' | 'FLASHCARDS' | 'QUIZ' | 'MINDMAP' | 'SLIDES' | 'REPORT';
  workspaceName?: string | undefined;
  answerContent?: string | undefined;
  citations?: CitationItem[] | undefined;
  onClose: () => void;
  onSaveNote: (title: string, content: string) => void;
}

export const KnowledgeStudioModal: React.FC<KnowledgeStudioModalProps> = ({
  toolType,
  workspaceName = 'Kho tri thức',
  answerContent = '',
  citations: propCitations = [],
  onClose,
  onSaveNote,
}) => {
  // Active Slide Index
  const [activeSlideIdx, setActiveSlideIdx] = useState(0);

  // Flashcards Interactive State
  const [flashcardIdx, setFlashcardIdx] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [masteredCards, setMasteredCards] = useState<Record<number, boolean>>({});

  // Quiz Interactive State
  const [activeQuizQIdx, setActiveQuizQIdx] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});

  // Audio Podcast State
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [podcastProgress, setPodcastProgress] = useState(0);
  const [activeTranscriptIdx, setActiveTranscriptIdx] = useState(0);



  // Mindmap Input Phase State
  const [mindmapPhase, setMindmapPhase] = useState<'INPUT' | 'RESULT'>('INPUT');
  const [mindmapPrompt, setMindmapPrompt] = useState('');
  const [mindmapCode, setMindmapCode] = useState('');

  // Saved Toast Message
  const [savedToastMsg, setSavedToastMsg] = useState<string | null>(null);

  // Slides Data — dynamically generated from AI answer
  const slides = useMemo(
    () => generateSlides(answerContent, workspaceName),
    [answerContent, workspaceName]
  );

  // Flashcards — dynamically generated from AI answer
  const flashcards = useMemo(
    () => generateFlashcards(answerContent),
    [answerContent]
  );

  // Quiz — dynamically generated from AI answer
  const quizQuestions = useMemo(
    () => generateQuizQuestions(answerContent),
    [answerContent]
  );

  // Mindmap Mermaid — generated on demand when user submits prompt
  const handleGenerateMindmap = useCallback(() => {
    const topic = mindmapPrompt.trim() || workspaceName;
    const code = generateMindmapCode(answerContent, topic);
    setMindmapCode(code);
    setMindmapPhase('RESULT');
  }, [answerContent, mindmapPrompt, workspaceName]);

  // Audio Podcast — dynamically generated from AI answer
  const podcastDialogLines = useMemo(
    () => generatePodcastDialog(answerContent, workspaceName),
    [answerContent, workspaceName]
  );

  // Report — dynamically generated from AI answer + real citations
  const reportData = useMemo(
    () => generateReportSections(answerContent, propCitations, workspaceName),
    [answerContent, propCitations, workspaceName]
  );

  const handleTriggerSave = useCallback(
    (title: string, content: string) => {
      onSaveNote(title, content);
      setSavedToastMsg(`Đã lưu "${title}" vào Sổ Ghi Chú!`);
      setTimeout(() => setSavedToastMsg(null), 3000);
    },
    [onSaveNote]
  );

  // Audio Progress Simulation
  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (isPlayingAudio) {
      timer = setInterval(() => {
        setPodcastProgress((prev) => {
          if (prev >= 100) {
            setIsPlayingAudio(false);
            return 0;
          }
          const next = prev + 5;
          const lineIdx = Math.min(Math.floor((next / 100) * podcastDialogLines.length), podcastDialogLines.length - 1);
          setActiveTranscriptIdx(lineIdx);
          return next;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isPlayingAudio, podcastDialogLines.length]);

  const handleToggleAudioPodcast = useCallback(() => {
    if (isPlayingAudio) {
      window.speechSynthesis.cancel();
      setIsPlayingAudio(false);
    } else {
      const text = podcastDialogLines.map((l) => `${l.host}: ${l.text}`).join(' ');
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'vi-VN';
      utterance.onend = () => {
        setIsPlayingAudio(false);
        setPodcastProgress(100);
      };
      utterance.onerror = () => setIsPlayingAudio(false);
      window.speechSynthesis.speak(utterance);
      setIsPlayingAudio(true);
    }
  }, [isPlayingAudio, podcastDialogLines]);

  const toolMeta = useMemo(() => {
    switch (toolType) {
      case 'PODCAST':
        return { icon: 'podcasts', title: 'Tổng quan Âm thanh (Podcast)', badge: '🎙️ Audio Broadcast' };
      case 'FLASHCARDS':
        return { icon: 'style', title: 'Bộ Thẻ Ghi Nhớ Khái Niệm', badge: '🎴 3D Flip Cards' };
      case 'QUIZ':
        return { icon: 'quiz', title: 'Kiểm Tra Trắc Nghiệm', badge: '✍️ Interactive Quiz Engine' };
      case 'MINDMAP':
        return { icon: 'schema', title: 'Sơ Đồ Tư Duy (Mindmap)', badge: '🧠 Mermaid Diagram Studio' };
      case 'SLIDES':
        return { icon: 'present_to_all', title: 'Kịch Bản Slide Thuyết Trình', badge: '💻 Presentation Briefing Deck' };
      case 'REPORT':
        return { icon: 'description', title: 'Báo Cáo Tổng Hợp Tri Thức', badge: '📝 Academic Study Report' };
      default:
        return { icon: 'auto_awesome', title: 'Studio Tri Thức', badge: 'AI Tool' };
    }
  }, [toolType]);

  const currentSlide = slides[activeSlideIdx] || slides[0];

  return (
    <div className="unichat-studio-modal-overlay" onClick={onClose}>
      <div className="unichat-studio-modal" onClick={(e) => e.stopPropagation()}>
        {/* Compact Header */}
        <div className="unichat-studio-modal__header">
          <div className="unichat-studio-modal__title-group">
            <span className="material-symbols-outlined unichat-studio-modal__icon">{toolMeta.icon}</span>
            <h3 className="unichat-studio-modal__title">{toolMeta.title}</h3>
          </div>
          <button type="button" className="unichat-studio-modal__close-btn" onClick={onClose} title="Đóng modal">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {savedToastMsg && (
          <div className="unichat-studio-modal__toast">
            <span className="material-symbols-outlined">check_circle</span>
            <span>{savedToastMsg}</span>
          </div>
        )}

        {/* Modal Body Content */}
        <div className="unichat-studio-modal__body">
          {/* TOOL 1: SLIDE OUTLINE PRESENTATION DECK */}
          {toolType === 'SLIDES' && currentSlide && (
            <div className="unichat-modal-slides">
              {/* Slide Navigation Tabs */}
              <div className="unichat-slides-selector">
                {slides.map((s, idx) => (
                  <button
                    key={s.id}
                    type="button"
                    className={`unichat-slides-pill ${activeSlideIdx === idx ? 'unichat-slides-pill--active' : ''}`}
                    onClick={() => setActiveSlideIdx(idx)}
                  >
                    Slide {idx + 1}
                  </button>
                ))}
              </div>

              {/* Slide Card Preview */}
              <div className="unichat-slide-card">
                <div className="unichat-slide-card__header">
                  <span className="unichat-slide-card__number">SLIDE {activeSlideIdx + 1} / {slides.length}</span>
                  <h3 className="unichat-slide-card__title">{currentSlide.title}</h3>
                  <span className="unichat-slide-card__subtitle">{currentSlide.subtitle}</span>
                </div>

                <div className="unichat-slide-card__content">
                  <h4 className="unichat-slide-card__section-label">📌 Ý Chính Cần Trình Bày:</h4>
                  <ul className="unichat-slide-card__bullet-list">
                    {currentSlide.points.map((pt, i) => (
                      <li key={i} className="unichat-slide-card__bullet-item">
                        <span className="material-symbols-outlined">arrow_right</span>
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Speaker Notes Box */}
                  <div className="unichat-speaker-notes">
                    <div className="unichat-speaker-notes__header">
                      <span className="material-symbols-outlined">record_voice_over</span>
                      <span>Ghi chú dành cho người thuyết trình (Speaker Notes):</span>
                    </div>
                    <p className="unichat-speaker-notes__text">"{currentSlide.speakerNotes}"</p>
                  </div>
                </div>
              </div>

              {/* Footer Controls */}
              <div className="unichat-modal-footer-bar">
                <div className="unichat-slides-controls">
                  <button
                    type="button"
                    className="unichat-btn"
                    disabled={activeSlideIdx === 0}
                    onClick={() => setActiveSlideIdx((p) => p - 1)}
                  >
                    <span className="material-symbols-outlined">chevron_left</span> Slide trước
                  </button>
                  <button
                    type="button"
                    className="unichat-btn unichat-btn--primary"
                    disabled={activeSlideIdx === slides.length - 1}
                    onClick={() => setActiveSlideIdx((p) => p + 1)}
                  >
                    Slide tiếp <span className="material-symbols-outlined">chevron_right</span>
                  </button>
                </div>

                <button
                  type="button"
                  className="unichat-save-btn unichat-save-btn--modal"
                  onClick={() =>
                    handleTriggerSave(
                      `💻 Kịch Bản Slide Thuyết Trình (${slides.length} Slides)`,
                      slides
                        .map(
                          (s) =>
                            `### Slide ${s.id}: ${s.title}\n*${s.subtitle}*\n` +
                            s.points.map((p) => `- ${p}`).join('\n') +
                            `\n\n> 🎙️ Speaker Note: ${s.speakerNotes}`
                        )
                        .join('\n\n---\n\n')
                    )
                  }
                >
                  <span className="material-symbols-outlined">push_pin</span>
                  <span>Lưu Kịch Bản Slide vào Sổ Ghi Chú</span>
                </button>
              </div>
            </div>
          )}

          {/* TOOL 2: AUDIO PODCAST BROADCAST */}
          {toolType === 'PODCAST' && (
            <div className="unichat-modal-podcast">
              <div className="unichat-modal-podcast__hero">
                <div className="unichat-modal-podcast__avatar">
                  <span className="material-symbols-outlined">
                    {isPlayingAudio ? 'graphic_eq' : 'podcasts'}
                  </span>
                </div>

                <div className="unichat-modal-podcast__info">
                  <h4>Bản Tin Phát Thanh Tri Thức 2 MC</h4>
                  <p>Hội thoại tóm tắt nội dung kho tri thức <strong>{workspaceName}</strong></p>
                  <div className="unichat-podcast-progress-bar">
                    <div className="unichat-podcast-progress-fill" style={{ width: `${podcastProgress}%` }} />
                  </div>
                </div>

                <button
                  type="button"
                  className="unichat-btn unichat-btn--primary unichat-btn--large"
                  onClick={handleToggleAudioPodcast}
                >
                  <span className="material-symbols-outlined">
                    {isPlayingAudio ? 'pause' : 'play_arrow'}
                  </span>
                  <span>{isPlayingAudio ? 'Tạm Dừng Podcast' : 'Phát Audio Podcast'}</span>
                </button>
              </div>

              {/* Interactive Transcript Chat Dialog */}
              <div className="unichat-podcast-transcript">
                <div className="unichat-podcast-transcript__header">
                  <span className="material-symbols-outlined">forum</span>
                  <span>Kịch bản đối thoại trực tiếp (Audio Transcript)</span>
                </div>

                <div className="unichat-podcast-transcript__list">
                  {podcastDialogLines.map((line, idx) => {
                    const isActive = activeTranscriptIdx === idx && isPlayingAudio;
                    return (
                      <div
                        key={idx}
                        className={`unichat-transcript-bubble ${
                          isActive ? 'unichat-transcript-bubble--active' : ''
                        }`}
                      >
                        <div className="unichat-transcript-bubble__avatar">
                          <span className="material-symbols-outlined">{line.avatar}</span>
                        </div>
                        <div className="unichat-transcript-bubble__content">
                          <span className="unichat-transcript-bubble__host">{line.host}</span>
                          <p className="unichat-transcript-bubble__text">{line.text}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="unichat-modal-footer-bar">
                <button
                  type="button"
                  className="unichat-save-btn unichat-save-btn--modal"
                  onClick={() =>
                    handleTriggerSave(
                      '🎙️ Kịch Bản Audio Podcast 2 MC',
                      podcastDialogLines.map((l) => `**${l.host}**: ${l.text}`).join('\n\n')
                    )
                  }
                >
                  <span className="material-symbols-outlined">push_pin</span>
                  <span>Lưu Kịch Bản Podcast vào Sổ Ghi Chú</span>
                </button>
              </div>
            </div>
          )}

          {/* TOOL 3: 3D FLIP FLASHCARDS */}
          {toolType === 'FLASHCARDS' && (
            <div className="unichat-modal-flashcards">
              <div className="unichat-modal-flashcards__top-bar">
                <div className="unichat-modal-flashcards__progress">
                  <span>Thẻ ghi nhớ <strong>{flashcardIdx + 1}</strong> / <strong>{flashcards.length}</strong></span>
                </div>
                <div className="unichat-modal-flashcards__stats">
                  <span>
                    Đã thuộc: <strong>{Object.keys(masteredCards).length}</strong> / {flashcards.length}
                  </span>
                </div>
              </div>

              {/* 3D Flip Card */}
              <div
                className={`unichat-modal-card-flip ${isFlipped ? 'unichat-modal-card-flip--flipped' : ''}`}
                onClick={() => setIsFlipped((p) => !p)}
              >
                <div className="unichat-modal-card-flip__inner">
                  <div className="unichat-modal-card-flip__face unichat-modal-card-flip__front">
                    <span className="unichat-modal-card-flip__tag">Mặt trước — Khái niệm</span>
                    <h3 className="unichat-modal-card-flip__term">{flashcards[flashcardIdx]?.term}</h3>
                    <span className="unichat-modal-card-flip__hint">
                      <span className="material-symbols-outlined">sync</span> Click để lật xem định nghĩa
                    </span>
                  </div>

                  <div className="unichat-modal-card-flip__face unichat-modal-card-flip__back">
                    <span className="unichat-modal-card-flip__tag">Mặt sau — Định nghĩa & Ví dụ</span>
                    <p className="unichat-modal-card-flip__def">{flashcards[flashcardIdx]?.definition}</p>
                    {flashcards[flashcardIdx]?.example ? (
                      <code className="unichat-modal-card-flip__code">{flashcards[flashcardIdx].example}</code>
                    ) : null}
                    <span className="unichat-modal-card-flip__hint">
                      <span className="material-symbols-outlined">sync</span> Click để quay lại khái niệm
                    </span>
                  </div>
                </div>
              </div>

              {/* Card Mastery & Navigation Controls */}
              <div className="unichat-modal-flashcards__footer">
                <button
                  type="button"
                  className="unichat-btn"
                  disabled={flashcardIdx === 0}
                  onClick={() => {
                    setIsFlipped(false);
                    setFlashcardIdx((p) => p - 1);
                  }}
                >
                  <span className="material-symbols-outlined">chevron_left</span> Thẻ trước
                </button>

                <button
                  type="button"
                  className={`unichat-mastery-btn ${
                    masteredCards[flashcardIdx] ? 'unichat-mastery-btn--active' : ''
                  }`}
                  onClick={() =>
                    setMasteredCards((prev) => ({
                      ...prev,
                      [flashcardIdx]: !prev[flashcardIdx],
                    }))
                  }
                >
                  <span className="material-symbols-outlined">
                    {masteredCards[flashcardIdx] ? 'check_circle' : 'task_alt'}
                  </span>
                  <span>{masteredCards[flashcardIdx] ? 'Đã thuộc thẻ này' : 'Đánh dấu đã thuộc'}</span>
                </button>

                <button
                  type="button"
                  className="unichat-btn unichat-btn--primary"
                  disabled={flashcardIdx === flashcards.length - 1}
                  onClick={() => {
                    setIsFlipped(false);
                    setFlashcardIdx((p) => p + 1);
                  }}
                >
                  Thẻ tiếp <span className="material-symbols-outlined">chevron_right</span>
                </button>
              </div>

              <div className="unichat-modal-footer-bar">
                <button
                  type="button"
                  className="unichat-save-btn unichat-save-btn--modal"
                  onClick={() =>
                    handleTriggerSave(
                      '🎴 Bộ Thẻ Ghi Nhớ Khái Niệm',
                      flashcards
                        .map((f) => `- **${f.term}**: ${f.definition}\n  \`Ví dụ\`: ${f.example}`)
                        .join('\n\n')
                    )
                  }
                >
                  <span className="material-symbols-outlined">push_pin</span>
                  <span>Lưu Toàn Bộ {flashcards.length} Thẻ vào Sổ Ghi Chú</span>
                </button>
              </div>
            </div>
          )}

          {/* TOOL 4: INTERACTIVE QUIZ TEST ENGINE */}
          {toolType === 'QUIZ' && (
            <div className="unichat-modal-quiz">
              {/* Question Navigation Pills */}
              <div className="unichat-quiz-pills">
                {quizQuestions.map((q, idx) => {
                  const isAnswered = userAnswers[q.id] !== undefined;
                  return (
                    <button
                      key={q.id}
                      type="button"
                      className={`unichat-quiz-pill ${activeQuizQIdx === idx ? 'unichat-quiz-pill--active' : ''} ${
                        isAnswered ? 'unichat-quiz-pill--answered' : ''
                      }`}
                      onClick={() => setActiveQuizQIdx(idx)}
                    >
                      Câu {q.id} {isAnswered && '✓'}
                    </button>
                  );
                })}
              </div>

              {/* Quiz Card */}
              {(() => {
                const currentQ = quizQuestions[activeQuizQIdx];
                if (!currentQ) return null;
                const selectedIdx = userAnswers[currentQ.id];
                const isAnswered = selectedIdx !== undefined;
                const isCorrect = selectedIdx === currentQ.correctAnswerIdx;

                return (
                  <div className="unichat-modal-quiz-card">
                    <div className="unichat-modal-quiz-card__title">
                      <strong>Câu {currentQ.id}:</strong> {currentQ.question}
                    </div>

                    <div className="unichat-modal-quiz-card__options">
                      {currentQ.options.map((opt, optIdx) => {
                        const isOptionSelected = selectedIdx === optIdx;
                        const isOptionCorrect = optIdx === currentQ.correctAnswerIdx;
                        let optionClass = 'unichat-quiz-option';
                        if (isAnswered) {
                          if (isOptionCorrect) optionClass += ' unichat-quiz-option--correct';
                          else if (isOptionSelected) optionClass += ' unichat-quiz-option--wrong';
                        }

                        return (
                          <button
                            key={optIdx}
                            type="button"
                            className={optionClass}
                            onClick={() =>
                              setUserAnswers((prev) => ({
                                ...prev,
                                [currentQ.id]: optIdx,
                              }))
                            }
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>

                    {isAnswered && (
                      <div
                        className={`unichat-quiz-explain ${
                          isCorrect ? 'unichat-quiz-explain--correct' : 'unichat-quiz-explain--wrong'
                        }`}
                      >
                        <span className="material-symbols-outlined">
                          {isCorrect ? 'check_circle' : 'cancel'}
                        </span>
                        <span>{currentQ.explanation}</span>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Footer Bar */}
              <div className="unichat-modal-footer-bar">
                <div className="unichat-slides-controls">
                  <button
                    type="button"
                    className="unichat-btn"
                    disabled={activeQuizQIdx === 0}
                    onClick={() => setActiveQuizQIdx((p) => p - 1)}
                  >
                    <span className="material-symbols-outlined">chevron_left</span> Câu trước
                  </button>
                  <button
                    type="button"
                    className="unichat-btn unichat-btn--primary"
                    disabled={activeQuizQIdx === quizQuestions.length - 1}
                    onClick={() => setActiveQuizQIdx((p) => p + 1)}
                  >
                    Câu tiếp <span className="material-symbols-outlined">chevron_right</span>
                  </button>
                </div>

                <button
                  type="button"
                  className="unichat-save-btn unichat-save-btn--modal"
                  onClick={() => {
                    const correctCount = Object.entries(userAnswers).filter(
                      ([qId, ansIdx]) =>
                        quizQuestions.find((q) => q.id === Number(qId))?.correctAnswerIdx === ansIdx
                    ).length;
                    handleTriggerSave(
                      `✍️ Kết Quả Kiểm Tra Trắc Nghiệm (${correctCount}/${quizQuestions.length} Đúng)`,
                      quizQuestions
                        .map(
                          (q) =>
                            `- **Câu ${q.id}**: ${q.question}\n  *Đáp án đúng*: ${q.options[q.correctAnswerIdx]}\n  *Giải thích*: ${q.explanation}`
                        )
                        .join('\n\n')
                    );
                  }}
                >
                  <span className="material-symbols-outlined">push_pin</span>
                  <span>Lưu Kết Quả Kiểm Tra vào Sổ Ghi Chú</span>
                </button>
              </div>
            </div>
          )}

          {/* TOOL 5: MERMAID MINDMAP DIAGRAM STUDIO */}
          {toolType === 'MINDMAP' && (
            <div className="unichat-modal-mindmap">
              {mindmapPhase === 'INPUT' ? (
                /* ── Input Phase: topic/prompt form ── */
                <div className="unichat-mindmap-input">
                  <div className="unichat-mindmap-input__source">
                    <span className="unichat-mindmap-input__source-label">Nguồn tri thức</span>
                    <div className="unichat-mindmap-input__source-badge">
                      <span className="material-symbols-outlined">folder_open</span>
                      <span>{workspaceName}</span>
                      {answerContent && (
                        <span className="unichat-mindmap-input__source-extra">
                          + câu trả lời AI gần nhất
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="unichat-mindmap-input__field">
                    <label
                      className="unichat-mindmap-input__label"
                      htmlFor="mindmap-prompt"
                    >
                      Chủ đề sơ đồ tư duy
                    </label>
                    <textarea
                      id="mindmap-prompt"
                      className="unichat-mindmap-input__textarea"
                      placeholder="Nhập chủ đề hoặc yêu cầu tùy chỉnh..."
                      value={mindmapPrompt}
                      onChange={(e) => setMindmapPrompt(e.target.value)}
                      rows={4}
                    />
                  </div>

                  <div className="unichat-mindmap-input__suggestions">
                    <span className="unichat-mindmap-input__suggestions-title">Những điều nên thử</span>
                    <ul className="unichat-mindmap-input__suggestions-list">
                      <li
                        onClick={() => setMindmapPrompt('Tổng quan toàn bộ nội dung tài liệu trong workspace')}
                      >
                        Tạo sơ đồ tổng quan toàn bộ nội dung tài liệu
                      </li>
                      <li
                        onClick={() => setMindmapPrompt('Phân tích mối liên hệ giữa các khái niệm chính')}
                      >
                        Phân tích mối liên hệ giữa các khái niệm chính
                      </li>
                      <li
                        onClick={() => setMindmapPrompt('Tóm tắt các chương và mục quan trọng nhất')}
                      >
                        Tóm tắt các chương và mục quan trọng nhất
                      </li>
                    </ul>
                  </div>

                  <div className="unichat-mindmap-input__actions">
                    <button
                      type="button"
                      className="unichat-btn unichat-btn--primary unichat-mindmap-input__create-btn"
                      onClick={handleGenerateMindmap}
                    >
                      <span className="material-symbols-outlined">schema</span>
                      <span>Tạo Sơ Đồ</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* ── Result Phase: rendered diagram ── */
                <>
                  <div className="unichat-mindmap-result-bar">
                    <button
                      type="button"
                      className="unichat-back-btn"
                      onClick={() => setMindmapPhase('INPUT')}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>arrow_back</span>
                      <span>Thay đổi chủ đề</span>
                    </button>
                    {mindmapPrompt && (
                      <span className="unichat-mindmap-result-bar__topic" title={mindmapPrompt}>
                        {mindmapPrompt.length > 50 ? mindmapPrompt.slice(0, 47) + '...' : mindmapPrompt}
                      </span>
                    )}
                  </div>

                  <div className="unichat-modal-mindmap__canvas">
                    <MermaidDiagram chart={mindmapCode} />
                  </div>

                  <div className="unichat-modal-footer-bar">
                    <button
                      type="button"
                      className="unichat-save-btn unichat-save-btn--modal"
                      onClick={() => handleTriggerSave('🧠 Sơ Đồ Tư Duy Mermaid', mindmapCode)}
                    >
                      <span className="material-symbols-outlined">push_pin</span>
                      <span>Lưu Sơ Đồ Tư Duy vào Sổ Ghi Chú</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {toolType === 'REPORT' && (
            <div className="unichat-modal-report">
              <div className="unichat-report-paper">
                <div className="unichat-report-paper__cover">
                  <span className="unichat-report-paper__badge">BÁO CÁO HỌC THUẬT RAG</span>
                  <h2 className="unichat-report-paper__title">{reportData.title}</h2>
                  <span className="unichat-report-paper__meta">{reportData.meta}</span>
                </div>

                {reportData.sections.map((section, idx) => (
                  <div key={idx} className="unichat-report-paper__section">
                    <h3>{idx + 1}. {section.heading}</h3>
                    <p style={{ whiteSpace: 'pre-line' }}>{section.content}</p>
                  </div>
                ))}

                {reportData.citations.length > 0 && (
                  <div className="unichat-report-paper__section">
                    <h3>{reportData.sections.length + 1}. Trích Dẫn & Bằng Chứng Tài Liệu</h3>
                    <ul className="unichat-report-citations-list">
                      {reportData.citations.map((cit, idx) => (
                        <li key={idx}>{cit.label} <em>{cit.detail}</em></li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="unichat-modal-footer-bar">
                <button
                  type="button"
                  className="unichat-save-btn unichat-save-btn--modal"
                  onClick={() =>
                    handleTriggerSave(
                      '📝 Báo Cáo Tổng Hợp Tri Thức',
                      `# ${reportData.title}\n*${reportData.meta}*\n\n---\n\n` +
                      reportData.sections
                        .map((s, i) => `### ${i + 1}. ${s.heading}\n${s.content}`)
                        .join('\n\n') +
                      (reportData.citations.length > 0
                        ? `\n\n### Trích Dẫn\n` + reportData.citations.map((c) => `- ${c.label} ${c.detail}`).join('\n')
                        : '')
                    )
                  }
                >
                  <span className="material-symbols-outlined">push_pin</span>
                  <span>Lưu Báo Cáo Học Thuật vào Sổ Ghi Chú</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
