import { RandomPool } from './crypto';

interface ImageGeneratorResult {
  image: string;
  answer: string;
  question: string;
}

const CHAR_POOL_EASY   = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const CHAR_POOL_MEDIUM = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CHAR_POOL_HARD   = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';

const SVG_WIDTH  = 200;
const SVG_HEIGHT = 70;

// prevents XML injection via user-controlled strings embedded in SVG
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function generateText(pool: RandomPool, charPool: string, length: number): string {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += charPool[pool.byte() % charPool.length]!;
  }
  return result;
}

// each character is rendered individually with rotation and offset to resist OCR
function renderChar(pool: RandomPool, char: string, x: number, baseY: number, colorHex: string): string {
  const rotate  = pool.int(-25, 25);
  const offsetY = pool.int(-6, 6);
  const fontSize = pool.int(22, 30);
  const opacity  = (pool.float() * 0.25 + 0.75).toFixed(2);

  return `<text x="${x}" y="${baseY + offsetY}" transform="rotate(${rotate},${x},${baseY + offsetY})" font-size="${fontSize}" font-family="monospace" font-weight="bold" fill="${colorHex}" opacity="${opacity}" letter-spacing="2">${escapeXml(char)}</text>`;
}

function grayColor(pool: RandomPool): string {
  const v = pool.int(100, 200);
  return `rgb(${v},${v},${v})`;
}

function darkColor(pool: RandomPool): string {
  const r = pool.int(20, 150);
  const g = pool.int(20, 150);
  const b = pool.int(20, 150);
  return `rgb(${r},${g},${b})`;
}

// interference lines make automated segment extraction harder
function renderNoiseLines(pool: RandomPool, count: number): string {
  let lines = '';
  for (let i = 0; i < count; i++) {
    const x1 = pool.int(0, SVG_WIDTH);
    const y1 = pool.int(0, SVG_HEIGHT);
    const x2 = pool.int(0, SVG_WIDTH);
    const y2 = pool.int(0, SVG_HEIGHT);
    const strokeWidth = (pool.float() * 1.5 + 0.5).toFixed(1);
    const color   = grayColor(pool);
    const opacity = (pool.float() * 0.4 + 0.2).toFixed(2);
    lines += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${strokeWidth}" opacity="${opacity}"/>`;
  }
  return lines;
}

// noise dots add pixel-level entropy that defeats simple segmentation
function renderNoiseDots(pool: RandomPool, count: number): string {
  let dots = '';
  for (let i = 0; i < count; i++) {
    const cx      = pool.int(0, SVG_WIDTH);
    const cy      = pool.int(0, SVG_HEIGHT);
    const r       = pool.int(1, 3);
    const color   = grayColor(pool);
    const opacity = (pool.float() * 0.5 + 0.1).toFixed(2);
    dots += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}" opacity="${opacity}"/>`;
  }
  return dots;
}

// sinusoidal wave distortion applied as a path overlay
function renderWavePath(pool: RandomPool): string {
  const amplitude  = pool.int(3, 8);
  const frequency  = pool.float() * 0.08 + 0.04;
  const phaseShift = pool.float() * Math.PI * 2;
  const strokeColor = grayColor(pool);

  let d = `M 0 ${SVG_HEIGHT / 2}`;
  for (let x = 1; x <= SVG_WIDTH; x += 2) {
    const y = SVG_HEIGHT / 2 + amplitude * Math.sin(frequency * x + phaseShift);
    d += ` L ${x} ${y.toFixed(2)}`;
  }

  return `<path d="${d}" stroke="${strokeColor}" stroke-width="1.5" fill="none" opacity="0.35"/>`;
}

function buildSvg(pool: RandomPool, text: string, difficulty: 'easy' | 'medium' | 'hard'): string {
  const charCount = text.length;
  const spacing   = SVG_WIDTH / (charCount + 1);
  const baseY     = SVG_HEIGHT / 2 + 8;

  const noiseLineCount = difficulty === 'easy' ? 4  : difficulty === 'medium' ? 7  : 10;
  const noiseDotCount  = difficulty === 'easy' ? 20 : difficulty === 'medium' ? 40 : 60;
  const waveCount      = difficulty === 'easy' ? 1  : difficulty === 'medium' ? 2  : 3;

  const bgGray = pool.int(235, 250);
  const background = `<rect width="${SVG_WIDTH}" height="${SVG_HEIGHT}" fill="rgb(${bgGray},${bgGray},${bgGray})" rx="6"/>`;

  let chars = '';
  for (let i = 0; i < charCount; i++) {
    const x     = Math.round(spacing * (i + 1));
    const color = darkColor(pool);
    chars += renderChar(pool, text[i]!, x, baseY, color);
  }

  let waves = '';
  for (let i = 0; i < waveCount; i++) {
    waves += renderWavePath(pool);
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SVG_WIDTH}" height="${SVG_HEIGHT}" viewBox="0 0 ${SVG_WIDTH} ${SVG_HEIGHT}">${background}${renderNoiseDots(pool, noiseDotCount)}${renderNoiseLines(pool, noiseLineCount)}${waves}${chars}</svg>`;
}

function svgToDataUri(svg: string): string {
  // btoa requires a binary string; TextEncoder gives us the UTF-8 bytes
  const bytes = new TextEncoder().encode(svg);
  const binString = Array.from(bytes, b => String.fromCodePoint(b)).join('');
  return `data:image/svg+xml;base64,${btoa(binString)}`;
}

export class ImageGenerator {
  static generate(difficulty: 'easy' | 'medium' | 'hard'): ImageGeneratorResult {
    // single pool allocation covers all random needs for this image — ~1 crypto
    // call instead of the ~500 individual randomBytes(4) calls it replaced
    const pool = new RandomPool(2048);

    const charPool = difficulty === 'easy' ? CHAR_POOL_EASY : difficulty === 'medium' ? CHAR_POOL_MEDIUM : CHAR_POOL_HARD;
    const length   = difficulty === 'easy' ? 4 : difficulty === 'medium' ? 5 : 6;
    const answer   = generateText(pool, charPool, length);
    const svg      = buildSvg(pool, answer, difficulty);
    const image    = svgToDataUri(svg);

    return {
      image,
      answer: answer.toLowerCase(),
      question: 'Type the characters shown in the image'
    };
  }
}
