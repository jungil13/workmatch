import React from 'react';
import { ApplicationStatus } from '@/types/database';
import { CheckCircle2, Circle, Clock, Check, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ApplicationPipelineProps {
  currentStatus: ApplicationStatus;
  statusHistory?: Array<{ to_status: ApplicationStatus; created_at: string; notes?: string }>;
}

export function ApplicationPipeline({ currentStatus, statusHistory = [] }: ApplicationPipelineProps) {
  const stages: Array<{ key: ApplicationStatus; label: string }> = [
    { key: 'applied', label: 'Applied' },
    { key: 'screening', label: 'Screening' },
    { key: 'interview', label: 'Interview' },
    { key: 'offer', label: 'Offer' },
    { key: 'hired', label: 'Hired' },
  ];

  if (currentStatus === 'rejected') {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-rose-800 flex items-center gap-3">
        <XCircle className="w-6 h-6 text-rose-500 shrink-0" />
        <div>
          <h4 className="text-sm font-bold">Application Closed</h4>
          <p className="text-xs text-rose-700">The employer decided to proceed with other applicants for this role.</p>
        </div>
      </div>
    );
  }

  const currentIdx = stages.findIndex((s) => s.key === currentStatus);

  return (
    <div className="w-full bg-white rounded-2xl border border-border p-6 shadow-soft space-y-6">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-bold text-dark">Recruitment Pipeline</h4>
        <span className="text-xs font-bold px-3 py-1 rounded-full bg-mint-50 text-mint-700 border border-mint-200 uppercase tracking-wider">
          Stage: {currentStatus}
        </span>
      </div>

      {/* Horizontal Pipeline Stepper */}
      <div className="relative flex items-center justify-between">
        {/* Connection line */}
        <div className="absolute left-4 right-4 top-1/2 -translate-y-1/2 h-1 bg-slate-100 z-0">
          <div
            className="h-full bg-mint-500 transition-all duration-500 rounded-full"
            style={{
              width: `${(Math.max(0, currentIdx) / (stages.length - 1)) * 100}%`,
            }}
          />
        </div>

        {/* Stage Nodes */}
        {stages.map((stage, idx) => {
          const isPassed = idx < currentIdx;
          const isCurrent = idx === currentIdx;
          const historyEntry = statusHistory.find((h) => h.to_status === stage.key);

          return (
            <div key={stage.key} className="relative z-10 flex flex-col items-center group">
              <div
                className={cn(
                  'w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-300 border-2',
                  isPassed && 'bg-mint-500 text-white border-mint-500 shadow-sm shadow-mint-500/30',
                  isCurrent && 'bg-white text-mint-600 border-mint-500 ring-4 ring-mint-100 shadow-md',
                  !isPassed && !isCurrent && 'bg-white text-slate-300 border-slate-200'
                )}
              >
                {isPassed ? <Check className="w-4 h-4 stroke-[3]" /> : idx + 1}
              </div>

              <div className="text-center mt-2">
                <span
                  className={cn(
                    'text-xs font-semibold block',
                    (isPassed || isCurrent) ? 'text-dark' : 'text-slate-400'
                  )}
                >
                  {stage.label}
                </span>
                {historyEntry && (
                  <span className="text-[10px] text-muted block -mt-0.5">
                    {new Date(historyEntry.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Stage notes / activity log history */}
      {statusHistory.length > 0 && (
        <div className="pt-4 border-t border-border space-y-3">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Stage History</p>
          <div className="space-y-2">
            {statusHistory.map((item, idx) => (
              <div key={idx} className="flex items-start gap-3 text-xs bg-slate-50 p-3 rounded-xl border border-slate-100">
                <CheckCircle2 className="w-4 h-4 text-mint-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-dark capitalize">{item.to_status} stage reached</span>
                  {item.notes && <p className="text-slate-600 mt-0.5">{item.notes}</p>}
                  <span className="text-[10px] text-muted mt-1 block">
                    {new Date(item.created_at).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
