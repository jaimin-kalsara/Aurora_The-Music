import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { usePlayer } from './store/player';
import { useLibrary } from './store/library';
import './styles.css';

if (import.meta.env.DEV) {
  // Handy for debugging from the console during development only.
  (window as unknown as { __aurora?: unknown }).__aurora = { usePlayer, useLibrary };
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
