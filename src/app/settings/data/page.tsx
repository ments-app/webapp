'use client';

import React, { useState } from 'react';
import { Download, Trash2, PauseCircle } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DeleteAccountDialog } from '@/components/settings/DeleteAccountDialog';
import { DeactivateAccountDialog } from '@/components/settings/DeactivateAccountDialog';
import { BackButton, SettingCard, IconBox } from '@/components/settings/SettingsShared';

export default function DataPage() {
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);

    return (
        <DashboardLayout>
            <div className="w-full max-w-full px-0 py-4">
                <div className="space-y-6">
                    <BackButton href="/settings" title="Data Management" />

                    <div className="bg-card border border-border rounded-xl p-6">
                        <h3 className="text-lg font-semibold text-foreground mb-4">Your Data</h3>
                        <div className="space-y-3">
                            <SettingCard icon={<IconBox icon={Download} />} title="Export Data" description="Download a copy of your data" />
                        </div>
                    </div>

                    <div className="bg-card border border-border rounded-xl p-6">
                        <h3 className="text-lg font-semibold text-foreground mb-4">Account Actions</h3>
                        <div className="space-y-3">
                            <SettingCard
                                icon={<div className="w-full h-full bg-amber-500/10 rounded-xl flex items-center justify-center"><PauseCircle className="h-5 w-5 text-amber-500" /></div>}
                                title="Deactivate Account"
                                description="Temporarily hide your profile — you can come back anytime"
                                onClick={() => setShowDeactivateDialog(true)}
                            />
                            <SettingCard
                                icon={<div className="w-full h-full bg-destructive/10 rounded-xl flex items-center justify-center"><Trash2 className="h-5 w-5 text-destructive" /></div>}
                                title="Delete Account"
                                description="Permanently delete your account, data, and all messages"
                                onClick={() => setShowDeleteDialog(true)}
                            />
                        </div>
                    </div>
                </div>
            </div>

            <DeleteAccountDialog isOpen={showDeleteDialog} onClose={() => setShowDeleteDialog(false)} />
            <DeactivateAccountDialog isOpen={showDeactivateDialog} onClose={() => setShowDeactivateDialog(false)} />
        </DashboardLayout>
    );
}
