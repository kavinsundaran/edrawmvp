/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Home,
  LayoutGrid,
  TrendingUp,
  Sparkles,
  BookOpen,
  BarChart3,
  Settings,
  Camera,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  MessageSquare,
} from 'lucide-react';
import { AppRoute } from '../../types/modules';
import { CapybaraLogoImg, CapybaraWordmarkImg } from '../BrandAssets';

export type SidebarSectionId =
  | 'dashboard'
  | 'points'
  | 'lines'
  | 'generator'
  | 'roadmap'
  | 'progress'
  | 'feedback'
  | 'settings';

interface AppSidebarProps {
  activeSection: SidebarSectionId;
  onSelectSection: (section: SidebarSectionId, route?: AppRoute) => void;
  onOpenScanModal: () => void;
  onOpenSettings: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  activeSection,
  onSelectSection,
  onOpenScanModal,
  onOpenSettings,
  isMobileOpen,
  onCloseMobile,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const navItems: {
    id: SidebarSectionId;
    label: string;
    badge?: string;
    icon: React.ReactNode;
    route?: AppRoute;
  }[] = [
    {
      id: 'dashboard',
      label: 'Home',
      icon: <Home className="w-[18px] h-[18px] shrink-0" />,
      route: '/dashboard',
    },
    {
      id: 'points',
      label: 'Projection of Points',
      icon: <LayoutGrid className="w-[18px] h-[18px] shrink-0" />,
      route: '/projection-of-points',
    },
    {
      id: 'lines',
      label: 'Projection of Straight Lines',
      icon: <TrendingUp className="w-[18px] h-[18px] shrink-0" />,
      route: '/projection-of-lines',
    },
    {
      id: 'generator',
      label: 'Question-to-Graphics Generator',
      badge: 'Coming soon',
      icon: <Sparkles className="w-[18px] h-[18px] shrink-0" />,
      route: '/question-generator',
    },
    {
      id: 'roadmap',
      label: 'Syllabus Roadmap',
      icon: <BookOpen className="w-[18px] h-[18px] shrink-0" />,
      route: '/dashboard',
    },
    {
      id: 'progress',
      label: 'Learning Progress',
      icon: <BarChart3 className="w-[18px] h-[18px] shrink-0" />,
      route: '/dashboard',
    },
    {
      id: 'feedback',
      label: 'Feedback Community',
      icon: <MessageSquare className="w-[18px] h-[18px] shrink-0" />,
      route: '/feedback-community',
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: <Settings className="w-[18px] h-[18px] shrink-0" />,
    },
  ];

  const handleItemClick = (item: (typeof navItems)[number]) => {
    if (item.id === 'settings') {
      onOpenSettings();
      onCloseMobile();
      return;
    }
    onSelectSection(item.id, item.route);
    onCloseMobile();
  };

