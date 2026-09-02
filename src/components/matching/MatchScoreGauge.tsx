import React from 'react';
import { cn } from '@/lib/utils';
import { Sparkles } from 'lucide-react';

interface MatchScoreGaugeProps {
  score: number; // 0-100
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export function MatchScoreGauge({ score, size = 'md', showLabel = true }: MatchScoreGaugeProps) {
  let badgeColor = 'bg-mint-50 text-mint-700 border-mint-200';
  let dotColor = 'bg-mint-500';

  if (score >= 90) {
    badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-300';
    dotColor = 'bg-emerald-500';
  } else if (score >= 80) {
    badgeColor = 'bg-mint-50 text-mint-700 border-mint-200';
    dotColor = 'bg-mint-500';
  } else if (score >= 70) {
    badgeColor = 'bg-teal-50 text-teal-700 border-teal-200';
    dotColor = 'bg-teal-500';
  } else {
    badgeColor = 'bg-slate-100 text-slate-700 border-slate-200';
    dotColor = 'bg-slate-400';
  }

  const sizes = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5 font-bold',
    lg: 'text-sm px-3.5 py-1.5 gap-2 font-black',
  };

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full border shadow-sm select-none',
        badgeColor,
        sizes[size]
      )}
    >
      <Sparkles className="w-3.5 h-3.5" />
      <span>{score}% Match</span>
    </div>
  );
}
