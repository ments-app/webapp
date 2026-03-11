"use client";

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StartupProfileView } from '@/components/startups/StartupProfileView';
import { fetchStartupById, bookmarkStartup, unbookmarkStartup, recordView, StartupProfile } from '@/api/startups';
import { createDeal, getDealForStartup, updateDealStage, removeDeal, InvestorDeal } from '@/api/investor-deals';
import { supabase } from '@/utils/supabase';
import { ArrowLeft, Plus, ChevronDown, Trash2 } from 'lucide-react';
import Link from 'next/link';

export default function StartupDetailPage() {
  const { user } = useAuth();
  const params = useParams();
  const id = params.id as string;

  const [startup, setStartup] = useState<StartupProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pipeline state for verified investors
  const [investorStatus, setInvestorStatus] = useState<string>('none');
  const [deal, setDeal] = useState<InvestorDeal | null>(null);
  const [addingToPipeline, setAddingToPipeline] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data, error } = await fetchStartupById(id, user?.id);
      if (error) {
        setError(error.message);
      } else {
        setStartup(data);
      }
      setLoading(false);

      // Record view (fire and forget)
      if (data && data.owner_id !== user?.id) {
        recordView(id, user?.id);
      }
    };
    load();
  }, [id, user?.id]);

  // Fetch investor status + existing deal
  useEffect(() => {
    if (!user) return;
    const fetchInvestor = async () => {
      const { data: userData } = await supabase.from('users').select('investor_status').eq('id', user.id).single();
      const status = userData?.investor_status ?? 'none';
      setInvestorStatus(status);

      if (status === 'verified') {
        const { data: dealData } = await getDealForStartup(user.id, id);
        if (dealData) setDeal(dealData);
      }
    };
    fetchInvestor();
  }, [user, id]);

  const handleBookmark = async () => {
    if (!user || !startup) return;
    await bookmarkStartup(user.id, startup.id);
    setStartup(prev => prev ? { ...prev, is_bookmarked: true } : prev);
  };

  const handleUnbookmark = async () => {
    if (!user || !startup) return;
    await unbookmarkStartup(user.id, startup.id);
    setStartup(prev => prev ? { ...prev, is_bookmarked: false } : prev);
  };

  const isOwner = user?.id === startup?.owner_id;
  const isCofounder = !isOwner && (startup?.founders || []).some(
    f => f.user_id === user?.id && f.status === 'accepted'
  );
  const isVerifiedInvestor = investorStatus === 'verified' && !isOwner && !isCofounder;

  const handleAddToPipeline = async () => {
    if (!user) return;
    setAddingToPipeline(true);
    const { data } = await createDeal(user.id, id);
    if (data) setDeal(data);
    setAddingToPipeline(false);
  };

  const handleDealStageChange = async (stage: string) => {
    if (!deal) return;
    const { data } = await updateDealStage(deal.id, stage);
    if (data) setDeal(prev => prev ? { ...prev, stage: data.stage } : prev);
  };

  const handleRemoveFromPipeline = async () => {
    if (!deal) return;
    const { error: err } = await removeDeal(deal.id);
    if (!err) setDeal(null);
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Link href="/startups" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors min-h-[44px]">
            <ArrowLeft className="h-4 w-4" /> Back to Directory
          </Link>

          {/* Pipeline controls for verified investors */}
          {isVerifiedInvestor && startup && (
            <div className="flex items-center gap-2">
              {deal ? (
                <>
                  <div className="relative">
                    <select
                      value={deal.stage}
                      onChange={(e) => handleDealStageChange(e.target.value)}
                      className="appearance-none pl-3 pr-7 py-2.5 min-h-[44px] rounded-xl text-sm font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 cursor-pointer"
                    >
                      <option value="watching">Watching</option>
                      <option value="interested">Interested</option>
                      <option value="in_talks">In Talks</option>
                      <option value="due_diligence">Due Diligence</option>
                      <option value="invested">Invested</option>
                      <option value="referred">Referred</option>
                      <option value="passed">Passed</option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-400" />
                  </div>
                  <button
                    onClick={handleRemoveFromPipeline}
                    className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
                    title="Remove from pipeline"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </>
              ) : (
                <button
                  onClick={handleAddToPipeline}
                  disabled={addingToPipeline}
                  className="flex items-center gap-1.5 px-4 py-2.5 min-h-[44px] rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm font-semibold hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
                >
                  <Plus className="h-4 w-4" />
                  Add to Pipeline
                </button>
              )}
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex flex-col gap-6 py-6 animate-pulse">
            <div className="h-48 w-full bg-muted rounded-2xl" />
            <div className="flex gap-4 items-center">
              <div className="h-20 w-20 bg-muted rounded-xl shrink-0" />
              <div className="space-y-2 flex-1">
                <div className="h-6 bg-muted rounded w-1/4" />
                <div className="h-4 bg-muted rounded w-1/3" />
              </div>
            </div>
            <div className="h-24 w-full bg-muted rounded-2xl" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20">
            <p className="text-red-500">{error}</p>
          </div>
        ) : startup ? (
          <StartupProfileView
            startup={startup}
            isOwner={isOwner}
            isCofounder={isCofounder}
            onBookmark={handleBookmark}
            onUnbookmark={handleUnbookmark}
          />
        ) : (
          <div className="flex flex-col items-center justify-center py-20">
            <p className="text-muted-foreground">Startup not found.</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
