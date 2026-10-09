'use client';
import { useEffect, useRef, useState } from 'react';

/** A number that climbs to its value, so earning points is something you see. */
export function CountUp({ value, className }: { value: number; className?: string }) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);

  useEffect(() => {
    const start = from.current;
    if (start === value) return;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { from.current = value; setShown(value); return; }

    const began = performance.now();
    const ms = 650;
    let frame = 0;
    const step = (now: number) => {
      const p = Math.min(1, (now - began) / ms);
      // Ease out, so it arrives gently rather than stopping dead.
      const eased = 1 - (1 - p) ** 3;
      setShown(Math.round(start + (value - start) * eased));
      if (p < 1) frame = requestAnimationFrame(step);
      else from.current = value;
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return <span className={className}>{shown.toLocaleString('en-US')}</span>;
}
