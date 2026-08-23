import React, { useMemo } from 'react';
import { DocumentResponse } from '../../documents/document-api';
import './chat-welcome.css';

interface ChatWelcomeProps {
  workspaceName?: string | undefined;
  documents?: DocumentResponse[] | undefined;
  onSelectPrompt: (prompt: string) => void;
}

interface SuggestedPrompt {
  icon: string;
  label: string;
  category: 'DEFINITION' | 'COMPARISON' | 'SUMMARY' | 'REASONING';
}

export const ChatWelcome: React.FC<ChatWelcomeProps> = ({
  workspaceName = 'Kho tri thức',
  documents = [],
  onSelectPrompt,
}) => {
  const nameLower = (workspaceName || '').toLowerCase();
  const docNames = documents.map((d) => d.originalName.toLowerCase()).join(' ');

  const isPM =
    nameLower.includes('dự án') ||
    nameLower.includes('project') ||
    nameLower.includes('quản lý') ||
    docNames.includes('itpm') ||
    docNames.includes('project');

  const isOOP =
    nameLower.includes('hướng đối tượng') ||
    nameLower.includes('oop') ||
    docNames.includes('oop') ||
    docNames.includes('java');

  const isDB =
    nameLower.includes('cơ sở dữ liệu') ||
    nameLower.includes('database') ||
    nameLower.includes('sql') ||
    docNames.includes('sql');

  const isNet =
    nameLower.includes('mạng') ||
    nameLower.includes('network') ||
    docNames.includes('network') ||
    docNames.includes('tcp');

  const overviewSummary = useMemo(() => {
    if (isOOP) {
      return 'Các tài liệu trong kho tri thức cung cấp một cái nhìn tổng quan toàn diện về phương pháp lập trình hướng đối tượng (OOP) thông qua việc so sánh với các kỹ thuật lập trình truyền thống. Nội dung tập trung giải thích các khái niệm nền tảng như Lớp (Class), Đối tượng (Object), cùng 4 đặc trưng cốt lõi: Tính Trừu tượng, Tính Đóng gói, Tính Kế thừa và Tính Đa hình. Hệ thống hỗ trợ bóc tách lý thuyết, thuật toán và sơ đồ cấu trúc từ nguồn tài liệu của bạn.';
    }
    if (isPM) {
      return 'Kho tri thức hợp nhất toàn bộ tài liệu chuyên môn về Quản lý dự án CNTT (ITPM), bao gồm các giai đoạn cốt lõi trong vòng đời phát triển dự án, so sánh phương pháp Agile/Scrum vs Waterfall, quy trình quản lý rủi ro và chỉ số kiểm soát chất lượng. Bạn có thể hỏi bất kỳ câu hỏi nào để AI phân tích và đưa ra giải pháp dự án thực tế.';
    }
    if (isDB) {
      return 'Kho tri thức tập hợp các chuyên đề về Cơ sở dữ liệu, quy tắc chuẩn hóa dữ liệu (1NF đến 3NF), tối ưu hóa câu lệnh truy vấn SQL và so sánh mô hình CSDL Quan hệ (RDBMS) vs NoSQL. Giúp bạn nhanh chóng giải đáp thắc mắc về thiết kế dữ liệu và tối ưu hiệu năng hệ thống.';
    }
    if (isNet) {
      return 'Tổng hợp toàn bộ tài liệu về Mạng máy tính & An toàn thông tin, bao gồm mô hình OSI 7 tầng, bộ giao thức TCP/IP, các cơ chế mã hóa bảo mật và phòng chống tấn công mạng. Giúp bạn bóc tách nguyên lý hoạt động và quy trình bảo mật mạng.';
    }
    return `Kho tri thức hợp nhất toàn bộ ${documents.length} tài liệu trong Workspace "${workspaceName}". Hệ thống Adaptive RAG hỗ trợ bạn tra cứu, tóm tắt khái niệm, so sánh phương pháp và suy luận chuyên sâu trực tiếp từ nội dung các tài liệu này.`;
  }, [isOOP, isPM, isDB, isNet, workspaceName, documents.length]);

  const suggestedPrompts = useMemo<SuggestedPrompt[]>(() => {
    if (isPM) {
      return [
        {
          icon: 'menu_book',
          label: 'Các giai đoạn cốt lõi trong vòng đời quản lý dự án (Project Lifecycle) là gì?',
          category: 'DEFINITION',
        },
        {
          icon: 'compare_arrows',
          label: 'So sánh phương pháp Quản lý dự án Agile/Scrum và phương pháp Waterfall',
          category: 'COMPARISON',
        },
        {
          icon: 'summarize',
          label: 'Tóm tắt các chỉ số đo lường hiệu quả (KPIs) và quy trình quản lý rủi ro dự án',
          category: 'SUMMARY',
        },
        {
          icon: 'psychology',
          label: 'Tại sao kỹ năng quản lý phạm vi (Scope Management) lại quyết định sự thành bại của dự án?',
          category: 'REASONING',
        },
      ];
    }

    if (isOOP) {
      return [
        {
          icon: 'menu_book',
          label: 'Lập trình hướng đối tượng (OOP) là gì và có mấy tính chất cơ bản?',
          category: 'DEFINITION',
        },
        {
          icon: 'compare_arrows',
          label: 'Phân biệt Interface và Abstract Class trong thiết kế phần mềm OOP',
          category: 'COMPARISON',
        },
        {
          icon: 'summarize',
          label: 'Tóm tắt các khái niệm Kế thừa (Inheritance) và Đa hình (Polymorphism) trong tri thức OOP',
          category: 'SUMMARY',
        },
        {
          icon: 'psychology',
          label: 'Tại sao tính Đóng gói (Encapsulation) giúp tăng tính bảo mật và bảo trì phần mềm?',
          category: 'REASONING',
        },
      ];
    }

    if (isDB) {
      return [
        {
          icon: 'menu_book',
          label: 'Chuẩn hóa dữ liệu (1NF, 2NF, 3NF) là gì và mục tiêu của chuẩn hóa?',
          category: 'DEFINITION',
        },
        {
          icon: 'compare_arrows',
          label: 'So sánh cơ sở dữ liệu quan hệ (RDBMS) và cơ sở dữ liệu NoSQL',
          category: 'COMPARISON',
        },
        {
          icon: 'summarize',
          label: 'Tóm tắt quy định giao dịch ACID và cơ chế Index trong cơ sở dữ liệu',
          category: 'SUMMARY',
        },
        {
          icon: 'psychology',
          label: 'Tại sao việc đánh chỉ mục (Indexing) giúp tăng tốc truy vấn nhưng lại làm chậm thao tác Ghi (Write)?',
          category: 'REASONING',
        },
      ];
    }

    const wsTitle = workspaceName || 'Kho tri thức';
    return [
      {
        icon: 'menu_book',
        label: `Định nghĩa và tổng quan các khái niệm lý thuyết nền tảng trong ${wsTitle}`,
        category: 'DEFINITION',
      },
      {
        icon: 'compare_arrows',
        label: `So sánh các phương pháp, quy trình và giải pháp chuyên môn trong ${wsTitle}`,
        category: 'COMPARISON',
      },
      {
        icon: 'summarize',
        label: `Tóm tắt toàn bộ nội dung kiến thức cốt lõi và các quy định quan trọng trong ${wsTitle}`,
        category: 'SUMMARY',
      },
      {
        icon: 'psychology',
        label: `Phân tích suy luận nâng cao và hướng dẫn ứng dụng thực tế từ kho tri thức ${wsTitle}`,
        category: 'REASONING',
      },
    ];
  }, [isPM, isOOP, isDB, workspaceName]);

  const todayStr = new Date().toLocaleDateString('vi-VN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="chat-welcome">
      <div className="chat-welcome__header">
        <h1 className="chat-welcome__title">
          Kho tri thức <span className="chat-welcome__title-ws">{workspaceName}</span>
        </h1>
        <div className="chat-welcome__meta">
          <span>📚 {documents.length} nguồn tài liệu</span>
          <span className="chat-welcome__dot">•</span>
          <span>Cập nhật {todayStr}</span>
        </div>
      </div>

      <div className="chat-welcome__overview">
        <p className="chat-welcome__overview-text">{overviewSummary}</p>
      </div>

      <div className="chat-welcome__suggestions-zone">
        <div className="chat-welcome__suggestions-label">
          <span className="material-symbols-outlined">tips_and_updates</span>
          <span>Gợi ý câu hỏi khám phá tri thức cho {workspaceName}:</span>
        </div>

        <div className="chat-welcome__grid">
          {suggestedPrompts.map((item, idx) => (
            <button
              key={idx}
              type="button"
              className="chat-welcome__card"
              onClick={() => onSelectPrompt(item.label)}
            >
              <div className="chat-welcome__card-icon">
                <span className="material-symbols-outlined">{item.icon}</span>
              </div>
              <div className="chat-welcome__card-content">
                <span className="chat-welcome__card-text">{item.label}</span>
                <span className="chat-welcome__card-tag">{item.category}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
