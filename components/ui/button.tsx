'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface SpotlightButtonProps {
  children: React.ReactNode;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
}

export function SpotlightButton({ children, href, onClick, disabled, className, type = 'button' }: SpotlightButtonProps) {
  const ref = useRef<HTMLElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    if (!ref.current || isFocused) return;
    const rect = ref.current.getBoundingClientRect();
    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const sharedProps = {
    onMouseMove: handleMouseMove,
    onFocus: () => { setIsFocused(true); setOpacity(1); },
    onBlur: () => { setIsFocused(false); setOpacity(0); },
    onMouseEnter: () => setOpacity(1),
    onMouseLeave: () => setOpacity(0),
    className: cn(
      "relative inline-flex h-12 items-center justify-center overflow-hidden rounded-xl border border-blue-400/40 bg-gradient-to-r from-blue-500 to-blue-700 px-6 font-medium text-white shadow-lg shadow-blue-200 transition-colors focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed",
      className
    ),
  };

  const inner = (
    <>
      <div
        className="pointer-events-none absolute -inset-px transition duration-300"
        style={{
          opacity,
          background: `radial-gradient(100px circle at ${position.x}px ${position.y}px, rgba(255,255,255,0.15), transparent)`,
        }}
      />
      <span className="relative z-20">{children}</span>
    </>
  );

  // Render as Link when href is provided, otherwise as button
  if (href) {
    return (
      <Link href={href} ref={ref as React.Ref<HTMLAnchorElement>} {...sharedProps}>
        {inner}
      </Link>
    );
  }

  return (
    <button ref={ref as React.Ref<HTMLButtonElement>} type={type} onClick={onClick} disabled={disabled} {...sharedProps}>
      {inner}
    </button>
  );
}
