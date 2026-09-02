'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { supabase } from '@/lib/supabase/client';
import { VerificationStatus } from '@/types/database';
import {
  GraduationCap,
  CheckCircle2,
  Clock,
  Check,
  X,
  Eye,
  ExternalLink,
  FileText,
  AlertCircle,
  ZoomIn,
} from 'lucide-react';

export default function AdminDocumentsQueuePage() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<any | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [previewDocTitle, setPreviewDocTitle] = useState<string>('');
  const [reviewNotes, setReviewNotes] = useState('Registrar seal and graduate records verified.');
  const [statusAction, setStatusAction] = useState<VerificationStatus>('verified');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDocuments();
  }, []);

  async function fetchDocuments() {
    const { data } = await supabase
      .from('documents')
      .select('*, profile:profiles(first_name, last_name, email)')
      .order('uploaded_at', { ascending: false });
    setDocuments(data ?? []);
    setLoading(false);
  }

  const getDocumentUrl = (filePath: string) => {
    if (!filePath) return '';
    const { data } = supabase.storage.from('documents').getPublicUrl(filePath);
    return data.publicUrl;
  };

  const isImageDocument = (doc: any) => {
    const mime = doc.mime_type || '';
    const name = doc.file_name?.toLowerCase() || '';
    return mime.startsWith('image/') || name.endsWith('.jpg') || name.endsWith('.jpeg') || name.endsWith('.png') || name.endsWith('.webp');
  };

  const handleOpenReview = (doc: any, action: VerificationStatus) => {
    setSelectedDoc(doc);
    setStatusAction(action);
    setReviewNotes(
      action === 'verified'
        ? 'Verified against registrar records and institutional database.'
        : 'Incomplete document scan; please re-upload clear full-page transcript.'
    );
  };

  const handleConfirmDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoc) return;

    await supabase
      .from('documents')
      .update({
        verification_status: statusAction,
        verification_notes: reviewNotes,
        verified_at: new Date().toISOString(),
      })
      .eq('id', selectedDoc.id);

    await supabase.from('audit_logs').insert({
      action: `Admin verified document as ${statusAction}`,
      entity_type: 'document',
      entity_id: selectedDoc.id,
      metadata: { file_name: selectedDoc.file_name, status: statusAction, notes: reviewNotes },
      created_at: new Date().toISOString(),
    });

    setSelectedDoc(null);
    fetchDocuments();
  };

  return (
    <DashboardLayout
      portal="admin"
      title="Document Verification Queue"
      subtitle="Examine diploma and credential scans to verify degrees and award high-trust badges."
    >
      <div className="space-y-6 max-w-7xl">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 border-4 border-mint-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : documents.length === 0 ? (
          <div className="bg-white rounded-3xl border border-border p-12 text-center space-y-3">
            <GraduationCap className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-base font-bold text-dark">No documents uploaded yet</h3>
            <p className="text-xs text-muted">When candidates upload credentials for verification, they will appear here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {documents.map((doc) => {
              const docUrl = getDocumentUrl(doc.file_path);
              const isImg = isImageDocument(doc);

              return (
                <div
                  key={doc.id}
                  className="bg-white rounded-3xl border border-border p-5 shadow-soft space-y-4 flex flex-col justify-between hover:shadow-card transition-all"
                >
                  <div className="space-y-3">
                    {/* Header: Candidate Info & Verification Status */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-mint-50 text-mint-600 flex items-center justify-center font-bold shrink-0">
                          <GraduationCap className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-dark">
                            {doc.profile ? `${doc.profile.first_name} ${doc.profile.last_name}` : 'Candidate'}
                          </h4>
                          <p className="text-[11px] text-muted truncate max-w-[150px]">
                            {doc.profile?.email || 'Registered Seeker'}
                          </p>
                        </div>
                      </div>

                      {doc.verification_status === 'verified' ? (
                        <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 flex items-center gap-1 shrink-0">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Verified
                        </span>
                      ) : doc.verification_status === 'rejected' ? (
                        <span className="text-[10px] font-bold text-rose-800 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200 shrink-0">
                          Rejected
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200 flex items-center gap-1 shrink-0">
                          <Clock className="w-3 h-3 text-amber-600" /> Pending Review
                        </span>
                      )}
                    </div>

                    {/* Visual Image / Document Preview Banner */}
                    <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 group aspect-[16/10] flex items-center justify-center">
                      {isImg ? (
                        <>
                          <img
                            src={docUrl}
                            alt={doc.file_name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => {
                              // If image fails to load, fallback to placeholder
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                          <div className="absolute inset-0 bg-dark/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setPreviewImageUrl(docUrl);
                                setPreviewDocTitle(doc.file_name);
                              }}
                              className="px-3 py-1.5 rounded-xl bg-white/90 text-dark text-xs font-bold flex items-center gap-1.5 hover:bg-white shadow-md transition-transform active:scale-95"
                            >
                              <ZoomIn className="w-3.5 h-3.5 text-mint-600" /> Zoom Scan
                            </button>
                            <a
                              href={docUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-xl bg-white/90 text-dark hover:bg-white shadow-md transition-transform"
                              title="Open original in new tab"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </div>
                        </>
                      ) : (
                        <div className="text-center p-6 space-y-2 text-white">
                          <FileText className="w-10 h-10 text-mint-400 mx-auto" />
                          <p className="text-xs font-bold">{doc.file_name}</p>
                          <a
                            href={docUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-mint-400 hover:underline"
                          >
                            <ExternalLink className="w-3.5 h-3.5" /> Open Document (PDF)
                          </a>
                        </div>
                      )}
                    </div>

                    {/* Metadata */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-dark truncate max-w-[200px]" title={doc.file_name}>
                          {doc.file_name}
                        </span>
                        <span className="text-[11px] text-muted shrink-0">
                          {(doc.file_size / 1024).toFixed(0)} KB
                        </span>
                      </div>
                      <p className="text-[11px] text-muted">
                        Uploaded on {new Date(doc.uploaded_at).toLocaleDateString()} at {new Date(doc.uploaded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>

                    {doc.verification_notes && (
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-[11px] text-slate-700">
                        <strong className="block text-[10px] text-muted uppercase tracking-wider mb-0.5">Admin Note:</strong>
                        {doc.verification_notes}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="pt-3 border-t border-border flex items-center justify-between gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleOpenReview(doc, 'verified')}
                      className="flex-1 text-xs font-bold justify-center"
                    >
                      <Check className="w-3.5 h-3.5" /> Approve Degree
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenReview(doc, 'rejected')}
                      className="text-xs text-rose-600 hover:bg-rose-50 border-rose-200"
                    >
                      <X className="w-3.5 h-3.5" /> Reject
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Review & Audit Modal */}
      <Modal
        isOpen={Boolean(selectedDoc)}
        onClose={() => setSelectedDoc(null)}
        title={`Confirm Degree ${statusAction === 'verified' ? 'Approval' : 'Rejection'}`}
        description={selectedDoc?.file_name}
      >
        <form onSubmit={handleConfirmDecision} className="space-y-4">
          {selectedDoc && (
            <div className="rounded-2xl border border-border p-3 bg-slate-50 flex items-center gap-3">
              {isImageDocument(selectedDoc) ? (
                <img
                  src={getDocumentUrl(selectedDoc.file_path)}
                  alt={selectedDoc.file_name}
                  className="w-14 h-14 object-cover rounded-xl border border-border shrink-0"
                />
              ) : (
                <div className="w-14 h-14 rounded-xl bg-mint-50 text-mint-600 flex items-center justify-center shrink-0">
                  <GraduationCap className="w-6 h-6" />
                </div>
              )}
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-dark truncate">{selectedDoc.file_name}</h4>
                <p className="text-[11px] text-muted">
                  Candidate: {selectedDoc.profile?.first_name} {selectedDoc.profile?.last_name}
                </p>
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">Audit Verification Note *</label>
            <textarea
              rows={3}
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              className="w-full rounded-xl border border-border p-3 text-xs text-dark focus:border-mint-500 focus:outline-none"
              required
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setSelectedDoc(null)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant={statusAction === 'verified' ? 'primary' : 'danger'}
              size="md"
            >
              Confirm {statusAction === 'verified' ? 'Verification' : 'Rejection'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Full Image Zoom Modal */}
      {previewImageUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200"
          onClick={() => setPreviewImageUrl(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-slate-50">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-mint-600" />
                <h3 className="text-sm font-bold text-dark truncate max-w-md">{previewDocTitle}</h3>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={previewImageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-xl border border-border bg-white text-xs font-semibold text-dark hover:bg-slate-100 flex items-center gap-1"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Full Resolution
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewImageUrl(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-dark hover:bg-slate-200 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-4 overflow-auto flex items-center justify-center bg-slate-950/90 max-h-[75vh]">
              <img
                src={previewImageUrl}
                alt="Document Full Preview"
                className="max-h-full max-w-full object-contain rounded-lg shadow-lg"
              />
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
