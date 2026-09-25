import { useEffect, useRef, useState } from "react";
import type { ElementType } from "react";

const GLYPHS = "!<>-_\\/[]{}=+*^?#01$%&";

interface DecryptTextProps {
  text: string;
  className?: string;
  as?: ElementType;
  /** ms between reveal steps — lower is faster */
  speed?: number;
}

/** On hover, scrambles through random glyphs before resolving back to the real text, left to right. */
export function DecryptText({ text, className = "", as: Tag = "span", speed = 28 }: DecryptTextProps) {
  const [display, setDisplay] = useState(text);
  const intervalRef = useRef<number | null>(null);
  const stepRef = useRef(0);

  function stop() {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }

  function scramble() {
    stop();
    stepRef.current = 0;
    intervalRef.current = window.setInterval(() => {
      stepRef.current += 1;
      const revealCount = stepRef.current - 3; // brief full-scramble stagger before reveal starts
      setDisplay(
        text
          .split("")
          .map((ch, i) => {
            if (ch === " ") return " ";
            if (i < revealCount) return ch;
            return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
          })
          .join(""),
      );
      if (revealCount >= text.length) {
        stop();
        setDisplay(text);
      }
    }, speed);
  }

  useEffect(() => () => stop(), []);

  // Keep in sync when the source text changes externally (e.g. a toggled label).
  useEffect(() => {
    stop();
    setDisplay(text);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  return (
    <Tag className={className} onMouseEnter={scramble}>
      {display}
    </Tag>
  );
}
