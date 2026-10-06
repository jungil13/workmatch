'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase/client';
import {
  UploadCloud,
  GraduationCap,
  ShieldCheck,
  Clock,
  Lock,
  CheckCircle2,
  Trash2,
  AlertCircle,
  Eye,
  Download,
  ExternalLink,
  FileText,
  X,
  ZoomIn,
  Loader2,
} from 'lucide-react';

export default function SeekerDiplomaPage() {
  const [userId, setUserId] = useState('');
  const [documents, setDocuments] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedDoc, setSelectedDoc] = useState<any | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      setUserId(user.id);
      fetchDocuments(user.id);
    });
  }, []);

  async function fetchDocuments(uid: string) {
    const { data } = await supabase
      .from('documents')
      .select('*')
      .eq('user_id', uid)
      .order('uploaded_at', { ascending: false });
    setDocuments(data ?? []);
  }

  const getDocumentUrl = (filePath: string) => {
    if (!filePath) return '';
    const { data } = supabase.storage.from('documents').getPublicUrl(filePath);
    return data.publicUrl;
  };

  const isImageDocument = (doc: any) => {
    const mime = doc.mime_type || '';
    const name = doc.file_name?.toLowerCase() || '';
    return (
      mime.startsWith('image/') ||
      name.endsWith('.jpg') ||
      name.endsWith('.jpeg') ||
      name.endsWith('.png') ||
      name.endsWith('.webp')
    );
  };

  const handleDownload = async (doc: any) => {
    setDownloadingId(doc.id);
    try {
      // 1. Try direct Supabase storage download
      const { data, error } = await supabase.storage.from('documents').download(doc.file_path);
      let blobUrl = '';
      if (!error && data) {
        blobUrl = window.URL.createObjectURL(data);
      } else {
        // Fallback: fetch from public URL
        const publicUrl = getDocumentUrl(doc.file_path);
        const res = await fetch(publicUrl);
        const blob = await res.blob();
        blobUrl = window.URL.createObjectURL(blob);
      }

      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = doc.file_name || 'diploma-certificate';
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000);
    } catch (err) {
      console.error('Download failed, opening file in new tab instead:', err);
      const publicUrl = getDocumentUrl(doc.file_path);
      window.open(publicUrl, '_blank');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;
    setUploading(true);
    setErrorMessage('');
    setUploadSuccess(false);

    // Sanitize file name for cloud storage
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filePath = `${userId}/diplomas/${Date.now()}_${sanitizedFileName}`;

    try {
      // 1. Upload file to Supabase Storage
      const { error: storageError } = await supabase.storage
        .from('documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (storageError) {
        console.error('Storage upload error:', storageError);
        setErrorMessage(
          storageError.message === 'Bucket not found'
            ? "Storage bucket 'documents' not found. Please run the SQL snippet in your Supabase SQL Editor to create it."
            : storageError.message || 'Failed to upload document.'
        );
        setUploading(false);
        e.target.value = '';
        return;
      }

      // 2. Create document record in database
      const { error: dbError } = await supabase.from('documents').insert({
        user_id: userId,
        document_type: 'diploma',
        file_name: file.name,
        file_path: filePath,
        mime_type: file.type || 'image/jpeg',
        file_size: file.size,
        verification_status: 'pending',
        uploaded_at: new Date().toISOString(),
      });

      if (dbError) {
        console.error('Database document insert error:', dbError);
        setErrorMessage(dbError.message || 'File uploaded but record creation failed.');
      } else {
        await fetchDocuments(userId);
        setUploadSuccess(true);
        setTimeout(() => setUploadSuccess(false), 4000);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred during upload.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDelete = async (id: string, filePath: string) => {
    if (!confirm('Are you sure you want to remove this uploaded credential?')) return;
    await supabase.storage.from('documents').remove([filePath]);
    await supabase.from('documents').delete().eq('id', id);
    setDocuments(prev => prev.filter(d => d.id !== id));
    if (selectedDoc?.id === id) {
      setSelectedDoc(null);
    }
  };

  return (
    <DashboardLayout
      portal="seeker"
      title="Diploma & Credential Verification"
      subtitle="Upload your college diploma or professional certificate to unlock verified status and employer priority."
    >
      <div className="max-w-4xl space-y-8">
        {/* Hero Banner */}
        <div className="bg-gradient-to-r from-mint-500 to-mint-600 rounded-3xl p-6 sm:p-8 text-white shadow-card space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold">Official Credential Program</span>
            <span className="bg-emerald-400 text-emerald-950 px-2.5 py-0.5 rounded-full text-xs font-bold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> High Trust Badge
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight">Boost Your Job Match Compatibility by 30%</h2>
          <p className="text-xs sm:text-sm text-mint-50 max-w-2xl leading-relaxed">
            Verified diplomas receive automatic priority ranking in employer candidate searches and faster application review times.
          </p>
        </div>

        {/* Alerts */}
        {errorMessage && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs p-4 rounded-2xl flex items-center gap-2 font-semibold">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" /> {errorMessage}
          </div>
        )}

        {uploadSuccess && (
          <div className="bg-mint-50 border border-mint-200 text-mint-800 text-xs p-4 rounded-2xl flex items-center gap-2 font-bold">
            <CheckCircle2 className="w-4 h-4 text-mint-600 shrink-0" /> Credential uploaded successfully! It is now pending administrative verification.
          </div>
        )}

        {/* Upload Dropzone */}
        <div className="bg-white rounded-3xl border-2 border-dashed border-mint-200 hover:border-mint-400 p-8 sm:p-12 text-center shadow-soft transition-all space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-mint-50 text-mint-600 mx-auto flex items-center justify-center">
            <UploadCloud className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-dark">Upload Official Diploma or Transcript</h3>
            <p className="text-xs text-muted max-w-sm mx-auto">
              Supported formats: JPEG, PNG, WebP, or PDF (Max 10MB per file).
            </p>
          </div>

          <div className="pt-2">
            <label className="inline-block cursor-pointer">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                onChange={handleFileUpload}
                disabled={uploading}
                className="hidden"
              />
              <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-mint-500 text-white hover:bg-mint-600 shadow-md transition-all pointer-events-auto cursor-pointer">
                {uploading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Uploading Document...
                  </>
                ) : (
                  <>
                    <GraduationCap className="w-4 h-4" /> Select Document File
                  </>
                )}
              </span>
            </label>
          </div>
        </div>

        {/* Uploaded Documents List */}
        <div className="bg-white rounded-3xl border border-border p-6 sm:p-8 shadow-soft space-y-6">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div>
              <h3 className="text-base font-bold text-dark">Your Uploaded Credentials</h3>
              <p className="text-xs text-muted">Click any document to view, zoom, and download your uploaded certificate.</p>
            </div>
            <span className="text-xs font-bold text-mint-700 bg-mint-50 px-3 py-1 rounded-full border border-mint-200">
              {documents.length} Uploaded
            </span>
          </div>

          {documents.length === 0 ? (
            <div className="text-center py-10 space-y-2">
              <GraduationCap className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs text-muted">No documents uploaded yet. Upload your diploma above to get started.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {documents.map((doc) => {
                const docUrl = getDocumentUrl(doc.file_path);
                const isImg = isImageDocument(doc);
                const isDownloadingThis = downloadingId === doc.id;

                return (
                  <div
                    key={doc.id}
                    className="flex flex-col md:flex-row md:items-center justify-between p-4 sm:p-5 rounded-2xl border border-border hover:border-mint-300 bg-slate-50/70 hover:bg-white gap-4 transition-all shadow-xs hover:shadow-soft group"
                  >
                    {/* Left: Thumbnail & Info */}
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      {/* Interactive Visual Thumbnail */}
                      <button
                        type="button"
                        onClick={() => setSelectedDoc(doc)}
                        className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden border border-slate-200 bg-slate-900 shrink-0 group/thumb cursor-pointer focus:outline-none focus:ring-2 focus:ring-mint-500"
                        title="Click to view full certificate"
                      >
                        {isImg ? (
                          <>
                            <img
                              src={docUrl}
                              alt={doc.file_name}
                              className="w-full h-full object-cover group-hover/thumb:scale-110 transition-transform duration-300"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                            <div className="absolute inset-0 bg-dark/40 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center text-white">
                              <ZoomIn className="w-5 h-5" />
                            </div>
                          </>
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 text-slate-600 group-hover/thumb:bg-mint-50 group-hover/thumb:text-mint-700 transition-colors">
                            <FileText className="w-6 h-6" />
                            <span className="text-[9px] font-bold mt-0.5 uppercase tracking-wide">PDF</span>
                          </div>
                        )}
                      </button>

                      {/* File Details */}
                      <div className="min-w-0 flex-1">
                        <button
                          type="button"
                          onClick={() => setSelectedDoc(doc)}
                          className="text-left text-xs sm:text-sm font-bold text-dark hover:text-mint-700 transition-colors truncate block max-w-full"
                          title="Click to view full certificate"
                        >
                          {doc.file_name}
                        </button>
                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted mt-1">
                          <span>{(doc.file_size / 1024).toFixed(0)} KB</span>
                          <span>•</span>
                          <span>Uploaded {new Date(doc.uploaded_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Status Badge & Actions */}
                    <div className="flex flex-wrap items-center justify-between md:justify-end gap-2.5 pt-2 md:pt-0 border-t md:border-t-0 border-slate-200/60">
                      {/* Verification Status */}
                      <div>
                        {doc.verification_status === 'verified' && (
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" /> Verified
                          </span>
                        )}
                        {doc.verification_status === 'pending' && (
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-800 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200">
                            <Clock className="w-4 h-4 text-amber-600 shrink-0" /> In Review
                          </span>
                        )}
                        {doc.verification_status === 'rejected' && (
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-800 bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-200">
                            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" /> Rejected
                          </span>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-1.5">
                        {/* View Button */}
                        <button
                          type="button"
                          onClick={() => setSelectedDoc(doc)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white hover:bg-mint-50 text-mint-700 border border-mint-200 shadow-xs hover:shadow-sm transition-all"
                          title="View Certificate"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View</span>
                        </button>

                        {/* Download Button */}
                        <button
                          type="button"
                          onClick={() => handleDownload(doc)}
                          disabled={isDownloadingThis}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white hover:bg-slate-100 text-slate-700 border border-border shadow-xs hover:shadow-sm transition-all disabled:opacity-50"
                          title="Download Certificate"
                        >
                          {isDownloadingThis ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-mint-600" />
                          ) : (
                            <Download className="w-3.5 h-3.5" />
                          )}
                          <span>Download</span>
                        </button>

                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={() => handleDelete(doc.id, doc.file_path)}
                          className="text-slate-400 hover:text-rose-600 p-2 rounded-xl hover:bg-rose-50 transition-colors"
                          title="Delete Document"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Interactive Certificate Preview Modal */}
      {selectedDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-4xl bg-white rounded-3xl border border-border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] my-auto">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-3 bg-slate-50/80">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-mint-50 border border-mint-200 text-mint-700 flex items-center justify-center shrink-0">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-bold text-dark truncate">
                    {selectedDoc.file_name}
                  </h3>
                  <div className="flex items-center gap-2 text-[11px] text-muted">
                    <span>{(selectedDoc.file_size / 1024).toFixed(0)} KB</span>
                    <span>•</span>
                    <span>Uploaded {new Date(selectedDoc.uploaded_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              {/* Header Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDownload(selectedDoc)}
                  disabled={downloadingId === selectedDoc.id}
                  className="px-3 py-1.5 rounded-xl bg-mint-500 hover:bg-mint-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50"
                  title="Download File"
                >
                  {downloadingId === selectedDoc.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Download className="w-3.5 h-3.5" />
                  )}
                  <span className="hidden sm:inline">Download</span>
                </button>

                <a
                  href={getDocumentUrl(selectedDoc.file_path)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-xl border border-border bg-white text-xs font-bold text-dark hover:bg-slate-100 flex items-center gap-1.5 shadow-xs transition-colors"
                  title="Open in new window"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Open Tab</span>
                </a>

                <button
                  type="button"
                  onClick={() => setSelectedDoc(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-dark hover:bg-slate-200 transition-colors"
                  title="Close preview"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body / Document Preview Area */}
            <div className="p-4 sm:p-6 overflow-auto flex items-center justify-center bg-slate-900/95 flex-1 min-h-[320px] max-h-[70vh]">
              {isImageDocument(selectedDoc) ? (
                <img
                  src={getDocumentUrl(selectedDoc.file_path)}
                  alt={selectedDoc.file_name}
                  className="max-h-full max-w-full object-contain rounded-xl shadow-2xl"
                  onError={(e) => {
                    const parent = (e.target as HTMLElement).parentElement;
                    if (parent) {
                      parent.innerHTML = `
                        <div class="text-center p-8 space-y-3 text-white">
                          <p class="text-sm font-semibold text-rose-300">Could not render image preview.</p>
                          <a href="${getDocumentUrl(selectedDoc.file_path)}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-mint-500 text-white font-bold text-xs hover:bg-mint-600">
                            Open in New Tab
                          </a>
                        </div>
                      `;
                    }
                  }}
                />
              ) : (
                <div className="w-full h-full min-h-[500px] flex flex-col rounded-xl overflow-hidden bg-white">
                  <iframe
                    src={getDocumentUrl(selectedDoc.file_path)}
                    className="w-full h-full flex-1 border-0 rounded-xl"
                    title={selectedDoc.file_name}
                  />
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3.5 border-t border-border bg-white flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-muted font-medium">Status:</span>
                {selectedDoc.verification_status === 'verified' && (
                  <span className="font-bold text-emerald-700 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Verified Credential
                  </span>
                )}
                {selectedDoc.verification_status === 'pending' && (
                  <span className="font-bold text-amber-700 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-amber-600" /> In Review by Administrators
                  </span>
                )}
                {selectedDoc.verification_status === 'rejected' && (
                  <span className="font-bold text-rose-700 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-600" /> Verification Rejected
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedDoc(null)}
                  className="px-4 py-2 rounded-xl border border-border text-slate-700 hover:bg-slate-50 font-bold text-xs transition-colors"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => handleDownload(selectedDoc)}
                  disabled={downloadingId === selectedDoc.id}
                  className="px-4 py-2 rounded-xl bg-mint-500 text-white hover:bg-mint-600 font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all disabled:opacity-50"
                >
                  {downloadingId === selectedDoc.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Download className="w-3.5 h-3.5" />
                  )}
                  Download Certificate
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
