import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { MermaidDiagram } from './mermaid-diagram';
import './knowledge-studio-modal.css';

interface Flashcard {
  id: number;
  term: string;
  definition: string;
  example: string;
  isMastered?: boolean;
}

interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctAnswerIdx: number;
  explanation: string;
}

interface SlideItem {
  id: number;
  title: string;
  subtitle: string;
  points: string[];
  speakerNotes: string;
}

interface KnowledgeStudioModalProps {
  toolType: 'PODCAST' | 'FLASHCARDS' | 'QUIZ' | 'MINDMAP' | 'SLIDES' | 'REPORT';
  workspaceName?: string | undefined;
  onClose: () => void;
  onSaveNote: (title: string, content: string) => void;
}

export const KnowledgeStudioModal: React.FC<KnowledgeStudioModalProps> = ({
  toolType,
  workspaceName = 'Kho tri thức',
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

  // Mindmap Zoom level
  const [mindmapZoom, setMindmapZoom] = useState(1);

  // Saved Toast Message
  const [savedToastMsg, setSavedToastMsg] = useState<string | null>(null);

  // Slides Data
  const slides = useMemo<SlideItem[]>(() => [
    {
      id: 1,
      title: `Tổng quan Kho Tri Thức ${workspaceName}`,
      subtitle: 'Nền tảng Kỹ nghệ Phần mềm & Kiến trúc Hệ thống',
      points: [
        'Tổng hợp các nguyên lý Kỹ nghệ Phần mềm cốt lõi trong hệ thống.',
        'Mục tiêu thuyết trình: Nắm vững OOP, CSDL quan hệ và các mẫu thiết kế.',
        'Cung cấp góc nhìn thực tiễn về ứng dụng mô hình RAG vào quản lý tri thức.',
      ],
      speakerNotes: 'Kính chào quý thầy cô và các bạn. Trong slide mở đầu này, tôi xin giới thiệu tổng quan về phạm vi nghiên cứu và các nguyên lý phần mềm được đóng gói trong kho tri thức.',
    },
    {
      id: 2,
      title: 'Bốn Trụ Cột Lập Trình Hướng Đối Tượng',
      subtitle: 'Encapsulation, Inheritance, Polymorphism, Abstraction',
      points: [
        'Tính Đóng Gói: Che giấu trạng thái nội bộ, bảo vệ thuộc tính với phạm vi private.',
        'Tính Kế Thừa: Tái sử dụng mã nguồn, thiết lập quan hệ cha-con (IS-A).',
        'Tính Đa Hình: Xử lý linh hoạt các đối tượng cùng giao diện qua Overriding.',
        'Tính Trừu Tượng: Ẩn chi tiết phức tạp, định nghĩa khung hợp đồng hành vi.',
      ],
      speakerNotes: 'Đây là 4 trụ cột quan trọng nhất của OOP. Hãy chú ý đến tính Đóng gói và Đa hình - hai yếu tố trực tiếp quyết định khả năng mở rộng và bảo trì của dự án.',
    },
    {
      id: 3,
      title: 'Chuẩn Hóa Dữ Liệu & Thiết Kế CSDL Quan Hệ',
      subtitle: 'Tối ưu hóa bảng dữ liệu từ 1NF đến 3NF',
      points: [
        '1NF: Đảm bảo thuộc tính nguyên tố, không chứa mảng/danh sách lặp.',
        '2NF: Loại bỏ phụ thuộc một phần vào khóa chính phức hợp.',
        '3NF: Loại bỏ phụ thuộc bắc cầu giữa các thuộc tính không khóa.',
      ],
      speakerNotes: 'Việc đưa CSDL về dạng chuẩn 3NF giúp loại bỏ hoàn toàn dư thừa dữ liệu và hạn chế tối đa các lỗi bất thường khi Insert, Update, Delete.',
    },
    {
      id: 4,
      title: 'Tổng Kết & Định Hướng Phát Triển',
      subtitle: 'Tích hợp mô hình vào sản phẩm thực tế',
      points: [
        'Áp dụng thành công các nguyên tắc SOLID vào mô hình hóa phần mềm.',
        'Kết hợp tìm kiếm tri thức tự động (RAG) giúp nâng cao hiệu suất làm việc.',
        'Định hướng: Mở rộng khả năng xử lý truy vấn đa phương thức và đồ thị tri thức.',
      ],
      speakerNotes: 'Tóm lại, việc kết hợp kiến trúc OOP vững chắc cùng công nghệ RAG mang lại giải pháp quản trị tri thức tối ưu cho doanh nghiệp và giáo dục.',
    },
  ], [workspaceName]);

  // Flashcards Dataset
  const flashcards = useMemo<Flashcard[]>(() => [
    {
      id: 1,
      term: 'Tính Đóng gói (Encapsulation)',
      definition: 'Che giấu dữ liệu riêng của lớp (dùng private) và chỉ cho phép truy xuất qua getter/setter public. Giúp bảo mật và dễ bảo trì.',
      example: 'private String password; public String getPassword() { return password; }',
    },
    {
      id: 2,
      term: 'Tính Đa hình (Polymorphism)',
      definition: 'Cho phép các đối tượng thuộc các lớp khác nhau thực thi cùng một phương thức theo các cách khác nhau (Overriding/Overloading).',
      example: 'Shape s = new Circle(); s.draw(); // Gọi hàm draw() của Circle',
    },
    {
      id: 3,
      term: 'Interface vs Abstract Class',
      definition: 'Abstract class có thể chứa thuộc tính & phương thức có thân bài; Interface định nghĩa khuôn mẫu hành vi thuần túy.',
      example: 'public interface Flyable { void fly(); }',
    },
    {
      id: 4,
      term: 'Chuẩn hóa Dữ liệu (1NF -> 3NF)',
      definition: 'Tổ chức dữ liệu loại bỏ dư thừa và phụ thuộc không hợp lý, đảm bảo toàn vẹn dữ liệu trong CSDL quan hệ.',
      example: 'Tách bảng Orders thành Orders(OrderID, CustomerID) và OrderDetails(OrderID, ProductID, Quantity)',
    },
  ], []);

  // Quiz Dataset
  const quizQuestions = useMemo<QuizQuestion[]>(() => [
    {
      id: 1,
      question: 'Tính chất nào trong LTHĐT giúp che giấu dữ liệu nội bộ và ngăn truy cập trực tiếp từ bên ngoài?',
      options: ['A. Kế thừa (Inheritance)', 'B. Đóng gói (Encapsulation)', 'C. Đa hình (Polymorphism)', 'D. Trừu tượng (Abstraction)'],
      correctAnswerIdx: 1,
      explanation: 'Tính Đóng gói sử dụng phạm vi truy cập private để bảo vệ thuộc tính khỏi sự thay đổi trực tiếp từ bên ngoài.',
    },
    {
      id: 2,
      question: 'Trong Java, một lớp có thể kế thừa trực tiếp bao nhiêu lớp cơ sở?',
      options: ['A. Chỉ 1 lớp duy nhất', 'B. Tối đa 2 lớp', 'C. Không giới hạn', 'D. Tùy thuộc vào Interface'],
      correctAnswerIdx: 0,
      explanation: 'Java chỉ hỗ trợ đơn kế thừa lớp (Single Inheritance) nhằm tránh xung đột cấu trúc phương thức.',
    },
    {
      id: 3,
      question: 'Mục tiêu chính của chuẩn hóa CSDL đến dạng chuẩn 3NF là gì?',
      options: ['A. Tăng tốc độ ghi dữ liệu', 'B. Loại bỏ phụ thuộc bắc cầu và dư thừa dữ liệu', 'C. Tạo nhiều bảng nhất có thể', 'D. Mã hóa tài khoản người dùng'],
      correctAnswerIdx: 1,
      explanation: 'Dạng chuẩn 3NF loại bỏ phụ thuộc bắc cầu giữa các thuộc tính không khóa chính.',
    },
  ], []);

  // Mindmap Mermaid Code
  const mindmapMermaidCode = useMemo(() => {
    return `mindmap
  root(("Kho Tri Thức ${workspaceName}"))
    "Lập Trình Hướng Đối Tượng"
      "Tính Đóng Gói (Encapsulation)"
        "Phạm vi Private"
        "Phương thức Getter Setter"
      "Tính Đa Hình (Polymorphism)"
        "Ghi đè phương thức (Overriding)"
        "Nạp chồng phương thức (Overloading)"
      "Kế Thừa (Inheritance)"
        "Single Inheritance"
        "Interface Multiple"
    "Cơ Sở Dữ Liệu"
      "Dạng Chuẩn 1NF 2NF 3NF"
      "Ràng Buộc Khóa Chính Khóa Ngoại"`;
  }, [workspaceName]);

  // Audio Podcast Dialog Lines
  const podcastDialogLines = useMemo(() => [
    { host: 'Host A (Nam)', avatar: 'record_voice_over', text: `Chào mừng các bạn đến với bản tin Podcast Tri Thức UniChat! Hôm nay chúng ta sẽ bóc tách các khái niệm cốt lõi trong kho tri thức ${workspaceName}.` },
    { host: 'Host B (Nữ)', avatar: 'graphic_eq', text: 'Đúng vậy! Tài liệu này trình bày rất chi tiết về 4 đặc trưng của Lập trình hướng đối tượng và nguyên lý thiết kế CSDL quan hệ.' },
    { host: 'Host A (Nam)', avatar: 'record_voice_over', text: 'Bạn có thể giải thích ngắn gọn tính Đóng gói giúp tăng độ bảo mật phần mềm như thế nào không?' },
    { host: 'Host B (Nữ)', avatar: 'graphic_eq', text: 'Rất đơn giản! Dữ liệu nội bộ được bảo vệ bằng keyword private, chỉ được truy cập qua getter/setter hợp lệ, ngăn chặn sửa đổi bất hợp pháp.' },
  ], [workspaceName]);

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
        {/* Header */}
        <div className="unichat-studio-modal__header">
          <div className="unichat-studio-modal__title-group">
            <span className="material-symbols-outlined unichat-studio-modal__icon">{toolMeta.icon}</span>
            <div>
              <h3 className="unichat-studio-modal__title">{toolMeta.title}</h3>
              <span className="unichat-studio-modal__subtitle">{workspaceName}</span>
            </div>
          </div>

          <div className="unichat-studio-modal__header-actions">
            <span className="unichat-studio-modal__badge">{toolMeta.badge}</span>
            <button type="button" className="unichat-studio-modal__close-btn" onClick={onClose} title="Đóng modal">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
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
                    <code className="unichat-modal-card-flip__code">{flashcards[flashcardIdx]?.example}</code>
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
              <div className="unichat-mindmap-toolbar">
                <div className="unichat-mindmap-toolbar__group">
                  <button
                    type="button"
                    className="unichat-icon-btn"
                    onClick={() => setMindmapZoom((z) => Math.min(z + 0.2, 2))}
                    title="Phóng to"
                  >
                    <span className="material-symbols-outlined">zoom_in</span>
                  </button>
                  <button
                    type="button"
                    className="unichat-icon-btn"
                    onClick={() => setMindmapZoom((z) => Math.max(z - 0.2, 0.5))}
                    title="Thu nhỏ"
                  >
                    <span className="material-symbols-outlined">zoom_out</span>
                  </button>
                  <button
                    type="button"
                    className="unichat-icon-btn"
                    onClick={() => setMindmapZoom(1)}
                    title="Đặt lại zoom"
                  >
                    <span className="material-symbols-outlined">restart_alt</span>
                  </button>
                </div>
                <span className="unichat-mindmap-zoom-label">{Math.round(mindmapZoom * 100)}%</span>
              </div>

              <div
                className="unichat-modal-mindmap__canvas"
                style={{ transform: `scale(${mindmapZoom})`, transformOrigin: 'top center' }}
              >
                <MermaidDiagram chart={mindmapMermaidCode} />
              </div>

              <div className="unichat-modal-footer-bar">
                <button
                  type="button"
                  className="unichat-save-btn unichat-save-btn--modal"
                  onClick={() => handleTriggerSave('🧠 Sơ Đồ Tư Duy Mermaid', mindmapMermaidCode)}
                >
                  <span className="material-symbols-outlined">push_pin</span>
                  <span>Lưu Sơ Đồ Tư Duy vào Sổ Ghi Chú</span>
                </button>
              </div>
            </div>
          )}

          {/* TOOL 6: ACADEMIC STUDY REPORT */}
          {toolType === 'REPORT' && (
            <div className="unichat-modal-report">
              <div className="unichat-report-paper">
                <div className="unichat-report-paper__cover">
                  <span className="unichat-report-paper__badge">BÁO CÁO HỌC THUẬT RAG</span>
                  <h2 className="unichat-report-paper__title">Báo Cáo Tổng Hợp Tri Thức: {workspaceName}</h2>
                  <span className="unichat-report-paper__meta">Ngày lập: {new Date().toLocaleDateString('vi-VN')} | Đơn vị: UniChat Knowledge Engine</span>
                </div>

                <div className="unichat-report-paper__section">
                  <h3>1. Tóm Tắt Tổng Quan (Executive Summary)</h3>
                  <p>
                    Kho tri thức cung cấp cái nhìn toàn diện về phương pháp luận Kỹ nghệ Phần mềm và Lập trình Hướng đối tượng (OOP). Nội dung tập trung giải thích các khái niệm nền tảng như Lớp (Class), Đối tượng (Object), Đóng gói, Kế thừa và Đa hình.
                  </p>
                </div>

                <div className="unichat-report-paper__section">
                  <h3>2. Phân Tích Chuyên Sâu Các Nguyên Lý Cốt Lõi</h3>
                  <div className="unichat-report-callout unichat-report-callout--info">
                    <strong>💡 Key Finding:</strong> Tính Đóng Gói (Encapsulation) đảm bảo tính toàn vẹn dữ liệu bằng cách hạn chế quyền truy cập trực tiếp từ bên ngoài qua phạm vi <code>private</code>.
                  </div>
                  <div className="unichat-report-callout unichat-report-callout--success">
                    <strong>⚡ Architectural Advantage:</strong> Tính Đa Hình (Polymorphism) cho phép gọi cùng một phương thức nhưng thực thi theo cơ chế khác nhau tùy thuộc vào lớp thực thể.
                  </div>
                </div>

                <div className="unichat-report-paper__section">
                  <h3>3. Bảng So Sánh Cấu Trúc Trừu Tượng</h3>
                  <table className="unichat-report-table">
                    <thead>
                      <tr>
                        <th>Khái niệm</th>
                        <th>Mức độ trừu tượng</th>
                        <th>Mục đích chính</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td><strong>Abstract Class</strong></td>
                        <td>Trừu tượng một phần</td>
                        <td>Định nghĩa khung lớp chung & tái sử dụng mã nguồn</td>
                      </tr>
                      <tr>
                        <td><strong>Interface</strong></td>
                        <td>Trừu tượng hoàn toàn</td>
                        <td>Quy định chuẩn giao tiếp / hợp đồng hành vi</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="unichat-report-paper__section">
                  <h3>4. Trích Dẫn & Bằng Chứng Tài Liệu</h3>
                  <ul className="unichat-report-citations-list">
                    <li>[1] <em>OOP_01_Tong_Quan_LTHDT.pdf</em> - Trang 12-18 (Độ tin cậy 95%)</li>
                    <li>[2] <em>OOP_02_Java_can_ban.pdf</em> - Trang 45-50 (Độ tin cậy 91%)</li>
                  </ul>
                </div>
              </div>

              <div className="unichat-modal-footer-bar">
                <button
                  type="button"
                  className="unichat-save-btn unichat-save-btn--modal"
                  onClick={() =>
                    handleTriggerSave(
                      '📝 Báo Cáo Tổng Hợp Tri Thức',
                      `# Báo Cáo Tổng Hợp Tri Thức: ${workspaceName}\n*Ngày lập: ${new Date().toLocaleDateString('vi-VN')} | Đơn vị: UniChat Knowledge Engine*\n\n---\n\n### 1. Tóm Tắt Tổng Quan (Executive Summary)\nKho tri thức cung cấp cái nhìn toàn diện về phương pháp luận Kỹ nghệ Phần mềm và Lập trình Hướng đối tượng (OOP). Nội dung tập trung giải thích các khái niệm nền tảng như Lớp (Class), Đối tượng (Object), Đóng gói, Kế thừa và Đa hình.\n\n### 2. Phân Tích Chuyên Sâu Các Nguyên Lý Cốt Lõi\n- 💡 **Key Finding**: Tính Đóng Gói (Encapsulation) đảm bảo tính toàn vẹn dữ liệu bằng cách hạn chế quyền truy cập trực tiếp từ bên ngoài qua phạm vi \`private\`.\n- ⚡ **Architectural Advantage**: Tính Đa Hình (Polymorphism) cho phép gọi cùng một phương thức nhưng thực thi theo cơ chế khác nhau tùy thuộc vào lớp thực thể.\n\n### 3. Bảng So Sánh Cấu Trúc Trừu Tượng\n| Khái niệm | Mức độ trừu tượng | Mục đích chính |\n| :--- | :--- | :--- |\n| **Abstract Class** | Trừu tượng một phần | Định nghĩa khung lớp chung & tái sử dụng mã nguồn |\n| **Interface** | Trừu tượng hoàn toàn | Quy định chuẩn giao tiếp / hợp đồng hành vi |\n\n### 4. Trích Dẫn & Bằng Chứng Tài Liệu\n- [1] *OOP_01_Tong_Quan_LTHDT.pdf* - Trang 12-18 (Độ tin cậy 95%)\n- [2] *OOP_02_Java_can_ban.pdf* - Trang 45-50 (Độ tin cậy 91%)`
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
