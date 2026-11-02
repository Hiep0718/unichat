import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TopicChips } from './topic-chips';
import { TopicPicker } from './topic-picker';

// Vitest `globals` is disabled project-wide, so RTL auto-cleanup is not installed.
afterEach(cleanup);

vi.mock('../workspace-topics', async () => {
  const actual = await vi.importActual<typeof import('../workspace-topics')>(
    '../workspace-topics',
  );
  return { ...actual, useWorkspaceTopics: vi.fn() };
});

const { useWorkspaceTopics } = await import('../workspace-topics');

const TECH = { group: 'TECHNICAL', groupLabel: 'Kỹ thuật và công nghệ' };
const LIFE = { group: 'LIFE', groupLabel: 'Đời sống và nhân văn' };

const OPTIONS = [
  { name: 'PROGRAMMING', label: 'Lập trình', icon: 'code', ...TECH },
  { name: 'DATA_SCIENCE', label: 'Khoa học dữ liệu', icon: 'analytics', ...TECH },
  { name: 'DATABASE', label: 'Cơ sở dữ liệu', icon: 'database', ...TECH },
  { name: 'LANGUAGES', label: 'Ngoại ngữ', icon: 'translate', ...LIFE },
];

function givenVocabulary(data: typeof OPTIONS | undefined, isLoading = false) {
  vi.mocked(useWorkspaceTopics).mockReturnValue({
    data,
    isLoading,
    error: data === undefined && !isLoading ? new Error('offline') : null,
  } as ReturnType<typeof useWorkspaceTopics>);
}

describe('TopicPicker', () => {
  beforeEach(() => givenVocabulary(OPTIONS));

  it('should add a topic when one is pressed', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TopicPicker value={[]} onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: /Lập trình/ }));

    expect(onChange).toHaveBeenCalledWith(['PROGRAMMING']);
  });

  it('should remove a topic that is pressed again', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TopicPicker value={['PROGRAMMING']} onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: /Lập trình/ }));

    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('should stop at three and keep the rest visible rather than hiding them', () => {
    render(
      <TopicPicker value={['PROGRAMMING', 'DATA_SCIENCE', 'DATABASE']} onChange={vi.fn()} />,
    );

    // Still on screen, so the reader sees what else exists and why it is shut.
    expect(screen.getByRole('button', { name: /Ngoại ngữ/ })).toBeDisabled();
    // The three already chosen stay pressable, otherwise they could not be undone.
    expect(screen.getByRole('button', { name: /Lập trình/ })).toBeEnabled();
  });

  it('should band the topics so twenty chips are not one wall', () => {
    render(<TopicPicker value={[]} onChange={vi.fn()} />);

    expect(screen.getByRole('group', { name: 'Kỹ thuật và công nghệ' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Đời sống và nhân văn' })).toBeInTheDocument();
  });

  it('should keep each topic inside its own band', () => {
    render(<TopicPicker value={[]} onChange={vi.fn()} />);

    const tech = screen.getByRole('group', { name: 'Kỹ thuật và công nghệ' });
    expect(within(tech).getByRole('button', { name: /Lập trình/ })).toBeInTheDocument();
    expect(within(tech).queryByRole('button', { name: /Ngoại ngữ/ })).not.toBeInTheDocument();
  });

  it('should not block the form when the vocabulary cannot be loaded', () => {
    givenVocabulary(undefined);
    render(<TopicPicker value={[]} onChange={vi.fn()} />);

    // Topics are optional, so a failure here must not look like a broken form.
    expect(screen.getByText(/Không tải được danh sách chủ đề/)).toBeInTheDocument();
  });
});

describe('TopicChips', () => {
  beforeEach(() => givenVocabulary(OPTIONS));

  it('should name each topic a workspace carries', () => {
    render(<TopicChips topics={['PROGRAMMING', 'DATABASE']} />);

    expect(screen.getByText('Lập trình')).toBeInTheDocument();
    expect(screen.getByText('Cơ sở dữ liệu')).toBeInTheDocument();
  });

  it('should drop a topic this build does not know instead of showing its raw name', () => {
    render(<TopicChips topics={['PROGRAMMING', 'QUANTUM_COMPUTING']} />);

    expect(screen.getByText('Lập trình')).toBeInTheDocument();
    expect(screen.queryByText(/QUANTUM/)).not.toBeInTheDocument();
  });

  it('should render nothing at all for a workspace with no topics', () => {
    const { container } = render(<TopicChips topics={[]} />);

    // Groups created before topics existed are most of them; an empty bar
    // under every card would be noise.
    expect(container).toBeEmptyDOMElement();
  });
});
