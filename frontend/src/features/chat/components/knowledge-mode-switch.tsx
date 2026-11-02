import { Icon } from '../../../components/icon';

/** Knowledge scope applied to the next question. */
export type KnowledgeMode = 'strict' | 'expanded';

interface KnowledgeModeSwitchProps {
  readonly value: KnowledgeMode;
  readonly onChange: (mode: KnowledgeMode) => void;
  readonly disabled?: boolean | undefined;
}

const OPTIONS: ReadonlyArray<{ mode: KnowledgeMode; icon: string; label: string; hint: string }> = [
  {
    mode: 'strict',
    icon: 'verified',
    label: 'Chỉ tài liệu',
    hint: 'Chỉ trả lời từ tài liệu được cấp quyền, bắt buộc có trích dẫn nguồn',
  },
  {
    mode: 'expanded',
    icon: 'auto_awesome',
    label: 'Mở rộng',
    hint: 'Kết hợp tài liệu được cấp quyền với kiến thức bổ trợ từ AI (gắn nhãn riêng)',
  },
];

/** Segmented radio group choosing between strict document-grounded and expanded answers. */
export function KnowledgeModeSwitch({ value, onChange, disabled = false }: KnowledgeModeSwitchProps) {
  return (
    <div className="knowledge-mode-switch" role="radiogroup" aria-label="Phạm vi tri thức">
      {OPTIONS.map((option) => {
        const active = value === option.mode;
        const modifier = active ? ` knowledge-mode-switch__option--active knowledge-mode-switch__option--${option.mode}` : '';
        return (
          <button
            key={option.mode}
            type="button"
            role="radio"
            aria-checked={active}
            title={option.hint}
            disabled={disabled}
            className={`knowledge-mode-switch__option${modifier}`}
            onClick={() => onChange(option.mode)}
          >
            <Icon name={option.icon} size={15} filled={active} />
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
