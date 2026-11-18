/**
 * FILE: src/lib/sky.js
 * PURPOSE: Sets the page's sky and theme from the clock (DESIGN §3):
 *   <html data-sky="dawn|day|dusk|night" data-theme="day|night">.
 *   Night theme = night hours OR the phone's dark mode. Rechecks every minute and when dark mode changes.
 */
export const skyAt = (hour) => (hour >= 5 && hour < 8 ? 'dawn' : hour < 17 && hour >= 8 ? 'day' : hour >= 17 && hour < 20 ? 'dusk' : 'night');

export function startSky(root = document.documentElement, now = () => new Date()) {
  const dark = matchMedia('(prefers-color-scheme: dark)');
  const apply = () => {
    const sky = skyAt(now().getHours());
    root.dataset.sky = sky;
    root.dataset.theme = sky === 'night' || dark.matches ? 'night' : 'day';
  };
  apply();
  const t = setInterval(apply, 60000);
  dark.addEventListener?.('change', apply);
  return () => { clearInterval(t); dark.removeEventListener?.('change', apply); };
}
