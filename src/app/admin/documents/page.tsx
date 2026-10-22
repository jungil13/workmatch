'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { SignedDocumentImage, SignedDocumentLink } from '@/components/documents/SignedDocumentLink';
import { VerificationStatus } from '@/types/database';
import { useToast, useConfirm } from '@/components/ui/Toast';
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
  Trash2,
} from 'lucide-react';

export default function AdminDocumentsQueuePage() {
  const toast = useToast();
  const { confirm: confirmDialog, ConfirmDialog } = useConfirm();
  const [documents, setDocuments] = useState<any[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<any | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [previewDocTitle, setPreviewDocTitle] = useState<string>('');
  const [reviewNotes, setReviewNotes] = useState('Registrar seal and graduate records verified.');
  const [statusAction, setStatusAction] = useState<VerificationStatus>('verified');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    void fetchDocuments(true);
  }, []);

  const clearUrlParam = () => {
    if (typeof window !== 'undefined' && window.location.search.includes('documentId')) {
      const url = new URL(window.location.href);
      url.searchParams.delete('documentId');
      window.history.replaceState({}, '', url.pathname + (url.search ? url.search : ''));
    }
  };

  async function fetchDocuments(openFromUrl = false) {
    setLoading(true);
    setErrorMessage('');
    try {
      const response = await fetch('/api/admin/documents', { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not load documents.');

      const loadedDocuments = result.documents ?? [];
      setDocuments(loadedDocuments);
      if (openFromUrl) {
        const documentId = new URLSearchParams(window.location.search).get('documentId');
        if (documentId) {
          const targetDocument = loadedDocuments.find((document: any) => document.id === documentId);
          if (targetDocument) {
            // Open review modal with appropriate action for initial URL param
            const defaultAction: VerificationStatus =
              targetDocument.verification_status === 'rejected' ? 'rejected' : 'verified';
            handleOpenReview(targetDocument, defaultAction);
          } else {
            setErrorMessage('The selected document was not found in the verification queue.');
          }
        }
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not load documents.');
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  }

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
        : action === 'rejected'
        ? 'Incomplete document scan; please re-upload clear full-page transcript.'
        : 'Returned to pending status for further examination.'
    );
  };

  const handleCloseReview = () => {
    setSelectedDoc(null);
    clearUrlParam();
  };

  const handleConfirmDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoc) return;

    setSaving(true);
    setErrorMessage('');
    try {
      const response = await fetch('/api/admin/verify-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId: selectedDoc.id,
          status: statusAction,
          notes: reviewNotes,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not update document status.');

      const savedDocId = selectedDoc.id;
      const targetStatus = statusAction;
      const targetNotes = reviewNotes;

      setSelectedDoc(null);
      clearUrlParam();

      // Optimistically update document in local state so UI updates immediately
      setDocuments((prev) =>
        prev.map((d) =>
          d.id === savedDocId
            ? {
                ...d,
                verification_status: targetStatus,
                verification_notes: targetNotes,
                verified_at: targetStatus === 'verified' ? new Date().toISOString() : null,
              }
            : d
        )
      );

      toast.success(
        targetStatus === 'verified'
          ? 'Degree approved!'
          : targetStatus === 'rejected'
          ? 'Document rejected'
          : 'Status reset to pending',
        targetStatus === 'verified'
          ? 'The candidate has been notified of their verification.'
          : targetStatus === 'rejected'
          ? 'The document was marked as rejected.'
          : 'Document has been returned to the pending queue.'
      );

      await fetchDocuments(false);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Could not update document status.';
      setErrorMessage(msg);
      toast.error('Action failed', msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDocument = async (doc: any) => {
    const ok = await confirmDialog(
      `Permanently delete "${doc.file_name}" and its uploaded file? This cannot be undone.`,
      { confirmLabel: 'Delete', cancelLabel: 'Cancel', type: 'error' }
    );
    if (!ok) return;

    setDeletingId(doc.id);
    setErrorMessage('');
    try {
      const response = await fetch('/api/admin/documents', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: doc.id }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not delete the document.');

      if (selectedDoc?.id === doc.id) {
        setSelectedDoc(null);
        clearUrlParam();
      }
      await fetchDocuments(false);
      toast.success('Document deleted', 'The document record and file were removed.');
      if (result.warnings?.length) {
        toast.warning('Deletion warning', result.warnings.join(' '));
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Could not delete the document.';
      setErrorMessage(msg);
      toast.error('Delete failed', msg);
    } finally {
      setDeletingId('');
    }
  };

  return (
    <>
    <DashboardLayout
      portal="admin"
      title="Document Verification Queue"
      subtitle="Examine diploma and credential scans to verify degrees and award high-trust badges."
    >
      <div className="space-y-6 max-w-7xl">
        {errorMessage && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert">
            {errorMessage}
          </div>
        )}
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 border-4 border-mint-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : documents.length === 0 ? (
          <div className="bg-white rounded-3xl border border-border p-12 text-center space-y-3">
            <GraduationCap className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-base font-bold text-dark">
              {errorMessage ? 'Document queue unavailable' : 'No documents uploaded yet'}
            </h3>
            {!errorMessage && (
              <p className="text-xs text-muted">When candidates upload credentials for verification, they will appear here.</p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {documents.map((doc) => {
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
                            {doc.profile ? `${doc.profile.first_name || ''} ${doc.profile.last_name || ''}`.trim() || 'Candidate' : 'Candidate'}
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
                          <SignedDocumentImage documentId={doc.id} alt={doc.file_name} />
                          <div className="absolute inset-0 bg-dark/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <SignedDocumentLink
                              documentId={doc.id}
                              label="Open scan"
                              className="px-3 py-1.5 rounded-xl bg-white/90 text-dark text-xs font-bold"
                            />
                          </div>
                        </>
                      ) : (
                        <div className="text-center p-6 space-y-2 text-white">
                          <FileText className="w-10 h-10 text-mint-400 mx-auto" />
                          <p className="text-xs font-bold">{doc.file_name}</p>
                          <SignedDocumentLink
                            documentId={doc.id}
                            label="Open Document (PDF)"
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-mint-400 hover:underline"
                          />
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
                      <p className="text-[11px] text-muted capitalize">
                        {String(doc.document_type || 'document').replaceAll('_', ' ')} · Status: {String(doc.verification_status || 'pending').replaceAll('_', ' ')}
                      </p>
                    </div>

                    {doc.verification_notes && (
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-[11px] text-slate-700">
                        <strong className="block text-[10px] text-muted uppercase tracking-wider mb-0.5">Admin Note:</strong>
                        {doc.verification_notes}
                      </div>
                    )}
                  </div>

                  {/* Actions / Verified Status Banner */}
                  <div className="pt-3 border-t border-border flex items-center justify-between gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={Boolean(deletingId) || saving}
                      isLoading={deletingId === doc.id}
                      onClick={() => void handleDeleteDocument(doc)}
                      className="text-rose-700 border-rose-200 hover:bg-rose-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </Button>
                    {doc.verification_status === 'verified' ? (
                      <div className="flex items-center gap-1.5 flex-1">
                        <div className="flex-1 py-1 px-2 rounded-xl bg-emerald-50 border border-emerald-200 text-[#00b074] font-bold text-[11px] flex items-center justify-center gap-1 shadow-2xs">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#00b074]" /> Approved
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenReview(doc, 'rejected')}
                          className="text-[11px] h-7 px-2 text-rose-600 hover:bg-rose-50 border-rose-200 shrink-0"
                          title="Reject this verified document"
                        >
                          Reject
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenReview(doc, 'pending')}
                          className="text-[11px] h-7 px-2 text-slate-500 hover:text-amber-700 hover:bg-amber-50 shrink-0"
                          title="Reset status back to pending"
                        >
                          Reset
                        </Button>
                      </div>
                    ) : doc.verification_status === 'rejected' ? (
                      <div className="flex items-center gap-1.5 flex-1">
                        <div className="flex-1 py-1 px-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-bold text-[11px] flex items-center justify-center gap-1 shadow-2xs">
                          <X className="w-3.5 h-3.5 text-rose-600" /> Rejected
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenReview(doc, 'verified')}
                          className="text-[11px] h-7 px-2 text-emerald-600 hover:bg-emerald-50 border-emerald-200 shrink-0"
                          title="Approve this rejected document"
                        >
                          Approve
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenReview(doc, 'pending')}
                          className="text-[11px] h-7 px-2 text-slate-500 hover:text-amber-700 hover:bg-amber-50 shrink-0"
                          title="Reset status back to pending"
                        >
                          Reset
                        </Button>
                      </div>
                    ) : (
                      <>
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
                      </>
                    )}
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
        onClose={handleCloseReview}
        title="Document Verification Review"
        description={selectedDoc?.file_name}
      >
        <form onSubmit={handleConfirmDecision} className="space-y-4">
          {selectedDoc && (
            <div className="rounded-2xl border border-border p-3 bg-slate-50 flex items-center gap-3">
              {isImageDocument(selectedDoc) ? (
                <div className="w-14 h-14 rounded-xl overflow-hidden border border-border shrink-0">
                  <SignedDocumentImage documentId={selectedDoc.id} alt={selectedDoc.file_name} />
                </div>
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
                <p className="text-[10px] text-muted capitalize mt-0.5">
                  Current Status: <span className="font-bold text-dark">{selectedDoc.verification_status || 'pending'}</span>
                </p>
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">Set Verification Decision</label>
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  setStatusAction('verified');
                  if (!reviewNotes || reviewNotes.includes('Incomplete document scan') || reviewNotes.includes('further examination')) {
                    setReviewNotes('Verified against registrar records and institutional database.');
                  }
                }}
                className={`py-2 px-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 ${
                  statusAction === 'verified'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-dark hover:bg-slate-200/60'
                }`}
              >
                <Check className="w-3.5 h-3.5" /> Approve
              </button>
              <button
                type="button"
                onClick={() => {
                  setStatusAction('rejected');
                  if (!reviewNotes || reviewNotes.includes('Verified against registrar records') || reviewNotes.includes('further examination')) {
                    setReviewNotes('Incomplete document scan; please re-upload clear full-page transcript.');
                  }
                }}
                className={`py-2 px-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 ${
                  statusAction === 'rejected'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-dark hover:bg-slate-200/60'
                }`}
              >
                <X className="w-3.5 h-3.5" /> Reject
              </button>
              <button
                type="button"
                onClick={() => {
                  setStatusAction('pending');
                  if (!reviewNotes || reviewNotes.includes('Verified against registrar records') || reviewNotes.includes('Incomplete document scan')) {
                    setReviewNotes('Returned to pending status for further examination.');
                  }
                }}
                className={`py-2 px-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 ${
                  statusAction === 'pending'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'text-slate-600 hover:text-dark hover:bg-slate-200/60'
                }`}
              >
                <Clock className="w-3.5 h-3.5" /> Pending
              </button>
            </div>
          </div>

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
            <Button type="button" variant="outline" size="sm" onClick={handleCloseReview}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant={statusAction === 'verified' ? 'primary' : statusAction === 'rejected' ? 'danger' : 'outline'}
              size="md"
              disabled={saving}
              isLoading={saving}
            >
              {saving
                ? 'Saving...'
                : statusAction === 'verified'
                ? 'Confirm Degree Approval'
                : statusAction === 'rejected'
                ? 'Confirm Degree Rejection'
                : 'Confirm Reset to Pending'}
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
    {ConfirmDialog}
    </>
  );
}
