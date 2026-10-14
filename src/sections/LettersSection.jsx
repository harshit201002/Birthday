import { memo, useEffect, useLayoutEffect, useRef, useState } from 'react';
import gifts from '../data/gifts.js';
import useSectionReveal from '../hooks/useSectionReveal.js';
import magicalPost from '../assets/images/magical-post-1086.webp';
import magicalPostSmall from '../assets/images/magical-post-768.webp';
import magicalPostMedium from '../assets/images/magical-post-1440.webp';
import magicalPostLarge from '../assets/images/magical-post-2172.webp';
import hogwartsCrest from '../assets/images/hogwarts-crest.webp';
import hogwartsCrestSmall from '../assets/images/hogwarts-crest-192.webp';
import './LettersSection.css';

// Optional delivery previews; gift data and full-resolution originals stay authoritative.
const letterPreviews = import.meta.glob('../assets/images/letter-*-preview.webp', {
  eager: true, import: 'default', query: '?url',
});

const OPENING_DURATION = 1600;
const CLOSING_DURATION = 240;

// The grid and opening sequence share the same envelope face.
function EnvelopeArtwork({ locked = false, large = false }) {
  return (
    <>
      <span aria-hidden="true" className="envelope-folds" />
      <span aria-hidden="true" className="envelope-flap">
        <img className="envelope-crest" src={hogwartsCrestSmall} srcSet={`${hogwartsCrestSmall} 192w, ${hogwartsCrest} 384w`} sizes={large ? '128px' : '(min-width: 1024px) 96px, (min-width: 640px) 144px, 64px'} alt="" width="384" height="384" loading="lazy" decoding="async" />
      </span>
      <span aria-hidden="true" className="envelope-seal">
        <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.4">
          {locked ? <><rect x="8" y="14" width="16" height="12" rx="2" /><path d="M11 14V9a5 5 0 0 1 10 0v5m-5 5v3" /></>
            : <path d="m16 6 2.5 6.5 7 .5-5.5 4.5 1.5 7-5.5-4-5.5 4 1.5-7L6.5 13l7-.5Z" />}
        </svg>
      </span>
    </>
  );
}

