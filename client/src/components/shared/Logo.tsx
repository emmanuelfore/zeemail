import React from 'react';

interface LogoProps {
  className?: string;
  style?: React.CSSProperties;
  color?: string;
  size?: 'sm' | 'md' | 'lg' | number;
  onClick?: () => void;
  iconOnly?: boolean;
}

export function Logo({ color = '#8C1007', size = 'md', style, className, onClick, iconOnly = false }: LogoProps) {
  const isNumericSize = typeof size === 'number';
  const fontSize = isNumericSize ? `${size * 0.6}px` : size === 'sm' ? '1.125rem' : size === 'lg' ? '1.75rem' : '1.375rem';
  const iconWidth = isNumericSize ? size : size === 'sm' ? 20 : 26;
  const iconHeight = isNumericSize ? size * 0.9 : size === 'sm' ? 18 : 24;
  
  return (
    <div 
      className={className}
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        fontWeight: 800,
        fontFamily: "'Outfit', sans-serif",
        color,
        fontSize,
        letterSpacing: '-0.02em',
        cursor: 'pointer',
        ...style
      }}
    >
      <div style={{
        width: `${iconWidth}px`,
        height: `${iconHeight}px`,
        background: color,
        borderRadius: isNumericSize ? `${size * 0.15}px` : '4px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontSize: isNumericSize ? `${size * 0.5}px` : size === 'sm' ? '10px' : '14px',
        fontWeight: 900,
        flexShrink: 0,
        boxShadow: `0 4px 12px ${color}44`
      }}>
        Z
      </div>
      {!iconOnly && (
        <span style={{ position: 'relative' }}>
          ZeeMail
          <div style={{
            position: 'absolute',
            bottom: '-2px',
            left: 0,
            width: '40%',
            height: '2px',
            background: color,
            opacity: 0.3,
            borderRadius: '1px'
          }} />
        </span>
      )}
    </div>
  );
}
