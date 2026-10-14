import { useEffect, useRef } from 'react';

export default function useSectionReveal() {
  const sectionRef = useRef(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section || typeof IntersectionObserver !== 'function' || typeof window.matchMedia !== 'function') return;

    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (motion.matches) return;

    let observer;
    function handleMotionChange() {
      if (motion.matches) {
        delete section.dataset.reveal;
        observer?.disconnect();
      }
    }

    try {
      observer = new IntersectionObserver((entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          section.dataset.reveal = 'visible';
          observer.disconnect();
        }
      });
      observer.observe(section);
      section.dataset.reveal = 'pending';
      motion.addEventListener?.('change', handleMotionChange);
    } catch {
      delete section.dataset.reveal;
      observer?.disconnect();
    }

    return () => {
      observer?.disconnect();
      motion.removeEventListener?.('change', handleMotionChange);
      delete section.dataset.reveal;
    };
  }, []);

  return sectionRef;
}
