'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase/client';
import { UploadCloud, GraduationCap, ShieldCheck, Clock, Lock, CheckCircle2, Trash2, AlertCircle } from 'lucide-react';

export default function SeekerDiplomaPage() {
  const [userId, setUserId] = useState('');
  const [documents, setDocuments] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

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
    await supabase.storage.from('documents').remove([filePath]);
    await supabase.from('documents').delete().eq('id', id);
    setDocuments(prev => prev.filter(d => d.id !== id));
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
              <p className="text-xs text-muted">Track the administrative review and verification status of your credentials.</p>
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
            <div className="space-y-3">
              {documents.map((doc) => (
                <div key={doc.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl border border-border hover:border-mint-200 bg-slate-50/50 gap-4 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white border border-border flex items-center justify-center text-mint-600 shrink-0">
                      <GraduationCap className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-dark line-clamp-1">{doc.file_name}</h4>
                      <div className="flex items-center gap-2 text-[11px] text-muted mt-0.5">
                        <span>{(doc.file_size / 1024).toFixed(0)} KB</span>
                        <span>•</span>
                        <span>Uploaded {new Date(doc.uploaded_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3">
                    {doc.verification_status === 'verified' && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Verified
                      </span>
                    )}
                    {doc.verification_status === 'pending' && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                        <Clock className="w-3.5 h-3.5 text-amber-600" /> In Review
                      </span>
                    )}
                    {doc.verification_status === 'rejected' && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-800 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200">
                        Rejected
                      </span>
                    )}

                    <button
                      onClick={() => handleDelete(doc.id, doc.file_path)}
                      className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-white transition-colors"
                      title="Delete Document"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
