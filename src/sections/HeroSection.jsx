import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import CountdownTimer from '../components/CountdownTimer.jsx';

let gardenModule;
const loadGarden = () => gardenModule ??= import('../components/FlowerScene.jsx').catch(() => ({
  default: () => <p className="sr-only">The animated floral garden is unavailable on this device.</p>,
}));
const FlowerScene = lazy(loadGarden);

const particles = [
  [8, 24, 3, 18, -4, 6],
  [18, 68, 2, 22, -12, -5],
  [29, 14, 2, 16, -7, 8],
  [76, 18, 3, 20, -15, -6],
  [91, 32, 2, 19, -9, 4],
  [83, 70, 3, 23, -3, -8],
  [12, 82, 2, 21, -17, 5],
  [65, 9, 2, 17, -6, -4],
  [35, 78, 2, 24, -13, 6],
  [72, 85, 3, 20, -8, -5],
  [48, 19, 2, 22, -18, 4],
  [92, 55, 2, 18, -11, -6],
];

// Small, varied silhouettes; petals are decorative CSS surfaces, not flower models.
const petals = [
  [5, 9, 31, -8, 34, -20, 0.8], [15, 12, 39, -26, -26, 35, 1],
  [25, 7, 35, -15, 42, -45, 0.7], [78, 10, 43, -31, -38, 10, 0.9],
  [88, 8, 33, -6, 25, 65, 0.75], [96, 12, 41, -21, -44, -15, 1],
  [10, 6, 46, -35, 18, 25, 0.65], [83, 7, 37, -12, -21, -35, 0.7],
  [34, 8, 44, -19, -35, 45, 0.8], [65, 9, 38, -29, 30, -55, 0.85],
];

export default function HeroSection({ countdown }) {
  const stage = useRef(null);
  const [showGarden, setShowGarden] = useState(false);

  useEffect(() => {
    // Let the heading and countdown paint before downloading and setting up WebGL.
    const delay = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 1200;
    const timer = window.setTimeout(() => setShowGarden(true), delay);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const hero = stage.current;
    const pointer = window.matchMedia('(hover: hover) and (pointer: fine)');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const finishEntrance = () => { hero.dataset.entranceComplete = 'true'; };
    const entranceTimer = window.setTimeout(finishEntrance, 5600);
    if (reduced.matches) finishEntrance();
    let frame = 0;
    let x = 0;
    let y = 0;
    const reset = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      hero.style.setProperty('--atmosphere-x', '0px');
      hero.style.setProperty('--atmosphere-y', '0px');
    };
    const move = (event) => {
      if (!pointer.matches || reduced.matches || event.pointerType !== 'mouse') return;
      const rect = hero.getBoundingClientRect();
      x = Math.max(-1, Math.min(1, (event.clientX - rect.left) / rect.width * 2 - 1)) * 6;
      y = Math.max(-1, Math.min(1, (event.clientY - rect.top) / rect.height * 2 - 1)) * 4;
      if (frame) return;
      frame = requestAnimationFrame(() => {
        hero.style.setProperty('--atmosphere-x', x + 'px');
        hero.style.setProperty('--atmosphere-y', y + 'px');
        frame = 0;
      });
    };
    const preference = () => {
      reset();
      if (reduced.matches) finishEntrance();
    };
    const observer = new IntersectionObserver(([entry]) => {
      const visible = entry.isIntersecting && entry.intersectionRatio >= 0.01;
      hero.dataset.atmospherePaused = String(!visible);
      if (!visible) reset();
    }, { threshold: 0.01 });
    observer.observe(hero);
    hero.addEventListener('pointermove', move, { passive: true });
    hero.addEventListener('pointerleave', reset);
    window.addEventListener('blur', reset);
    pointer.addEventListener('change', reset);
    reduced.addEventListener('change', preference);
    return () => {
      observer.disconnect();
      window.clearTimeout(entranceTimer);
      hero.removeEventListener('pointermove', move);
      hero.removeEventListener('pointerleave', reset);
      window.removeEventListener('blur', reset);
      pointer.removeEventListener('change', reset);
      reduced.removeEventListener('change', preference);
      reset();
    };
  }, []);

  return (
    <section
      id="hero"
      aria-labelledby="hero-heading"
      className="relative bg-ivory-white"
    >
      <div ref={stage} className="hero-garden relative isolate flex min-h-svh flex-col items-center justify-center overflow-hidden bg-ivory-white px-6 text-center text-burgundy">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="hero-glow absolute" />
          <div className="hero-light-enter hero-drift-field absolute inset-0">
            {particles.map(([left, top, size, duration, delay, drift], index) => (
              <span
                key={index}
                className="hero-particle"
                style={{
                  left: `${left}%`,
                  top: `${top}%`,
                  width: `${size}px`,
                  height: `${size}px`,
                  '--particle-duration': `${duration}s`,
                  '--particle-delay': `${delay}s`,
                  '--particle-drift': `${drift}px`,
                }}
              />
            ))}
          </div>
        </div>
        <Suspense fallback={null}>
          {showGarden && <FlowerScene />}
        </Suspense>
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-[2] overflow-hidden">
          <div className="hero-haze absolute inset-0" />
          <div className="hero-drift-field hero-petals absolute inset-0">
            {petals.map(([left, size, duration, delay, drift, turn, scale], index) => (
              <span key={index} className="hero-petal" style={{
                left: left + '%', width: size + 'px', height: size * 1.6 + 'px',
                '--petal-duration': duration + 's', '--petal-delay': delay + 's',
                '--petal-drift': drift + 'px', '--petal-turn': turn + 'deg', '--petal-scale': scale,
              }} />
            ))}
          </div>
        </div>
        <div className="hero-reading relative z-10 mx-auto w-full">
          <span
            aria-hidden="true"
            className="mx-auto mb-5 block h-px w-16 bg-warm-gold/50 sm:mb-6"
          />
          <h1
            id="hero-heading"
            className="hero-heading-enter font-heading text-4xl leading-[1.05] font-medium tracking-tight text-balance text-burgundy min-[375px]:text-[2.75rem] sm:text-6xl lg:text-7xl xl:text-8xl"
          >
            Happy Birthday, <span className="block">My Love</span>
          </h1>
          <p className="hero-subtitle-enter mt-4 font-accent text-2xl leading-relaxed text-burgundy/80 sm:mt-6 sm:text-3xl">
            A little world made just for you.
          </p>
          <CountdownTimer countdown={countdown} />
        </div>

        <p className="hero-scroll-enter hero-garden-scroll absolute z-10 font-body text-xs leading-relaxed tracking-widest text-burgundy/70 sm:text-sm">
          Scroll to discover <span aria-hidden="true">↓</span>
        </p>
      </div>
    </section>
  );
}
