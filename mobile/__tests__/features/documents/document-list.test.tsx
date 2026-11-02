import React from 'react';
import { render } from '@testing-library/react-native';

import { DocumentList } from '../../../src/features/documents/document-list';

import type {
  DocumentItem,
  DocumentStatus,
} from '../../../src/features/workspaces/workspace-types';

let nextId = 0;

function doc(
  status: DocumentStatus,
  name: string,
  fileSizeBytes = 448_800,
  mimeType = 'application/pdf',
): DocumentItem {
  // Id riêng cho từng dòng: hai tệp trùng tên vẫn là hai hàng khác nhau, và
  // suy id từ tên sẽ làm chính bài kiểm tra trùng tên sinh ra key trùng.
  nextId += 1;
  return {
    id: `doc-${nextId}`,
    name,
    mimeType,
    fileSizeBytes,
    status,
    createdAt: '2026-09-07T00:00:00Z',
  };
}

function renderList(documents: DocumentItem[], onDelete?: (id: string) => void) {
  return render(
    <DocumentList
      documents={documents}
      refreshing={false}
      onRefresh={jest.fn()}
      onDelete={onDelete}
    />,
  );
}

describe('DocumentList', () => {
  it('should say a processed file is ready rather than still waiting', async () => {
    // Arrange, Act: trước đây nhánh badge so khớp 'COMPLETED', một giá trị Core
    // API chưa bao giờ gửi, nên mọi tệp đã xong đều hiện "Đang chờ".
    const { getByText, queryByText } = await renderList([
      doc('PROCESSED', '00_Chapter_Overview_Subject.pdf'),
    ]);

    // Assert
    expect(getByText('Sẵn sàng cho AI')).toBeTruthy();
    expect(queryByText('Đang chờ')).toBeNull();
  });

  it('should keep a working file distinct from a ready one', async () => {
    // Arrange, Act
    const { getByText } = await renderList([
      doc('PROCESSED', 'xong.pdf'),
      doc('PROCESSING', 'dang-chay.pdf'),
    ]);

    // Assert
    expect(getByText('Sẵn sàng cho AI')).toBeTruthy();
    expect(getByText('Đang xử lý')).toBeTruthy();
  });

  it('should show the kind beside the name', async () => {
    // Arrange, Act
    const { getByText } = await renderList([
      doc('PROCESSED', 'bai.pdf'),
      doc('PROCESSED', 'ghi-chu.txt', 2048, 'text/plain'),
    ]);

    // Assert
    expect(getByText('PDF')).toBeTruthy();
    expect(getByText('TXT')).toBeTruthy();
  });

  it('should warn when two files share a name', async () => {
    // Arrange, Act: người đang chọn xoá cái nào thì không còn cách phân biệt.
    const { getAllByText } = await renderList([
      doc('PROCESSED', '00_Chapter_Overview_Subject.pdf'),
      doc('PROCESSED', '00_Chapter_Overview_Subject.pdf'),
      doc('PROCESSED', '01_Chapter_Introducing_Data_Modeling.pdf'),
    ]);

    // Assert
    expect(getAllByText('Trùng tên với một tệp khác').length).toBe(2);
  });

  it('should leave distinct names unmarked', async () => {
    // Arrange, Act
    const { queryByText } = await renderList([
      doc('PROCESSED', 'a.pdf'),
      doc('PROCESSED', 'b.pdf'),
    ]);

    // Assert
    expect(queryByText('Trùng tên với một tệp khác')).toBeNull();
  });

  it('should offer no way to delete anything to a member who may not', async () => {
    // Arrange, Act
    const { queryByLabelText } = await renderList([doc('PROCESSED', 'bai.pdf')]);

    // Assert
    expect(queryByLabelText('Xoá bai.pdf')).toBeNull();
  });

  it('should offer the owner a way to delete each file', async () => {
    // Arrange, Act
    const { getByLabelText } = await renderList([doc('PROCESSED', 'bai.pdf')], jest.fn());

    // Assert
    expect(getByLabelText('Xoá bai.pdf')).toBeTruthy();
  });

  it('should invite the first upload when the group has no files', async () => {
    // Arrange, Act
    const { getByText } = await renderList([]);

    // Assert
    expect(getByText('Chưa có tài liệu nào')).toBeTruthy();
  });
});
