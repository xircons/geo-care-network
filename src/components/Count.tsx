import { useEffect, useState } from "react";

interface CountProps {
  to: number;
  duration?: number;
}

export default function Count({ to, duration = 900 }: CountProps) {
  const [n, setN] = useState(0);

  useEffect(() => {
    let raf = 0;
    let start = 0;
    const step = (time: number) => {
      if (!start) {
        start = time;
      }
      const p = Math.min(1, (time - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(Math.round(eased * to));
      if (p < 1) {
        raf = requestAnimationFrame(step);
      }
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [to, duration]);

  return <span>{n}</span>;
}