  const renderSidebarContent = (collapsed: boolean) => (
    <div
      className={`relative h-full w-full flex flex-col justify-between text-white rounded-[24px] select-none overflow-hidden shadow-[0_18px_40px_-14px_rgba(74,27,174,0.45)] transition-all duration-200 ${
        collapsed ? 'p-2.5' : 'p-4'
      }`}
      style={{
        background: 'linear-gradient(180deg, #7138E8 0%, #612AD6 58%, #4F1EC0 100%)',
      }}
    >
      {/* Subtle Wireframe Cube Watermark at Bottom */}
      <svg
        viewBox="0 0 180 180"
        className="pointer-events-none absolute -bottom-6 -left-4 w-48 h-48 text-white/[0.08]"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M90 18L154 54V126L90 162L26 126V54L90 18Z"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path
          d="M90 18V90M90 90L154 126M90 90L26 126M26 54L90 90L154 54"
          stroke="currentColor"
          strokeWidth="1.25"
        />
        <circle cx="90" cy="90" r="4" fill="currentColor" />
      </svg>

      {/* Top Brand Logo Tile + Desktop Minimize/Expand Control */}
      <div className="relative z-10">
        {collapsed ? (
          <div className="flex flex-col items-center gap-2 pt-1 pb-4">
            {onToggleCollapse && (
              <button
                type="button"
                onClick={onToggleCollapse}
                title="Expand sidebar"
                aria-label="Expand sidebar"
                className="hidden lg:flex w-9 h-9 rounded-xl bg-white/15 hover:bg-white/25 text-white items-center justify-center transition-colors cursor-pointer"
              >
                <PanelLeftOpen className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                onSelectSection('dashboard', '/dashboard');
                onCloseMobile();
              }}
              title="CAPYBARA Home"
              aria-label="CAPYBARA Home"
              className="w-12 h-12 aspect-square rounded-xl bg-[#F6F5FA] border border-white/30 p-0.5 shadow-[0_12px_28px_-6px_rgba(32,12,78,0.4)] flex items-center justify-center transition-transform duration-150 hover:scale-[1.04] cursor-pointer"
            >
              <CapybaraLogoImg colorHex="#1D1D2B" />
            </button>
          </div>
        ) : (
          <div className="relative flex items-center justify-between pt-1 pb-5 pr-8">
            <button
              type="button"
              onClick={() => {
                onSelectSection('dashboard', '/dashboard');
                onCloseMobile();
              }}
              className="flex flex-col items-start gap-2 group cursor-pointer focus-visible:outline-2 focus-visible:outline-white rounded-xl min-w-0"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-11 h-11 aspect-square rounded-xl bg-[#F6F5FA] border border-white/30 p-0.5 shadow-[0_10px_24px_-6px_rgba(32,12,78,0.4)] flex items-center justify-center shrink-0 transition-transform duration-150 group-hover:scale-[1.03]">
                  <CapybaraLogoImg colorHex="#1D1D2B" />
                </div>
                <CapybaraWordmarkImg
                  colorHex="#FFFFFF"
                  className="h-8 sm:h-9 max-w-[136px] w-auto object-contain object-left select-none"
                />
              </div>
              <div className="text-[11px] text-white/75 font-medium leading-tight pl-0.5">
                Engineering Graphics
              </div>
            </button>

            {onToggleCollapse && (
              <button
                type="button"
                onClick={onToggleCollapse}
                title="Minimize sidebar"
                aria-label="Minimize sidebar"
                className="hidden lg:flex absolute top-1 right-0 w-8 h-8 rounded-xl bg-white/12 hover:bg-white/24 text-white/90 hover:text-white items-center justify-center transition-colors cursor-pointer"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={onCloseMobile}
              className="lg:hidden absolute top-1 right-0 p-2 rounded-xl bg-white/15 hover:bg-white/25 text-white cursor-pointer"
              aria-label="Close navigation menu"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Navigation Links */}
        <nav className="mt-1 flex flex-col gap-1" aria-label="Main Navigation">
          {navItems.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleItemClick(item)}
                title={collapsed ? (item.badge ? `${item.label} (${item.badge})` : item.label) : undefined}
                aria-label={item.label}
                className={`relative w-full flex items-center transition-all duration-150 cursor-pointer rounded-xl ${
                  collapsed
                    ? 'justify-center px-0 py-2.5'
                    : 'gap-3 px-3.5 py-2.5 text-[13px] leading-snug text-left'
                } ${
                  isActive
                    ? 'bg-white/20 text-white font-semibold shadow-xs backdrop-blur-xs'
                    : 'text-white/80 hover:text-white hover:bg-white/10 font-medium'
                }`}
              >
                {isActive && (
                  <span
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full bg-white"
                    aria-hidden="true"
                  />
                )}
                <span className={isActive ? 'text-white' : 'text-white/80'}>
                  {item.icon}
                </span>
                {!collapsed && (
                  <div className="min-w-0 flex flex-col items-start gap-0.5">
                    <span className="leading-tight">{item.label}</span>
                    {item.badge && (
                      <span className="inline-block px-1.5 py-0.2 rounded text-[9px] font-semibold bg-amber-300/25 text-amber-100 border border-amber-200/35 leading-tight">
                        {item.badge}
                      </span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Quick Problem Scan Action Card */}
      {collapsed ? (
        <div className="relative z-10 mt-4 flex justify-center">
          <button
            type="button"
            onClick={() => {
              onOpenScanModal();
              onCloseMobile();
            }}
            title="Quick Problem Scan"
            aria-label="Quick Problem Scan"
            className="w-11 h-11 rounded-2xl bg-white hover:bg-[#F1EBFF] text-[#7138E8] flex items-center justify-center transition-colors cursor-pointer shadow-xs"
          >
            <Camera className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="relative z-10 mt-5 rounded-2xl bg-white/14 border border-white/20 backdrop-blur-md p-3.5">
          <div className="text-xs font-bold text-white text-center">
            Quick Problem Scan
          </div>
          <p className="text-[11px] text-white/75 text-center mt-0.5 font-mono">
            OCR · Coming soon
          </p>

          <button
            type="button"
            onClick={() => {
              onOpenScanModal();
              onCloseMobile();
            }}
            className="mt-2.5 w-full py-2 px-3 rounded-xl bg-white hover:bg-[#F1EBFF] text-[#7138E8] text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap shadow-xs"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Scan Question</span>
          </button>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop Sticky Sidebar */}
      <aside
        className={`hidden lg:block shrink-0 p-3 pr-0 transition-[width] duration-200 ${
          isCollapsed ? 'w-[80px]' : 'w-[232px] xl:w-[244px]'
        }`}
      >
        <div className="sticky top-3 h-[calc(100vh-1.5rem)] max-h-[920px]">
          {renderSidebarContent(isCollapsed)}
        </div>
      </aside>

      {/* Mobile & Tablet Slide-over Drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-[#202044]/50 backdrop-blur-xs"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="relative z-10 w-[265px] max-w-[82vw] h-full p-3">
            {renderSidebarContent(false)}
          </div>
        </div>
      )}
    </>
  );
};
