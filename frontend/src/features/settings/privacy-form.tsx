import { useState } from 'react';

import { settingsErrorMessage, useSettingsSave } from './use-settings-save';

import type { FormEvent } from 'react';
import type { SettingsWorkspace } from './use-settings-save';

interface PrivacyFormProps {
  readonly workspace: SettingsWorkspace;
  readonly isOwner: boolean;
}

/** Allows only the workspace owner to explicitly save the AI processing policy. */
export function PrivacyForm({ workspace, isOwner }: PrivacyFormProps) {
  const [draft, setDraft] = useState<boolean | null>(null);
  const mutation = useSettingsSave(workspace.id);
  const cloudAllowed = draft ?? workspace.cloudAllowed;
  const handleSave = (event: FormEvent) => {
    event.preventDefault();
    if (!isOwner || mutation.isPending || cloudAllowed === workspace.cloudAllowed) return;
    mutation.mutate({ cloudAllowed, expectedVersion: workspace.version }, { onSuccess: () => setDraft(null) });
  };

  return (
    <section className="settings-section" aria-labelledby="workspace-ai-title">
      <h3 className="settings-section__title" id="workspace-ai-title">AI &amp; Quyền riêng tư</h3>
      <p className="settings-section__description" id="workspace-ai-description">
        Khi bật, câu hỏi và các đoạn trích liên quan từ tài liệu bạn có quyền truy cập có thể được gửi đến nhà cung cấp AI đám mây đang cấu hình để tạo câu trả lời. Quyền truy cập tài liệu vẫn được kiểm tra.
      </p>
      {!isOwner && <p>Chỉ chủ workspace mới có thể thay đổi quyền xử lý bằng AI.</p>}
      <form className="settings-form" onSubmit={handleSave}>
        <label className="settings-form__label">
          <input type="checkbox" checked={cloudAllowed} aria-describedby="workspace-ai-description"
            disabled={!isOwner || mutation.isPending} onChange={(event) => { setDraft(event.target.checked); mutation.reset(); }} />
          {' '}Cho phép xử lý bằng AI
        </label>
        <p role="status">Trạng thái đã lưu: {workspace.cloudAllowed ? 'Đã cho phép' : 'Chưa cho phép'}</p>
        {mutation.isError && <p className="settings-form__error" role="alert">{settingsErrorMessage(mutation.error)}</p>}
        {mutation.isSuccess && <p className="settings-form__success" role="status">Đã lưu quyền xử lý bằng AI.</p>}
        {isOwner && <button className="settings-form__save-btn" type="submit"
          disabled={mutation.isPending || cloudAllowed === workspace.cloudAllowed}>
          {mutation.isPending ? 'Đang lưu...' : 'Lưu quyền AI'}
        </button>}
      </form>
    </section>
  );
}
