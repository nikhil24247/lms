import { useEffect, useRef, useState } from 'react';

export function AnimatedNumber({
  value,
  duration = 700,
  className = '',
}: {
  value: number;
  duration?: number;
  className?: string;
}) {
  const [display, setDisplay] = useState(0);
  const fromRef = useRef(0);

  useEffect(() => {
    const from = fromRef.current;
    const to = value;
    const start = performance.now();

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) ** 3;
      const next = Math.round(from + (to - from) * eased);
      setDisplay(next);
      if (t < 1) requestAnimationFrame(tick);
      else fromRef.current = to;
    };

    requestAnimationFrame(tick);
  }, [value, duration]);

  return <span className={className}>{display}</span>;
}
