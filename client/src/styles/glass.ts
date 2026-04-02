import React from 'react';

export interface GlassOptions {
  blur?: number;
  bg?: string;
  border?: string;
  fallbackBg?: string;
  fallbackBorder?: string;
}

/**
 * Returns a CSSProperties object with glassmorphism styles.
 * Uses CSS.supports to detect backdrop-filter support and falls back to solid colours.
 */
export function glassStyle(opts?: GlassOptions): React.CSSProperties {
  const {
    blur = 12,
    bg = 'rgba(13,1,0,0.6)',
    border = '1px solid rgba(140,16,7,0.3)',
    fallbackBg = 'var(--surface-container-low)',
    fallbackBorder = '1px solid var(--border)',
  } = opts ?? {};

  const supported =
    typeof CSS !== 'undefined' &&
    CSS.supports('backdrop-filter', 'blur(1px)');

  if (!supported) {
    return {
      background: fallbackBg,
      border: fallbackBorder,
    };
  }

  return {
    backdropFilter: `blur(${blur}px)`,
    WebkitBackdropFilter: `blur(${blur}px)`,
    background: bg,
    border,
  };
}
