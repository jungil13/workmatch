'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase/client';
import { Job, Company } from '@/types/database';
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertCircle,
  Building2,
  Sparkles,
  Send,
  X,
  FileCheck,
  Paperclip,
} from 'lucide-react';

interface ApplyModalProps {
  job: Job & { company?: Company };
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  matchScore?: number;
}

export function ApplyModal({
  job,
  isOpen,
  onClose,
  onSuccess,
  matchScore = 0,
}: ApplyModalProps) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [existingResumes, setExistingResumes] = useState<any[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState<string>('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [coverLetter, setCoverLetter] = useState('');
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [success, setSuccess] = useState(false);
  const [loadingResumes, setLoadingResumes] = useState(true);

  useEffect(() => {
    if (!isOpen) {
      setSuccess(false);
      setErrorMessage('');
      setUploadedFile(null);
      return;
    }

    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        setUser(null);
        setLoadingResumes(false);
        return;
      }
      setUser(user);

      // Fetch user's existing uploaded resumes
      const { data } = await supabase
        .from('documents')
        .select('*')
        .eq('user_id', user.id)
        .eq('document_type', 'resume')
        .order('uploaded_at', { ascending: false });

      const resumes = data ?? [];
      setExistingResumes(resumes);
      if (resumes.length > 0) {
        setSelectedResumeId(resumes[0].id);
      }
      setLoadingResumes(false);
    });
  }, [isOpen]);

  const ALLOWED_MIME_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/jpg',
    'image/png',
  ];

  const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage('');
    const file = e.target.files?.[0];
    if (!file) return;

    const fileExt = '.' + file.name.split('.').pop()?.toLowerCase();
    const isAllowedExt = ALLOWED_EXTENSIONS.includes(fileExt);
    const isAllowedMime =
      ALLOWED_MIME_TYPES.includes(file.type) ||
      (file.type === '' && isAllowedExt);

    if (!isAllowedExt && !isAllowedMime) {
      setErrorMessage(
        'Invalid file format. Please upload a PDF, DOC, DOCX, JPG, or PNG file.'
      );
      e.target.value = '';
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setErrorMessage('File size exceeds the 15MB limit. Please upload a smaller file.');
      e.target.value = '';
      return;
    }

    setUploadedFile(file);
    setSelectedResumeId('NEW_FILE');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      router.push('/auth/seeker/sign-in');
      return;
    }

    setErrorMessage('');
    setSubmitting(true);

    try {
      let finalResumeDocId: string | null = null;

      // If user uploaded a new file, store in storage & documents table
      if (selectedResumeId === 'NEW_FILE' && uploadedFile) {
        setUploading(true);
        const sanitized = uploadedFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const storagePath = `resumes/${user.id}/${Date.now()}_${sanitized}`;

        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(storagePath, uploadedFile, {
            cacheControl: '3600',
            upsert: true,
          });

        if (uploadError) {
          console.warn('Storage upload note:', uploadError.message);
          // If bucket doesn't exist, we can still proceed with fallback
        }

        const mimeType = uploadedFile.type || 'application/pdf';

        const { data: docData, error: docError } = await supabase
          .from('documents')
          .insert({
            user_id: user.id,
            document_type: 'resume',
            file_name: uploadedFile.name,
            file_path: storagePath,
            mime_type: mimeType,
            file_size: uploadedFile.size,
            verification_status: 'verified',
            uploaded_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (docError) {
          console.error('Document record insert error:', docError);
        } else if (docData) {
          finalResumeDocId = docData.id;
        }
        setUploading(false);
      } else if (selectedResumeId && selectedResumeId !== 'NEW_FILE') {
        finalResumeDocId = selectedResumeId;
      }

      // Submit application to Supabase
      const { error: appError } = await supabase.from('applications').upsert(
        {
          applicant_id: user.id,
          job_id: job.id,
          resume_document_id: finalResumeDocId,
          cover_letter: coverLetter.trim(),
          match_score: matchScore || 0,
          status: 'applied',
          applied_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'job_id,applicant_id' }
      );

      if (appError) {
        throw new Error(appError.message || 'Failed to submit application.');
      }

      setSuccess(true);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to submit application. Please try again.');
    } finally {
      setSubmitting(false);
      setUploading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={success ? 'Application Submitted!' : `Apply for ${job.title}`}
      description={
        success
          ? `Your application has been received by ${job.company?.name || 'the hiring team'}.`
          : `Submit your profile and resume to ${job.company?.name || 'the hiring team'}`
      }
    >
      {success ? (
        <div className="text-center py-6 space-y-4">
          <div className="w-16 h-16 rounded-full bg-mint-100 text-mint-700 flex items-center justify-center mx-auto shadow-sm animate-in zoom-in">
            <CheckCircle2 className="w-9 h-9" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-dark">You're All Set!</h3>
            <p className="text-xs text-muted max-w-sm mx-auto">
              Your resume and credentials were sent directly to {job.company?.name || 'the recruiter'}. You can track the status in your applications hub.
            </p>
          </div>
          <div className="pt-3 flex flex-col sm:flex-row gap-2 justify-center">
            <Link href="/seeker/applications" onClick={onClose}>
              <Button variant="primary" size="sm" className="w-full sm:w-auto">
                View My Applications
              </Button>
            </Link>
            <Button variant="outline" size="sm" onClick={onClose} className="w-full sm:w-auto">
              Browse More Jobs
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          {errorMessage && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs p-3.5 rounded-2xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Job summary card snippet */}
          <div className="bg-slate-50 border border-border p-3.5 rounded-2xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-white border border-border flex items-center justify-center overflow-hidden shrink-0">
                {job.company?.logo_url ? (
                  <img
                    src={job.company.logo_url}
                    alt={job.company.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Building2 className="w-5 h-5 text-slate-400" />
                )}
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-dark truncate">{job.title}</h4>
                <p className="text-[11px] text-muted truncate">
                  {job.company?.name} • {job.city || 'Remote'}
                </p>
              </div>
            </div>
            {matchScore > 0 && (
              <span className="bg-mint-50 text-mint-800 border border-mint-200 text-[11px] font-extrabold px-2.5 py-1 rounded-full shrink-0 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-mint-600" /> {matchScore}% Match
              </span>
            )}
          </div>

          {/* Resume Upload Section */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-dark uppercase tracking-wider">
                Resume / CV <span className="text-rose-500">*</span>
              </label>
              <span className="text-[11px] text-muted">
                PDF, DOC, DOCX, JPEG, PNG (max 15MB)
              </span>
            </div>

            {/* Select existing resume option if available */}
            {existingResumes.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <select
                    value={selectedResumeId}
                    onChange={(e) => {
                      setSelectedResumeId(e.target.value);
                      if (e.target.value !== 'NEW_FILE') {
                        setUploadedFile(null);
                      }
                    }}
                    className="w-full h-11 rounded-xl border border-border bg-white px-3 text-xs text-dark focus:border-mint-500 focus:outline-none"
                  >
                    <option value="NEW_FILE">+ Upload a different resume file...</option>
                    {existingResumes.map((res) => (
                      <option key={res.id} value={res.id}>
                        Use on-file: {res.file_name} ({new Date(res.uploaded_at).toLocaleDateString()})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* File drop / upload zone */}
            {(selectedResumeId === 'NEW_FILE' || existingResumes.length === 0) && (
              <div className="border-2 border-dashed border-border hover:border-mint-500 rounded-2xl p-5 text-center transition-colors bg-white">
                <input
                  type="file"
                  id="resumeUploadInput"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label
                  htmlFor="resumeUploadInput"
                  className="cursor-pointer flex flex-col items-center gap-2"
                >
                  <div className="w-10 h-10 rounded-xl bg-mint-50 text-mint-600 flex items-center justify-center">
                    <UploadCloud className="w-5 h-5" />
                  </div>
                  {uploadedFile ? (
                    <div className="flex items-center gap-2 text-xs font-bold text-mint-800 bg-mint-50 px-3 py-1 rounded-full border border-mint-200">
                      <FileCheck className="w-4 h-4 text-mint-600" />
                      <span className="truncate max-w-xs">{uploadedFile.name}</span>
                      <span className="text-[10px] text-muted">
                        ({(uploadedFile.size / 1024 / 1024).toFixed(2)} MB)
                      </span>
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs font-bold text-dark">
                        Click to upload your resume
                      </p>
                      <p className="text-[11px] text-muted mt-0.5">
                        Accepted: PDF, DOC, DOCX, JPG, PNG (Max 15MB)
                      </p>
                    </div>
                  )}
                </label>
              </div>
            )}
          </div>

          {/* Cover Note */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-dark uppercase tracking-wider">
              Cover Note to Employer (Optional)
            </label>
            <textarea
              rows={3}
              value={coverLetter}
              onChange={(e) => setCoverLetter(e.target.value)}
              placeholder="Highlight your key achievements, relevant projects, or reason for applying..."
              className="w-full rounded-xl border border-border p-3 text-xs text-dark focus:border-mint-500 focus:outline-none"
            />
          </div>

          {/* Action buttons */}
          <div className="pt-2 border-t border-border flex items-center justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={submitting || uploading}
              className="font-bold shadow-sm"
            >
              <Send className="w-3.5 h-3.5" />
              {uploading ? 'Uploading Resume...' : 'Submit Application'}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
