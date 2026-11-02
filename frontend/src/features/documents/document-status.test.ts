import { describe, expect, it } from 'vitest';

import {
  countReady,
  duplicatedNames,
  fileKind,
  isDuplicatedName,
  isReadyForAssistant,
  presentStatus,
} from './document-status';

import type { DocumentResponse, DocumentStatus } from './document-api';

/** A document carrying only the fields these functions actually read. */
function doc(status: DocumentStatus, originalName = 'tep.pdf'): DocumentResponse {
  return {
    id: originalName + status,
    workspaceId: 'w1',
    storageKey: 'k',
    originalName,
    mediaType: 'application/pdf',
    byteSize: 1024,
    sha256: 'x',
    status,
    ingestionVersion: 1,
    pageOrBlockCount: 1,
    version: 1,
    createdAt: '2026-09-07T00:00:00Z',
    updatedAt: '2026-09-07T00:00:00Z',
    uploadedBy: null,
    uploadedByEmail: null,
    approvedBy: null,
    approvedAt: null,
    rejectionReason: null,
  } as DocumentResponse;
}

const EVERY_STATUS: DocumentStatus[] = [
  'PENDING_APPROVAL', 'REJECTED', 'PENDING', 'PROCESSING', 'PROCESSED', 'FAILED', 'DELETING',
];

describe('presentStatus', () => {
  it('should say a processed file is usable by the assistant', () => {
    // Arrange, Act
    const shown = presentStatus('PROCESSED');

    // Assert
    expect(shown.label).toBe('Sẵn sàng cho AI');
    expect(shown.tone).toBe('ready');
  });

  it('should name every state in words rather than pipeline vocabulary', () => {
    // Arrange, Act, Assert: the table used to print "Vector DB Ready" and
    // "Tách Vector...", which name the machinery, not the answer.
    for (const status of EVERY_STATUS) {
      const { label } = presentStatus(status);
      expect(label).not.toMatch(/Vector/i);
      expect(label.length).toBeGreaterThan(0);
    }
  });

  it('should keep a failed file distinct from one still working', () => {
    // Arrange, Act, Assert: collapsing these would tell someone to wait for
    // something that already stopped.
    expect(presentStatus('FAILED').tone).toBe('blocked');
    expect(presentStatus('PROCESSING').tone).toBe('working');
    expect(presentStatus('FAILED').label).not.toBe(presentStatus('PROCESSING').label);
  });

  it('should keep a rejected contribution distinct from one awaiting a decision', () => {
    // Arrange, Act, Assert
    expect(presentStatus('REJECTED').label).toBe('Bị từ chối');
    expect(presentStatus('PENDING_APPROVAL').label).toBe('Chờ duyệt');
  });

  it('should treat only PROCESSED as ready', () => {
    // Arrange, Act, Assert
    for (const status of EVERY_STATUS) {
      expect(isReadyForAssistant(status)).toBe(status === 'PROCESSED');
    }
  });

  it('should show an unrecognised state as unknown rather than as ready', () => {
    // Arrange, Act: a state added server-side before the client learns it must
    // not read as "the assistant can use this".
    const shown = presentStatus('SOMETHING_NEW' as DocumentStatus);

    // Assert
    expect(shown.label).toBe('Không rõ');
    expect(shown.tone).toBe('blocked');
  });
});

describe('countReady', () => {
  it('should count the files the assistant can actually read', () => {
    // Arrange: the screen this was written for shows 5 of 6.
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

  it('should not count a file that failed as ready', () => {
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
    // Arrange: the screen this was written for has two files called
    // 00_Chapter_Overview_Subject.pdf.
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
    // Arrange, Act: a reader cannot tell "Bai.pdf" from "bai.pdf " apart in a
    // list either.
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
    // Arrange, Act, Assert
    expect(fileKind('application/pdf')).toBe('PDF');
  });

  it('should render the Word type as DOCX rather than its full subtype', () => {
    // Arrange, Act: the real subtype says DOCX to nobody.
    const kind = fileKind(
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    );

    // Assert
    expect(kind).toBe('DOCX');
  });

  it('should render plain text as TXT', () => {
    // Arrange, Act, Assert
    expect(fileKind('text/plain')).toBe('TXT');
  });

  it('should fall back to the whole type when there is no subtype', () => {
    // Arrange, Act, Assert
    expect(fileKind('application')).toBe('APPLICATION');
  });
});
