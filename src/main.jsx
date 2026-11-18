/**
 * FILE: src/main.jsx
 * PURPOSE: App entry + routes (docs/ARCHITECTURE.md §2).
 * /app/* is the app (src/app/AppRoutes.jsx). Pages not built yet show <Soon />.
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Landing from './landing/Landing.jsx';
import Soon from './pages/Soon.jsx';
import AppRoutes from './app/AppRoutes.jsx';
import './styles/tokens.css';

export const routes = (
  <Routes>
    <Route path="/" element={<Landing />} />
    <Route path="/app/*" element={<AppRoutes />} />
    <Route path="/privacy" element={<Soon title="Privacy policy" />} />
    <Route path="/terms" element={<Soon title="Terms of use" />} />
    <Route path="*" element={<Soon title="Page not found" notFound />} />
  </Routes>
);

const el = document.getElementById('root');
if (el) createRoot(el).render(<StrictMode><BrowserRouter>{routes}</BrowserRouter></StrictMode>);
