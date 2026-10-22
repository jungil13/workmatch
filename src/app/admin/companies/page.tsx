'use client';

import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { supabase } from '@/lib/supabase/client';
import { VerifiedCompanyBadge } from '@/components/ui/VerifiedCompanyBadge';
import { useToast, useConfirm } from '@/components/ui/Toast';
import { Building2, MapPin, Trash2, FileText } from 'lucide-react';

export default function AdminCompaniesPage() {
  const toast = useToast();
  const { confirm: confirmDialog, ConfirmDialog } = useConfirm();
  const [companies, setCompanies] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notesBySubmission, setNotesBySubmission] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');
  const [actingId, setActingId] = useState('');
  const [previewSubmission, setPreviewSubmission] = useState<any | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);

  async function load() {
    const [c, v] = await Promise.all([
      supabase.from('companies').select('*').order('updated_at', { ascending: false }),
      supabase
        .from('company_verifications')
        .select('*, company:companies(name)')
        .order('created_at', { ascending: false }),
    ]);
    if (c.error || v.error) {
      setMessage(c.error?.message || v.error?.message || 'Could not load verification data.');
      setLoading(false);
      return;
    }
    setCompanies(c.data ?? []);
    setSubmissions(v.data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    const channel = supabase
      .channel('admin-company-verification-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'company_verifications' }, () => {
        load();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'companies' }, () => {
        load();
      })
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setMessage('Live verification updates are unavailable. Refresh the page to check for new submissions.');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const decide = async (companyId: string, verificationId: string | undefined, status: string, submissionId?: string) => {
    if (actingId) return;
    const submissionNotes = submissionId ? notesBySubmission[submissionId] || '' : '';
    setActingId(submissionId || companyId);
    setMessage('');
    try {
      const res = await fetch('/api/admin/verify-company', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId, verificationId, status, notes: submissionNotes }),
      });
      const data = await res.json();
      if (!res.ok) {
        const errorMsg = data.error || 'Action failed.';
        setMessage(errorMsg);
        toast.error('Verification failed', errorMsg);
        return;
      }
      const successMsg = `Company marked ${status}.`;
      setMessage(successMsg);
      toast.success(status === 'approved' ? 'Company approved!' : `Company ${status}`, successMsg);
      if (submissionId) {
        setNotesBySubmission((prev) => ({ ...prev, [submissionId]: '' }));
      }
      await load();
    } catch {
      const failMsg = 'The review request could not be completed. Please retry.';
      setMessage(failMsg);
      toast.error('Action failed', failMsg);
    } finally {
      setActingId('');
    }
  };

  const previewPermit = async (submission: any) => {
    setPreviewSubmission(submission);
    setPreviewUrl('');
    setPreviewLoading(true);
    try {
      const res = await fetch(`/api/documents/signed-url?bucket=company-documents&path=${encodeURIComponent(submission.permit_file_path)}`);
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || 'Could not open permit.');
      setPreviewUrl(data.url);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not load permit preview.');
    } finally {
      setPreviewLoading(false);
    }
  };

  const deletePermit = async (verificationId: string) => {
    const ok = await confirmDialog('Permanently delete this business permit submission and its uploaded file?', {
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      type: 'error',
    });
    if (!ok) return;

    setActingId(verificationId);
    setMessage('');
    try {
      const res = await fetch('/api/company/verification', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verificationId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not delete business permit.');
      setMessage('Business permit deleted.');
      toast.success('Permit deleted', 'The business permit submission was removed.');
      await load();
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Could not delete business permit.';
      setMessage(msg);
      toast.error('Delete failed', msg);
    } finally {
      setActingId('');
    }
  };

  return (
    <>
    <DashboardLayout
      portal="admin"
      title="Company Verification"
      subtitle="Review business permits. Uploading a permit does not verify a company until you approve it."
    >
      {message && (
        <p className={`text-xs mb-4 rounded-xl p-3 border ${
          message.toLowerCase().includes('could not') || message.toLowerCase().includes('failed') || message.toLowerCase().includes('allow pop-ups')
            ? 'bg-rose-50 border-rose-200 text-rose-800'
            : 'bg-emerald-50 border-emerald-200 text-emerald-800'
        }`} role="status">
          {message}
        </p>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-4 border-mint-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-8 max-w-7xl">
          <section className="space-y-3">
            <h3 className="text-base font-bold">Business permit submissions</h3>
            {submissions.length === 0 ? (
              <p className="text-xs text-muted">No company verification submissions yet.</p>
            ) : (
              submissions
                .map((s) => (
                  <div key={s.id} className="bg-white border rounded-3xl p-5 space-y-3">
                    <div className="flex justify-between gap-3">
                      <div>
                        <p className="font-bold text-sm">{s.business_name}</p>
                        <p className="text-xs text-muted">{s.business_address}</p>
                        <p className="text-xs">{s.contact_email} {s.contact_phone}</p>
                      </div>
                      <span className={`text-[11px] font-bold px-2 py-1 rounded-full h-fit ${
                        s.status === 'approved'
                          ? 'bg-emerald-50 text-emerald-800'
                          : s.status === 'pending'
                          ? 'bg-amber-50 text-amber-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}>{s.status.replaceAll('_', ' ')}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-xs text-slate-600 truncate" title={s.permit_file_name}>
                        {s.permit_file_name}
                      </span>
                      <button
                        type="button"
                        className="text-xs font-bold text-emerald-700 underline"
                        onClick={() => void previewPermit(s)}
                      >
                        View business permit
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {s.status === 'pending' && (
                        <>
                          <textarea
                            className="w-full border rounded-xl text-xs p-2"
                            rows={2}
                            placeholder="Admin notes / rejection reason"
                            value={notesBySubmission[s.id] || ''}
                            onChange={(e) =>
                              setNotesBySubmission((prev) => ({
                                ...prev,
                                [s.id]: e.target.value,
                              }))
                            }
                          />
                          <Button size="sm" isLoading={actingId === s.id} disabled={Boolean(actingId)} onClick={() => decide(s.company_id, s.id, 'approved', s.id)}>
                            Approve
                          </Button>
                          <Button size="sm" variant="outline" isLoading={actingId === s.id} disabled={Boolean(actingId)} onClick={() => decide(s.company_id, s.id, 'resubmission_required', s.id)}>
                            Request resubmission
                          </Button>
                          <Button size="sm" variant="danger" isLoading={actingId === s.id} disabled={Boolean(actingId)} onClick={() => decide(s.company_id, s.id, 'rejected', s.id)}>
                            Reject
                          </Button>
                        </>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        isLoading={actingId === s.id}
                        disabled={Boolean(actingId)}
                        onClick={() => void deletePermit(s.id)}
                        className="text-rose-700 border-rose-200 hover:bg-rose-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete permit
                      </Button>
                    </div>
                  </div>
                ))
            )}
          </section>

          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {companies.map((comp) => (
              <div key={comp.id} className="bg-white rounded-3xl border p-6 space-y-3">
                <div className="flex justify-between">
                  <Building2 className="w-6 h-6 text-slate-400" />
                  <VerifiedCompanyBadge company={comp} />
                </div>
                <h3 className="text-base font-bold">{comp.name}</h3>
                <p className="text-xs text-mint-700 font-semibold">{comp.industry}</p>
                <p className="text-xs text-muted flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" /> {comp.city}, {comp.province}
                </p>
                <p className="text-[11px] font-bold uppercase text-slate-500">
                  Status: {comp.verification_status || (comp.verified ? 'approved' : 'unverified')}
                </p>
                {comp.verification_status === 'approved' && (
                  <Button size="sm" variant="outline" isLoading={actingId === comp.id} disabled={Boolean(actingId)} onClick={() => decide(comp.id, undefined, 'rejected')}>
                    Revoke verification
                  </Button>
                )}
              </div>
            ))}
          </section>
        </div>
      )}
      <Modal
        isOpen={Boolean(previewSubmission)}
        onClose={() => {
          setPreviewSubmission(null);
          setPreviewUrl('');
        }}
        title="Business permit"
        description={previewSubmission?.permit_file_name}
        maxWidth="3xl"
      >
        {previewLoading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-mint-500 border-t-transparent" />
          </div>
        ) : previewUrl && previewSubmission?.permit_mime_type?.startsWith('image/') ? (
          <img
            src={previewUrl}
            alt={`Business permit: ${previewSubmission.permit_file_name}`}
            className="max-h-[70vh] w-full rounded-xl border border-slate-200 bg-slate-50 object-contain"
          />
        ) : previewUrl ? (
          <iframe
            src={previewUrl}
            title={`Business permit: ${previewSubmission?.permit_file_name || 'PDF preview'}`}
            className="h-[70vh] w-full rounded-xl border border-slate-200"
          />
        ) : (
          <div className="flex min-h-48 flex-col items-center justify-center gap-2 text-sm text-muted">
            <FileText className="h-8 w-8" />
            <span>Permit preview is unavailable.</span>
          </div>
        )}
      </Modal>
    </DashboardLayout>
    {ConfirmDialog}
    </>
  );
}
