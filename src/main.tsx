import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initFirebaseFetch } from './lib/firebaseFetch';

// Initialize full-stack Firebase Firestore router
initFirebaseFetch();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Synced with Firebase rules and blueprint configuration



