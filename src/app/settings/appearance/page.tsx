'use client';

import React from 'react';
import { useTheme } from '@/context/theme/ThemeContext';
import {
    Palette,
    Eye,
    Info,
    Monitor,
    Sun,
    Moon,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { BackButton, SettingCard, IconBox } from '@/components/settings/SettingsShared';

const colorSwatches: Record<string, string> = {
    emerald: '#10b981',
    violet: '#8b5cf6',
    blue: '#3b82f6',
    amber: '#f59e0b',
};

export default function AppearancePage() {
    const { theme, setTheme, colorScheme, setColorScheme } = useTheme();

    const accentColor = colorSwatches[colorScheme] || colorSwatches.emerald;

    const ThemeOption = ({ themeValue, label, desc, icon: Icon, iconBg }: {
        themeValue: 'system' | 'light' | 'dark';
        label: string;
        desc: string;
        icon: typeof Monitor;
        iconBg: string;
    }) => {
        const isActive = theme === themeValue;
        return (
            <div
                className={`relative bg-card border rounded-xl p-4 cursor-pointer transition-all hover:border-primary/40 ${isActive ? 'border-primary ring-1 ring-primary' : 'border-border'
                    }`}
                onClick={() => setTheme(themeValue)}
            >
                <div className="flex items-center">
                    <div className={`w-12 h-12 rounded-lg mr-4 flex items-center justify-center ${iconBg}`}>
                        <Icon className="h-6 w-6" />
                    </div>
                    <div>
                        <div className="flex items-center">
                            <h3 className="font-medium text-foreground">{label}</h3>
                            {isActive && (
                                <span
                                    className="ml-2 px-2 py-0.5 text-white text-xs rounded-full"
                                    style={{ backgroundColor: accentColor }}
                                >
                                    Active
                                </span>
                            )}
                        </div>
                        <p className="text-sm text-muted-foreground">{desc}</p>
                    </div>
                    <div className="ml-auto">
                        <div className={`w-6 h-6 rounded-full border flex items-center justify-center ${isActive ? 'border-primary' : 'border-border'
                            }`}>
                            {isActive && (
                                <div className="w-4 h-4 rounded-full bg-primary" />
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <DashboardLayout>
            <div className="w-full max-w-full px-0 py-4">
                <div className="space-y-6">
                    <BackButton href="/settings" title="Appearance" />

                    {/* Header */}
                    <div className="bg-card border border-border rounded-xl p-5">
                        <div className="flex items-center">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mr-4">
                                <Palette className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-foreground">Customize your experience</h2>
                                <p className="text-sm text-muted-foreground">Choose a theme and color scheme that matches your style</p>
                            </div>
                        </div>
                    </div>

                    {/* Color Scheme Selector */}
                    <div className="bg-card border border-border rounded-xl p-6 mb-6">
                        <h3 className="text-lg font-semibold text-foreground mb-4">Color Scheme</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {Object.entries(colorSwatches).map(([scheme, color]) => (
                                <button
                                    key={scheme}
                                    onClick={() => setColorScheme(scheme as 'emerald' | 'violet' | 'blue' | 'amber')}
                                    className={`relative p-3 rounded-lg border transition-all ${colorScheme === scheme
                                            ? 'border-primary ring-1 ring-primary'
                                            : 'border-border hover:border-primary/40'
                                        }`}
                                >
                                    <div className="flex items-center">
                                        <div className="w-6 h-6 rounded-full mr-2" style={{ backgroundColor: color }} />
                                        <span className="text-sm font-medium capitalize text-foreground">
                                            {scheme}
                                        </span>
                                    </div>
                                    {colorScheme === scheme && (
                                        <div className="absolute top-2 right-2 w-4 h-4 rounded-full flex items-center justify-center" style={{ backgroundColor: color }}>
                                            <div className="w-2 h-2 bg-white rounded-full" />
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Theme Toggle Section */}
                    <div className="bg-card border border-border rounded-xl p-6">
                        <h3 className="text-lg font-semibold text-foreground mb-4">Theme Preference</h3>
                        <div className="space-y-4">
                            <ThemeOption themeValue="system" label="System" desc="Use your device's system preference" icon={Monitor} iconBg="bg-secondary text-muted-foreground" />
                            <ThemeOption themeValue="light" label="Light" desc="Clean light theme" icon={Sun} iconBg="bg-amber-100 text-amber-600" />
                            <ThemeOption themeValue="dark" label="Dark" desc="Dark theme for low-light environments" icon={Moon} iconBg="bg-slate-800 text-blue-400" />
                        </div>
                    </div>

                    {/* Additional Settings */}
                    <div className="bg-card border border-border rounded-xl p-6">
                        <h3 className="text-lg font-semibold text-foreground mb-4">Display Settings</h3>
                        <div className="space-y-3">
                            <SettingCard icon={<IconBox icon={Eye} />} title="Font Size" description="Adjust text size for better readability" badge="Coming Soon" disabled />
                            <SettingCard icon={<IconBox icon={Palette} />} title="Custom Themes" description="Create and manage custom color themes" badge="Coming Soon" disabled />
                        </div>
                    </div>

                    {/* Info Message */}
                    <div className="bg-muted border border-border rounded-xl p-5 mt-4">
                        <div className="flex">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mr-3">
                                <Info className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                                <p className="text-foreground">Theme and color scheme changes will be applied immediately and saved to your preferences.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
