import { useState } from 'react';

import { settingsErrorMessage, useSettingsSave } from './use-settings-save';

import type { FormEvent } from 'react';
import type { SettingsWorkspace } from './use-settings-save';

/** Edits workspace metadata using the current optimistic locking version. */
export function GeneralForm({ workspace, canEdit }: {
  readonly workspace: SettingsWorkspace;
  readonly canEdit: boolean;
}) {
  const [name, setName] = useState(workspace.name);
  const [description, setDescription] = useState(workspace.description);
  const mutation = useSettingsSave(workspace.id);
  const handleSave = (event: FormEvent) => {
    event.preventDefault();
    if (!canEdit || mutation.isPending) return;
    mutation.mutate({ name, description, expectedVersion: workspace.version });
  };

  return (
    <section className="settings-section">
      <h3 className="settings-section__title">Thông tin chung</h3>
      <form className="settings-form" onSubmit={handleSave}>
        <label className="settings-form__field" htmlFor="settings-name">Tên workspace
          <input id="settings-name" className="settings-form__input" value={name}
            onChange={(event) => setName(event.target.value)} disabled={!canEdit || mutation.isPending}
            required minLength={3} maxLength={100} />
        </label>
        <label className="settings-form__field" htmlFor="settings-description">Mô tả
          <textarea id="settings-description" className="settings-form__textarea" value={description}
            onChange={(event) => setDescription(event.target.value)} disabled={!canEdit || mutation.isPending}
            maxLength={1000} rows={3} />
        </label>
        {mutation.isError && <p className="settings-form__error" role="alert">{settingsErrorMessage(mutation.error)}</p>}
        {mutation.isSuccess && <p className="settings-form__success" role="status">Cập nhật thông tin thành công.</p>}
        {canEdit && <button className="settings-form__save-btn" type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
        </button>}
      </form>
    </section>
  );
}
