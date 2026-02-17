"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type HeaderHelpTooltipProps = {
  label: string;
  text: string;
  title: string;
};

export default function HeaderHelpTooltip({
  label,
  text,
  title,
}: HeaderHelpTooltipProps) {
  const triggerRef = useRef<HTMLSpanElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [position, setPosition] = useState({ left: 0, top: 0 });

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (!isOpen) return;

    const updatePosition = () => {
      const el = triggerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setPosition({
        left: rect.left + rect.width / 2,
        top: rect.bottom + 6,
      });
    };

    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [isOpen]);

  return (
    <span className="inline-flex items-center gap-1">
      {label}
      <span
        ref={triggerRef}
        className="inline-flex shrink-0 cursor-help rounded-full border border-text-secondary/50 w-3.5 h-3.5 items-center justify-center text-[8px] text-text-secondary hover:text-accent hover:border-accent"
        title={title}
        role="button"
        tabIndex={0}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setIsOpen(false)}
      >
        ?
      </span>
      {mounted &&
        isOpen &&
        createPortal(
          <span
            className="fixed z-[120] w-56 max-w-[calc(100vw-1rem)] -translate-x-1/2 rounded border border-[#222] bg-card px-2.5 py-2 text-[9px] font-normal normal-case tracking-normal text-text-primary shadow-lg leading-relaxed pointer-events-none"
            style={{
              left: `${position.left}px`,
              top: `${Math.max(8, position.top)}px`,
            }}
          >
            <span className="block font-medium text-accent mb-0.5">{title}</span>
            {text}
          </span>,
          document.body
        )}
    </span>
  );
}
