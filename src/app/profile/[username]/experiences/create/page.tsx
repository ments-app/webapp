"use client";

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Check } from 'lucide-react';
import CompanyAutocomplete from '@/components/profile/CompanyAutocomplete';
import { MonthYearSelect } from '@/components/profile/MonthYearSelect';

type ExperienceItem = { id: string; company_name: string };

export default function CreateExperiencePage() {
  const params = useParams() as { username?: string };
  const username = (params?.username || '').toString();
  const router = useRouter();

  const [experiences, setExperiences] = useState<ExperienceItem[]>([]);
  const [loadingExp, setLoadingExp] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Form state
  const [mode, setMode] = useState<'existing' | 'new'>('existing');
  const [experienceId, setExperienceId] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [domain, setDomain] = useState('');
  const [position, setPosition] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [isCurrent, setIsCurrent] = useState(false);
  const [endDate, setEndDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 2600);
  };

  useEffect(() => {
    const load = async () => {
      try {
        setLoadingExp(true);
        const res = await fetch(`/api/users/${encodeURIComponent(username)}/work-experience`);
        if (!res.ok) throw new Error('Failed to load experiences');
        const json = await res.json();
        const list: ExperienceItem[] = (json?.data?.experiences || []).map(
          (e: { id: string; company_name: string }) => ({ id: e.id, company_name: e.company_name })
        );
        setExperiences(list);
        // Auto-select first existing company; default to 'new' if none exist
        if (list.length > 0) {
          setExperienceId(list[0].id);
          setMode('existing');
        } else {
          setMode('new');
        }
      } catch (e) {
        setLoadError(e instanceof Error ? e.message : 'Failed to load');
        setMode('new');
      } finally {
        setLoadingExp(false);
      }
    };
    if (username) void load();
  }, [username]);

  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    if (mode === 'existing') {
      if (!experienceId) e.experienceId = 'Please choose a company.';
    } else {
      if (!companyName.trim()) e.companyName = 'Company name is required.';
    }
    if (!position.trim()) e.position = 'Position is required.';
    if (!startDate) e.startDate = 'Start date is required.';
    if (!isCurrent && endDate && startDate && endDate < startDate)
      e.endDate = 'End date cannot be before start date.';
    return e;
  }, [mode, experienceId, companyName, position, startDate, endDate, isCurrent]);

  const canSubmit = useMemo(() => Object.keys(errors).length === 0 && !submitting, [errors, submitting]);

  const handleSubmit = async () => {
    setSubmitted(true);
    if (!canSubmit) return;
    try {
      setSubmitting(true);
      let expId = experienceId;
      if (mode === 'new') {
        const resExp = await fetch(`/api/users/${encodeURIComponent(username)}/work-experience`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ companyName: companyName.trim(), domain: domain.trim() || null }),
        });
        if (!resExp.ok) throw new Error('Failed to create company');
        const expJson = await resExp.json();
        expId = expJson?.data?.id;
      }

      const res = await fetch(`/api/users/${encodeURIComponent(username)}/positions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          experienceId: expId,
          position: position.trim(),
          description: description.trim() || null,
          startDate: startDate || null,
          endDate: isCurrent ? null : (endDate || null),
        }),
      });
      if (!res.ok) throw new Error('Failed to add position');

      showToast('success', 'Position added ✓');
      setTimeout(() => router.push(`/profile/${encodeURIComponent(username)}/experiences/edit`), 400);
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : 'Position couldn\u2019t be saved');
    } finally {
      setSubmitting(false);
    }
  };

  // Only show field errors after first submit attempt
  const fe = (key: string) => (submitted ? errors[key] : undefined);

  return (
    <DashboardLayout>
      <div className="flex-1 w-full min-h-[calc(100vh-4rem)] py-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto w-full">
          <div className="bg-card/60 border border-border rounded-2xl shadow-sm p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-6">
              <Link
                href={`/profile/${encodeURIComponent(username)}/experiences/edit`}
                className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-5 w-5 mr-1" /> Back
              </Link>
              <h1 className="text-2xl font-semibold">Add Position</h1>
            </div>

            {loadError && <div className="text-sm text-red-400 mb-3">{loadError}</div>}

            {/* Company */}
            <div>
              <div className="text-emerald-400 font-semibold mb-3">Company</div>

              {/* Toggle — only shown when user already has companies */}
              {!loadingExp && experiences.length > 0 && (
                <div className="flex gap-2 mb-4">
                  <button
                    type="button"
                    onClick={() => setMode('existing')}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${
                      mode === 'existing'
                        ? 'bg-emerald-600 border-emerald-600 text-black'
                        : 'border-border text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Already in my profile
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('new')}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${
                      mode === 'new'
                        ? 'bg-emerald-600 border-emerald-600 text-black'
                        : 'border-border text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Add new company
                  </button>
                </div>
              )}

              {mode === 'existing' && !loadingExp ? (
                <div>
                  <span className="block text-sm text-muted-foreground mb-1.5">Select company</span>
                  <select
                    className={`w-full px-4 py-3 rounded-xl bg-background/50 border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                      fe('experienceId') ? 'border-red-500/50' : 'border-border'
                    }`}
                    value={experienceId}
                    onChange={(e) => setExperienceId(e.target.value)}
                  >
                    <option value="">— Select a company —</option>
                    {experiences.map((it) => (
                      <option key={it.id} value={it.id}>{it.company_name}</option>
                    ))}
                  </select>
                  {fe('experienceId') && (
                    <p className="text-xs text-red-400 mt-1">{fe('experienceId')}</p>
                  )}
                </div>
              ) : mode === 'new' ? (
                <div className="space-y-2">
                  <CompanyAutocomplete
                    value={companyName}
                    domain={domain}
                    onChange={(sel) => {
                      setCompanyName(sel.name);
                      if (sel.domain) setDomain(sel.domain);
                    }}
                    placeholder="Company name"
                    className="mb-1"
                  />
                  {fe('companyName') && (
                    <p className="text-xs text-red-400 -mt-1">{fe('companyName')}</p>
                  )}
                  <div className="flex items-center gap-2">
                    {domain && (
                      <img
                        src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`}
                        alt=""
                        className="h-5 w-5 rounded"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    )}
                    <input
                      type="text"
                      placeholder="Website (e.g. google.com)"
                      className="w-full px-4 py-3 rounded-xl bg-background/50 border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      value={domain}
                      onChange={(e) => setDomain(e.target.value)}
                    />
                  </div>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">Loading…</div>
              )}
            </div>

            <hr className="my-6 border-border" />

            {/* Position Details */}
            <div className="space-y-3">
              <div className="text-emerald-400 font-semibold">Position Details</div>
              <div>
                <span className="block text-sm text-muted-foreground mb-1.5">Job title</span>
                <input
                  type="text"
                  placeholder="e.g. Software Engineer"
                  className={`w-full px-4 py-3 rounded-xl bg-background/50 border text-foreground text-sm focus:outline-none focus:ring-2 ${
                    fe('position') ? 'border-red-500/50 focus:ring-red-500' : 'border-border focus:ring-emerald-500'
                  }`}
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                />
                {fe('position') && <p className="text-xs text-red-400 mt-1">{fe('position')}</p>}
              </div>
              <div>
                <span className="block text-sm text-muted-foreground mb-1.5">Description <span className="text-muted-foreground/50">(optional)</span></span>
                <textarea
                  placeholder="What did you work on?"
                  rows={4}
                  className="w-full px-4 py-3 rounded-xl bg-background/50 border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </div>

            {/* Employment Period */}
            <div className="mt-6 space-y-3">
              <div className="text-emerald-400 font-semibold">Employment Period</div>

              <MonthYearSelect
                label="Start date"
                value={startDate}
                onChange={setStartDate}
                error={fe('startDate')}
              />

              <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-emerald-500"
                  checked={isCurrent}
                  onChange={(e) => {
                    setIsCurrent(e.target.checked);
                    if (e.target.checked) setEndDate('');
                  }}
                />
                I currently work here
              </label>

              {!isCurrent && (
                <MonthYearSelect
                  label="End date"
                  value={endDate}
                  onChange={setEndDate}
                  error={fe('endDate')}
                />
              )}
            </div>

            <div className="mt-8 flex items-center justify-end gap-3">
              <button
                type="button"
                className="px-4 py-2 rounded-lg border border-border text-sm"
                onClick={() => router.push(`/profile/${encodeURIComponent(username)}/experiences/edit`)}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className={`px-4 py-2 rounded-lg text-sm inline-flex items-center gap-2 ${
                  !submitting
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-black'
                    : 'bg-white/5 border border-white/10 text-white/40 cursor-not-allowed'
                }`}
                onClick={handleSubmit}
                disabled={submitting}
              >
                <Check className="h-4 w-4" /> Save
              </button>
            </div>

            {toast && (
              <div
                className={`fixed right-4 bottom-4 z-50 px-4 py-3 rounded-lg border shadow-lg ${
                  toast.type === 'success'
                    ? 'bg-emerald-600/90 border-emerald-400/50 text-black'
                    : 'bg-red-600/90 border-red-400/50 text-white'
                }`}
              >
                {toast.message}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
