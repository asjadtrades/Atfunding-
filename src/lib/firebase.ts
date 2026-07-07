import { initializeApp } from 'firebase/app';
import { initializeFirestore } from 'firebase/firestore';

// Configuration from firebase-applet-config.json
const firebaseConfig = {
  apiKey: "AIzaSyAADPW8LOIluHtErmMmdyuRDhiuSlvnhGA",
  authDomain: "gen-lang-client-0674008062.firebaseapp.com",
  projectId: "gen-lang-client-0674008062",
  storageBucket: "gen-lang-client-0674008062.firebasestorage.app",
  messagingSenderId: "956506567280",
  appId: "1:956506567280:web:d9472988e16bc4745cfab5"
};

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Firestore with the specific custom database ID and force long polling
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, "ai-studio-atfunding-fc82b33e-08de-4a91-8a7f-2c61f8431ca5");

