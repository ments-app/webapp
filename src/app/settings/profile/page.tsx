'use client';

import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { BackButton } from '@/components/settings/SettingsShared';

export default function ProfileSettingsPage() {
    return (
        <DashboardLayout>
            <div className="w-full max-w-full px-0 py-4">
                <div className="space-y-6">
                    <BackButton href="/settings" title="Profile Settings" />

                    <div className="bg-card border border-border rounded-xl p-6">
                        <h3 className="text-lg font-semibold text-foreground mb-4">Profile Information</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">Display Name</label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 border border-border bg-background text-foreground rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                                    placeholder="Your display name"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">Email</label>
                                <input
                                    type="email"
                                    className="w-full px-3 py-2 border border-border bg-background text-foreground rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                                    placeholder="your@email.com"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">Bio</label>
                                <textarea
                                    className="w-full px-3 py-2 border border-border bg-background text-foreground rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                                    rows={3}
                                    placeholder="Tell us about yourself..."
                                />
                            </div>
                            <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
