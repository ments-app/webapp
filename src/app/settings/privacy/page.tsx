'use client';

import React from 'react';
import { Eye, Cookie, Lock, Shield } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { BackButton, SettingCard, IconBox } from '@/components/settings/SettingsShared';

export default function PrivacyPage() {
    return (
        <DashboardLayout>
            <div className="w-full max-w-full px-0 py-4">
                <div className="space-y-6">
                    <BackButton href="/settings" title="Privacy & Security" />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-card border border-border rounded-xl p-6">
                            <h3 className="text-lg font-semibold text-foreground mb-4">Privacy</h3>
                            <div className="space-y-3">
                                <SettingCard icon={<IconBox icon={Eye} />} title="Data Visibility" description="Control who can see your data" />
                                <SettingCard icon={<IconBox icon={Cookie} />} title="Cookie Preferences" description="Manage cookie settings" />
                            </div>
                        </div>

                        <div className="bg-card border border-border rounded-xl p-6">
                            <h3 className="text-lg font-semibold text-foreground mb-4">Security</h3>
                            <div className="space-y-3">
                                <SettingCard icon={<IconBox icon={Lock} />} title="Two-Factor Authentication" description="Add extra security to your account" badge="Recommended" />
                                <SettingCard icon={<IconBox icon={Shield} />} title="Active Sessions" description="Manage your active login sessions" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
