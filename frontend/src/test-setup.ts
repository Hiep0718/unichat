import '@testing-library/jest-dom/vitest';

import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Testing Library unmounts after each test only when Vitest runs with
// `globals: true`, which this project does not. Without it the rendered trees
// pile up in one document, and a query that should find one node finds every
// copy every earlier test left behind. Existing tests only avoided it by
// asserting on text no other test in the file used.
afterEach(cleanup);
