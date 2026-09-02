import React from 'react';
import { MatchResult } from '@/types/matching';
import { Progress } from '../ui/Progress';
import { CheckCircle2, Sparkles, AlertCircle, MapPin, Briefcase, GraduationCap, DollarSign, Calendar } from 'lucide-react';

interface WhyYouMatchPanelProps {
  match: MatchResult;
}

export function WhyYouMatchPanel({ match }: WhyYouMatchPanelProps) {
  const factorIcons: Record<string, any> = {
    Skills: Sparkles,
    Experience: Briefcase,
    Location: MapPin,
    Education: GraduationCap,
    Salary: DollarSign,
    Availability: Calendar,
  };

  return (
    <div className="bg-white rounded-2xl border border-border p-5 space-y-5 shadow-soft">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <span className="text-xs font-bold text-mint-700 bg-mint-50 px-2.5 py-1 rounded-full border border-mint-200">
            {match.tier} Match ({match.overallScore}%)
          </span>
          <h4 className="text-base font-bold text-dark mt-2">Why you match this role</h4>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-mint-500 to-mint-600 text-white font-black flex items-center justify-center text-lg shadow-md shadow-mint-500/20">
          {match.overallScore}%
        </div>
      </div>

      {/* Positive Reasons list */}
      <div className="space-y-2">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Key Compatibility Signals</p>
        <div className="space-y-2">
          {match.whyYouMatch.map((reason, idx) => (
            <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-800">
              <CheckCircle2 className="w-4 h-4 text-mint-500 shrink-0 mt-0.5" />
              <span>{reason}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Multi-factor Progress Breakdown */}
      <div className="space-y-3 pt-3 border-t border-border">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">6-Factor Algorithm Breakdown</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Object.values(match.factors).map((factor) => {
            const Icon = factorIcons[factor.name] || Sparkles;
            return (
              <div key={factor.name} className="bg-slate-50/70 p-3 rounded-xl border border-slate-100 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-dark flex items-center gap-1.5">
                    <Icon className="w-3.5 h-3.5 text-mint-600" />
                    {factor.name} ({Math.round(factor.weight * 100)}%)
                  </span>
                  <span className="font-bold text-dark">{factor.score}%</span>
                </div>
                <Progress value={factor.score} size="sm" />
                <p className="text-[11px] text-muted truncate">{factor.explanation}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Growth/Gap areas if any */}
      {match.growthAreas.length > 0 && (
        <div className="pt-3 border-t border-border space-y-2">
          <p className="text-xs font-bold text-amber-700 uppercase tracking-wider flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5 text-amber-500" /> Areas to Note
          </p>
          <div className="space-y-1">
            {match.growthAreas.map((gap, idx) => (
              <p key={idx} className="text-xs text-slate-600 pl-4 border-l-2 border-amber-300">
                {gap}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
