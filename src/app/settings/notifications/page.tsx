'use client';

import React, { useState } from 'react';
import { useTheme } from '@/context/theme/ThemeContext';
import { Smartphone, Mail, Volume2 } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { NotificationSettings as NotificationSettingsComponent } from '@/components/settings/NotificationSettings';
import { BackButton } from '@/components/settings/SettingsShared';

const colorSwatches: Record<string, string> = {
    emerald: '#10b981',
    violet: '#8b5cf6',
    blue: '#3b82f6',
    amber: '#f59e0b',
};

export default function NotificationsPage() {
    const { colorScheme, isDarkMode } = useTheme();
    const accentColor = colorSwatches[colorScheme] || colorSwatches.emerald;

    const [notifications, setNotifications] = useState({
        push: true,
        email: false,
        sounds: true,
    });

    type NotificationKey = keyof typeof notifications;

    return (
        <DashboardLayout>
            <div className="w-full max-w-full px-0 py-4">
                <div className="space-y-6">
                    <BackButton href="/settings" title="Notifications" />

                    {/* Browser Notification Settings Component */}
                    <NotificationSettingsComponent />

                    {/* Additional Settings */}
                    <div className="bg-card border border-border rounded-xl p-6">
                        <h3 className="text-lg font-semibold text-foreground mb-4">Additional Settings</h3>
                        <div className="space-y-4">
                            {Object.entries({
                                push: { label: 'Mobile Push', desc: 'Receive notifications on your mobile device', icon: Smartphone },
                                email: { label: 'Email Notifications', desc: 'Get updates via email', icon: Mail },
                                sounds: { label: 'Notification Sounds', desc: 'Play sounds for notifications', icon: Volume2 },
                            }).map(([key, { label, desc, icon: Icon }]) => {
                                const notificationKey = key as NotificationKey;
                                return (
                                    <div key={key} className="flex items-center justify-between">
                                        <div className="flex items-center">
                                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mr-3">
                                                <Icon className="h-5 w-5 text-primary" />
                                            </div>
                                            <div>
                                                <h4 className="font-medium text-foreground">{label}</h4>
                                                <p className="text-sm text-muted-foreground">{desc}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setNotifications(prev => ({ ...prev, [notificationKey]: !prev[notificationKey] }))}
                                            className="w-12 h-6 rounded-full relative transition-colors"
                                            style={{ backgroundColor: notifications[notificationKey] ? accentColor : isDarkMode ? '#4b5563' : '#d1d5db' }}
                                        >
                                            <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${notifications[notificationKey] ? 'translate-x-6' : 'translate-x-0.5'}`} />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
