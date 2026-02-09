"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { fetchMyStartup, updateStartup, StartupProfile } from '@/api/startups';
import { Rocket, Eye, Edit, Plus, ExternalLink, TrendingUp } from 'lucide-react';
import Link from 'next/link';

const stageLabels: Record<string, string> = {
  ideation: 'Ideation', mvp: 'MVP', scaling: 'Scaling', expansion: 'Expansion', maturity: 'Maturity',
};
const stageColors: Record<string, string> = {
  ideation: 'from-blue-500 to-cyan-500', mvp: 'from-purple-500 to-pink-500', scaling: 'from-green-500 to-emerald-500',
  expansion: 'from-orange-500 to-amber-500', maturity: 'from-red-500 to-rose-500',
};

export default function MyStartupPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [startup, setStartup] = useState<StartupProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      const { data } = await fetchMyStartup(user.id);
      setStartup(data);
      setLoading(false);
    };
    if (user) load();
    else if (!authLoading) setLoading(false);
  }, [user, authLoading]);

  const togglePublish = async () => {
    if (!startup) return;
    const { data } = await updateStartup(startup.id, { is_published: !startup.is_published });
    if (data) setStartup(data);
  };

  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  if (!user) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-muted-foreground">Please sign in to manage your startup.</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!startup) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-20">
          <Rocket className="h-16 w-16 text-muted-foreground/30 mb-6" />
          <h2 className="text-xl font-semibold text-foreground mb-2">No Startup Profile Yet</h2>
          <p className="text-sm text-muted-foreground mb-6">Create your startup profile to get discovered by investors and collaborators.</p>
          <Link
            href="/startups/create"
            className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors shadow-md"
          >
            <Plus className="h-4 w-4" /> Create Startup Profile
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">My Startup</h1>

        {/* Startup Overview Card */}
        <div className="backdrop-blur-xl bg-card border border-border/50 rounded-2xl p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${stageColors[startup.stage] || 'from-primary to-primary/80'} shadow-lg`}>
                <Rocket className="h-7 w-7 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">{startup.brand_name}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r ${stageColors[startup.stage]} text-white`}>
                    {stageLabels[startup.stage]}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${startup.is_published ? 'bg-green-500/10 text-green-600' : 'bg-amber-500/10 text-amber-600'}`}>
                    {startup.is_published ? 'Published' : 'Draft'}
                  </span>
                </div>
              </div>
            </div>
            {startup.is_actively_raising && (
              <span className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-green-500/10 text-green-600 border border-green-500/20 animate-pulse">
                <TrendingUp className="h-3.5 w-3.5" /> Raising
              </span>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="backdrop-blur-xl bg-card border border-border/50 rounded-xl p-4 shadow-sm text-center">
            <Eye className="h-5 w-5 text-muted-foreground mx-auto mb-1" />
            <p className="text-2xl font-bold text-foreground">{startup.view_count || 0}</p>
            <p className="text-xs text-muted-foreground">Profile Views</p>
          </div>
          <div className="backdrop-blur-xl bg-card border border-border/50 rounded-xl p-4 shadow-sm text-center">
            <p className="text-2xl font-bold text-foreground">{startup.founders?.length || 0}</p>
            <p className="text-xs text-muted-foreground">Team Members</p>
          </div>
          <div className="backdrop-blur-xl bg-card border border-border/50 rounded-xl p-4 shadow-sm text-center">
            <p className="text-2xl font-bold text-foreground">{startup.funding_rounds?.length || 0}</p>
            <p className="text-xs text-muted-foreground">Funding Rounds</p>
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Link
            href={`/startups/${startup.id}`}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-card border border-border/50 rounded-xl text-sm font-medium text-foreground hover:bg-accent/50 transition-colors"
          >
            <ExternalLink className="h-4 w-4" /> View Profile
          </Link>
          <Link
            href={`/startups/${startup.id}/edit`}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-card border border-border/50 rounded-xl text-sm font-medium text-foreground hover:bg-accent/50 transition-colors"
          >
            <Edit className="h-4 w-4" /> Edit Profile
          </Link>
          <button
            onClick={togglePublish}
            className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
              startup.is_published
                ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20 hover:bg-amber-500/20'
                : 'bg-primary text-primary-foreground hover:bg-primary/90'
            }`}
          >
            {startup.is_published ? 'Unpublish' : 'Publish'}
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}
