export default function CountdownTimer({ countdown }) {
  const { days, hours, minutes, seconds, isComplete } = countdown;
  const units = [
    ['Days', String(days)],
    ['Hours', String(hours).padStart(2, '0')],
    ['Minutes', String(minutes).padStart(2, '0')],
    ['Seconds', String(seconds).padStart(2, '0')],
  ];

  function openSurprise() {
    if (!isComplete) return;

    document.getElementById('surprise')?.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      block: 'start',
    });
  }

  return (
    <div className="hero-countdown-enter mt-6 font-body text-sm leading-relaxed text-burgundy sm:mt-8">
      <div className="mx-auto grid min-h-32 w-full max-w-lg items-center">
        <div
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="col-start-1 row-start-1"
        >
          {isComplete && (
            <div className="rounded-xl border border-soft-rose/60 bg-linear-to-br from-ivory-white/90 via-blush-pink/25 to-warm-gold/10 px-4 py-4 shadow-[0_0_32px] shadow-warm-gold/20 motion-safe:animate-[hero-rise_1.2s_ease-out_both] sm:px-6">
              <h2 className="font-heading text-2xl leading-tight font-medium text-balance sm:text-4xl">
                It's Your Day, My Love!
              </h2>
              <p className="mt-2 text-xs leading-relaxed text-balance sm:text-sm">
                Happy Birthday to the most beautiful part of my life.
              </p>
            </div>
          )}
        </div>
        {!isComplete && (
          <div
            role="timer"
            aria-live="off"
            aria-label="Time remaining until the configured date"
            className="col-start-1 row-start-1"
          >
            <dl className="grid w-full grid-cols-4 gap-2 sm:gap-4">
              {units.map(([label, value]) => (
                <div
                  key={label}
                  className="flex min-w-0 flex-col items-center rounded-xl border border-soft-rose/60 bg-ivory-white/80 px-1 py-3 shadow-sm shadow-burgundy/5 sm:px-3 sm:py-5"
                >
                  <dt className="mt-1 text-[10px] font-medium tracking-wide sm:text-xs">
                    {label}
                  </dt>
                  <dd className="order-first font-heading text-3xl leading-none font-medium tabular-nums sm:text-5xl">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </div>
      <div className="hero-surprise-enter mt-4 flex flex-col items-center gap-2">
        <button
          type="button"
          disabled={!isComplete}
          aria-describedby={!isComplete ? 'surprise-unlock-hint' : undefined}
          onClick={openSurprise}
          className={`min-h-11 max-w-full cursor-pointer rounded-full border border-warm-gold/50 bg-burgundy px-6 py-3 text-sm font-medium text-ivory-white shadow-sm shadow-warm-gold/20 transition-colors duration-200 enabled:hover:bg-burgundy/90 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-burgundy disabled:cursor-not-allowed disabled:border-soft-rose/70 disabled:bg-blush-pink/50 disabled:text-burgundy/75 motion-reduce:transition-none ${isComplete ? 'motion-safe:animate-[hero-rise_1s_ease-out_both]' : ''}`}
        >
          Open Your Surprise
        </button>
        <p id="surprise-unlock-hint" className="min-h-10 text-xs sm:min-h-5">
          {!isComplete && 'Your surprise unlocks on your birthday.'}
        </p>
      </div>
    </div>
  );
}