function LettersSection() {
  const sectionRef = useSectionReveal();
  const [viewedLetter, setViewedLetter] = useState(null);
  const [isOpening, setIsOpening] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const [failedImages, setFailedImages] = useState([]);
  const viewerRef = useRef(null);
  const openerRef = useRef(null);
  const scrollRef = useRef(null);
  const originRef = useRef(null);
  const openingTimer = useRef(null);
  const animationsRef = useRef([]);
  const closingRef = useRef(false);

  useLayoutEffect(() => {
    if (!viewedLetter) return;
    const viewer = viewerRef.current;
    const opener = openerRef.current;
    const previousOverflow = document.body.style.overflow;
    const previousRootOverflow = document.documentElement.style.overflow;
    const previousPadding = document.body.style.paddingRight;
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    if (scrollbar > 0) document.body.style.paddingRight = `${parseFloat(getComputedStyle(document.body).paddingRight) + scrollbar}px`;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    scrollRef.current.scrollTo(0, 0);
    viewer.showModal();

    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let active = true;
    const finishOpening = () => {
      window.clearTimeout(openingTimer.current);
      setIsOpening(false);
    };
    if (motion.matches || typeof viewer.animate !== 'function') {
      finishOpening();
    } else {
      const started = performance.now();
      const envelope = viewer.querySelector('.opening-envelope');
      const origin = originRef.current;
      const width = envelope.offsetWidth;
      const height = envelope.offsetHeight;
      const left = (viewer.clientWidth - width) / 2;
      const top = (viewer.clientHeight - height) / 2;
      const fromX = origin.left + origin.width / 2 - left - width / 2;
      const fromY = origin.top + origin.height / 2 - top - height / 2;
      const ease = 'cubic-bezier(.22,.75,.25,1)';
      animationsRef.current.push(envelope.animate([
        { transform: `translate(${fromX}px, ${fromY}px) scale(${origin.width / width})` },
        { transform: 'translate(0, 0) scale(1)' },
      ], { duration: 420, easing: ease, fill: 'both' }));

      // Measure once after decoding; the photo flies to its actual fitted reader bounds.
      const slip = viewer.querySelector('.letter-slip');
      const photo = viewer.querySelector('.letter-reading-image');
      if (slip && photo) {
        Promise.all([slip.querySelector('img').decode(), photo.decode()]).then(() => {
          if (!active || motion.matches || closingRef.current || !slip.isConnected
            || performance.now() - started >= OPENING_DURATION) return;
          const target = photo.getBoundingClientRect();
          const x = target.left - left - slip.offsetLeft;
          const y = target.top - top - slip.offsetTop;
          const scale = target.width / slip.offsetWidth;
          const animation = slip.animate([
            { opacity: 0, transform: 'translate(0, 0) scale(1)', zIndex: 1, offset: 0 },
            { opacity: 0, transform: 'translate(0, 0) scale(1)', zIndex: 1, offset: 0.53 },
            { opacity: 1, transform: `translate(0, ${-height * 0.12}px) scale(1)`, zIndex: 1, offset: 0.61, easing: ease },
            { opacity: 1, transform: `translate(0, ${-height * 0.62}px) scale(1)`, zIndex: 6, offset: 0.74, easing: ease },
            { opacity: 1, transform: `translate(${x}px, ${y}px) scale(${scale})`, zIndex: 6, offset: 1 },
          ], { duration: OPENING_DURATION, fill: 'both' });
          animation.currentTime = performance.now() - started;
          animationsRef.current.push(animation);
        }).catch(() => { /* The existing image-error fallback handles unavailable photos. */ });
      }
      openingTimer.current = window.setTimeout(finishOpening, OPENING_DURATION);
    }
    const updateMotion = () => {
      if (!motion.matches) return;
      animationsRef.current.forEach((animation) => animation.cancel());
      finishOpening();
      if (closingRef.current) setViewedLetter(null);
      setIsClosing(false);
    };
    motion.addEventListener('change', updateMotion);
    return () => {
      active = false;
      window.clearTimeout(openingTimer.current);
      animationsRef.current.forEach((animation) => animation.cancel());
      animationsRef.current = [];
      motion.removeEventListener('change', updateMotion);
      viewer.close();
      document.body.style.overflow = previousOverflow;
      document.documentElement.style.overflow = previousRootOverflow;
      document.body.style.paddingRight = previousPadding;
      opener?.focus({ preventScroll: true });
    };
  }, [viewedLetter]);

  useEffect(() => {
    if (!isClosing) return;
    const timer = window.setTimeout(() => setViewedLetter(null), CLOSING_DURATION);
    return () => window.clearTimeout(timer);
  }, [isClosing]);

  function openLetter(gift, event) {
    if (!gift.available || viewedLetter) return;
    openerRef.current = event.currentTarget;
    originRef.current = event.currentTarget.getBoundingClientRect();
    setIsOpening(!window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    setIsZoomed(false);
    setIsClosing(false);
    closingRef.current = false;
    setViewedLetter(gift);
  }

  function closeLetter() {
    if (closingRef.current) return;
    closingRef.current = true;
    window.clearTimeout(openingTimer.current);
    animationsRef.current.forEach((animation) => animation.pause());
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setViewedLetter(null);
    } else {
      setIsClosing(true);
    }
  }

  function markImageFailed(id) {
    setFailedImages((previous) => previous.includes(id) ? previous : [...previous, id]);
  }

  const hasImage = viewedLetter?.letterImage && !failedImages.includes(viewedLetter.id);
  const imageName = viewedLetter?.letterImage?.split('/').pop().replace(/\.[^.]+$/, '');
  const previewImage = letterPreviews[`../assets/images/${imageName}-preview.webp`];

  return (
    <section id="letters" aria-labelledby="letters-heading" className="magical-letters relative isolate px-6 py-20 text-burgundy sm:px-10 sm:py-24 lg:px-16">
      <div ref={sectionRef} className="section-reveal mx-auto w-full max-w-4xl">
        <div aria-hidden="true" className="letter-artwork">
          <img src={magicalPostSmall} srcSet={`${magicalPostSmall} 768w, ${magicalPost} 1086w, ${magicalPostMedium} 1440w, ${magicalPostLarge} 2172w`} sizes="(min-width: 1232px) 1200px, calc(100vw - 32px)" alt="" width="2172" height="724" loading="lazy" decoding="async" />
        </div>
        <h2 id="letters-heading" className="letters-heading relative mb-10 text-center font-heading text-4xl leading-tight font-medium text-balance sm:mb-12 sm:text-5xl">Your Letters</h2>
        <ol className="envelope-grid">
          {gifts.map((gift, index) => (
            <li key={gift.id} className="magic-envelope">
              <button
                id={`letter-trigger-${gift.id}`}
                type="button"
                className="envelope-trigger"
                disabled={!gift.available}
                aria-haspopup="dialog"
                aria-controls="letter-viewer"
                onClick={(event) => openLetter(gift, event)}
              >
                <EnvelopeArtwork locked={!gift.available} />
                <span className="envelope-address">
                  <span className="envelope-number">Letter {String(gift.number ?? index + 1).padStart(2, '0')}</span>
                  <span className="envelope-title">{gift.available ? gift.title : 'Coming Soon'}</span>
                </span>
              </button>
            </li>
          ))}
        </ol>
      </div>
      <dialog
        id="letter-viewer"
        ref={viewerRef}
        aria-label={viewedLetter ? `Handwritten letter ${viewedLetter.number}: ${viewedLetter.title}` : 'Handwritten letter'}
        onCancel={(event) => { event.preventDefault(); closeLetter(); }}
        data-closing={isClosing}
        className="letter-reader"
      >
        <button type="button" autoFocus className="letter-reader-close" onClick={closeLetter}>Close</button>
        {viewedLetter && (
          <>
            {isOpening && (
              <div className="letter-opening-stage" aria-hidden="true">
                <div className="opening-envelope">
                  <div className="opening-envelope-paper" />
                  {hasImage && <picture className="letter-slip">
                    {previewImage && <source srcSet={previewImage} type="image/webp" />}
                    <img src={viewedLetter.letterImage} alt="" decoding="async" onError={() => markImageFailed(viewedLetter.id)} />
                  </picture>}
                  <EnvelopeArtwork large />
                  <span className="envelope-address">
                    <span className="envelope-number">Letter {String(viewedLetter.number).padStart(2, '0')}</span>
                    <span className="envelope-title">{viewedLetter.title}</span>
                  </span>
                </div>
              </div>
            )}
            <div ref={scrollRef} className="letter-reader-scroll" data-opening={isOpening} data-zoomed={isZoomed} inert={isOpening || isClosing}>
              <div className="letter-reader-page">
                {hasImage ? (
                  <button
                    type="button"
                    className="letter-zoom-button"
                    aria-label={`${isZoomed ? 'Zoom out of' : 'Zoom in on'} handwritten letter for ${viewedLetter.title}`}
                    aria-pressed={isZoomed}
                    onClick={() => { setIsZoomed(!isZoomed); scrollRef.current.scrollTo(0, 0); }}
                  >
                    <picture>
                      {!isZoomed && previewImage && <source srcSet={previewImage} type="image/webp" />}
                      <img className="letter-reading-image" src={viewedLetter.letterImage} alt={`Handwritten letter for ${viewedLetter.title}`} decoding="async" onError={() => markImageFailed(viewedLetter.id)} />
                    </picture>
                  </button>
                ) : <p role="status" className="font-body text-sm">Letter photo coming soon</p>}
              </div>
            </div>
          </>
        )}
      </dialog>
    </section>
  );
}

export default memo(LettersSection);
