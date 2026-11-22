/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { CapybaraLogoImg, CapybaraWordmarkImg } from '../BrandAssets';

interface AuthLayoutProps {
  isDark: boolean;
  onToggleTheme: () => void;
  children: React.ReactNode;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({
  isDark,
  onToggleTheme,
  children,
}) => {
  return (
    <div
      className={`min-h-screen font-['Space_Grotesk',sans-serif] ${
        isDark ? 'dark bg-slate-950 text-slate-100' : 'bg-[#F8F7FC] text-[#202044]'
      } transition-colors duration-200 flex flex-col lg:flex-row`}
    >
      {/* Left Split Showcase Panel */}
      <div className="lg:w-[44%] xl:w-[42%] p-3 sm:p-5 lg:p-6 flex">
        <div
          className="relative w-full rounded-[26px] p-7 sm:p-10 text-white flex flex-col justify-between overflow-hidden shadow-[0_24px_60px_-15px_rgba(74,27,174,0.45)]"
          style={{
            background: 'linear-gradient(155deg, #7C42EB 0%, #612AD6 54%, #4518AD 100%)',
          }}
        >
          {/* Subtle CAD Coordinate Grid Overlay */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.14]"
            style={{
              backgroundImage:
                'linear-gradient(to right, rgba(255,255,255,0.28) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.28) 1px, transparent 1px)',
              backgroundSize: '36px 36px',
            }}
            aria-hidden="true"
          />

          {/* Top Brand Lockup */}
          <div className="relative z-10 flex items-center gap-3.5">
            <div className="w-14 h-14 aspect-square rounded-xl bg-[#F6F5FA] border border-white/30 p-0.5 flex items-center justify-center shrink-0 shadow-xs">
              <CapybaraLogoImg colorHex="#1D1D2B" />
            </div>
            <div>
              <CapybaraWordmarkImg
                colorHex="#FFFFFF"
                className="h-10 sm:h-12 w-auto object-contain select-none"
              />
              <div className="text-xs text-white/80 font-medium mt-1">
                Interactive Engineering Graphics Studio
              </div>
            </div>
          </div>

          {/* Center Hero Copy & First-Angle Projection Diagram */}
          <div className="relative z-10 my-8 lg:my-0 space-y-6">
            <div className="space-y-3.5">
              <h1 className="text-3xl sm:text-4xl font-bold leading-[1.15] tracking-tight text-balance">
                Master First-Angle Projections in 3D and 2D.
              </h1>
              <p className="text-sm sm:text-[15px] text-white/85 leading-relaxed max-w-md">
                Visualize points across quadrants, step through 8-stage rotating line constructions,
                and parse textbook problems directly into BIS SP 46 orthographic sheets.
              </p>
            </div>

            {/* Orthographic Projection Preview Card */}
            <div className="rounded-2xl bg-[#1A123A]/75 border border-white/15 backdrop-blur-md p-4 sm:p-5 shadow-inner">
              <div className="flex items-center justify-between gap-2 text-[10px] sm:text-[11px] font-mono tracking-wider text-white/70 mb-3">
                <span>FIRST-ANGLE PROJECTION · HP / VP REFERENCE</span>
                <span className="shrink-0 text-white/60">BIS SP 46:2003</span>
              </div>

              <svg
                viewBox="0 0 420 190"
                className="w-full h-auto"
                role="img"
                aria-label="First-angle orthographic projection diagram showing XY reference line, Front View above XY, and Top View below XY"
              >
                {/* Loci horizontal dashed lines */}
                <line
                  x1="90"
                  y1="42"
                  x2="335"
                  y2="42"
                  stroke="rgba(255,255,255,0.35)"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
                <line
                  x1="90"
                  y1="148"
                  x2="335"
                  y2="148"
                  stroke="rgba(255,255,255,0.35)"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />

                {/* Vertical projectors */}
                <line
                  x1="96"
                  y1="66"
                  x2="96"
                  y2="122"
                  stroke="rgba(255,255,255,0.45)"
                  strokeWidth="1.25"
                  strokeDasharray="3 3"
                />
                <line
                  x1="252"
                  y1="42"
                  x2="252"
                  y2="148"
                  stroke="rgba(255,255,255,0.45)"
                  strokeWidth="1.25"
                  strokeDasharray="3 3"
                />

                {/* XY Reference Line */}
                <line x1="28" y1="95" x2="352" y2="95" stroke="rgba(255,255,255,0.85)" strokeWidth="1.5" />
                <text x="14" y="99" fill="rgba(255,255,255,0.85)" fontSize="12" fontFamily="JetBrains Mono, monospace">
                  X
                </text>
                <text x="360" y="99" fill="rgba(255,255,255,0.85)" fontSize="12" fontFamily="JetBrains Mono, monospace">
                  Y
                </text>

                {/* True Length auxiliary construction lines */}
                <line
                  x1="96"
                  y1="66"
                  x2="282"
                  y2="42"
                  stroke="#A5B4FC"
                  strokeWidth="1.5"
                  strokeDasharray="3 3"
                />
                <line
                  x1="96"
                  y1="122"
                  x2="274"
                  y2="148"
                  stroke="#7DD3FC"
                  strokeWidth="1.5"
                  strokeDasharray="3 3"
                />

                {/* Front View Line (a'b') */}
                <line x1="96" y1="66" x2="252" y2="42" stroke="#FB7185" strokeWidth="2.8" strokeLinecap="round" />
                {/* Top View Line (ab) */}
                <line x1="96" y1="122" x2="252" y2="148" stroke="#38BDF8" strokeWidth="2.8" strokeLinecap="round" />

                {/* Points */}
                <circle cx="96" cy="66" r="3.5" fill="#FB7185" />
                <circle cx="252" cy="42" r="3.5" fill="#FB7185" />
                <circle cx="282" cy="42" r="3" fill="#C7D2FE" />
                <circle cx="96" cy="122" r="3.5" fill="#38BDF8" />
                <circle cx="252" cy="148" r="3.5" fill="#38BDF8" />
                <circle cx="274" cy="148" r="3" fill="#BAE6FD" />

                {/* Labels */}
                <text x="80" y="64" fill="#FFFFFF" fontSize="12" fontFamily="JetBrains Mono, monospace" fontWeight="600">
                  a′
                </text>
                <text x="249" y="31" fill="#FFFFFF" fontSize="12" fontFamily="JetBrains Mono, monospace" fontWeight="600">
                  b′
                </text>
                <text x="291" y="45" fill="rgba(255,255,255,0.88)" fontSize="11" fontFamily="JetBrains Mono, monospace">
                  b₁′ (TL)
                </text>
                <text x="358" y="45" fill="rgba(255,255,255,0.75)" fontSize="11" fontFamily="JetBrains Mono, monospace">
                  VP (FV)
                </text>

                <text x="82" y="138" fill="#FFFFFF" fontSize="12" fontFamily="JetBrains Mono, monospace" fontWeight="600">
                  a
                </text>
                <text x="248" y="166" fill="#FFFFFF" fontSize="12" fontFamily="JetBrains Mono, monospace" fontWeight="600">
                  b
                </text>
                <text x="282" y="156" fill="rgba(255,255,255,0.88)" fontSize="11" fontFamily="JetBrains Mono, monospace">
                  b₂ (TL)
                </text>
                <text x="358" y="152" fill="rgba(255,255,255,0.75)" fontSize="11" fontFamily="JetBrains Mono, monospace">
                  HP (TV)
                </text>
              </svg>
            </div>
          </div>

          {/* Quiet Footer Note */}
          <div className="relative z-10 text-xs text-white/70 font-mono">
            First-Angle Orthographic Standard · Unique EDID-XXXX Student Access
          </div>
        </div>
      </div>

      {/* Right Authentication Form Panel */}
      <div className="flex-1 flex flex-col justify-between px-4 py-6 sm:px-8 lg:px-12">
        {/* Top Utility Bar */}
        <div className="flex items-center justify-between gap-4 max-w-xl w-full mx-auto">
          <span className="text-xs font-medium text-[#77758F] dark:text-slate-400">
            Engineering Drawing Simulator · Student Access
          </span>
          <button
            type="button"
            onClick={onToggleTheme}
            className="w-9 h-9 rounded-xl bg-[#F1EBFF] dark:bg-slate-800 hover:bg-[#E6DAFF] dark:hover:bg-slate-700 text-[#7138E8] dark:text-amber-300 flex items-center justify-center transition-colors cursor-pointer shrink-0"
            title={isDark ? 'Switch to Light Studio' : 'Switch to Dark Mode'}
            aria-label="Toggle color theme"
          >
            {isDark ? <Sun className="w-[17px] h-[17px]" /> : <Moon className="w-[17px] h-[17px]" />}
          </button>
        </div>

        {/* Form Card Slot */}
        <div className="my-auto py-6 w-full max-w-[490px] mx-auto">
          <div className="rounded-[24px] bg-white dark:bg-slate-900 border border-[#ECE8F8] dark:border-slate-800 shadow-[0_20px_60px_-15px_rgba(96,53,181,0.1)] p-6 sm:p-8">
            {children}
          </div>
        </div>

        <div className="h-4" />
      </div>
    </div>
  );
};
