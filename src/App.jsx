import HeroSection from './sections/HeroSection.jsx';
import LettersSection from './sections/LettersSection.jsx';
import SurpriseSection from './sections/SurpriseSection.jsx';
import useCountdown from './hooks/useCountdown.js';

// Birthday starts at midnight on 21 October, India Standard Time.
const countdownTarget = '2026-10-21T00:00:00+05:30';

export default function App() {
  const countdown = useCountdown(countdownTarget);

  return (
    <main>
      <HeroSection countdown={countdown} />
      <LettersSection />
      <SurpriseSection isUnlocked={countdown.isComplete} />
    </main>
  );
}
