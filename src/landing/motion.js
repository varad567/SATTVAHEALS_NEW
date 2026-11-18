/**
 * FILE: src/landing/motion.js
 * PURPOSE: Scroll-linked motion for the landing page (DESIGN §3), ported from the astro motion.js.
 * INPUT: root element of the landing page. OUTPUT: cleanup function.
 * Skipped entirely when the user prefers reduced motion — the page is complete without it.
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

export function initLandingMotion(root) {
  if (!root || matchMedia('(prefers-reduced-motion: reduce)').matches) return () => {};
  gsap.registerPlugin(ScrollTrigger);
  const scrub = (trigger, start = 'top bottom', end = 'bottom top') => ({ trigger, start, end, scrub: 1.2 });

  const ctx = gsap.context(() => {
    gsap.to('.lp-progress', { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: true } });
    gsap.to('.lp-hero__prana', { y: -60, ease: 'none', scrollTrigger: scrub('.lp-hero', 'top top') });
    gsap.to('.lp-hero__blob', { y: 80, rotation: 8, ease: 'none', scrollTrigger: scrub('.lp-hero', 'top top') });
    gsap.from('.lp-card', { y: 32, opacity: 0, stagger: 0.12, duration: 0.9, ease: 'power2.out',
      scrollTrigger: { trigger: '.lp-cards', start: 'top 80%' } });
    gsap.fromTo('.lp-cta__blob', { scale: 0.6 }, { scale: 1.2, ease: 'none', scrollTrigger: scrub('.lp-cta', 'top bottom', 'center center') });
  }, root);

  return () => ctx.revert();
}
