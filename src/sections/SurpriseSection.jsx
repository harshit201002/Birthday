import { memo, useEffect, useRef, useState } from 'react';
import useSectionReveal from '../hooks/useSectionReveal.js';

// Place the final photograph here, or update this path to use another image.
const finalLetterImage = `${import.meta.env.BASE_URL}letters/final-letter.jpg`;

function getYouTubeEmbedUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.port) return null;

    let videoId;
    if (url.hostname === 'youtu.be') {
      videoId = url.pathname.match(/^\/([A-Za-z0-9_-]{11})\/?$/)?.[1];
    } else if (['youtube.com', 'www.youtube.com', 'm.youtube.com'].includes(url.hostname)) {
      videoId = url.pathname === '/watch'
        ? url.searchParams.get('v')
        : url.pathname.match(/^\/(?:shorts|embed)\/([A-Za-z0-9_-]{11})\/?$/)?.[1];
    }

    return /^[A-Za-z0-9_-]{11}$/.test(videoId ?? '')
      ? `https://www.youtube-nocookie.com/embed/${videoId}?controls=1&autoplay=0&fs=1&playsinline=1`
      : null;
  } catch {
    return null;
  }
}

function SurpriseSection({ isUnlocked }) {
  const sectionRef = useSectionReveal();
  const viewerRef = useRef(null);
  const [isLetterOpen, setIsLetterOpen] = useState(false);
  const [isViewingLetter, setIsViewingLetter] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const embedUrl = getYouTubeEmbedUrl(import.meta.env.VITE_YOUTUBE_URL);

  useEffect(() => {
    if (!isUnlocked || !isViewingLetter) return;

    const viewer = viewerRef.current;
    const opener = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    const previousRootOverflow = document.documentElement.style.overflow;
    const previousPadding = document.body.style.paddingRight;
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    if (scrollbar > 0) document.body.style.paddingRight = `${parseFloat(getComputedStyle(document.body).paddingRight) + scrollbar}px`;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    viewer.showModal();

    return () => {
      viewer.close();
      document.body.style.overflow = previousOverflow;
      document.documentElement.style.overflow = previousRootOverflow;
      document.body.style.paddingRight = previousPadding;
      opener?.focus({ preventScroll: true });
    };
  }, [isUnlocked, isViewingLetter]);

  return (
    <section
      id="surprise"
      aria-labelledby="surprise-heading"
      className="bg-ivory-white px-6 py-20 text-center text-burgundy sm:px-10 sm:py-24 lg:px-16"
    >
      <div ref={sectionRef} className="section-reveal mx-auto w-full max-w-4xl">
        <h2 id="surprise-heading" className="font-heading text-4xl leading-tight font-medium text-balance sm:text-5xl">
          One Last Surprise...
        </h2>
        <p className="mt-4 font-body text-sm leading-relaxed text-balance sm:text-base">
          Something special is waiting just for you.
        </p>
        {isUnlocked && (
          <div className="mt-10 overflow-hidden rounded-xl border border-warm-gold/40 bg-linear-to-br from-ivory-white to-blush-pink/10 text-left shadow-sm shadow-warm-gold/15 motion-safe:animate-[hero-fade_1.2s_ease-out_both] sm:mt-12">
            <h3>
              <button
                id="final-letter-trigger"
                type="button"
                aria-expanded={isLetterOpen}
                aria-controls="final-letter-panel"
                onClick={() => setIsLetterOpen((open) => !open)}
                className="flex min-h-16 w-full cursor-pointer items-center justify-between gap-4 px-4 py-5 text-left font-heading text-2xl leading-tight font-medium transition-colors hover:bg-blush-pink/20 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-burgundy motion-reduce:transition-none sm:px-6"
              >
                <span className="min-w-0">One Final Letter For You</span>
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className={`size-4 shrink-0 transition-transform duration-300 motion-reduce:transition-none ${isLetterOpen ? 'rotate-180' : ''}`}
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>
            </h3>
            <div
              id="final-letter-panel"
              role="region"
              aria-labelledby="final-letter-trigger"
              aria-hidden={!isLetterOpen}
              inert={!isLetterOpen}
              className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none ${isLetterOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
            >
              <div className="min-h-0 overflow-hidden">
                <div className="px-4 pt-2 pb-6 sm:px-6">
                  {isLetterOpen && (finalLetterImage && !imageFailed ? (
                    <button
                      type="button"
                      aria-label="View the final handwritten birthday letter at a larger size"
                      aria-haspopup="dialog"
                      onClick={() => setIsViewingLetter(true)}
                      className="block w-full cursor-zoom-in rounded-lg border border-soft-rose/60 shadow-sm shadow-burgundy/5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-burgundy"
                    >
                      <img
                        src={finalLetterImage}
                        alt="Final handwritten birthday letter"
                        loading="lazy"
                        decoding="async"
                        onError={() => setImageFailed(true)}
                        className="mx-auto h-auto w-full rounded-lg object-contain"
                      />
                    </button>
                  ) : (
                    <p className="font-body text-sm leading-relaxed">Final letter photo coming soon.</p>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
        <div
          role="status"
          aria-live={isUnlocked && embedUrl ? 'off' : 'polite'}
          aria-atomic="true"
          className="relative mt-10 grid aspect-video w-full place-items-center overflow-hidden rounded-xl border border-soft-rose/60 bg-linear-to-br from-ivory-white via-blush-pink/25 to-warm-gold/15 p-4 shadow-sm shadow-warm-gold/15 sm:mt-12 sm:p-6"
        >
          {isUnlocked ? (
            embedUrl ? (
              <iframe
                loading="lazy"
                src={embedUrl}
                title="A birthday video made just for you"
                allow="encrypted-media; picture-in-picture; fullscreen"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
                className="absolute inset-0 h-full w-full border-0 motion-safe:animate-[hero-fade_1.2s_ease-out_both]"
              />
            ) : (
              <p className="font-body text-xs leading-relaxed text-balance motion-safe:animate-[hero-fade_1.2s_ease-out_both] sm:text-sm">
                A special video is coming soon.
              </p>
            )
          ) : (
            <div className="flex flex-col items-center gap-3">
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="size-10 rounded-full bg-warm-gold/10 p-2 ring-1 ring-warm-gold/30 sm:size-12 sm:p-3"
              >
                <rect x="5" y="10" width="14" height="11" rx="2" />
                <path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" strokeLinecap="round" />
              </svg>
              <p className="font-body text-xs leading-relaxed text-balance sm:text-sm">
                A little magic is waiting for your special day.
              </p>
            </div>
          )}
        </div>
      </div>
      {isUnlocked && (
        <dialog
          ref={viewerRef}
          aria-labelledby="final-letter-viewer-title"
          onCancel={() => setIsViewingLetter(false)}
          className="fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none border-0 bg-ivory-white p-0 text-burgundy"
        >
          <div className="flex h-full flex-col">
            <div className="flex shrink-0 items-center justify-between gap-4 border-b border-blush-pink px-4 py-4 sm:px-8">
              <h2 id="final-letter-viewer-title" className="max-h-[25dvh] min-w-0 overflow-y-auto font-heading text-2xl font-medium break-words">
                One Final Letter For You
              </h2>
              <button
                type="button"
                autoFocus
                onClick={() => setIsViewingLetter(false)}
                className="min-h-11 shrink-0 cursor-pointer rounded-full border border-soft-rose/60 px-5 py-2 font-body text-sm leading-relaxed font-medium transition-colors hover:bg-blush-pink/30 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-burgundy motion-reduce:transition-none"
              >
                Close
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-8">
              {isViewingLetter && (imageFailed ? (
                <p role="status" className="font-body text-sm">Final letter photo coming soon.</p>
              ) : (
                <img
                  src={finalLetterImage}
                  alt="Enlarged final handwritten birthday letter"
                  loading="lazy"
                  decoding="async"
                  onError={() => setImageFailed(true)}
                  className="mx-auto block h-auto w-full max-w-6xl rounded-lg border border-blush-pink object-contain shadow-sm shadow-burgundy/5"
                />
              ))}
            </div>
          </div>
        </dialog>
      )}
    </section>
  );
}
export default memo(SurpriseSection);
