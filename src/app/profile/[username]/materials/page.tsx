"use client";

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { useUserData } from '@/hooks/useUserData';
import type {
  ApplyKitRecord,
  MaterialLinkEntry,
  MaterialProjectBrief,
  ResumeVariantRecord,
} from '@/lib/application-materials';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ChevronDown,
  Check,
  ExternalLink,
  FileText,
  Layers3,
  Loader2,
  Pencil,
  Trash2,
} from 'lucide-react';
import { cn } from '@/utils/cn';

type MaterialsResponse = {
  resume_variants: ResumeVariantRecord[];
  apply_kits: ApplyKitRecord[];
  projects: MaterialProjectBrief[];
  profile_links: MaterialLinkEntry[];
};

const EMPTY_KIT_FORM = {
  id: null as string | null,
  name: '',
  summary: '',
  resume_variant_id: '',
  highlight_project_ids: [] as string[],
  selected_link_keys: [] as string[],
  include_profile_links: true,
  show_on_profile: false,
  is_primary: false,
};

const EMPTY_RESUME_FORM = {
  id: null as string | null,
  label: '',
  file_url: '',
  is_default: false,
};

export default function ApplicationMaterialsPage() {
  const params = useParams<{ username?: string }>();
  const username = (params?.username || '').toString();
  const router = useRouter();
  const { userData, loading: userDataLoading } = useUserData();

  const [materials, setMaterials] = useState<MaterialsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [resumeForm, setResumeForm] = useState(EMPTY_RESUME_FORM);
  const [resumeSaving, setResumeSaving] = useState(false);
  const [resumeUploading, setResumeUploading] = useState(false);

  const [kitForm, setKitForm] = useState(EMPTY_KIT_FORM);
  const [kitSaving, setKitSaving] = useState(false);
  const [activeWorkspace, setActiveWorkspace] = useState<'portfolio' | 'resume'>('portfolio');
  const [expandedKitSection, setExpandedKitSection] = useState<'resume' | 'projects' | 'links' | 'visibility' | null>(null);

  const isOwner = !!(userData?.username && userData.username.toLowerCase() === username.toLowerCase());

  const resumeLabelById = useMemo(() => {
    const entries = materials?.resume_variants || [];
    return new Map(entries.map((item) => [item.id, item.label]));
  }, [materials?.resume_variants]);

  const loadMaterials = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/users/${encodeURIComponent(username)}/application-materials`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Failed to load materials');
      setMaterials(json.data as MaterialsResponse);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load materials');
    } finally {
      setLoading(false);
    }
  }, [username]);

  useEffect(() => {
    if (!userDataLoading && userData && !isOwner) {
      router.replace(`/profile/${encodeURIComponent(username)}`);
    }
  }, [isOwner, router, userData, userDataLoading, username]);

  useEffect(() => {
    if (!username || !isOwner) return;
    void loadMaterials();
  }, [isOwner, loadMaterials, username]);

  const resetResumeForm = () => setResumeForm(EMPTY_RESUME_FORM);
  const resetKitForm = () => {
    setKitForm(EMPTY_KIT_FORM);
    setExpandedKitSection(null);
  };

  const openKitForEditing = (kit: ApplyKitRecord) => {
    setActiveWorkspace('portfolio');
    setExpandedKitSection(null);
    setKitForm({
      id: kit.id,
      name: kit.name,
      summary: kit.summary || '',
      resume_variant_id: kit.resume_variant_id || '',
      highlight_project_ids: kit.highlight_project_ids || [],
      selected_link_keys: kit.selected_link_keys || [],
      include_profile_links: kit.include_profile_links,
      show_on_profile: kit.show_on_profile,
      is_primary: kit.is_primary,
    });
  };

  const handleResumeFile = async (file: File) => {
    setResumeUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('resume', file);

      const res = await fetch('/api/resume-variants/upload', {
        method: 'POST',
        body: formData,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Failed to upload file');

      setResumeForm((prev) => ({ ...prev, file_url: json.url || '' }));
      if (!resumeForm.label.trim()) {
        const fileName = file.name.replace(/\.pdf$/i, '').trim();
        setResumeForm((prev) => ({ ...prev, label: prev.label.trim() || fileName || 'Resume version' }));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to upload file');
    } finally {
      setResumeUploading(false);
    }
  };

  const saveResumeVariant = async () => {
    setResumeSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/users/${encodeURIComponent(username)}/application-materials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'resume_variant',
          ...resumeForm,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Failed to save resume version');

      resetResumeForm();
      await loadMaterials();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save resume version');
    } finally {
      setResumeSaving(false);
    }
  };

  const deleteResumeVariant = async (id: string) => {
    const ok = window.confirm('Delete this resume version?');
    if (!ok) return;

    setError(null);
    try {
      const res = await fetch(`/api/users/${encodeURIComponent(username)}/application-materials?kind=resume_variant&id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Failed to delete resume version');
      if (resumeForm.id === id) resetResumeForm();
      await loadMaterials();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete resume version');
    }
  };

  const saveApplyKit = async () => {
    setKitSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/users/${encodeURIComponent(username)}/application-materials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'apply_kit',
          id: kitForm.id,
          name: kitForm.name,
          summary: kitForm.summary,
          resume_variant_id: kitForm.resume_variant_id || null,
          highlight_project_ids: kitForm.highlight_project_ids,
          selected_link_keys: kitForm.selected_link_keys,
          include_profile_links: kitForm.include_profile_links,
          show_on_profile: kitForm.show_on_profile,
          is_primary: kitForm.is_primary,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Failed to save role kit');

      resetKitForm();
      await loadMaterials();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save role kit');
    } finally {
      setKitSaving(false);
    }
  };

  const deleteApplyKit = async (id: string) => {
    const ok = window.confirm('Delete this role kit?');
    if (!ok) return;

    setError(null);
    try {
      const res = await fetch(`/api/users/${encodeURIComponent(username)}/application-materials?kind=apply_kit&id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Failed to delete role kit');
      if (kitForm.id === id) resetKitForm();
      await loadMaterials();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete role kit');
    }
  };

  const toggleProjectSelection = (projectId: string) => {
    setKitForm((prev) => {
      const exists = prev.highlight_project_ids.includes(projectId);
      if (exists) {
        return {
          ...prev,
          highlight_project_ids: prev.highlight_project_ids.filter((id) => id !== projectId),
        };
      }

      if (prev.highlight_project_ids.length >= 3) {
        return prev;
      }

      return {
        ...prev,
        highlight_project_ids: [...prev.highlight_project_ids, projectId],
      };
    });
  };

  const toggleLinkSelection = (key: string) => {
    setKitForm((prev) => {
      const exists = prev.selected_link_keys.includes(key);
      return {
        ...prev,
        selected_link_keys: exists
          ? prev.selected_link_keys.filter((item) => item !== key)
          : [...prev.selected_link_keys, key],
      };
    });
  };

  const kitProjectLimitReached = kitForm.highlight_project_ids.length >= 3;
  const selectedProjects = useMemo(() => {
    const selectedIds = new Set(kitForm.highlight_project_ids);
    return (materials?.projects || []).filter((project) => selectedIds.has(project.id));
  }, [kitForm.highlight_project_ids, materials?.projects]);

  const selectedLinks = useMemo(() => {
    const selectedKeys = new Set(kitForm.selected_link_keys);
    return (materials?.profile_links || []).filter((link) => selectedKeys.has(link.key));
  }, [kitForm.selected_link_keys, materials?.profile_links]);

  const hasKitDraft = !!(
    kitForm.id ||
    kitForm.name.trim() ||
    kitForm.summary.trim() ||
    kitForm.resume_variant_id ||
    kitForm.highlight_project_ids.length > 0 ||
    kitForm.selected_link_keys.length > 0 ||
    kitForm.show_on_profile ||
    kitForm.is_primary
  );

  const selectedResumeSummary = kitForm.resume_variant_id
    ? resumeLabelById.get(kitForm.resume_variant_id) || 'Saved resume'
    : 'Flexible per application';

  const selectedLinksSummary = !kitForm.include_profile_links
    ? 'Hidden'
    : kitForm.selected_link_keys.length > 0
      ? `${kitForm.selected_link_keys.length} selected`
      : `${(materials?.profile_links || []).length} inherited`;

  const visibilitySummary = !kitForm.show_on_profile
    ? 'Apply-only'
    : kitForm.is_primary
      ? 'Primary public view'
      : 'Public view';

  if (userDataLoading || (!isOwner && userData)) {
    return (
      <DashboardLayout>
        <div className="min-h-[50vh] flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex-1 w-full min-h-[calc(100vh-4rem)] py-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto w-full space-y-6">
          <div className="flex items-center gap-3">
            <Link
              href={`/profile/${encodeURIComponent(username)}`}
              className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Link>
            <div>
              <h1 className="text-2xl font-semibold">Application Materials</h1>
              <p className="text-sm text-muted-foreground">
                Save resume versions and reusable role kits without cluttering your main profile.
              </p>
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          {loading ? (
            <div className="rounded-2xl border border-border bg-card p-10 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <div className="inline-flex rounded-2xl border border-border bg-card p-1">
                <button
                  type="button"
                  onClick={() => setActiveWorkspace('portfolio')}
                  className={cn(
                    'rounded-xl px-4 py-2 text-sm font-medium transition-colors',
                    activeWorkspace === 'portfolio'
                      ? 'bg-emerald-500/10 text-emerald-300'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  Portfolio Views
                </button>
                <button
                  type="button"
                  onClick={() => setActiveWorkspace('resume')}
                  className={cn(
                    'rounded-xl px-4 py-2 text-sm font-medium transition-colors',
                    activeWorkspace === 'resume'
                      ? 'bg-emerald-500/10 text-emerald-300'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  Resume Library
                </button>
              </div>

              {activeWorkspace === 'portfolio' ? (
                <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
                  <div className="bg-card border border-border rounded-2xl overflow-hidden">
                    <div className="px-6 py-4 border-b border-border flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-emerald-400">
                        <Layers3 className="h-4 w-4" />
                        <span className="text-sm font-medium">Portfolio View Builder</span>
                      </div>
                      {hasKitDraft && (
                        <Button variant="ghost" size="sm" onClick={resetKitForm} className="rounded-full">
                          Start Fresh
                        </Button>
                      )}
                    </div>

                    <div className="p-6 space-y-4">
                      <div className="rounded-2xl border border-border bg-background/20 p-4 space-y-3">
                        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
                          <div>
                            <label className="text-sm font-medium block mb-2">View Name</label>
                            <input
                              value={kitForm.name}
                              onChange={(e) => setKitForm((prev) => ({ ...prev, name: e.target.value }))}
                              className="w-full px-4 py-3 rounded-xl bg-background/50 border border-border focus:outline-none focus:ring-2 focus:ring-emerald-500"
                              placeholder="Developer, CA, Designer..."
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium block mb-2">Short Summary</label>
                            <textarea
                              value={kitForm.summary}
                              onChange={(e) => setKitForm((prev) => ({ ...prev, summary: e.target.value }))}
                              rows={3}
                              className="w-full px-4 py-3 rounded-xl bg-background/50 border border-border focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                              placeholder="What this role lens is strongest at."
                            />
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                          <span className="rounded-full border border-border px-2.5 py-1">
                            Resume: {selectedResumeSummary}
                          </span>
                          <span className="rounded-full border border-border px-2.5 py-1">
                            Projects: {kitForm.highlight_project_ids.length}/3
                          </span>
                          <span className="rounded-full border border-border px-2.5 py-1">
                            Links: {selectedLinksSummary}
                          </span>
                          <span className="rounded-full border border-border px-2.5 py-1">
                            {visibilitySummary}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="rounded-2xl border border-border bg-background/20">
                          <button
                            type="button"
                            onClick={() => setExpandedKitSection((prev) => (prev === 'resume' ? null : 'resume'))}
                            className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left"
                          >
                            <div>
                              <p className="text-sm font-medium text-foreground">Resume</p>
                              <p className="mt-1 text-xs text-muted-foreground">{selectedResumeSummary}</p>
                            </div>
                            <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', expandedKitSection === 'resume' && 'rotate-180')} />
                          </button>

                          {expandedKitSection === 'resume' && (
                            <div className="border-t border-border px-4 py-4">
                              <div className="grid gap-2">
                                <button
                                  type="button"
                                  onClick={() => setKitForm((prev) => ({ ...prev, resume_variant_id: '' }))}
                                  className={cn(
                                    'w-full rounded-2xl border px-4 py-3 text-left transition-colors',
                                    !kitForm.resume_variant_id
                                      ? 'border-emerald-500/40 bg-emerald-500/10'
                                      : 'border-border bg-background/30 hover:border-emerald-500/20'
                                  )}
                                >
                                  <div className="flex items-center justify-between gap-3">
                                    <div>
                                      <p className="text-sm font-medium text-foreground">No fixed resume</p>
                                      <p className="mt-1 text-xs text-muted-foreground">Choose a resume at apply time instead.</p>
                                    </div>
                                    <div className={cn('inline-flex h-6 w-6 items-center justify-center rounded-full border', !kitForm.resume_variant_id ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300' : 'border-border text-transparent')}>
                                      <Check className="h-3.5 w-3.5" />
                                    </div>
                                  </div>
                                </button>

                                {(materials?.resume_variants || []).map((resume) => {
                                  const selected = kitForm.resume_variant_id === resume.id;
                                  return (
                                    <button
                                      key={resume.id}
                                      type="button"
                                      onClick={() => setKitForm((prev) => ({ ...prev, resume_variant_id: resume.id }))}
                                      className={cn(
                                        'w-full rounded-2xl border px-4 py-3 text-left transition-colors',
                                        selected
                                          ? 'border-emerald-500/40 bg-emerald-500/10'
                                          : 'border-border bg-background/30 hover:border-emerald-500/20'
                                      )}
                                    >
                                      <div className="flex items-center justify-between gap-3">
                                        <div className="min-w-0">
                                          <div className="flex flex-wrap items-center gap-2">
                                            <p className="text-sm font-medium text-foreground">{resume.label}</p>
                                            {resume.is_default && (
                                              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-300">
                                                Default
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                        <div className={cn('inline-flex h-6 w-6 items-center justify-center rounded-full border', selected ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300' : 'border-border text-transparent')}>
                                          <Check className="h-3.5 w-3.5" />
                                        </div>
                                      </div>
                                    </button>
                                  );
                                })}

                                {(materials?.resume_variants || []).length === 0 && (
                                  <div className="rounded-2xl border border-dashed border-border px-4 py-5 text-sm text-muted-foreground">
                                    Add a resume in the Resume Library tab first.
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="rounded-2xl border border-border bg-background/20">
                          <button
                            type="button"
                            onClick={() => setExpandedKitSection((prev) => (prev === 'projects' ? null : 'projects'))}
                            className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left"
                          >
                            <div>
                              <p className="text-sm font-medium text-foreground">Projects</p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {kitForm.highlight_project_ids.length === 0 ? 'No featured projects yet' : `${kitForm.highlight_project_ids.length} selected`}
                              </p>
                            </div>
                            <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', expandedKitSection === 'projects' && 'rotate-180')} />
                          </button>

                          {expandedKitSection === 'projects' && (
                            <div className="border-t border-border px-4 py-4 space-y-3">
                              {(materials?.projects || []).length === 0 ? (
                                <p className="text-sm text-muted-foreground">No projects available yet.</p>
                              ) : (
                                <div className="grid gap-2">
                                  {materials?.projects.map((project) => {
                                    const selected = kitForm.highlight_project_ids.includes(project.id);
                                    const disabled = !selected && kitProjectLimitReached;
                                    const selectionIndex = kitForm.highlight_project_ids.indexOf(project.id);

                                    return (
                                      <button
                                        key={project.id}
                                        type="button"
                                        onClick={() => {
                                          if (!disabled) toggleProjectSelection(project.id);
                                        }}
                                        className={cn(
                                          'w-full rounded-2xl border px-4 py-3 text-left transition-colors',
                                          selected
                                            ? 'border-emerald-500/40 bg-emerald-500/10'
                                            : 'border-border bg-background/30 hover:border-emerald-500/20',
                                          disabled && 'cursor-not-allowed opacity-50'
                                        )}
                                      >
                                        <div className="flex items-start justify-between gap-3">
                                          <div className="min-w-0">
                                            <p className="text-sm font-medium text-foreground">{project.title}</p>
                                            {project.tagline && (
                                              <p className="mt-1 text-xs text-muted-foreground">{project.tagline}</p>
                                            )}
                                          </div>
                                          <div className={cn('inline-flex h-7 min-w-7 items-center justify-center rounded-full border px-2 text-xs font-medium', selected ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300' : 'border-border text-muted-foreground')}>
                                            {selected ? selectionIndex + 1 : 'Add'}
                                          </div>
                                        </div>
                                      </button>
                                    );
                                  })}
                                </div>
                              )}

                              {selectedProjects.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                  {selectedProjects.map((project, index) => (
                                    <span key={project.id} className="inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300">
                                      <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500/20 text-[10px] font-semibold">
                                        {index + 1}
                                      </span>
                                      {project.title}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="rounded-2xl border border-border bg-background/20">
                          <button
                            type="button"
                            onClick={() => setExpandedKitSection((prev) => (prev === 'links' ? null : 'links'))}
                            className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left"
                          >
                            <div>
                              <p className="text-sm font-medium text-foreground">Links</p>
                              <p className="mt-1 text-xs text-muted-foreground">{selectedLinksSummary}</p>
                            </div>
                            <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', expandedKitSection === 'links' && 'rotate-180')} />
                          </button>

                          {expandedKitSection === 'links' && (
                            <div className="border-t border-border px-4 py-4 space-y-3">
                              <div className="grid gap-2 sm:grid-cols-2">
                                <button
                                  type="button"
                                  onClick={() => setKitForm((prev) => ({ ...prev, include_profile_links: true }))}
                                  className={cn(
                                    'rounded-2xl border px-4 py-3 text-left transition-colors',
                                    kitForm.include_profile_links
                                      ? 'border-emerald-500/40 bg-emerald-500/10'
                                      : 'border-border bg-background/30 hover:border-emerald-500/20'
                                  )}
                                >
                                  <p className="text-sm font-medium text-foreground">Show links</p>
                                  <p className="mt-1 text-xs text-muted-foreground">Expose selected profile links in this view.</p>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setKitForm((prev) => ({
                                    ...prev,
                                    include_profile_links: false,
                                    selected_link_keys: [],
                                  }))}
                                  className={cn(
                                    'rounded-2xl border px-4 py-3 text-left transition-colors',
                                    !kitForm.include_profile_links
                                      ? 'border-emerald-500/40 bg-emerald-500/10'
                                      : 'border-border bg-background/30 hover:border-emerald-500/20'
                                  )}
                                >
                                  <p className="text-sm font-medium text-foreground">Hide links</p>
                                  <p className="mt-1 text-xs text-muted-foreground">Keep this view focused on projects only.</p>
                                </button>
                              </div>

                              {(materials?.profile_links || []).length === 0 ? (
                                <p className="text-sm text-muted-foreground">No profile links available right now.</p>
                              ) : (
                                <div className="flex flex-wrap gap-2">
                                  {materials?.profile_links.map((link) => {
                                    const selected = kitForm.selected_link_keys.includes(link.key);
                                    return (
                                      <button
                                        key={link.key}
                                        type="button"
                                        disabled={!kitForm.include_profile_links}
                                        onClick={() => toggleLinkSelection(link.key)}
                                        className={cn(
                                          'rounded-full border px-3 py-2 text-xs transition-colors',
                                          selected
                                            ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                                            : 'border-border bg-background/30 text-muted-foreground hover:border-emerald-500/20 hover:text-foreground',
                                          !kitForm.include_profile_links && 'cursor-not-allowed opacity-50'
                                        )}
                                      >
                                        {link.label}
                                      </button>
                                    );
                                  })}
                                </div>
                              )}

                              {kitForm.include_profile_links && selectedLinks.length > 0 && (
                                <div className="rounded-xl border border-border bg-background/30 p-3">
                                  <p className="text-xs font-medium text-foreground">Selected links</p>
                                  <div className="mt-2 flex flex-wrap gap-2">
                                    {selectedLinks.map((link) => (
                                      <span key={link.key} className="inline-flex items-center rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground">
                                        {link.label}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="rounded-2xl border border-border bg-background/20">
                          <button
                            type="button"
                            onClick={() => setExpandedKitSection((prev) => (prev === 'visibility' ? null : 'visibility'))}
                            className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left"
                          >
                            <div>
                              <p className="text-sm font-medium text-foreground">Visibility</p>
                              <p className="mt-1 text-xs text-muted-foreground">{visibilitySummary}</p>
                            </div>
                            <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', expandedKitSection === 'visibility' && 'rotate-180')} />
                          </button>

                          {expandedKitSection === 'visibility' && (
                            <div className="border-t border-border px-4 py-4 space-y-3">
                              <div className="grid gap-2 sm:grid-cols-2">
                                <button
                                  type="button"
                                  onClick={() => setKitForm((prev) => ({
                                    ...prev,
                                    show_on_profile: false,
                                    is_primary: false,
                                  }))}
                                  className={cn(
                                    'rounded-2xl border px-4 py-3 text-left transition-colors',
                                    !kitForm.show_on_profile
                                      ? 'border-emerald-500/40 bg-emerald-500/10'
                                      : 'border-border bg-background/30 hover:border-emerald-500/20'
                                  )}
                                >
                                  <p className="text-sm font-medium text-foreground">Apply-only</p>
                                  <p className="mt-1 text-xs text-muted-foreground">Keep this private for applications.</p>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setKitForm((prev) => ({ ...prev, show_on_profile: true }))}
                                  className={cn(
                                    'rounded-2xl border px-4 py-3 text-left transition-colors',
                                    kitForm.show_on_profile
                                      ? 'border-emerald-500/40 bg-emerald-500/10'
                                      : 'border-border bg-background/30 hover:border-emerald-500/20'
                                  )}
                                >
                                  <p className="text-sm font-medium text-foreground">Show in portfolio</p>
                                  <p className="mt-1 text-xs text-muted-foreground">Make this available in the inline profile portfolio.</p>
                                </button>
                              </div>

                              {kitForm.show_on_profile && (
                                <div className="grid gap-2 sm:grid-cols-2">
                                  <button
                                    type="button"
                                    onClick={() => setKitForm((prev) => ({ ...prev, is_primary: false }))}
                                    className={cn(
                                      'rounded-2xl border px-4 py-3 text-left transition-colors',
                                      !kitForm.is_primary
                                        ? 'border-emerald-500/40 bg-emerald-500/10'
                                        : 'border-border bg-background/30 hover:border-emerald-500/20'
                                    )}
                                  >
                                    <p className="text-sm font-medium text-foreground">Standard public view</p>
                                    <p className="mt-1 text-xs text-muted-foreground">Shows in the switcher.</p>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setKitForm((prev) => ({
                                      ...prev,
                                      is_primary: true,
                                      show_on_profile: true,
                                    }))}
                                    className={cn(
                                      'rounded-2xl border px-4 py-3 text-left transition-colors',
                                      kitForm.is_primary
                                        ? 'border-emerald-500/40 bg-emerald-500/10'
                                        : 'border-border bg-background/30 hover:border-emerald-500/20'
                                    )}
                                  >
                                    <p className="text-sm font-medium text-foreground">Primary public view</p>
                                    <p className="mt-1 text-xs text-muted-foreground">Opens first on the profile.</p>
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button
                          onClick={saveApplyKit}
                          disabled={!kitForm.name.trim() || kitSaving}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl"
                        >
                          {kitSaving ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Saving…
                            </>
                          ) : (
                            kitForm.id ? 'Update Portfolio View' : 'Save Portfolio View'
                          )}
                        </Button>
                        {kitForm.id && (
                          <Button variant="outline" onClick={resetKitForm}>
                            Cancel Edit
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="bg-card border border-border rounded-2xl overflow-hidden">
                    <div className="px-6 py-4 border-b border-border flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-emerald-400">
                        <Layers3 className="h-4 w-4" />
                        <span className="text-sm font-medium">Saved Views</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {(materials?.apply_kits || []).length} total
                      </span>
                    </div>

                    <div className="p-6 space-y-3">
                      {(materials?.apply_kits || []).length === 0 ? (
                        <div className="rounded-xl border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
                          No portfolio views yet. Start with one clear role lens.
                        </div>
                      ) : (
                        materials?.apply_kits.map((kit) => (
                          <div key={kit.id} className="rounded-xl border border-border bg-background/30 px-4 py-4">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                              <div className="flex items-start gap-3 min-w-0 flex-1">
                                <div className="mt-0.5 shrink-0 rounded-lg bg-emerald-500/10 p-2 text-emerald-300">
                                  <Layers3 className="h-4 w-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <p className="font-medium break-words">{kit.name}</p>
                                        {kit.show_on_profile && (
                                          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-300">
                                            Public
                                          </span>
                                        )}
                                        {kit.is_primary && (
                                          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-300">
                                            Primary
                                          </span>
                                        )}
                                      </div>
                                      {kit.summary && (
                                        <p className="mt-1 text-sm text-muted-foreground break-words line-clamp-2">{kit.summary}</p>
                                      )}
                                    </div>
                                    <div className="hidden sm:flex items-center gap-1 shrink-0">
                                      <button
                                        type="button"
                                        onClick={() => openKitForEditing(kit)}
                                        className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5"
                                      >
                                        <Pencil className="h-4 w-4" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => void deleteApplyKit(kit.id)}
                                        className="p-2 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </button>
                                    </div>
                                  </div>

                                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                                    <span className="inline-flex max-w-full items-center rounded-full border border-border px-2 py-1">
                                      <span className="truncate">
                                        {kit.resume_variant_id ? `Resume: ${resumeLabelById.get(kit.resume_variant_id) || 'Saved resume'}` : 'Flexible resume'}
                                      </span>
                                    </span>
                                    <span className="inline-flex max-w-full items-center rounded-full border border-border px-2 py-1">
                                      <span className="truncate">{kit.highlight_project_ids.length} projects</span>
                                    </span>
                                    <span className="inline-flex max-w-full items-center rounded-full border border-border px-2 py-1">
                                      <span className="truncate">
                                        {kit.include_profile_links ? `${kit.selected_link_keys.length || (materials?.profile_links || []).length} links` : 'Links hidden'}
                                      </span>
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center justify-end gap-1 sm:hidden">
                                <button
                                  type="button"
                                  onClick={() => openKitForEditing(kit)}
                                  className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5"
                                >
                                  <Pencil className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void deleteApplyKit(kit.id)}
                                  className="p-2 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(320px,1.05fr)]">
                  <div className="bg-card border border-border rounded-2xl overflow-hidden">
                    <div className="px-6 py-4 border-b border-border flex items-center gap-2 text-emerald-400">
                      <FileText className="h-4 w-4" />
                      <span className="text-sm font-medium">Resume Editor</span>
                    </div>

                    <div className="p-6">
                      <div className="space-y-4 rounded-2xl border border-border bg-background/20 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h2 className="text-sm font-semibold text-foreground">
                              {resumeForm.id ? 'Edit resume version' : 'Add a resume version'}
                            </h2>
                            <p className="mt-1 text-xs text-muted-foreground">
                              Upload once, then reuse the same file across quick fill and portfolio views.
                            </p>
                          </div>
                          {resumeForm.id && (
                            <Button variant="ghost" size="sm" onClick={resetResumeForm} className="rounded-full">
                              Cancel
                            </Button>
                          )}
                        </div>

                        <div>
                          <label className="text-sm font-medium block mb-2">Label</label>
                          <input
                            value={resumeForm.label}
                            onChange={(e) => setResumeForm((prev) => ({ ...prev, label: e.target.value }))}
                            className="w-full px-4 py-3 rounded-xl bg-background/50 border border-border focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            placeholder="Frontend Resume"
                          />
                        </div>

                        <div>
                          <label className="text-sm font-medium block mb-2">Resume PDF</label>
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                            <input
                              type="file"
                              accept="application/pdf"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) void handleResumeFile(file);
                              }}
                              className="block w-full text-sm text-muted-foreground file:mr-4 file:rounded-lg file:border-0 file:bg-emerald-500/15 file:px-3 file:py-2 file:text-sm file:font-medium file:text-emerald-300 hover:file:bg-emerald-500/20"
                            />
                            {resumeForm.file_url && (
                              <a
                                href={resumeForm.file_url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-sm text-emerald-300 hover:text-emerald-200"
                              >
                                Preview
                                <ExternalLink className="h-3.5 w-3.5" />
                              </a>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setResumeForm((prev) => ({ ...prev, is_default: !prev.is_default }))}
                          className={cn(
                            'w-full rounded-2xl border px-4 py-3 text-left transition-colors',
                            resumeForm.is_default
                              ? 'border-emerald-500/40 bg-emerald-500/10'
                              : 'border-border bg-background/30 hover:border-emerald-500/20'
                          )}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-medium text-foreground">Default resume</p>
                              <p className="mt-1 text-xs text-muted-foreground">Use this version first in applications and kits.</p>
                            </div>
                            <div className={cn('inline-flex h-6 w-6 items-center justify-center rounded-full border', resumeForm.is_default ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300' : 'border-border text-transparent')}>
                              <Check className="h-3.5 w-3.5" />
                            </div>
                          </div>
                        </button>

                        <Button
                          onClick={saveResumeVariant}
                          disabled={!resumeForm.label.trim() || !resumeForm.file_url || resumeSaving || resumeUploading}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl"
                        >
                          {resumeSaving || resumeUploading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              {resumeUploading ? 'Uploading…' : 'Saving…'}
                            </>
                          ) : (
                            resumeForm.id ? 'Update Resume Version' : 'Save Resume Version'
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="bg-card border border-border rounded-2xl overflow-hidden">
                    <div className="px-6 py-4 border-b border-border flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-emerald-400">
                        <FileText className="h-4 w-4" />
                        <span className="text-sm font-medium">Saved Resumes</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {(materials?.resume_variants || []).length} total
                      </span>
                    </div>

                    <div className="p-6 space-y-3">
                      {(materials?.resume_variants || []).length === 0 ? (
                        <div className="rounded-xl border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
                          No resume versions yet. Upload your main one first, then add role-specific versions as needed.
                        </div>
                      ) : (
                        materials?.resume_variants.map((resume) => (
                          <div key={resume.id} className="rounded-xl border border-border bg-background/30 px-4 py-4 flex items-start gap-3">
                            <div className="mt-0.5 rounded-lg bg-emerald-500/10 p-2 text-emerald-300">
                              <FileText className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-medium">{resume.label}</p>
                                {resume.is_default && (
                                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-300">
                                    <Check className="h-3 w-3" />
                                    Default
                                  </span>
                                )}
                              </div>
                              <a
                                href={resume.file_url}
                                target="_blank"
                                rel="noreferrer"
                                className="mt-1 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                              >
                                View PDF
                                <ExternalLink className="h-3.5 w-3.5" />
                              </a>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveWorkspace('resume');
                                  setResumeForm({
                                    id: resume.id,
                                    label: resume.label,
                                    file_url: resume.file_url,
                                    is_default: resume.is_default,
                                  });
                                }}
                                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => void deleteResumeVariant(resume.id)}
                                className="p-2 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
