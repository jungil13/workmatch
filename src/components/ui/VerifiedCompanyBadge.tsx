'use client';

import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { isCompanyVerified } from '@/lib/applicationStatus';

export function VerifiedCompanyBadge({
  company,
  className = '',
}: {
  company?: { verification_status?: string | null; verified?: boolean | null } | null;
  className?: string;
}) {
  if (!isCompanyVerified(company)) return null;

  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 ${className}`}
      title="Verified by a WorkMatch administrator after reviewing submitted business documents"
    >
      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
      Verified Company
    </span>
  );
}
