/**
 * FILE: src/test/setup.js
 * PURPOSE: Test helpers — jest-dom matchers and browser APIs jsdom lacks.
 */
import '@testing-library/jest-dom/vitest';

// jsdom has no matchMedia; default to "motion allowed". Tests can override.
if (typeof window !== 'undefined') window.matchMedia ||= (q) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {} });
