import { useState } from 'react';

import { VISIBILITY_OPTIONS } from '../workspaces/workspace-visibility';
import { settingsErrorMessage, useSettingsSave } from './use-settings-save';

import type { FormEvent } from 'react';
import type { SettingsWorkspace } from './use-settings-save';

/** Lets the owner save workspace visibility with optimistic locking. */
export function AccessForm({ workspace }: { readonly workspace: SettingsWorkspace }) {
  const [visibility, setVisibility] = useState(workspace.visibility);
  const mutation = useSettingsSave(workspace.id);
  const handleSave = (event: FormEvent) => {
    event.preventDefault();
    if (mutation.isPending || visibility === workspace.visibility) return;
    mutation.mutate({ visibility, expectedVersion: workspace.version });
  };

  return (
    <section className="settings-section">
      <h3 className="settings-section__title">Chế độ hiển thị</h3>
      <form className="settings-form" onSubmit={handleSave}>
        <div className="settings-form__radio-group">
          {VISIBILITY_OPTIONS.map((option) => (
            <label key={option.value} className={`settings-form__radio-label ${visibility === option.value ? 'settings-form__radio-label--selected' : ''}`}>
              <input className="settings-form__radio-input" type="radio" name="visibility"
                value={option.value} checked={visibility === option.value} disabled={mutation.isPending}
                onChange={() => setVisibility(option.value)} />
              <span className="settings-form__radio-info">
                <span className="settings-form__radio-title">{option.label}</span>
                <span className="settings-form__radio-desc">{option.description}</span>
              </span>
            </label>
          ))}
        </div>
        {mutation.isError && <p className="settings-form__error" role="alert">{settingsErrorMessage(mutation.error)}</p>}
        {mutation.isSuccess && <p className="settings-form__success" role="status">Cập nhật chế độ hiển thị thành công.</p>}
        <button className="settings-form__save-btn" type="submit" disabled={mutation.isPending || visibility === workspace.visibility}>
          {mutation.isPending ? 'Đang lưu...' : 'Cập nhật chế độ hiển thị'}
        </button>
      </form>
    </section>
  );
}
