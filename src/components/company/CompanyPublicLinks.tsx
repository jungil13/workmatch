'use client';

import React from 'react';
import { Globe } from 'lucide-react';

function LinkRow({ label, href }: { label: string; href?: string | null }) {
  if (!href) return null;
  return (
    <div className="space-y-0.5">
      <span className="text-[11px] text-muted">{label}</span>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs font-semibold text-emerald-700 hover:underline break-all flex items-center gap-1"
      >
        <Globe className="w-3 h-3" /> {href}
      </a>
      <p className="text-[10px] text-slate-400">Employer-provided link. WorkMatch has not independently verified this page.</p>
    </div>
  );
}

export function CompanyPublicLinks({ company }: { company: any }) {
  const hasAny = company?.website || company?.facebook_url || company?.linkedin_url || company?.instagram_url || company?.other_social_url;
  if (!hasAny) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <LinkRow label="Official website" href={company.website} />
      <LinkRow label="Facebook page" href={company.facebook_url} />
      <LinkRow label="LinkedIn page" href={company.linkedin_url} />
      <LinkRow label="Instagram page" href={company.instagram_url} />
      <LinkRow label="Other official page" href={company.other_social_url} />
    </div>
  );
}
