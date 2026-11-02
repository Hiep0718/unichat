import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { CoverAssignmentProvider } from './cover-assignment';
import { useAssignedCover } from './cover-assignment-context';
import { assignCovers, defaultCoverFor } from './default-covers';

// Vitest `globals` is disabled project-wide, so RTL auto-cleanup is not installed.
afterEach(cleanup);

const ONE = '019f88b7-a7e6-70c0-ad22-c4edaa988e22';
const TWO = '01a079ca-ce20-768b-9714-6a2cd3fb58a0';
const THREE = '01a017f7-f724-7fc6-a579-08e9cf2f68a7';

/** Prints what one group was given, so a test can read it back. */
function Card({ id }: { readonly id: string }) {
  const { src, accent } = useAssignedCover(id);
  return <span data-testid={id}>{`${src} ${accent}`}</span>;
}

describe('useAssignedCover', () => {
  it('should hand a card the picture the page assigned it', () => {
    // Arrange
    const expected = assignCovers([ONE, TWO, THREE]);

    // Act
    render(
      <CoverAssignmentProvider workspaceIds={[ONE, TWO, THREE]}>
        <Card id={TWO} />
      </CoverAssignmentProvider>,
    );

    // Assert
    expect(screen.getByTestId(TWO)).toHaveTextContent(expected.get(TWO)!.src);
  });

  it('should give two cards in the same page different marks as well', () => {
    // Arrange and Act: the rail's tiles repeated for the same reason the
    // cards did, because each id was hashed on its own.
    render(
      <CoverAssignmentProvider workspaceIds={[ONE, TWO, THREE]}>
        <Card id={ONE} />
        <Card id={TWO} />
        <Card id={THREE} />
      </CoverAssignmentProvider>,
    );

    // Assert
    const accents = [ONE, TWO, THREE].map(
      (id) => screen.getByTestId(id).textContent!.split(' ')[1],
    );
    expect(new Set(accents).size).toBe(3);
  });

  it('should give two cards in the same page different pictures', () => {
    // Arrange and Act: this is the defect — two groups wore the same picture.
    render(
      <CoverAssignmentProvider workspaceIds={[ONE, TWO, THREE]}>
        <Card id={ONE} />
        <Card id={TWO} />
        <Card id={THREE} />
      </CoverAssignmentProvider>,
    );

    // Assert
    const shown = [ONE, TWO, THREE].map(
      (id) => screen.getByTestId(id).textContent,
    );
    expect(new Set(shown).size).toBe(3);
  });

  it('should show one group the same picture wherever it is drawn', () => {
    // Arrange and Act: the quick-access row and the grid below render the
    // same group, and a card must not change as the eye travels down.
    render(
      <CoverAssignmentProvider workspaceIds={[ONE, TWO, THREE]}>
        <div data-testid="row"><Card id={TWO} /></div>
        <div data-testid="grid"><Card id={TWO} /></div>
      </CoverAssignmentProvider>,
    );

    // Assert
    const [row, grid] = screen.getAllByTestId(TWO);
    expect(row!.textContent).toBe(grid!.textContent);
  });

  it('should fall back to the hashed picture outside a provider', () => {
    // Arrange and Act: a group's own page draws one card, and a repeat needs
    // two, so there is nothing to resolve there.
    render(<Card id={TWO} />);

    // Assert
    expect(screen.getByTestId(TWO)).toHaveTextContent(defaultCoverFor(TWO).src);
  });

  it('should answer for a group the page did not list', () => {
    // Arrange and Act: a card for a group that arrived after the assignment
    // was made must still draw something.
    render(
      <CoverAssignmentProvider workspaceIds={[ONE]}>
        <Card id={THREE} />
      </CoverAssignmentProvider>,
    );

    // Assert
    expect(screen.getByTestId(THREE)).toHaveTextContent(defaultCoverFor(THREE).src);
  });
});
