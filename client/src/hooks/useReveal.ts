import { useEffect } from 'react';
export function useReveal(): void {
  useEffect(() => {
    if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); }
      });
    }, { threshold: 0.08 });
    const elements = document.querySelectorAll<HTMLElement>('[data-reveal]');
    elements.forEach(element => { element.classList.add('reveal-ready'); observer.observe(element); });
    return () => { observer.disconnect(); elements.forEach(element => element.classList.remove('reveal-ready')); };
  }, []);
}
