"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { createStartup, upsertFounders, upsertFundingRounds, uploadPitchDeck, uploadStartupImage } from '@/api/startups';
import { Step1Identity } from './Step1Identity';
import { Step2Description } from './Step2Description';
import { Step3Branding } from './Step3Branding';
import { Step4Positioning } from './Step4Positioning';
import { Step5Edge } from './Step5Edge';
import { Step6Financials } from './Step6Financials';
import { Step7Media } from './Step7Media';
import { Step8Visibility } from './Step8Visibility';
import { ChevronLeft, ChevronRight, Send, SkipForward } from 'lucide-react';

const STEPS = ['Identity', 'Description', 'Branding', 'Positioning', 'Edge', 'Financials', 'Media', 'Visibility'];
const OPTIONAL_STEPS = [2, 3, 4, 5, 6]; // 0-indexed: Branding, Positioning, Edge, Financials, Media

export function StartupCreateWizard() {
  const { user } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingDeck, setIsUploadingDeck] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Profile data
  const [profileData, setProfileData] = useState({
    brand_name: '',
    registered_name: '',
    legal_status: 'not_registered',
    cin: '',
    stage: 'ideation',
    founded_date: '',
    city: '',
    country: '',
    startup_email: user?.email || '',
    startup_phone: '',
    business_model: '',
    description: '',
    keywords: [] as string[],
    categories: [] as string[],
    website: '',
    team_size: '',
    key_strengths: '',
    target_audience: '',
    revenue_amount: '',
    revenue_currency: 'USD',
    revenue_growth: '',
    traction_metrics: '',
    total_raised: '',
    investor_count: '',
    is_actively_raising: false,
    pitch_deck_url: '',
    elevator_pitch: '',
    logo_url: '',
    banner_url: '',
    visibility: 'public',
    confirmation: false,
  });

  // Related data
  const [founders, setFounders] = useState<{ name: string; linkedin_url: string; display_order: number }[]>([
    { name: '', linkedin_url: '', display_order: 0 },
  ]);
  const [fundingRounds, setFundingRounds] = useState<{ investor: string; amount: string; round_type: string; round_date: string; is_public: boolean }[]>([]);

  const handleProfileChange = (field: string, value: string | string[] | boolean) => {
    setProfileData(prev => ({ ...prev, [field]: value }));
  };

  // File uploads
  const handlePitchDeckUpload = async (file: File) => {
    setIsUploadingDeck(true);
    const { url, error } = await uploadPitchDeck(file);
    setIsUploadingDeck(false);
    if (error) {
      setError(error);
    } else {
      setProfileData(prev => ({ ...prev, pitch_deck_url: url }));
    }
  };

  const handleLogoUpload = async (file: File) => {
    setIsUploadingLogo(true);
    const { url, error } = await uploadStartupImage(file, 'logo');
    setIsUploadingLogo(false);
    if (error) {
      setError(error);
    } else {
      setProfileData(prev => ({ ...prev, logo_url: url }));
    }
  };

  const handleBannerUpload = async (file: File) => {
    setIsUploadingBanner(true);
    const { url, error } = await uploadStartupImage(file, 'banner');
    setIsUploadingBanner(false);
    if (error) {
      setError(error);
    } else {
      setProfileData(prev => ({ ...prev, banner_url: url }));
    }
  };

  // Validation
  const canProceed = () => {
    switch (step) {
      case 0: // Identity
        return profileData.brand_name.trim() && profileData.legal_status && profileData.startup_email.trim() && profileData.stage;
      case 1: // Description
        return profileData.description.trim() && founders[0]?.name.trim();
      case 7: // Visibility
        return profileData.confirmation;
      default:
        return true;
    }
  };

  const isUploading = isUploadingDeck || isUploadingLogo || isUploadingBanner;

  // Submit
  const handleSubmit = async () => {
    if (!user) return;
    if (!profileData.confirmation) {
      setError('Please confirm that the information is accurate.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const isPublish = profileData.visibility !== 'private';

      const { data: startup, error: createError } = await createStartup({
        owner_id: user.id,
        brand_name: profileData.brand_name,
        registered_name: profileData.registered_name || null,
        legal_status: profileData.legal_status as 'llp' | 'pvt_ltd' | 'sole_proprietorship' | 'not_registered',
        cin: profileData.cin || null,
        stage: profileData.stage as 'ideation' | 'mvp' | 'scaling' | 'expansion' | 'maturity',
        description: profileData.description || null,
        keywords: profileData.keywords,
        website: profileData.website || null,
        founded_date: profileData.founded_date || null,
        registered_address: null,
        startup_email: profileData.startup_email,
        startup_phone: profileData.startup_phone || '',
        pitch_deck_url: profileData.pitch_deck_url || null,
        is_actively_raising: profileData.is_actively_raising,
        visibility: profileData.visibility as 'public' | 'investors_only' | 'private',
        is_published: isPublish,
        is_featured: false,
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

      if (createError) throw new Error(createError.message);
      if (!startup) throw new Error('Failed to create startup');

      // Save related data in parallel
      const promises = [];

      const validFounders = founders.filter(f => f.name.trim());
      if (validFounders.length > 0) {
        promises.push(upsertFounders(startup.id, validFounders.map(f => ({
          name: f.name, linkedin_url: f.linkedin_url || undefined, display_order: f.display_order,
        }))));
      }

      const validRounds = fundingRounds.filter(r => r.round_type || r.amount || r.investor);
      if (validRounds.length > 0) {
        promises.push(upsertFundingRounds(startup.id, validRounds));
      }

      await Promise.all(promises);

      router.push(isPublish ? `/startups/${startup.id}` : '/startups/my');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          {STEPS.map((label, i) => (
            <button
              key={label}
              onClick={() => { if (i < step) setStep(i); }}
              className={`hidden sm:block text-xs font-medium transition-colors ${
                i === step ? 'text-primary' : i < step ? 'text-foreground cursor-pointer hover:text-primary' : 'text-muted-foreground'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary to-primary/80 rounded-full transition-all duration-300"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 sm:hidden">
          <span className="text-xs text-muted-foreground">Step {step + 1} of {STEPS.length}</span>
          <span className="text-xs font-medium text-primary">{Math.round(((step + 1) / STEPS.length) * 100)}%</span>
        </div>
      </div>

      {/* Step Content */}
      <div className="min-h-[400px]">
        {step === 0 && (
          <Step1Identity data={profileData} onChange={handleProfileChange} />
        )}
        {step === 1 && (
          <Step2Description
            data={profileData}
            founders={founders}
            onChange={handleProfileChange}
            onFoundersChange={setFounders}
          />
        )}
        {step === 2 && (
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
        )}
        {step === 3 && (
          <Step4Positioning data={profileData} onChange={handleProfileChange} />
        )}
        {step === 4 && (
          <Step5Edge data={profileData} onChange={handleProfileChange} />
        )}
        {step === 5 && (
          <Step6Financials
            data={profileData}
            fundingRounds={fundingRounds}
            onChange={handleProfileChange}
            onFundingChange={setFundingRounds}
          />
        )}
        {step === 6 && (
          <Step7Media
            data={profileData}
            isUploadingDeck={isUploadingDeck}
            onChange={handleProfileChange}
            onPitchDeckUpload={handlePitchDeckUpload}
          />
        )}
        {step === 7 && (
          <Step8Visibility data={profileData} onChange={handleProfileChange} />
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between mt-8 pt-6 border-t border-border/50">
        <button
          onClick={() => setStep(s => s - 1)}
          disabled={step === 0}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30"
        >
          <ChevronLeft className="h-4 w-4" /> Back
        </button>

        <div className="flex gap-2">
          {/* Skip button for optional steps */}
          {OPTIONAL_STEPS.includes(step) && (
            <button
              onClick={() => setStep(s => s + 1)}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <SkipForward className="h-4 w-4" /> Skip
            </button>
          )}

          {step === STEPS.length - 1 ? (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !canProceed()}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? (
                <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Submit
            </button>
          ) : (
            <button
              onClick={() => setStep(s => s + 1)}
              disabled={!canProceed() || isUploading}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              Next <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
