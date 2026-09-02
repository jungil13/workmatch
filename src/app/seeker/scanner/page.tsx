'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Progress } from '@/components/ui/Progress';
import { scanTextForSkills, DetectedSkillItem } from '@/lib/ai/skillScanner';
import { supabase } from '@/lib/supabase/client';
import {
  Scan,
  Sparkles,
  CheckCircle2,
  Plus,
  Trash2,
  FileText,
  Check,
  ArrowRight,
} from 'lucide-react';

export default function SeekerScannerPage() {
  const [inputText, setInputText] = useState('');
  const [detectedSkills, setDetectedSkills] = useState<DetectedSkillItem[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [acceptedCount, setAcceptedCount] = useState(0);
  const [newSkillName, setNewSkillName] = useState('');
  const [userId, setUserId] = useState('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
  }, []);

  const handleScan = () => {
    if (!inputText.trim()) return;
    setIsScanning(true);
    setTimeout(() => {
      const results = scanTextForSkills(inputText);
      setDetectedSkills(results);
      setIsScanning(false);
    }, 600);
  };

  const handleAcceptSkill = async (skill: DetectedSkillItem) => {
    if (!userId) return;
    // Find or create skill in skills table
    let skillId = '';
    const { data: existingSkill } = await supabase
      .from('skills')
      .select('id')
      .ilike('name', skill.name)
      .maybeSingle();

    if (existingSkill) {
      skillId = existingSkill.id;
    } else {
      const { data: newSkill } = await supabase
        .from('skills')
        .insert({ name: skill.name, category: skill.category as any, verified: false })
        .select('id')
        .maybeSingle();
      if (newSkill) skillId = newSkill.id;
    }

    if (skillId) {
      await supabase.from('job_seeker_skills').upsert({
        user_id: userId,
        skill_id: skillId,
        proficiency: skill.proficiency,
        years_experience: skill.years_experience,
        verified: false,
      });
      setAcceptedCount((prev) => prev + 1);
    }
  };

  const handleRemoveSkill = (skillName: string) => {
    setDetectedSkills((prev) => prev.filter((s) => s.name !== skillName));
  };

  const handleAcceptAll = async () => {
    for (const skill of detectedSkills) {
      await handleAcceptSkill(skill);
    }
  };

  const handleAddManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSkillName.trim()) return;
    const manualItem: DetectedSkillItem = {
      name: newSkillName.trim(),
      category: 'Technical',
      confidence: 100,
      years_experience: 2,
      proficiency: 4,
      evidenceSnippet: 'Manually added by candidate',
    };
    setDetectedSkills([manualItem, ...detectedSkills]);
    handleAcceptSkill(manualItem);
    setNewSkillName('');
  };

  return (
    <DashboardLayout
      portal="seeker"
      title="AI Skill Scanner"
      subtitle="Extract verified technical skills, frameworks, and tools from your resume text."
      actions={
        <Link href="/seeker/profile">
          <Button variant="outline" size="sm">
            View Updated Profile <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </Link>
      }
    >
      <div className="space-y-8 max-w-5xl">
        {/* Top Scanner Banner */}
        <div className="bg-gradient-to-r from-mint-500 to-mint-600 rounded-3xl p-6 sm:p-8 text-white shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold">
              Automated NLP Skill Taxonomy Extraction
            </span>
            <h2 className="text-2xl font-black tracking-tight">
              Extract and Save Skills with AI
            </h2>
            <p className="text-xs text-mint-100 leading-relaxed">
              Paste your resume, bio, or credentials below to automatically detect technical skills and save them directly to your verified profile.
            </p>
          </div>

          {detectedSkills.length > 0 && (
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="secondary"
                size="md"
                onClick={handleAcceptAll}
                className="bg-white text-dark hover:bg-slate-100 shadow-md font-bold"
              >
                <Check className="w-4 h-4" /> Accept All ({detectedSkills.length})
              </Button>
            </div>
          )}
        </div>

        {/* 2-Column Interface */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-5 bg-white rounded-3xl border border-border p-6 shadow-soft space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-dark flex items-center gap-2">
                <FileText className="w-4 h-4 text-mint-600" /> Resume / Experience Text
              </h3>
              <span className="text-[11px] text-muted">Paste plain text</span>
            </div>

            <textarea
              rows={14}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Paste your resume summary, work experience bullets, or technical stack here..."
              className="w-full rounded-2xl border border-border p-4 text-xs font-mono text-dark bg-slate-50 focus:bg-white focus:border-mint-500 focus:outline-none leading-relaxed resize-none"
            />

            <Button
              variant="primary"
              size="md"
              onClick={handleScan}
              isLoading={isScanning}
              disabled={!inputText.trim()}
              className="w-full justify-center shadow-md font-bold"
            >
              <Scan className="w-4 h-4" /> Scan Text with AI
            </Button>
          </div>

          {/* Right Column */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white rounded-3xl border border-border p-6 shadow-soft space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
                <div>
                  <h3 className="text-base font-bold text-dark flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-mint-600" /> Detected Skills ({detectedSkills.length})
                  </h3>
                  <p className="text-xs text-muted">Review, adjust proficiency, and accept into your profile.</p>
                </div>

                <form onSubmit={handleAddManual} className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Add manual skill..."
                    value={newSkillName}
                    onChange={(e) => setNewSkillName(e.target.value)}
                    className="h-9 px-3 text-xs rounded-xl border border-border focus:border-mint-500 focus:outline-none w-36 sm:w-44"
                  />
                  <Button type="submit" variant="mint-soft" size="sm">
                    <Plus className="w-3.5 h-3.5" />
                  </Button>
                </form>
              </div>

              {detectedSkills.length === 0 ? (
                <div className="text-center py-12 text-xs text-muted space-y-2">
                  <Sparkles className="w-8 h-8 text-slate-300 mx-auto" />
                  <p>Paste text on the left and click <strong>Scan Text with AI</strong> to extract skills.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                  {detectedSkills.map((skill) => (
                    <div
                      key={skill.name}
                      className="bg-slate-50 p-4 rounded-2xl border border-slate-100 hover:border-mint-200 transition-colors space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-dark">{skill.name}</h4>
                            <span className="text-[10px] font-semibold bg-white border border-slate-200 text-slate-700 px-2 py-0.5 rounded-md">
                              {skill.category}
                            </span>
                          </div>
                          {skill.evidenceSnippet && (
                            <p className="text-[11px] text-muted italic mt-0.5 line-clamp-1">
                              {skill.evidenceSnippet}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            variant="mint-soft"
                            size="sm"
                            onClick={() => handleAcceptSkill(skill)}
                            className="h-8 px-3 text-xs font-bold"
                          >
                            <Check className="w-3.5 h-3.5" /> Accept
                          </Button>
                          <button
                            onClick={() => handleRemoveSkill(skill.name)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-white transition-colors"
                            title="Dismiss"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px] font-semibold text-slate-600">
                          <span>AI Confidence</span>
                          <span className="text-mint-700 font-bold">{skill.confidence}%</span>
                        </div>
                        <Progress value={skill.confidence} size="sm" variant="mint" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

