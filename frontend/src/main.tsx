import '@fontsource-variable/ibm-plex-sans/index.css';
import '@fontsource-variable/source-serif-4/index.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './App';
import './styles/index.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Không tìm thấy phần tử root của ứng dụng.');
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);