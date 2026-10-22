'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Info, X, TrendingUp, AlertCircle, CheckCircle2 } from 'lucide-react';
import { MatchResult } from '@/types/matching';

interface MatchBreakdownPopoverProps {
  match: MatchResult;
}

const FACTOR_LABELS: Record<string, string> = {
  requiredSkills: 'Required Skills',
  experience: 'Experience',
  education: 'Education',
  location: 'Location',
};

const FACTOR_COLORS: Record<string, { bar: string; text: string }> = {
  requiredSkills: { bar: 'bg-emerald-500', text: 'text-emerald-700' },
  experience: { bar: 'bg-blue-500', text: 'text-blue-700' },
  education: { bar: 'bg-violet-500', text: 'text-violet-700' },
  location: { bar: 'bg-sky-500', text: 'text-sky-700' },
};

function getTierColor(score: number) {
  if (score >= 80) return 'text-emerald-700 bg-emerald-50 border-emerald-200';
  if (score >= 60) return 'text-blue-700 bg-blue-50 border-blue-200';
  if (score >= 40) return 'text-amber-700 bg-amber-50 border-amber-200';
  return 'text-rose-700 bg-rose-50 border-rose-200';
}

function PopoverPanel({
  match,
  anchorRect,
  onClose,
}: {
  match: MatchResult;
  anchorRect: DOMRect;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const GAP = 8;

  const viewportH = typeof window !== 'undefined' ? window.innerHeight : 800;
  const viewportW = typeof window !== 'undefined' ? window.innerWidth : 1200;
  const panelWidth = Math.min(300, viewportW - 20);

  // Horizontal: center on anchor, clamp to viewport with padding
  let left = anchorRect.left + anchorRect.width / 2 - panelWidth / 2;
  left = Math.max(10, Math.min(left, viewportW - panelWidth - 10));

  // Vertical: check available space above vs below
  const spaceAbove = anchorRect.top - GAP;
  const spaceBelow = viewportH - anchorRect.bottom - GAP;
  const placeAbove = spaceAbove >= 360 || spaceAbove >= spaceBelow;

  // Arrow alignment relative to panel
  const arrowLeft = Math.max(12, Math.min(anchorRect.left + anchorRect.width / 2 - left - 6, panelWidth - 24));

  const factors = match.factors || {};
  const score = Math.round(match.overallScore ?? 0);

  const style: React.CSSProperties = {
    position: 'fixed',
    left,
    width: panelWidth,
    zIndex: 9999,
    maxHeight: Math.min(460, (placeAbove ? spaceAbove : spaceBelow) - 16),
  };

  if (placeAbove) {
    style.bottom = viewportH - anchorRect.top + GAP;
  } else {
    style.top = anchorRect.bottom + GAP;
  }

  return createPortal(
    <>
      {/* Invisible backdrop */}
      <div
        className="fixed inset-0 z-[9998]"
        onClick={onClose}
        onTouchStart={onClose}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className="bg-white rounded-2xl border border-slate-200 shadow-2xl text-left overflow-y-auto"
        style={style}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Arrow indicator */}
        {placeAbove ? (
          <div
            className="absolute bottom-[-6px] w-3 h-3 bg-white border-r border-b border-slate-200 rotate-45 pointer-events-none"
            style={{ left: arrowLeft }}
          />
        ) : (
          <div
            className="absolute top-[-6px] w-3 h-3 bg-white border-l border-t border-slate-200 rotate-45 pointer-events-none"
            style={{ left: arrowLeft }}
          />
        )}

        <div className="p-4 space-y-3 relative z-10">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-xs font-black px-2.5 py-0.5 rounded-full border ${getTierColor(score)}`}>
                {score}% {match.tier}
              </span>
              <span className="text-[11px] text-slate-400 font-semibold">Match Breakdown</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors shrink-0"
              aria-label="Close"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* 4 Factor bars */}
          <div className="space-y-2.5">
            {Object.entries(factors).map(([key, factor]) => {
              if (!factor) return null;
              const label = FACTOR_LABELS[key] || key;
              const color = FACTOR_COLORS[key] || { bar: 'bg-slate-400', text: 'text-slate-600' };
              const pct = Math.round(factor.score ?? 0);
              const weight = Math.round((factor.weight ?? 0) * 100);
              return (
                <div key={key} className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-slate-700">
                      {label}{' '}
                      <span className="text-slate-400 font-normal">({weight}%)</span>
                    </span>
                    <span className={`font-black ${color.text}`}>{pct}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${color.bar}`}
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>
                  {factor.explanation && (
                    <p className="text-[10px] text-slate-400 leading-tight">{factor.explanation}</p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Strengths */}
          {match.whyYouMatch && match.whyYouMatch.length > 0 && (
            <div className="space-y-1 pt-2 border-t border-slate-100">
              <p className="text-[10px] font-black text-emerald-800 uppercase tracking-wide flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" /> Strengths
              </p>
              <ul className="space-y-1">
                {match.whyYouMatch.map((item, i) => (
                  <li key={i} className="text-[11px] text-slate-600 flex items-start gap-1.5 leading-snug">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Growth areas */}
          {match.growthAreas && match.growthAreas.length > 0 && (
            <div className="space-y-1 pt-2 border-t border-slate-100">
              <p className="text-[10px] font-black text-amber-800 uppercase tracking-wide flex items-center gap-1">
                <AlertCircle className="w-3 h-3 text-amber-600 shrink-0" /> Areas for Growth
              </p>
              <ul className="space-y-1">
                {match.growthAreas.map((item, i) => (
                  <li key={i} className="text-[11px] text-slate-600 flex items-start gap-1.5 leading-snug">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Footer note */}
          <div className="pt-2 border-t border-slate-100 flex items-center gap-1 text-[10px] text-slate-400">
            <TrendingUp className="w-3 h-3 shrink-0 text-slate-400" />
            <span>Scores update automatically as you edit your profile.</span>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}

export function MatchBreakdownPopover({ match }: MatchBreakdownPopoverProps) {
  const [open, setOpen] = useState(false);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const updatePosition = useCallback(() => {
    if (buttonRef.current) {
      setAnchorRect(buttonRef.current.getBoundingClientRect());
    }
  }, []);

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!open) {
      updatePosition();
      setOpen(true);
    } else {
      setOpen(false);
    }
  };

  const handleClose = useCallback(() => {
    setOpen(false);
  }, []);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, handleClose]);

  // Reposition on scroll/resize while open
  useEffect(() => {
    if (!open) return;
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [open, updatePosition]);

  return (
    <span className="relative inline-flex items-center">
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        className="w-4 h-4 rounded-full inline-flex items-center justify-center text-emerald-600 hover:text-emerald-800 hover:bg-emerald-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 cursor-pointer"
        aria-label="Why this match score?"
        title="Why this match score?"
      >
        <Info className="w-3.5 h-3.5" />
      </button>

      {open && anchorRect && (
        <PopoverPanel match={match} anchorRect={anchorRect} onClose={handleClose} />
      )}
    </span>
  );
}
