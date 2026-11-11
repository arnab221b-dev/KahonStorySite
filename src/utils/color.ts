import type { Palette } from '../types';

export const DEFAULT_PALETTE: Palette = {
  dominant: '#4a3319',
  vibrant: '#ff9900',
  secondary: '#3a2b1c',
  deep: '#1f1812',
};

export function hexToRgbTuple(hex: string): string {
  const clean = hex.replace('#', '').trim();
  if (clean.length !== 6) return '255, 153, 0';
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  if ([r, g, b].some(Number.isNaN)) return '255, 153, 0';
  return `${r}, ${g}, ${b}`;
}

export function applyAmbientPalette(palette: Palette | undefined): void {
  const p = palette || DEFAULT_PALETTE;
  const root = document.documentElement;
  root.style.setProperty('--ambient-dominant', p.dominant);
  root.style.setProperty('--ambient-vibrant', p.vibrant);
  root.style.setProperty('--ambient-secondary', p.secondary);
  root.style.setProperty('--ambient-deep', p.deep);
  root.style.setProperty('--ambient-dominant-rgb', hexToRgbTuple(p.dominant));
  root.style.setProperty('--ambient-vibrant-rgb', hexToRgbTuple(p.vibrant));
  root.style.setProperty('--ambient-secondary-rgb', hexToRgbTuple(p.secondary));
  root.style.setProperty('--ambient-deep-rgb', hexToRgbTuple(p.deep));
}
