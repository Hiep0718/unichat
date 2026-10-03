/**
 * The row of colour swatches in the compose box.
 *
 * It disappears rather than greys out once the post stops qualifying — too
 * long, or a file attached. A control that is visible but refuses to work
 * invites the question "why not", and the honest answer is that the feature
 * would not read well, which is easier to show than to explain.
 */
import { Icon } from '../../../components/icon';
import { POST_BACKGROUNDS } from '../post-background';
import './background-picker.css';

interface BackgroundPickerProps {
  readonly value: string | null;
  readonly onChange: (key: string | null) => void;
  /** Hidden entirely when the post cannot carry a background. */
  readonly visible: boolean;
}

export function BackgroundPicker({ value, onChange, visible }: BackgroundPickerProps) {
  if (!visible) {
    return null;
  }

  return (
    <div className="bg-picker">
      <span className="bg-picker__label">Nền bài viết</span>
      <div className="bg-picker__swatches" role="radiogroup" aria-label="Nền bài viết">
        <button
          type="button"
          role="radio"
          aria-checked={value === null}
          aria-label="Không dùng nền"
          title="Không dùng nền"
          className={`bg-picker__swatch bg-picker__swatch--none ${
            value === null ? 'bg-picker__swatch--active' : ''
          }`}
          onClick={() => onChange(null)}
        >
          <Icon name="format_color_reset" size={15} />
        </button>

        {POST_BACKGROUNDS.map((preset) => (
          <button
            key={preset.key}
            type="button"
            role="radio"
            aria-checked={value === preset.key}
            aria-label={preset.label}
            title={preset.label}
            className={`bg-picker__swatch ${
              value === preset.key ? 'bg-picker__swatch--active' : ''
            }`}
            style={{ background: preset.background }}
            onClick={() => onChange(preset.key)}
          />
        ))}
      </div>
    </div>
  );
}
