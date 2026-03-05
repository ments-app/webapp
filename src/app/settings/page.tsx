'use client';

import React from 'react';
import { useTheme } from '@/context/theme/ThemeContext';
import {
  Settings,
  Palette,
  Bell,
  ShieldAlert,
  LogOut,
  Info,
  User,
  Globe,
  Database,
  HelpCircle,
  MessageSquare,
  Shield,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { SettingCard, IconBox } from '@/components/settings/SettingsShared';
import { useAuth } from '@/context/AuthContext';

export default function SettingsPage() {
  const { theme, colorScheme } = useTheme();
  const { signOut } = useAuth();

  return (
    <DashboardLayout>
      <div className="w-full max-w-full px-0 py-4">
        <div className="space-y-6 px-4">
          {/* Header Card */}
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-5">
            <div className="flex items-center">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mr-4">
                <Settings className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-foreground mb-1">Settings</h1>
                <p className="text-sm text-muted-foreground">Manage your app preferences and account settings</p>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-card border border-border rounded-xl p-4 hover:shadow-sm transition-all cursor-pointer">
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mr-3">
                  <Palette className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium text-foreground">Current Theme</h3>
                  <p className="text-sm text-muted-foreground capitalize">{theme} &bull; {colorScheme}</p>
                </div>
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-4 hover:shadow-sm transition-all cursor-pointer">
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mr-3">
                  <Bell className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium text-foreground">Notifications</h3>
                  <p className="text-sm text-muted-foreground">Manage alerts</p>
                </div>
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-4 hover:shadow-sm transition-all cursor-pointer">
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mr-3">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium text-foreground">Security</h3>
                  <p className="text-sm text-muted-foreground">All secure</p>
                </div>
              </div>
            </div>
          </div>

          {/* Preferences Section */}
          <div>
            <h3 className="text-xl font-semibold text-foreground mb-4">Preferences</h3>
            <div className="space-y-3">
              <SettingCard
                icon={<IconBox icon={Palette} />}
                title="Appearance"
                description="Themes, colors, and display settings"
                href="/settings/appearance"
              />
              <SettingCard
                icon={<IconBox icon={Bell} />}
                title="Notifications"
                description="Manage notification preferences and delivery"
                href="/settings/notifications"
              />
              <SettingCard
                icon={<IconBox icon={ShieldAlert} />}
                title="Privacy & Security"
                description="Data protection and security settings"
                href="/settings/privacy"
              />
              <SettingCard
                icon={<IconBox icon={Globe} />}
                title="Language & Region"
                description="Localization and accessibility options"
                badge="New"
              />
            </div>
          </div>

          {/* Account Section */}
          <div>
            <h3 className="text-xl font-semibold text-foreground mb-4">Account</h3>
            <div className="space-y-3">
              <SettingCard
                icon={<IconBox icon={User} />}
                title="Profile Settings"
                description="Manage your profile information and preferences"
                href="/settings/profile"
              />
              <SettingCard
                icon={<IconBox icon={Database} />}
                title="Data Management"
                description="Export, backup, and delete your data"
                href="/settings/data"
              />
              <SettingCard
                icon={<div className="w-full h-full bg-destructive/10 rounded-xl flex items-center justify-center"><LogOut className="h-6 w-6 text-destructive" /></div>}
                title="Sign Out"
                description="Sign out of your account"
                onClick={() => signOut()}
              />
            </div>
          </div>

          {/* Support Section */}
          <div>
            <h3 className="text-xl font-semibold text-foreground mb-4">Support</h3>
            <div className="space-y-3">
              <SettingCard
                icon={<IconBox icon={HelpCircle} />}
                title="Help Center"
                description="Get help and find answers to common questions"
              />
              <SettingCard
                icon={<IconBox icon={MessageSquare} />}
                title="Contact Support"
                description="Get in touch with our support team"
              />
            </div>
          </div>

          {/* Version Info */}
          <div className="flex items-center justify-center py-8 text-sm text-muted-foreground border-t border-border">
            <Info className="h-4 w-4 mr-2" />
            <span>Ments v1.0.0</span>
            <span className="mx-3">&bull;</span>
            <span>Made with love for the community</span>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
