import React from 'react';
import { createRoot } from 'react-dom/client';
import { inject } from '@vercel/analytics';
import { initAnalytics } from '@/lib/analytics';
import App from './App.tsx';
import './index.css';

inject();
initAnalytics();


createRoot(document.getElementById("root")!).render(<App />);
