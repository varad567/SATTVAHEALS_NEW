/**
 * FILE: src/main.jsx
 * PURPOSE: App entry + routes (docs/ARCHITECTURE.md §2).
 * /app/* is the app (src/app/AppRoutes.jsx). Unknown paths show the 404 page.
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Landing from './landing/Landing.jsx';
import Soon from './pages/Soon.jsx';
import Legal from './pages/Legal.jsx';
import AppRoutes from './app/AppRoutes.jsx';
import ChatWidget from './components/ChatWidget.jsx';
import { startSky } from './lib/sky.js';
import './styles/tokens.css';

export const routes = (
  <Routes>
    <Route path="/" element={<Landing />} />
    <Route path="/app/*" element={<AppRoutes />} />
    <Route path="/privacy" element={<Legal doc="privacy" />} />
    <Route path="/terms" element={<Legal doc="terms" />} />
    <Route path="*" element={<Soon title="Page not found" notFound />} />
  </Routes>
);

startSky();
const el = document.getElementById('root');
if (el) createRoot(el).render(<StrictMode><BrowserRouter>{routes}<ChatWidget /></BrowserRouter></StrictMode>);
