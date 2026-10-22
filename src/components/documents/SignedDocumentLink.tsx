'use client';

import React, { useEffect, useState } from 'react';

export function SignedDocumentLink({
  documentId,
  label = 'Open securely',
  className = '',
}: {
  documentId: string;
  label?: string;
  className?: string;
}) {
  const [url, setUrl] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/documents/signed-url?documentId=${documentId}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setUrl(data.url || '');
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [documentId]);

  if (!url) {
    return <span className={`text-[11px] text-muted ${className}`}>Preparing secure link…</span>;
  }

  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className={className}>
      {label}
    </a>
  );
}

export function SignedDocumentImage({ documentId, alt }: { documentId: string; alt: string }) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    fetch(`/api/documents/signed-url?documentId=${documentId}`)
      .then((r) => r.json())
      .then((data) => setUrl(data.url || ''))
      .catch(() => {});
  }, [documentId]);
  if (!url) return <div className="w-full h-full bg-slate-200 animate-pulse" />;
  return <img src={url} alt={alt} className="w-full h-full object-cover" />;
}
