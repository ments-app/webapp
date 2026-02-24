"use client";

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Step1Identity } from '@/components/startups/Step1Identity';
import { Step2Description } from '@/components/startups/Step2Description';
import { Step3Branding } from '@/components/startups/Step3Branding';
import { Step4Positioning } from '@/components/startups/Step4Positioning';
import { Step5Edge } from '@/components/startups/Step5Edge';
import { Step6Financials } from '@/components/startups/Step6Financials';
import { Step7Media } from '@/components/startups/Step7Media';
import {
  fetchStartupById, updateStartup, upsertFounders, upsertFundingRounds,
  uploadPitchDeck, uploadStartupImage, StartupProfile,
} from '@/api/startups';
import { ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';

export default function EditStartupPage() {
  const { user } = useAuth();
  const params = useParams();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isUploadingDeck, setIsUploadingDeck] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [profileData, setProfileData] = useState({
    brand_name: '', registered_name: '', legal_status: 'not_registered', cin: '',
    stage: 'ideation', description: '', keywords: [] as string[], website: '',
    founded_date: '', registered_address: '', startup_email: '',
    startup_phone: '', pitch_deck_url: '', is_actively_raising: false,
    business_model: '', city: '', country: '', categories: [] as string[],
    team_size: '', key_strengths: '', target_audience: '',
    revenue_amount: '', revenue_currency: 'USD', revenue_growth: '',
    traction_metrics: '', total_raised: '', investor_count: '',
    elevator_pitch: '', logo_url: '', banner_url: '',
  });

  const [founders, setFounders] = useState<{ name: string; linkedin_url: string; display_order: number }[]>([]);
  const [fundingRounds, setFundingRounds] = useState<{ investor: string; amount: string; round_type: string; round_date: string; is_public: boolean }[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data } = await fetchStartupById(id, user?.id);
      if (!data) {
        setError('Startup not found');
        setLoading(false);
        return;
      }
      if (data.owner_id !== user?.id) {
        setError('You do not own this startup');
        setLoading(false);
        return;
      }

      setProfileData({
        brand_name: data.brand_name, registered_name: data.registered_name || '',
        legal_status: data.legal_status, cin: data.cin || '',
        stage: data.stage, description: data.description || '',
        keywords: data.keywords || [], website: data.website || '',
        founded_date: data.founded_date || '', registered_address: data.registered_address || '',
        startup_email: data.startup_email, startup_phone: data.startup_phone,
        pitch_deck_url: data.pitch_deck_url || '',
        is_actively_raising: data.is_actively_raising,
        business_model: data.business_model || '', city: data.city || '',
        country: data.country || '', categories: data.categories || [],
        team_size: data.team_size || '', key_strengths: data.key_strengths || '',
        target_audience: data.target_audience || '',
        revenue_amount: data.revenue_amount || '', revenue_currency: data.revenue_currency || 'USD',
        revenue_growth: data.revenue_growth || '', traction_metrics: data.traction_metrics || '',
        total_raised: data.total_raised || '',
        investor_count: data.investor_count?.toString() || '',
        elevator_pitch: data.elevator_pitch || '',
        logo_url: data.logo_url || '', banner_url: data.banner_url || '',
      });

      if (data.founders) {
        setFounders(data.founders.map(f => ({
          name: f.name, linkedin_url: f.linkedin_url || '', display_order: f.display_order,
        })));
      }
      if (data.funding_rounds) {
        setFundingRounds(data.funding_rounds.map(r => ({
          investor: r.investor || '', amount: r.amount || '',
          round_type: r.round_type || '', round_date: r.round_date || '', is_public: r.is_public,
        })));
      }
      if (data.incubators) {
        setIncubators(data.incubators.map(i => ({
          program_name: i.program_name,
          year: i.year ? (typeof i.year === 'string' ? new Date(i.year).getFullYear() : i.year) : '' as number | '',
        })));
      }
      if (data.awards) {
        setAwards(data.awards.map(a => ({
          award_name: a.award_name,
          year: a.year ? (typeof a.year === 'string' ? new Date(a.year).getFullYear() : a.year) : '' as number | '',
        })));
      }
      setLoading(false);
    };
    if (user) load();
  }, [id, user]);

  const handleProfileChange = (field: string, value: string | string[] | boolean) => {
    setProfileData(prev => ({ ...prev, [field]: value }));
  };

  const handlePitchDeckUpload = async (file: File) => {
    setIsUploadingDeck(true);
    const { url, error } = await uploadPitchDeck(file);
    setIsUploadingDeck(false);
    if (error) setError(error);
    else setProfileData(prev => ({ ...prev, pitch_deck_url: url }));
  };

  const handleLogoUpload = async (file: File) => {
    setIsUploadingLogo(true);
    const { url, error } = await uploadStartupImage(file, 'logo');
    setIsUploadingLogo(false);
    if (error) setError(error);
    else setProfileData(prev => ({ ...prev, logo_url: url }));
  };

  const handleBannerUpload = async (file: File) => {
    setIsUploadingBanner(true);
    const { url, error } = await uploadStartupImage(file, 'banner');
    setIsUploadingBanner(false);
    if (error) setError(error);
    else setProfileData(prev => ({ ...prev, banner_url: url }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const { error: updateError } = await updateStartup(id, {
        brand_name: profileData.brand_name,
        registered_name: profileData.registered_name || null,
        legal_status: profileData.legal_status as StartupProfile['legal_status'],
        cin: profileData.cin || null,
        stage: profileData.stage as StartupProfile['stage'],
        description: profileData.description || null,
        keywords: profileData.keywords,
        website: profileData.website || null,
        founded_date: profileData.founded_date || null,
        registered_address: profileData.registered_address || null,
        startup_email: profileData.startup_email,
        startup_phone: profileData.startup_phone,
        pitch_deck_url: profileData.pitch_deck_url || null,
        is_actively_raising: profileData.is_actively_raising,
        business_model: profileData.business_model || null,
        city: profileData.city || null,
        country: profileData.country || null,
        categories: profileData.categories,
        team_size: profileData.team_size || null,
        key_strengths: profileData.key_strengths || null,
        target_audience: profileData.target_audience || null,
        revenue_amount: profileData.revenue_amount || null,
        revenue_currency: profileData.revenue_currency || null,
        revenue_growth: profileData.revenue_growth || null,
        traction_metrics: profileData.traction_metrics || null,
        total_raised: profileData.total_raised || null,
        investor_count: profileData.investor_count ? parseInt(profileData.investor_count) : null,
        elevator_pitch: profileData.elevator_pitch || null,
        logo_url: profileData.logo_url || null,
        banner_url: profileData.banner_url || null,
      });

      if (updateError) throw new Error(updateError.message);

      await Promise.all([
        upsertFounders(id, founders.filter(f => f.name).map(f => ({
          name: f.name, linkedin_url: f.linkedin_url || undefined, display_order: f.display_order,
        }))),
        upsertFundingRounds(id, fundingRounds.filter(r => r.round_type || r.amount || r.investor)),
      ]);

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  if (error && !profileData.brand_name) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-red-500">{error}</p>
          <Link href="/startups" className="mt-4 text-sm text-primary hover:underline">Back to Startups</Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Link href={`/startups/${id}`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back to Profile
          </Link>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {saving ? (
              <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save Changes
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-600">{error}</div>
        )}
        {success && (
          <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl text-sm text-green-600">Changes saved successfully!</div>
        )}

        <div className="space-y-8">
          <Step1Identity data={profileData} onChange={handleProfileChange} />
          <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
          <Step2Description data={profileData} founders={founders} onChange={handleProfileChange} onFoundersChange={setFounders} />
          <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
          <Step3Branding
            logoUrl={profileData.logo_url}
            bannerUrl={profileData.banner_url}
            isUploadingLogo={isUploadingLogo}
            isUploadingBanner={isUploadingBanner}
            onLogoUpload={handleLogoUpload}
            onBannerUpload={handleBannerUpload}
            onRemoveLogo={() => handleProfileChange('logo_url', '')}
            onRemoveBanner={() => handleProfileChange('banner_url', '')}
          />
          <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
          <Step4Positioning data={profileData} onChange={handleProfileChange} />
          <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
          <Step5Edge data={profileData} onChange={handleProfileChange} />
          <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
          <Step6Financials
            data={profileData}
            fundingRounds={fundingRounds}
            onChange={handleProfileChange}
            onFundingChange={setFundingRounds}
          />
          <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
          <Step7Media
            data={profileData}
            isUploadingDeck={isUploadingDeck}
            onChange={handleProfileChange}
            onPitchDeckUpload={handlePitchDeckUpload}
          />
        </div>

        {/* Bottom save */}
        <div className="flex justify-end pt-6 border-t border-border/50">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {saving ? (
              <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save Changes
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}
