"use client";

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Check } from 'lucide-react';
import { MonthYearSelect } from '@/components/profile/MonthYearSelect';

type PositionRow = {
  id: string;
  experience_id: string;
  position: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
};

export default function EditPositionPage() {
  const params = useParams() as { username?: string; experienceId?: string; positionId?: string };
  const username = (params?.username || '').toString();
  const experienceId = (params?.experienceId || '').toString();
  const positionId = (params?.positionId || '').toString();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [isCurrent, setIsCurrent] = useState(false);
  const [endDate, setEndDate] = useState('');

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 2400);
  };

  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    if (!title.trim()) e.title = 'Job title is required.';
    if (!startDate) e.startDate = 'Start date is required.';
    if (!isCurrent && endDate && startDate && endDate < startDate)
      e.endDate = 'End date cannot be before start date.';
    return e;
  }, [title, startDate, endDate, isCurrent]);

  const canSave = useMemo(() => Object.keys(errors).length === 0 && !saving, [errors, saving]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(
        `/api/users/${encodeURIComponent(username)}/positions?experienceId=${encodeURIComponent(experienceId)}`
      );
      if (!res.ok) throw new Error('Failed to load');
      const json = await res.json();
      const items: PositionRow[] = json?.data || [];
      const pos = items.find((p) => p.id === positionId);
      if (!pos) throw new Error('Position not found');
      setTitle(pos.position || '');
      setDescription(pos.description || '');
      setStartDate(pos.start_date || '');
      setIsCurrent(!pos.end_date);
      setEndDate(pos.end_date || '');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [username, experienceId, positionId]);

  useEffect(() => {
    if (username && experienceId && positionId) void load();
  }, [load, username, experienceId, positionId]);

  const onSave = async () => {
    setSubmitted(true);
    if (!canSave) return;
    try {
      setSaving(true);
      const res = await fetch(`/api/users/${encodeURIComponent(username)}/positions`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: positionId,
          position: title.trim(),
          description: description.trim() || null,
          startDate: startDate || null,
          endDate: isCurrent ? null : (endDate || null),
        }),
      });
      if (!res.ok) throw new Error('Failed to save');
      showToast('success', 'Position updated ✓');
      setTimeout(
        () => router.push(`/profile/${encodeURIComponent(username)}/experiences/${encodeURIComponent(experienceId)}/edit`),
        400
      );
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : 'Position couldn\u2019t be saved');
    } finally {
      setSaving(false);
    }
  };

  const fe = (key: string) => (submitted ? errors[key] : undefined);

  return (
    <DashboardLayout>
      <div className="flex-1 w-full min-h-[calc(100vh-4rem)] py-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto w-full">
          <div className="bg-card/60 border border-border rounded-2xl shadow-sm p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-6">
              <Link
                href={`/profile/${encodeURIComponent(username)}/experiences/${encodeURIComponent(experienceId)}/edit`}
                className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-5 w-5 mr-1" /> Back
              </Link>
              <h1 className="text-2xl font-semibold">Edit Position</h1>
            </div>

            {loading && <div className="text-sm text-muted-foreground">Loading…</div>}
            {error && <div className="text-sm text-red-400">{error}</div>}

            {!loading && !error && (
              <>
                {/* Position Details */}
                <div className="space-y-3">
                  <div className="text-emerald-400 font-semibold">Position Details</div>
                  <div>
                    <span className="block text-sm text-muted-foreground mb-1.5">Job title</span>
                    <input
                      type="text"
                      placeholder="e.g. Software Engineer"
                      className={`w-full px-4 py-3 rounded-xl bg-background/50 border text-foreground text-sm focus:outline-none focus:ring-2 ${
                        fe('title') ? 'border-red-500/50 focus:ring-red-500' : 'border-border focus:ring-emerald-500'
                      }`}
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                    {fe('title') && <p className="text-xs text-red-400 mt-1">{fe('title')}</p>}
                  </div>
                  <div>
                    <span className="block text-sm text-muted-foreground mb-1.5">
                      Description <span className="text-muted-foreground/50">(optional)</span>
                    </span>
                    <textarea
                      placeholder="What did you work on?"
                      rows={5}
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
                    onClick={() =>
                      router.push(
                        `/profile/${encodeURIComponent(username)}/experiences/${encodeURIComponent(experienceId)}/edit`
                      )
                    }
                    disabled={saving}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className={`px-4 py-2 rounded-lg text-sm inline-flex items-center gap-2 ${
                      !saving
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-black'
                        : 'bg-white/5 border border-white/10 text-white/40 cursor-not-allowed'
                    }`}
                    onClick={onSave}
                    disabled={saving}
                  >
                    <Check className="h-4 w-4" /> Save Position
                  </button>
                </div>
              </>
            )}

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
