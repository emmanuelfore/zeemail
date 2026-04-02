import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const tokensPath = resolve(__dirname, '../styles/tokens.css');
const indexHtmlPath = resolve(__dirname, '../../index.html');

const tokensCSS = readFileSync(tokensPath, 'utf-8');
const indexHTML = readFileSync(indexHtmlPath, 'utf-8');

describe('Font tokens (tokens.css)', () => {
  it('contains --font-heading with Syne', () => {
    expect(tokensCSS).toMatch(/--font-heading:\s*'Syne'/);
  });

  it('contains --font-body with Inter', () => {
    expect(tokensCSS).toMatch(/--font-body:\s*'Inter'/);
  });
});

describe('Google Fonts links (index.html)', () => {
  it('has preconnect to fonts.googleapis.com', () => {
    expect(indexHTML).toContain('rel="preconnect" href="https://fonts.googleapis.com"');
  });

  it('has preconnect to fonts.gstatic.com with crossorigin', () => {
    expect(indexHTML).toContain('href="https://fonts.gstatic.com"');
    expect(indexHTML).toContain('crossorigin');
  });

  it('loads Inter and Syne with display=swap', () => {
    expect(indexHTML).toContain('family=Inter');
    expect(indexHTML).toContain('family=Syne');
    expect(indexHTML).toContain('display=swap');
  });

  it('loads Inter weights 400, 500, 600, 700', () => {
    expect(indexHTML).toMatch(/Inter.*wght@400;500;600;700/);
  });

  it('loads Syne weights 700, 800', () => {
    expect(indexHTML).toMatch(/Syne.*wght@700;800/);
  });
});
