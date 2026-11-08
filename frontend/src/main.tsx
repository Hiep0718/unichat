import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './App';
import { installRandomUuidFallback } from './lib/random-uuid';
import './styles/index.css';

installRandomUuidFallback();

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Không tìm thấy phần tử root của ứng dụng.');
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);