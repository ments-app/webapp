export const MATERIAL_LINK_KEYS = [
  'linkedin',
  'github',
  'instagram',
  'dribbble',
  'behance',
  'youtube',
  'figma',
  'website',
  'substack',
] as const;

export type MaterialLinkKey = typeof MATERIAL_LINK_KEYS[number];

export interface ResumeVariantRecord {
  id: string;
  user_id: string;
  label: string;
  file_url: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface ApplyKitRecord {
  id: string;
  user_id: string;
  name: string;
  summary: string | null;
  resume_variant_id: string | null;
  highlight_project_ids: string[];
  selected_link_keys: MaterialLinkKey[];
  include_profile_links: boolean;
  show_on_profile: boolean;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

export interface MaterialProjectBrief {
  id: string;
  title: string;
  tagline: string | null;
  logo_url: string | null;
}

export interface MaterialLinkEntry {
  key: MaterialLinkKey;
  label: string;
  url: string;
}

const MATERIAL_LINK_LABELS: Record<MaterialLinkKey, string> = {
  linkedin: 'LinkedIn',
  github: 'GitHub',
  instagram: 'Instagram',
  dribbble: 'Dribbble',
  behance: 'Behance',
  youtube: 'YouTube',
  figma: 'Figma',
  website: 'Website',
  substack: 'Substack',
};

type UserSocialLinks = Partial<Record<Exclude<MaterialLinkKey, 'linkedin'>, string | null>>;

export function normalizeMaterialUrl(url?: string | null): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export function sanitizeSelectedLinkKeys(input: unknown): MaterialLinkKey[] {
  if (!Array.isArray(input)) return [];
  const allowed = new Set<string>(MATERIAL_LINK_KEYS);
  const unique = new Set<MaterialLinkKey>();

  for (const value of input) {
    if (typeof value !== 'string') continue;
    const key = value.trim().toLowerCase() as MaterialLinkKey;
    if (allowed.has(key)) unique.add(key);
  }

  return Array.from(unique);
}

export function sanitizeProjectIds(input: unknown, limit = 3): string[] {
  if (!Array.isArray(input)) return [];
  const unique = new Set<string>();

  for (const value of input) {
    if (typeof value !== 'string') continue;
    const trimmed = value.trim();
    if (!trimmed) continue;
    unique.add(trimmed);
    if (unique.size >= limit) break;
  }

  return Array.from(unique);
}

export function getProfileMaterialLinks(
  linkedin: string | null | undefined,
  socialLinks: UserSocialLinks | null | undefined,
): MaterialLinkEntry[] {
  const entries: MaterialLinkEntry[] = [];

  const addEntry = (key: MaterialLinkKey, url?: string | null) => {
    const normalized = normalizeMaterialUrl(url);
    if (!normalized) return;
    entries.push({
      key,
      label: MATERIAL_LINK_LABELS[key],
      url: normalized,
    });
  };

  addEntry('linkedin', linkedin);

  for (const key of MATERIAL_LINK_KEYS) {
    if (key === 'linkedin') continue;
    addEntry(key, socialLinks?.[key as Exclude<MaterialLinkKey, 'linkedin'>]);
  }

  return entries;
}
