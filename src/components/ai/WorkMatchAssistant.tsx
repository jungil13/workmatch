'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, Send, X, AlertTriangle, Loader2, Star, Mic } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  text: string;
  scores?: { relevance: number; clarity: number; completeness: number; communication: number };
}

export function WorkMatchAssistant({ jobId, companyId }: { jobId?: string; companyId?: string }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [interviewSessionId, setInterviewSessionId] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      text: 'Hi! I\'m the WorkMatch AI Assistant. No sign-in is needed to chat. I can help you with:\n• Job match scores & applications\n• Company verification status\n• Job scam warning signs\n\nSign in is required for interview practice and job reports.',
    },
  ]);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('Suspicious job posting');
  const [reportDetails, setReportDetails] = useState('');
  const [reportMsg, setReportMsg] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get('openAssistant') !== 'true') return;

    setOpen(true);
    url.searchParams.delete('openAssistant');
    window.history.replaceState({}, document.title, `${url.pathname}${url.search}${url.hash}`);
  }, []);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (open) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, open]);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const addMessage = useCallback((msg: Message) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  const interviewRequest = async (payload: Record<string, string>) => {
    const response = await fetch('/api/ai/interview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Interview practice is temporarily unavailable.');
    return data;
  };

  const startInterview = async () => {
    if (busy) return;
    setBusy(true);
    addMessage({ role: 'user', text: '▶ Starting mock interview...' });
    try {
      const data = await interviewRequest({ action: 'start', jobId: jobId || '' });
      setInterviewSessionId(data.sessionId);
      addMessage({
        role: 'assistant',
        text: `🎤 Mock interview started${data.jobTitle ? ` for **${data.jobTitle}**` : ''}.\n\n**${data.category?.toUpperCase() || 'QUESTION'}**\n${data.question}\n\n_Type your answer below and press Send._`,
      });
    } catch (err) {
      addMessage({
        role: 'assistant',
        text: `❌ ${err instanceof Error ? err.message : 'Could not start interview practice. Try again.'}`,
      });
    } finally {
      setBusy(false);
    }
  };

  const finishInterview = async () => {
    if (!interviewSessionId || busy) return;
    setBusy(true);
    try {
      const data = await interviewRequest({ action: 'finish', sessionId: interviewSessionId });
      const summary = data.summary;
      const strengths = (summary?.strengths || []).map((s: string) => `✅ ${s}`).join('\n');
      const improvements = (summary?.improvements || []).map((s: string) => `📈 ${s}`).join('\n');
      addMessage({
        role: 'assistant',
        text: `📊 **Interview Summary**\n\n${summary?.overall || 'Session complete.'}\n\n**Strengths:**\n${strengths || 'Not available'}\n\n**Areas to improve:**\n${improvements || 'Not available'}`,
      });
      setInterviewSessionId('');
    } catch (err) {
      addMessage({
        role: 'assistant',
        text: err instanceof Error ? err.message : 'Could not finish the interview.',
      });
    } finally {
      setBusy(false);
    }
  };

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    setInput('');
    addMessage({ role: 'user', text });
    setBusy(true);

    try {
      if (interviewSessionId) {
        // Interview answer flow
        const turn = await interviewRequest({ action: 'answer', sessionId: interviewSessionId, answer: text });
        const avgScore = turn.scores
          ? Math.round(
              (turn.scores.relevance + turn.scores.clarity + turn.scores.completeness + turn.scores.communication) / 4
            )
          : null;

        const feedbackParts = [
          `💬 **Feedback**\n${turn.feedback}`,
          turn.sampleAnswer ? `📖 **Sample answer (learning reference)**\n${turn.sampleAnswer}` : '',
          turn.nextQuestion
            ? `\n**Next question (${turn.category}):**\n${turn.nextQuestion}\n\n_Type your answer below._`
            : '\n_All questions answered. Generating your summary..._',
        ].filter(Boolean).join('\n\n');

        addMessage({
          role: 'assistant',
          text: feedbackParts,
          scores: turn.scores || undefined,
        });

        if (!turn.nextQuestion) {
          // Auto-finish when no more questions
          const result = await interviewRequest({ action: 'finish', sessionId: interviewSessionId });
          const summary = result.summary;
          const strengths = (summary?.strengths || []).map((s: string) => `✅ ${s}`).join('\n');
          const improvements = (summary?.improvements || []).map((s: string) => `📈 ${s}`).join('\n');
          addMessage({
            role: 'assistant',
            text: `📊 **Interview Complete — Summary**\n\n${summary?.overall || 'Session complete.'}\n\n**Strengths:**\n${strengths || 'Not available'}\n\n**Areas to improve:**\n${improvements || 'Not available'}`,
          });
          setInterviewSessionId('');
        }
        return;
      }

      // Regular assistant
      const res = await fetch('/api/ai/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, jobId }),
      });
      const data = await res.json();
      addMessage({
        role: 'assistant',
        text: data.reply || data.error || 'I could not answer that right now. Please try again.',
      });
    } catch {
      addMessage({ role: 'assistant', text: 'The assistant is temporarily unavailable. Please try again in a moment.' });
    } finally {
      setBusy(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  };

  const submitReport = async () => {
    setReportMsg('');
    const res = await fetch('/api/reports/job', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId, companyId, reason: reportReason, description: reportDetails }),
    });
    const data = await res.json();
    if (!res.ok) {
      setReportMsg(data.error || 'Could not submit report. Sign in and try again.');
      return;
    }
    setReportMsg('Report submitted to WorkMatch administrators.');
    setReportDetails('');
    setReportOpen(false);
  };

  return (
    <>
      {/* Floating trigger button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-40 rounded-full bg-emerald-600 text-white shadow-lg px-4 py-3 text-xs font-bold flex items-center gap-2 hover:bg-emerald-700 transition-all hover:scale-105 active:scale-95"
        aria-label="Open WorkMatch AI Assistant"
      >
        <MessageCircle className="w-4 h-4" />
        <span>AI Assistant</span>
      </button>

      {open && (
        <div className="fixed bottom-5 right-5 z-50 w-[min(100vw-1.5rem,24rem)] bg-white border border-slate-200 rounded-3xl shadow-2xl flex flex-col max-h-[80vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-gradient-to-r from-emerald-50 to-white rounded-t-3xl">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                <Mic className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">WorkMatch AI</p>
                <p className="text-[10px] text-emerald-700 font-semibold">
                  {interviewSessionId ? '🎤 Interview in progress' : 'Jobs · Matching · Verification'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {interviewSessionId ? (
                <button
                  type="button"
                  onClick={() => void finishInterview()}
                  disabled={busy}
                  className="text-[10px] font-bold text-rose-600 hover:text-rose-700 disabled:opacity-40 bg-rose-50 px-2 py-1 rounded-lg border border-rose-200 transition-colors"
                >
                  End Interview
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void startInterview()}
                  disabled={busy}
                  className="text-[10px] font-bold text-emerald-700 hover:text-emerald-800 disabled:opacity-40 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200 transition-colors"
                >
                  Practice Interview
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close assistant"
                className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5 text-xs scroll-smooth">
            {messages.map((m, i) => (
              <div key={i} className={`flex flex-col gap-1 ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div
                  className={`rounded-2xl px-3 py-2.5 max-w-[90%] leading-relaxed whitespace-pre-line ${
                    m.role === 'user'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-50 text-slate-700 border border-slate-100'
                  }`}
                >
                  {m.text}
                </div>
                {/* Score pills for interview answers */}
                {m.scores && (
                  <div className="flex flex-wrap gap-1 ml-1">
                    {Object.entries(m.scores).map(([key, val]) => (
                      <span
                        key={key}
                        className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                          val >= 4 ? 'bg-emerald-100 text-emerald-800' : val >= 3 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        <Star className="w-2.5 h-2.5" />
                        {key.charAt(0).toUpperCase() + key.slice(1)}: {val}/5
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {busy && (
              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                <Loader2 className="w-3 h-3 animate-spin text-emerald-500" />
                <span>Thinking…</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Report Job */}
          {jobId && (
            <div className="px-3 pb-1 border-t border-slate-50">
              <button
                type="button"
                onClick={() => setReportOpen((v) => !v)}
                className="text-[11px] font-bold text-rose-600 flex items-center gap-1 py-1.5 hover:text-rose-700 transition-colors"
              >
                <AlertTriangle className="w-3 h-3" /> Report this job
              </button>
              {reportOpen && (
                <div className="space-y-2 pb-2">
                  <select
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl text-xs p-2 focus:border-emerald-500 focus:outline-none"
                  >
                    <option>Suspicious job posting</option>
                    <option>Requests upfront fees</option>
                    <option>Misleading company information</option>
                    <option>Suspicious links</option>
                    <option>Requests sensitive information</option>
                  </select>
                  <textarea
                    value={reportDetails}
                    onChange={(e) => setReportDetails(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl text-xs p-2 focus:border-emerald-500 focus:outline-none"
                    rows={2}
                    placeholder="Describe what looks suspicious..."
                  />
                  <button
                    type="button"
                    onClick={() => void submitReport()}
                    className="text-xs font-bold bg-rose-600 text-white px-3 py-1.5 rounded-lg hover:bg-rose-700 transition-colors"
                  >
                    Submit report
                  </button>
                  {reportMsg && <p className="text-[11px] text-emerald-700">{reportMsg}</p>}
                </div>
              )}
            </div>
          )}

          {/* Input */}
          <form
            className="p-3 border-t border-slate-100 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:border-emerald-500 focus:outline-none placeholder:text-slate-400"
              placeholder={interviewSessionId ? 'Type your interview answer…' : 'Ask about jobs, matching, or verification…'}
              disabled={busy}
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              className="bg-emerald-600 text-white rounded-xl px-3 disabled:opacity-40 hover:bg-emerald-700 transition-colors active:scale-95"
              aria-label="Send"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
