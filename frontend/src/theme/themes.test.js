// Contraste de cada tema (WCAG 2.1), lido direto de themes.css: uma paleta nova que não passe quebra o CI.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { THEME_IDS } from './themes';

const css = readFileSync(fileURLToPath(new URL('./themes.css', import.meta.url)), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const html = readFileSync(fileURLToPath(new URL('../../index.html', import.meta.url)), 'utf8');

function declarations(body) {
  const tokens = {};
  for (const [, name, value] of body.matchAll(/--([\w-]+):\s*([^;]+);/g)) tokens[name] = value.trim();
  return tokens;
}

function block(selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = css.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`));
  return match ? declarations(match[1]) : null;
}

const derived = block('[data-theme] ');
const paletteOf = (id) => ({ ...derived, ...block(`[data-theme='${id}']`) });

const hexToRgb = (hex) => {
  const value = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(value.slice(i, i + 2), 16));
};

// Resolve um token até virar [r, g, b, a]: hex, var(--x) ou color-mix(in srgb, A P%, B).
function resolve(value, palette, depth = 0) {
  if (depth > 12) throw new Error(`Referência circular em ${value}`);
  const text = value.trim();
  if (text === 'transparent') return [0, 0, 0, 0];
  if (/^#[0-9a-f]{6}$/i.test(text)) return [...hexToRgb(text), 1];
  // var(--x, reserva): vale a variável se o tema a define (e não como `initial`); senão, a reserva.
  const withFallback = text.match(/^var\(--([\w-]+),\s*(.+)\)$/);
  if (withFallback) {
    const own = palette[withFallback[1]];
    return resolve(own && own !== 'initial' ? own : withFallback[2], palette, depth + 1);
  }
  const variable = text.match(/^var\(--([\w-]+)\)$/);
  if (variable) {
    const next = palette[variable[1]];
    if (next === undefined) throw new Error(`Token --${variable[1]} não definido`);
    return resolve(next, palette, depth + 1);
  }
  const mix = text.match(/^color-mix\(in srgb,\s*(.+?)\s+(var\(--[\w-]+\)|[\d.]+%),\s*(.+)\)$/);
  if (mix) {
    const amount = mix[2].endsWith('%') ? mix[2] : resolveRaw(mix[2], palette);
    const p = parseFloat(amount) / 100;
    const a = resolve(mix[1], palette, depth + 1);
    const b = resolve(mix[3], palette, depth + 1);
    // Mistura em srgb com alfa pré-multiplicado, como o navegador faz.
    const alpha = a[3] * p + b[3] * (1 - p);
    const channel = (i) => (alpha === 0 ? 0 : (a[i] * a[3] * p + b[i] * b[3] * (1 - p)) / alpha);
    return [channel(0), channel(1), channel(2), alpha];
  }
  throw new Error(`Valor não suportado no teste: ${text}`);
}

function resolveRaw(value, palette) {
  const variable = value.match(/^var\(--([\w-]+)\)$/);
  return variable ? resolveRaw(palette[variable[1]], palette) : value;
}

const luminance = ([r, g, b]) => {
  const linear = (c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
};

export function contrast(foreground, background) {
  const [l1, l2] = [luminance(foreground), luminance(background)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

// [texto, fundo, mínimo]
const PAIRS = [
  ['ink', 'bg', 4.5],
  ['ink', 'surface', 4.5],
  ['accent-text', 'bg', 4.5],
  ['accent-text', 'surface', 4.5],
  ['on-accent', 'accent-fill', 4.5],
  ['header-ink', 'header', 4.5],
  ['secondary-icon', 'bg', 3],
  ['secondary-icon', 'surface', 3],
  // Derivados usados como texto ou borda de campo.
  ['ink-soft', 'bg', 4.5],
  ['ink-soft', 'surface', 4.5],
  ['muted', 'bg', 4.5],
  ['muted', 'surface', 4.5],
  ['secondary-text', 'bg', 4.5],
  ['secondary-text', 'surface', 4.5],
  ['danger', 'bg', 4.5],
  ['danger', 'surface', 4.5],
  ['good', 'bg', 4.5],
  ['good', 'surface', 4.5],
  // Faixas de efetividade (cores fixas) com o texto claro fixo: ficha, Calculadora de defesa.
  ['fixed-light', 'eff-weak-4', 4.5],
  ['fixed-light', 'eff-weak-2', 4.5],
  ['fixed-light', 'eff-resist-2', 4.5],
  ['fixed-light', 'eff-resist-4', 4.5],
  // Células da Tabela de tipos, com e sem o destaque de linha/coluna.
  ['chart-x2-text', 'chart-x2-bg', 4.5],
  ['chart-half-text', 'chart-half-bg', 4.5],
  ['ink', 'chart-zero-bg', 4.5],
  ['chart-x2-text', 'chart-x2-bg-hl', 4.5],
  ['chart-half-text', 'chart-half-bg-hl', 4.5],
  ['ink', 'chart-zero-bg-hl', 4.5],
  ['magenta', 'surface', 4.5],
  ['smogon', 'surface', 4.5],
  ['ink', 'surface-2', 4.5],
  ['border-strong', 'bg', 3],
  ['header-ink', 'header-solid', 4.5],
  ['header-placeholder', 'header', 4.5],
  ['on-accent', 'accent-fill-hover', 4.5],
];

describe('temas', () => {
  it('a lista de ids é a mesma em themes.js, themes.css e no script do index.html', () => {
    const cssIds = [...css.matchAll(/\[data-theme='([\w-]+)'\]/g)].map((m) => m[1]);
    expect(cssIds).toEqual(THEME_IDS);
    const inline = html.match(/var THEMES = \[([^\]]+)\]/);
    expect(inline, 'script de tema no <head>').not.toBeNull();
    expect(inline[1].match(/[\w-]+/g)).toEqual(THEME_IDS);
  });

  it('a cor do theme-color no script do <head> é o --header de cada tema', () => {
    const headers = html.match(/var HEADERS = \{([^}]+)\}/);
    expect(headers, 'mapa HEADERS no <head>').not.toBeNull();
    const inline = Object.fromEntries([...headers[1].matchAll(/'?([\w-]+)'?:\s*'(#[0-9a-f]{6})'/gi)].map((m) => [m[1], m[2].toLowerCase()]));
    for (const id of THEME_IDS) expect(inline[id], id).toBe(paletteOf(id).header.toLowerCase());
  });

  // Fios dos chips de tipo, onde o tema define um opaco: ≥3:1 com a superfície (contorno de elemento, não texto).
  it.each(THEME_IDS)('fios opacos dos chips de tipo de %s têm 3:1 com a superfície', (id) => {
    const palette = paletteOf(id);
    for (const token of ['chip-edge', 'chip-edge-pale']) {
      if (!palette[token] || palette[token] === 'initial') continue;
      const edge = resolve(`var(--${token})`, palette);
      if (edge[3] < 1) continue;
      expect(contrast(edge, resolve('var(--surface)', palette)), `${id}: ${token}`).toBeGreaterThanOrEqual(3);
    }
  });

  describe.each(THEME_IDS)('%s', (id) => {
    const palette = paletteOf(id);
    it.each(PAIRS)('%s sobre %s ≥ %s', (fg, bg, min) => {
      const ratio = contrast(resolve(`var(--${fg})`, palette), resolve(`var(--${bg})`, palette));
      expect(Number(ratio.toFixed(2)), `${id}: ${fg}/${bg} = ${ratio.toFixed(2)}`).toBeGreaterThanOrEqual(min);
    });
  });
});
