/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';

const processedCache = new Map<string, string>();

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean;
  const num = parseInt(full, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

/**
 * Loads an uploaded monochrome brand image, strips its light/white background
 * into true alpha transparency, optionally strengthens/bolds stroke weight
 * without altering the glyph shapes or spacing, recolors ink pixels to
 * `colorHex`, and trims excess empty outer margins preserving exact 1:1 proportions.
 */
function useTransparentBrandAsset(
  src: string,
  colorHex: string,
  paddingRatio: number,
  bolden: boolean
): string | null {
  const cacheKey = `${src}::${colorHex}::${paddingRatio}::${bolden ? 'b1' : 'b0'}`;
  const [dataUrl, setDataUrl] = useState<string | null>(() => processedCache.get(cacheKey) || null);

  useEffect(() => {
    const cached = processedCache.get(cacheKey);
    if (cached) {
      setDataUrl(cached);
      return;
    }

    let cancelled = false;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (cancelled) return;
      try {
        const w = img.naturalWidth;
        const h = img.naturalHeight;
        if (!w || !h) return;

        const srcCanvas = document.createElement('canvas');
        srcCanvas.width = w;
        srcCanvas.height = h;
        const srcCtx = srcCanvas.getContext('2d');
        if (!srcCtx) return;

        srcCtx.drawImage(img, 0, 0);
        const imageData = srcCtx.getImageData(0, 0, w, h);
        const data = imageData.data;
        const [tr, tg, tb] = hexToRgb(colorHex);

        // Higher inkFloor gives fuller, bolder anti-aliased strokes
        const bgCutoff = bolden ? 236 : 218;
        const inkFloor = bolden ? 120 : 45;
        const span = bgCutoff - inkFloor;

        const alphaMap = new Uint8ClampedArray(w * h);

        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const p = y * w + x;
            const idx = p * 4;
            const origAlpha = data[idx + 3];
            if (origAlpha === 0) {
              alphaMap[p] = 0;
              continue;
            }
            const lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
            if (lum >= bgCutoff) {
              alphaMap[p] = 0;
            } else {
              const inkStrength = lum <= inkFloor ? 1 : (bgCutoff - lum) / span;
              alphaMap[p] = Math.round(inkStrength * origAlpha);
            }
          }
        }

        // Subtle stroke weight reinforcement along existing glyphs (preserves font & spacing)
        const finalAlphas = bolden ? new Uint8ClampedArray(w * h) : alphaMap;
        if (bolden) {
          for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
              const p = y * w + x;
              let best = alphaMap[p];
              // Cardinal neighbors (0.85 weight) & diagonals (0.45 weight)
              if (x > 0) best = Math.max(best, Math.round(alphaMap[p - 1] * 0.85));
              if (x + 1 < w) best = Math.max(best, Math.round(alphaMap[p + 1] * 0.85));
              if (y > 0) best = Math.max(best, Math.round(alphaMap[p - w] * 0.85));
              if (y + 1 < h) best = Math.max(best, Math.round(alphaMap[p + w] * 0.85));
              if (x > 0 && y > 0) best = Math.max(best, Math.round(alphaMap[p - w - 1] * 0.45));
              if (x + 1 < w && y > 0) best = Math.max(best, Math.round(alphaMap[p - w + 1] * 0.45));
              if (x > 0 && y + 1 < h) best = Math.max(best, Math.round(alphaMap[p + w - 1] * 0.45));
              if (x + 1 < w && y + 1 < h) best = Math.max(best, Math.round(alphaMap[p + w + 1] * 0.45));
              finalAlphas[p] = best;
            }
          }
        }

        let minX = w;
        let minY = h;
        let maxX = -1;
        let maxY = -1;

        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const p = y * w + x;
            const idx = p * 4;
            const a = finalAlphas[p];
            if (a === 0) {
              data[idx + 3] = 0;
            } else {
              data[idx] = tr;
              data[idx + 1] = tg;
              data[idx + 2] = tb;
              data[idx + 3] = a;
              if (a > 8) {
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
              }
            }
          }
        }

        srcCtx.putImageData(imageData, 0, 0);

        if (maxX < minX || maxY < minY) {
          const fallbackUrl = srcCanvas.toDataURL('image/png');
          processedCache.set(cacheKey, fallbackUrl);
          if (!cancelled) setDataUrl(fallbackUrl);
          return;
        }

        const inkW = maxX - minX + 1;
        const inkH = maxY - minY + 1;
        const pad = Math.round(Math.max(inkW, inkH) * paddingRatio);

        const outCanvas = document.createElement('canvas');
        outCanvas.width = inkW + pad * 2;
        outCanvas.height = inkH + pad * 2;
        const outCtx = outCanvas.getContext('2d');
        if (!outCtx) return;

        outCtx.drawImage(srcCanvas, minX, minY, inkW, inkH, pad, pad, inkW, inkH);
        const outUrl = outCanvas.toDataURL('image/png');
        processedCache.set(cacheKey, outUrl);
        if (!cancelled) {
          setDataUrl(outUrl);
        }
      } catch {
        // Ignore canvas errors and allow fallback
      }
    };
    img.src = src;

    return () => {
      cancelled = true;
    };
  }, [src, colorHex, paddingRatio, bolden, cacheKey]);

  return dataUrl;
}

interface CapybaraLogoProps {
  colorHex?: string;
  className?: string;
}

export const CapybaraLogoImg: React.FC<CapybaraLogoProps> = ({
  colorHex = '#1D1D2B',
  className = 'w-full h-full object-contain select-none',
}) => {
  const src = '/assets/aistudio/Capybara_Pencil_Pole_Logo_4f7f9a24.png';
  const processed = useTransparentBrandAsset(src, colorHex, 0.08, false);

  return (
    <img
      src={processed || src}
      alt="CAPYBARA logo"
      referrerPolicy="no-referrer"
      className={
        processed
          ? className
          : `${className} brightness-[1.08] contrast-[1.15] mix-blend-multiply`
      }
    />
  );
};

interface CapybaraWordmarkProps {
  colorHex?: string;
  className?: string;
}

export const CapybaraWordmarkImg: React.FC<CapybaraWordmarkProps> = ({
  colorHex = '#1D1D2B',
  className = 'h-10 sm:h-12 w-auto object-contain select-none',
}) => {
  const src = '/assets/aistudio/Screenshot_2026-11-22_210850_075c472a.png';
  const processed = useTransparentBrandAsset(src, colorHex, 0.015, true);

  if (!processed) {
    return (
      <span
        className="inline-flex items-center font-serif italic font-bold text-3xl select-none"
        style={{ color: colorHex }}
      >
        Capybara
      </span>
    );
  }

  return (
    <img
      src={processed}
      alt="CAPYBARA"
      referrerPolicy="no-referrer"
      className={className}
    />
  );
};
