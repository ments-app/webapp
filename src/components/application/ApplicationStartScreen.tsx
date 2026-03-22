'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useUserData } from '@/hooks/useUserData';
import type {
  ApplyKitRecord,
  MaterialLinkEntry,
  MaterialProjectBrief,
  ResumeVariantRecord,
} from '@/lib/application-materials';
import ApplicationFlow from './ApplicationFlow';
import { AlertTriangle, ArrowLeft, Brain, Clock, Layers3, Link2, Shield } from 'lucide-react';

type MaterialsResponse = {
  resume_variants: ResumeVariantRecord[];
  apply_kits: ApplyKitRecord[];
  projects: MaterialProjectBrief[];
  profile_links: MaterialLinkEntry[];
};

interface ApplicationStartScreenProps {
  type: 'job' | 'gig';
  listingId: string;
  listingTitle: string;
}

export default function ApplicationStartScreen({
  type,
  listingId,
  listingTitle,
}: ApplicationStartScreenProps) {
  const router = useRouter();
  const { userData } = useUserData();

  const [started, setStarted] = useState(false);
  const [materials, setMaterials] = useState<MaterialsResponse | null>(null);
  const [materialsLoading, setMaterialsLoading] = useState(true);
  const [materialsError, setMaterialsError] = useState<string | null>(null);

  const [selectedApplyKitId, setSelectedApplyKitId] = useState('');
  const [selectedResumeVariantId, setSelectedResumeVariantId] = useState('');
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [includeProfileLinks, setIncludeProfileLinks] = useState(true);

  const allProfileLinkKeys = useMemo(
    () => (materials?.profile_links || []).map((link) => link.key),
    [materials?.profile_links],
  );

  const defaultResumeId = useMemo(() => {
    const variants = materials?.resume_variants || [];
    return variants.find((resume) => resume.is_default)?.id || variants[0]?.id || '';
  }, [materials?.resume_variants]);

  const applyKitMap = useMemo(() => {
    return new Map((materials?.apply_kits || []).map((kit) => [kit.id, kit]));
  }, [materials?.apply_kits]);

  useEffect(() => {
    if (!userData?.username) {
      setMaterialsLoading(false);
      return;
    }

    let cancelled = false;

    const run = async () => {
      try {
        setMaterialsLoading(true);
        setMaterialsError(null);
        const res = await fetch(`/api/users/${encodeURIComponent(userData.username)}/application-materials`);
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error || 'Failed to load application materials');
        if (!cancelled) {
          setMaterials(json.data as MaterialsResponse);
        }
      } catch (e) {
        if (!cancelled) {
          setMaterialsError(e instanceof Error ? e.message : 'Failed to load application materials');
        }
      } finally {
        if (!cancelled) setMaterialsLoading(false);
      }
    };

    void run();
    return () => { cancelled = true; };
  }, [userData?.username]);

  useEffect(() => {
    if (!materials) return;
    setSelectedResumeVariantId((prev) => prev || defaultResumeId);
    setIncludeProfileLinks(true);
  }, [defaultResumeId, materials]);

  useEffect(() => {
    if (!materials) return;

    const kit = selectedApplyKitId ? applyKitMap.get(selectedApplyKitId) : null;
    if (!kit) {
      setSelectedResumeVariantId(defaultResumeId);
      setSelectedProjectIds([]);
      setIncludeProfileLinks(allProfileLinkKeys.length > 0);
      return;
    }

    setSelectedResumeVariantId(kit.resume_variant_id || defaultResumeId);
    setSelectedProjectIds(Array.isArray(kit.highlight_project_ids) ? kit.highlight_project_ids.slice(0, 3) : []);
    setIncludeProfileLinks(Boolean(kit.include_profile_links && (kit.selected_link_keys?.length || allProfileLinkKeys.length)));
  }, [allProfileLinkKeys.length, applyKitMap, defaultResumeId, materials, selectedApplyKitId]);

  const selectedLinkKeys = useMemo(() => {
    const kit = selectedApplyKitId ? applyKitMap.get(selectedApplyKitId) : null;
    if (!includeProfileLinks) return [];
    if (kit) {
      return (kit.selected_link_keys?.length ? kit.selected_link_keys : allProfileLinkKeys).slice(0, 9);
    }
    return allProfileLinkKeys;
  }, [allProfileLinkKeys, applyKitMap, includeProfileLinks, selectedApplyKitId]);

  const selectedResumeLabel = useMemo(() => {
    return (materials?.resume_variants || []).find((resume) => resume.id === selectedResumeVariantId)?.label || 'Profile only';
  }, [materials?.resume_variants, selectedResumeVariantId]);

  const toggleProject = (projectId: string) => {
    setSelectedProjectIds((prev) => {
      if (prev.includes(projectId)) {
        return prev.filter((id) => id !== projectId);
      }
      if (prev.length >= 3) {
        return prev;
      }
      return [...prev, projectId];
    });
  };

  if (started) {
    return (
      <ApplicationFlow
        type={type}
        listingId={listingId}
        listingTitle={listingTitle}
        startOptions={{
          applyKitId: selectedApplyKitId || null,
          resumeVariantId: selectedResumeVariantId || null,
          highlightProjectIds: selectedProjectIds,
          selectedLinkKeys,
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-8">
          <div className="h-16 w-16 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center mx-auto mb-4">
            <Brain className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">AI-Powered Application</h1>
          <p className="text-sm text-muted-foreground mt-2">
            {listingTitle ? `Apply for: ${listingTitle}` : 'Loading...'}
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 space-y-4 mb-6">
          <h2 className="text-sm font-semibold text-foreground">Before you begin:</h2>

          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">AI Profile Analysis</p>
              <p className="text-xs text-muted-foreground">
                Your profile will be analyzed against this {type === 'job' ? 'role' : 'gig'} and scored.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Brain className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">AI Interview (6 Questions)</p>
              <p className="text-xs text-muted-foreground">You&apos;ll answer role-specific questions. Each answer is evaluated and scored by AI in real-time.</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Clock className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">Estimated Time: 5-10 minutes</p>
              <p className="text-xs text-muted-foreground">Take your time to give thoughtful answers. Quality matters more than speed.</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">Do Not Leave This Page</p>
              <p className="text-xs text-muted-foreground">Tab switches are tracked and visible to the hiring team. Stay focused during the application.</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 space-y-5 mb-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Application Materials</h2>
              <p className="text-xs text-muted-foreground mt-1">
                Pick the resume and supporting proof you want attached to this application.
              </p>
            </div>
            {userData?.username && (
              <Link
                href={`/profile/${encodeURIComponent(userData.username)}/materials`}
                className="text-xs font-medium text-emerald-400 hover:text-emerald-300"
              >
                Manage
              </Link>
            )}
          </div>

          {materialsLoading ? (
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <Brain className="h-4 w-4" />
              Loading saved materials...
            </div>
          ) : materialsError ? (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {materialsError}
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium block">Role Kit</label>
                <select
                  value={selectedApplyKitId}
                  onChange={(e) => setSelectedApplyKitId(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background/50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Custom for this application</option>
                  {(materials?.apply_kits || []).map((kit) => (
                    <option key={kit.id} value={kit.id}>{kit.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium block">Resume Version</label>
                <select
                  value={selectedResumeVariantId}
                  onChange={(e) => setSelectedResumeVariantId(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background/50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Profile only</option>
                  {(materials?.resume_variants || []).map((resume) => (
                    <option key={resume.id} value={resume.id}>
                      {resume.label}{resume.is_default ? ' (Default)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Highlighted Projects</label>
                  <span className="text-xs text-muted-foreground">{selectedProjectIds.length}/3</span>
                </div>
                {(materials?.projects || []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No projects on your profile yet.</p>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {materials?.projects.map((project) => {
                      const checked = selectedProjectIds.includes(project.id);
                      const disabled = !checked && selectedProjectIds.length >= 3;
                      return (
                        <label
                          key={project.id}
                          className={`flex items-start gap-3 rounded-xl border px-3 py-3 text-sm ${
                            checked ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-border bg-background/30'
                          } ${disabled ? 'opacity-50' : ''}`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={disabled}
                            onChange={() => toggleProject(project.id)}
                            className="mt-1 rounded border-border"
                          />
                          <span className="min-w-0">
                            <span className="block font-medium truncate">{project.title}</span>
                            {project.tagline && <span className="block text-xs text-muted-foreground truncate">{project.tagline}</span>}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={includeProfileLinks}
                  onChange={(e) => setIncludeProfileLinks(e.target.checked)}
                  className="rounded border-border"
                />
                Include profile links
              </label>

              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1">
                  <Layers3 className="h-3.5 w-3.5" />
                  {selectedApplyKitId ? 'Kit applied' : 'Custom setup'}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1">
                  {selectedResumeLabel}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1">
                  <Link2 className="h-3.5 w-3.5" />
                  {includeProfileLinks ? `${selectedLinkKeys.length} links included` : 'Links off'}
                </span>
              </div>
            </>
          )}
        </div>

        <button
          onClick={() => setStarted(true)}
          disabled={!listingTitle}
          className="w-full rounded-xl bg-primary text-primary-foreground py-3.5 text-sm font-bold hover:opacity-90 transition disabled:opacity-50"
        >
          Start Application
        </button>
        <button
          onClick={() => router.back()}
          className="w-full mt-3 rounded-xl border border-border py-3 text-sm font-medium text-muted-foreground hover:bg-accent/50 transition flex items-center justify-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Go Back
        </button>
      </div>
    </div>
  );
}
