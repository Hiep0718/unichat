import {
  countReady,
  duplicatedNames,
  fileKind,
  isDuplicatedName,
  isReadyForAssistant,
  presentStatus,
} from '../../../src/features/documents/document-status';

import type {
  DocumentItem,
  DocumentStatus,
} from '../../../src/features/workspaces/workspace-types';

/** Một tài liệu chỉ mang những trường mà các hàm này thật sự đọc. */
function doc(status: DocumentStatus, name = 'tep.pdf'): DocumentItem {
  return {
    id: name + status,
    name,
    mimeType: 'application/pdf',
    fileSizeBytes: 1024,
    status,
    createdAt: '2026-09-07T00:00:00Z',
  };
}

const EVERY_STATUS: DocumentStatus[] = [
  'PENDING_APPROVAL', 'REJECTED', 'PENDING', 'PROCESSING', 'PROCESSED', 'FAILED', 'DELETING',
];

describe('presentStatus', () => {
  it('should report a processed file as one the assistant can use', () => {
    // Arrange, Act
    const shown = presentStatus('PROCESSED');

    // Assert
    expect(shown.label).toBe('Sẵn sàng cho AI');
    expect(shown.tone).toBe('ready');
  });

  it('should no longer read a processed file as still waiting', () => {
    // Arrange, Act: màn Tệp từng so khớp 'COMPLETED', một giá trị Core API
    // chưa bao giờ gửi, nên mọi tệp đã xong đều rơi vào nhánh mặc định và
    // hiện "Đang chờ".
    const shown = presentStatus('PROCESSED');

    // Assert
    expect(shown.label).not.toBe('Đang chờ');
    expect(shown.tone).not.toBe('working');
  });

  it('should give every status the Core API sends a label of its own', () => {
    // Arrange, Act, Assert
    const labels = EVERY_STATUS.map((status) => presentStatus(status).label);
    expect(labels.every((label) => label.length > 0)).toBe(true);
    expect(labels).not.toContain('Không rõ');
  });

  it('should keep a failed file distinct from one still working', () => {
    // Arrange, Act, Assert: gộp hai cái này lại là bảo người ta chờ một thứ
    // đã dừng hẳn.
    expect(presentStatus('FAILED').tone).toBe('blocked');
    expect(presentStatus('PROCESSING').tone).toBe('working');
    expect(presentStatus('FAILED').label).not.toBe(presentStatus('PROCESSING').label);
  });

  it('should treat only PROCESSED as ready', () => {
    // Arrange, Act, Assert
    for (const status of EVERY_STATUS) {
      expect(isReadyForAssistant(status)).toBe(status === 'PROCESSED');
    }
  });

  it('should show an unrecognised status as unknown rather than as ready', () => {
    // Arrange, Act: một trạng thái thêm ở server trước khi client biết tới
    // không được phép đọc ra "trợ lý dùng được".
    const shown = presentStatus('COMPLETED' as DocumentStatus);

    // Assert
    expect(shown.label).toBe('Không rõ');
    expect(shown.tone).toBe('blocked');
  });
});

describe('countReady', () => {
  it('should count the files the assistant can actually read', () => {
    // Arrange: màn hình được dựng cho mockup này hiện 5/6.
    const documents = [
      doc('PROCESSED', 'a.pdf'), doc('PROCESSED', 'b.pdf'), doc('PROCESSED', 'c.pdf'),
      doc('PROCESSED', 'd.pdf'), doc('PROCESSED', 'e.pdf'), doc('PROCESSING', 'f.pdf'),
    ];

    // Act
    const { ready, total } = countReady(documents);

    // Assert
    expect(ready).toBe(5);
    expect(total).toBe(6);
  });

  it('should not count a failed file as ready', () => {
    // Arrange, Act
    const { ready, total } = countReady([doc('FAILED'), doc('PROCESSED', 'ok.pdf')]);

    // Assert
    expect(ready).toBe(1);
    expect(total).toBe(2);
  });

  it('should report nothing for a group with no files', () => {
    // Arrange, Act
    const { ready, total } = countReady([]);

    // Assert
    expect(ready).toBe(0);
    expect(total).toBe(0);
  });
});

describe('duplicatedNames', () => {
  it('should flag a name two files share', () => {
    // Arrange
    const documents = [
      doc('PROCESSED', '00_Chapter_Overview_Subject.pdf'),
      doc('PROCESSED', '00_Chapter_Overview_Subject.pdf'),
      doc('PROCESSED', '01_Chapter_Introducing_Data_Modeling.pdf'),
    ];

    // Act
    const duplicates = duplicatedNames(documents);

    // Assert
    expect(isDuplicatedName('00_Chapter_Overview_Subject.pdf', duplicates)).toBe(true);
    expect(isDuplicatedName('01_Chapter_Introducing_Data_Modeling.pdf', duplicates)).toBe(false);
  });

  it('should treat names differing only in case or spacing as the same', () => {
    // Arrange, Act
    const duplicates = duplicatedNames([doc('PROCESSED', 'Bai.pdf'), doc('PROCESSED', 'bai.pdf ')]);

    // Assert
    expect(isDuplicatedName('Bai.pdf', duplicates)).toBe(true);
  });

  it('should flag nothing when every name is distinct', () => {
    // Arrange, Act
    const duplicates = duplicatedNames([doc('PROCESSED', 'a.pdf'), doc('PROCESSED', 'b.pdf')]);

    // Assert
    expect(duplicates.size).toBe(0);
  });
});

describe('fileKind', () => {
  it('should name a PDF by its extension', () => {
    expect(fileKind('application/pdf')).toBe('PDF');
  });

  it('should render the Word type as DOCX rather than its full subtype', () => {
    expect(
      fileKind('application/vnd.openxmlformats-officedocument.wordprocessingml.document'),
    ).toBe('DOCX');
  });

  it('should render plain text as TXT', () => {
    expect(fileKind('text/plain')).toBe('TXT');
  });

  it('should fall back to the whole type when there is no subtype', () => {
    expect(fileKind('application')).toBe('APPLICATION');
  });
});
