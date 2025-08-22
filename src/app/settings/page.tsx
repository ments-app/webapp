// setting 
'use client';

import React, { useState } from 'react';
import { useTheme } from '@/context/theme/ThemeContext';
import { NotificationSettings as NotificationSettingsComponent } from '@/components/settings/NotificationSettings';

import { 
  Settings, 
  Palette, 
  Bell, 
  ShieldAlert, 
  LogOut, 
  Info, 
  ChevronRight, 
  ChevronLeft,
  User,
  Globe,
  Lock,
  Mail,
  Smartphone,
  Database,
  Download,
  Trash2,
  HelpCircle,
  MessageSquare,
  Shield,
  Eye,
  Cookie,
  Volume2,
  Monitor,
  Sun,
  Moon
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

const SettingsPage = () => {
  const { theme, setTheme, colorScheme, setColorScheme, isDarkMode } = useTheme();
  const [activeSection, setActiveSection] = useState('main');

  const [notifications, setNotifications] = useState({
    push: true,
    email: false,
    desktop: true,
    sounds: true
  });

  // Define type for notification keys
  type NotificationKey = keyof typeof notifications;

  // Color scheme configurations
  const colorSchemes = {
    emerald: {
      primary: isDarkMode ? 'emerald-400' : 'emerald-600',
      primaryBg: isDarkMode ? 'emerald-900/20' : 'emerald-50',
      primaryBorder: isDarkMode ? 'emerald-700' : 'emerald-200',
      primaryText: isDarkMode ? 'emerald-300' : 'emerald-700',
      accent: isDarkMode ? 'emerald-500' : 'emerald-600',
      gradient: isDarkMode ? 'from-emerald-900/30 to-blue-900/30' : 'from-emerald-50 to-blue-50',
      gradientBorder: isDarkMode ? 'emerald-700' : 'emerald-100'
    },
    violet: {
      primary: isDarkMode ? 'violet-400' : 'violet-600',
      primaryBg: isDarkMode ? 'violet-900/20' : 'violet-50',
      primaryBorder: isDarkMode ? 'violet-700' : 'violet-200',
      primaryText: isDarkMode ? 'violet-300' : 'violet-700',
      accent: isDarkMode ? 'violet-500' : 'violet-600',
      gradient: isDarkMode ? 'from-violet-900/30 to-purple-900/30' : 'from-violet-50 to-purple-50',
      gradientBorder: isDarkMode ? 'violet-700' : 'violet-100'
    },
    blue: {
      primary: isDarkMode ? 'blue-400' : 'blue-600',
      primaryBg: isDarkMode ? 'blue-900/20' : 'blue-50',
      primaryBorder: isDarkMode ? 'blue-700' : 'blue-200',
      primaryText: isDarkMode ? 'blue-300' : 'blue-700',
      accent: isDarkMode ? 'blue-500' : 'blue-600',
      gradient: isDarkMode ? 'from-blue-900/30 to-indigo-900/30' : 'from-blue-50 to-indigo-50',
      gradientBorder: isDarkMode ? 'blue-700' : 'blue-100'
    },
    amber: {
      primary: isDarkMode ? 'amber-400' : 'amber-600',
      primaryBg: isDarkMode ? 'amber-900/20' : 'amber-50',
      primaryBorder: isDarkMode ? 'amber-700' : 'amber-200',
      primaryText: isDarkMode ? 'amber-300' : 'amber-700',
      accent: isDarkMode ? 'amber-500' : 'amber-600',
      gradient: isDarkMode ? 'from-amber-900/30 to-orange-900/30' : 'from-amber-50 to-orange-50',
      gradientBorder: isDarkMode ? 'amber-700' : 'amber-100'
    }
  };

  const currentColors = colorSchemes[colorScheme];

  interface SettingCardProps {
    icon: React.ReactNode;
    title: string;
    description: string;
    onClick?: () => void;
    disabled?: boolean;
    badge?: string | null;
  }

  const SettingCard = ({ icon, title, description, onClick, disabled = false, badge = null }: SettingCardProps) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all duration-200 text-left group ${
        disabled 
          ? `${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'} cursor-not-allowed opacity-60` 
          : `${isDarkMode ? 'bg-gray-800 border-gray-700 hover:border-gray-600' : 'bg-white border-gray-200 hover:border-gray-300'} hover:shadow-sm cursor-pointer`
      }`}
    >
      <div className="flex items-center">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center mr-3">
          {icon}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className={`font-medium ${isDarkMode ? 'text-gray-100' : 'text-gray-900'} text-sm`}>{title}</h3>
            {badge && (
              <span className={`px-2 py-0.5 text-xs bg-${currentColors.primaryBg} text-${currentColors.primaryText} rounded-full`}>
                {badge}
              </span>
            )}
          </div>
          <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mt-0.5`}>{description}</p>
        </div>
      </div>
      <ChevronRight className={`h-4 w-4 transition-transform ${disabled ? (isDarkMode ? 'text-gray-600' : 'text-gray-400') : `${isDarkMode ? 'text-gray-400 group-hover:text-gray-300' : 'text-gray-400 group-hover:text-gray-600'} group-hover:translate-x-0.5`}`} />
    </button>
  );

  interface BackButtonProps {
    onClick: () => void;
    title: string;
  }

  const BackButton = ({ onClick, title }: BackButtonProps) => (
    <div className="flex items-center mb-4">
      <button
        onClick={onClick}
        className={`flex items-center ${isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-600 hover:text-gray-900'} transition-colors mr-3`}
      >
        <ChevronLeft className="h-5 w-5 mr-1" />
        <span className="text-sm">Back</span>
      </button>
      <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>{title}</h2>
    </div>
  );

  const ColorSchemeSelector = () => (
    <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl p-6 mb-6`}>
      <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-gray-100' : 'text-gray-900'} mb-4`}>Color Scheme</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Object.entries(colorSchemes).map(([scheme, colors]) => (
          <button
            key={scheme}
            onClick={() => setColorScheme(scheme as keyof typeof colorSchemes)}
            className={`relative p-3 rounded-lg border transition-all ${
              colorScheme === scheme 
                ? `border-${colors.accent} ring-1 ring-${colors.accent}` 
                : `${isDarkMode ? 'border-gray-700 hover:border-gray-600' : 'border-gray-200 hover:border-gray-300'}`
            }`}
          >
            <div className="flex items-center">
              <div className={`w-6 h-6 rounded-full bg-${colors.primary} mr-2`}></div>
              <span className={`text-sm font-medium capitalize ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                {scheme}
              </span>
            </div>
            {colorScheme === scheme && (
              <div className={`absolute top-2 right-2 w-4 h-4 bg-${colors.accent} rounded-full flex items-center justify-center`}>
                <div className="w-2 h-2 bg-white rounded-full"></div>
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );

  const MainSettings = () => (
    <div className="space-y-6 px-4">
      {/* Header Card */}
      <div className={`bg-gradient-to-r ${currentColors.gradient} border border-${currentColors.gradientBorder} rounded-xl p-5`}>
        <div className="flex items-center">
          <div className={`w-12 h-12 rounded-xl bg-${currentColors.primaryBg} flex items-center justify-center mr-4`}>
            <Settings className={`h-6 w-6 text-${currentColors.primary}`} />
          </div>
          <div>
            <h1 className={`text-xl font-semibold ${isDarkMode ? 'text-gray-100' : 'text-gray-900'} mb-1`}>Settings</h1>
            <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Manage your app preferences and account settings</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl p-4 hover:shadow-sm transition-all cursor-pointer`}>
          <div className="flex items-center">
            <div className={`w-10 h-10 rounded-lg bg-${currentColors.primaryBg} flex items-center justify-center mr-3`}>
              <Palette className={`h-5 w-5 text-${currentColors.primary}`} />
            </div>
            <div>
              <h3 className={`font-medium ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>Current Theme</h3>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} capitalize`}>{theme} • {colorScheme}</p>
            </div>
          </div>
        </div>
        
        <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl p-4 hover:shadow-sm transition-all cursor-pointer`}>
          <div className="flex items-center">
            <div className={`w-10 h-10 rounded-lg bg-${currentColors.primaryBg} flex items-center justify-center mr-3`}>
              <Bell className={`h-5 w-5 text-${currentColors.primary}`} />
            </div>
            <div>
              <h3 className={`font-medium ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>Notifications</h3>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {Object.values(notifications).filter(Boolean).length} enabled
              </p>
            </div>
          </div>
        </div>
        
        <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl p-4 hover:shadow-sm transition-all cursor-pointer`}>
          <div className="flex items-center">
            <div className={`w-10 h-10 rounded-lg bg-${currentColors.primaryBg} flex items-center justify-center mr-3`}>
              <Shield className={`h-5 w-5 text-${currentColors.primary}`} />
            </div>
            <div>
              <h3 className={`font-medium ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>Security</h3>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>All secure</p>
            </div>
          </div>
        </div>
      </div>

      {/* Preferences Section */}
      <div>
        <h3 className={`text-xl font-semibold ${isDarkMode ? 'text-gray-100' : 'text-gray-900'} mb-4`}>Preferences</h3>
        <div className="space-y-3">
          <SettingCard
            icon={<div className={`w-full h-full bg-${currentColors.primaryBg} rounded-xl flex items-center justify-center`}><Palette className={`h-6 w-6 text-${currentColors.primary}`} /></div>}
            title="Appearance"
            description="Themes, colors, and display settings"
            onClick={() => setActiveSection('appearance')}
          />
          
          <SettingCard
            icon={<div className={`w-full h-full bg-${currentColors.primaryBg} rounded-xl flex items-center justify-center`}><Bell className={`h-6 w-6 text-${currentColors.primary}`} /></div>}
            title="Notifications"
            description="Manage notification preferences and delivery"
            onClick={() => setActiveSection('notifications')}
          />
          
          <SettingCard
            icon={<div className={`w-full h-full bg-${currentColors.primaryBg} rounded-xl flex items-center justify-center`}><ShieldAlert className={`h-6 w-6 text-${currentColors.primary}`} /></div>}
            title="Privacy & Security"
            description="Data protection and security settings"
            onClick={() => setActiveSection('privacy')}
          />
          
          <SettingCard
            icon={<div className={`w-full h-full bg-${currentColors.primaryBg} rounded-xl flex items-center justify-center`}><Globe className={`h-6 w-6 text-${currentColors.primary}`} /></div>}
            title="Language & Region"
            description="Localization and accessibility options"
            badge="New"
          />
        </div>
      </div>

      {/* Account Section */}
      <div>
        <h3 className={`text-xl font-semibold ${isDarkMode ? 'text-gray-100' : 'text-gray-900'} mb-4`}>Account</h3>
        <div className="space-y-3">
          <SettingCard
            icon={<div className={`w-full h-full bg-${currentColors.primaryBg} rounded-xl flex items-center justify-center`}><User className={`h-6 w-6 text-${currentColors.primary}`} /></div>}
            title="Profile Settings"
            description="Manage your profile information and preferences"
            onClick={() => setActiveSection('profile')}
          />
          
          <SettingCard
            icon={<div className={`w-full h-full bg-${currentColors.primaryBg} rounded-xl flex items-center justify-center`}><Database className={`h-6 w-6 text-${currentColors.primary}`} /></div>}
            title="Data Management"
            description="Export, backup, and delete your data"
            onClick={() => setActiveSection('data')}
          />
          
          <SettingCard
            icon={<div className="w-full h-full bg-red-100 rounded-xl flex items-center justify-center"><LogOut className="h-6 w-6 text-red-600" /></div>}
            title="Sign Out"
            description="Sign out of your account"
            onClick={() => alert('Signing out...')}
          />
        </div>
      </div>

      {/* Support Section */}
      <div>
        <h3 className={`text-xl font-semibold ${isDarkMode ? 'text-gray-100' : 'text-gray-900'} mb-4`}>Support</h3>
        <div className="space-y-3">
          <SettingCard
            icon={<div className={`w-full h-full bg-${currentColors.primaryBg} rounded-xl flex items-center justify-center`}><HelpCircle className={`h-6 w-6 text-${currentColors.primary}`} /></div>}
            title="Help Center"
            description="Get help and find answers to common questions"
          />
          
          <SettingCard
            icon={<div className={`w-full h-full bg-${currentColors.primaryBg} rounded-xl flex items-center justify-center`}><MessageSquare className={`h-6 w-6 text-${currentColors.primary}`} /></div>}
            title="Contact Support"
            description="Get in touch with our support team"
          />
        </div>
      </div>

      {/* Version Info */}
      <div className={`flex items-center justify-center py-8 text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-500'} border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <Info className="h-4 w-4 mr-2" />
        <span>Ments v1.0.0</span>
        <span className="mx-3">•</span>
        <span>Made with ❤️ for the community</span>
      </div>
    </div>
  );

  const AppearanceSettings = () => (
    <div className="space-y-6">
      <BackButton onClick={() => setActiveSection('main')} title="Appearance" />
      
      {/* Header */}
      <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'} rounded-xl p-5`}>
        <div className="flex items-center">
          <div className={`w-10 h-10 rounded-xl bg-${currentColors.primaryBg} flex items-center justify-center mr-4`}>
            <Palette className={`h-5 w-5 text-${currentColors.primary}`} />
          </div>
          <div>
            <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>Customize your experience</h2>
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Choose a theme and color scheme that matches your style</p>
          </div>
        </div>
      </div>

      {/* Color Scheme Selector */}
      <ColorSchemeSelector />
      
      {/* Theme Toggle Section */}
      <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl p-6`}>
        <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-gray-100' : 'text-gray-900'} mb-4`}>Theme Preference</h3>
        <div className="space-y-4">
          {/* System Theme */}
          <div 
            className={`relative ${isDarkMode ? 'bg-gray-800' : 'bg-white'} border ${theme === 'system' ? `border-${currentColors.accent} ring-1 ring-${currentColors.accent}` : `${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`} rounded-xl p-4 cursor-pointer transition-all ${isDarkMode ? 'hover:border-gray-600' : 'hover:border-gray-300'}`}
            onClick={() => setTheme('system')}
          >
            <div className="flex items-center">
              <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${isDarkMode ? 'from-gray-700 to-gray-800' : 'from-gray-100 to-gray-200'} mr-4 flex items-center justify-center`}>
                <Monitor className={`h-6 w-6 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`} />
              </div>
              <div>
                <div className="flex items-center">
                  <h3 className={`font-medium ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>System</h3>
                  {theme === 'system' && (
                    <span className={`ml-2 px-2 py-0.5 bg-${currentColors.accent} text-white text-xs rounded-full`}>Active</span>
                  )}
                </div>
                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Use your device&apos;s system preference</p>
              </div>
              <div className="ml-auto">
                <div className={`w-6 h-6 rounded-full border ${theme === 'system' ? `border-${currentColors.accent} flex items-center justify-center` : `${isDarkMode ? 'border-gray-600' : 'border-gray-300'}`}`}>
                  {theme === 'system' && <div className={`w-4 h-4 rounded-full bg-${currentColors.accent}`}></div>}
                </div>
              </div>
            </div>
          </div>

          {/* Light Theme */}
          <div 
            className={`relative ${isDarkMode ? 'bg-gray-800' : 'bg-white'} border ${theme === 'light' ? `border-${currentColors.accent} ring-1 ring-${currentColors.accent}` : `${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`} rounded-xl p-4 cursor-pointer transition-all ${isDarkMode ? 'hover:border-gray-600' : 'hover:border-gray-300'}`}
            onClick={() => setTheme('light')}
          >
            <div className="flex items-center">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-yellow-100 to-orange-100 mr-4 flex items-center justify-center">
                <Sun className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <div className="flex items-center">
                  <h3 className={`font-medium ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>Light</h3>
                  {theme === 'light' && (
                    <span className={`ml-2 px-2 py-0.5 bg-${currentColors.accent} text-white text-xs rounded-full`}>Active</span>
                  )}
                </div>
                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Clean light theme</p>
              </div>
              <div className="ml-auto">
                <div className={`w-6 h-6 rounded-full border ${theme === 'light' ? `border-${currentColors.accent} flex items-center justify-center` : `${isDarkMode ? 'border-gray-600' : 'border-gray-300'}`}`}>
                  {theme === 'light' && <div className={`w-4 h-4 rounded-full bg-${currentColors.accent}`}></div>}
                </div>
              </div>
            </div>
          </div>
          
          {/* Dark Theme */}
          <div 
            className={`relative ${isDarkMode ? 'bg-gray-800' : 'bg-white'} border ${theme === 'dark' ? `border-${currentColors.accent} ring-1 ring-${currentColors.accent}` : `${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`} rounded-xl p-4 cursor-pointer transition-all ${isDarkMode ? 'hover:border-gray-600' : 'hover:border-gray-300'}`}
            onClick={() => setTheme('dark')}
          >
            <div className="flex items-center">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-gray-800 to-gray-900 mr-4 flex items-center justify-center">
                <Moon className="h-6 w-6 text-blue-400" />
              </div>
              <div>
                <div className="flex items-center">
                  <h3 className={`font-medium ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>Dark</h3>
                  {theme === 'dark' && (
                    <span className={`ml-2 px-2 py-0.5 bg-${currentColors.accent} text-white text-xs rounded-full`}>Active</span>
                  )}
                </div>
                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Dark theme for low-light environments</p>
              </div>
              <div className="ml-auto">
                <div className={`w-6 h-6 rounded-full border ${theme === 'dark' ? `border-${currentColors.accent} flex items-center justify-center` : `${isDarkMode ? 'border-gray-600' : 'border-gray-300'}`}`}>
                  {theme === 'dark' && <div className={`w-4 h-4 rounded-full bg-${currentColors.accent}`}></div>}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Additional Settings */}
      <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl p-6`}>
        <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-gray-100' : 'text-gray-900'} mb-4`}>Display Settings</h3>
        <div className="space-y-3">
          <SettingCard
            icon={<div className={`w-full h-full bg-${currentColors.primaryBg} rounded-xl flex items-center justify-center`}><Eye className={`h-5 w-5 text-${currentColors.primary}`} /></div>}
            title="Font Size"
            description="Adjust text size for better readability"
            badge="Coming Soon"
            disabled={true}
          />
          
          <SettingCard
            icon={<div className={`w-full h-full bg-${currentColors.primaryBg} rounded-xl flex items-center justify-center`}><Palette className={`h-5 w-5 text-${currentColors.primary}`} /></div>}
            title="Custom Themes"
            description="Create and manage custom color themes"
            badge="Coming Soon"
            disabled={true}
          />
        </div>
      </div>
      
      {/* Info Message */}
      <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-100'} rounded-xl p-5 mt-4`}>
        <div className="flex">
          <div className={`w-8 h-8 rounded-full bg-${currentColors.primaryBg} flex items-center justify-center mr-3`}>
            <Info className={`h-4 w-4 text-${currentColors.primary}`} />
          </div>
          <div>
            <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Theme and color scheme changes will be applied immediately and saved to your preferences.</p>
          </div>
        </div>
      </div>
    </div>
  );

  const NotificationSettings = () => (
    <div className="space-y-6">
      <BackButton onClick={() => setActiveSection('main')} title="Notifications" />
      
      {/* Browser Notification Settings Component */}
      <NotificationSettingsComponent />
      
      {/* Legacy Push Notifications */}
      <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl p-6`}>
        <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-gray-100' : 'text-gray-900'} mb-4`}>Additional Settings</h3>
        <div className="space-y-4">
          {Object.entries({
            push: { label: 'Mobile Push', desc: 'Receive notifications on your mobile device', icon: Smartphone },
            email: { label: 'Email Notifications', desc: 'Get updates via email', icon: Mail },
            sounds: { label: 'Notification Sounds', desc: 'Play sounds for notifications', icon: Volume2 }
          }).map(([key, { label, desc, icon: Icon }]) => {
            const notificationKey = key as NotificationKey;
            return (
              <div key={key} className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className={`w-10 h-10 rounded-lg bg-${currentColors.primaryBg} flex items-center justify-center mr-3`}>
                    <Icon className={`h-5 w-5 text-${currentColors.primary}`} />
                  </div>
                  <div>
                    <h4 className={`font-medium ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>{label}</h4>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{desc}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setNotifications(prev => ({ ...prev, [notificationKey]: !prev[notificationKey] }))}
                  className={`w-12 h-6 rounded-full relative transition-colors ${notifications[notificationKey] ? `bg-${currentColors.accent}` : `${isDarkMode ? 'bg-gray-600' : 'bg-gray-200'}`}`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${notifications[notificationKey] ? 'translate-x-6' : 'translate-x-0.5'}`} />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  const PrivacySettings = () => (
    <div className="space-y-6">
      <BackButton onClick={() => setActiveSection('main')} title="Privacy & Security" />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl p-6`}>
          <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-gray-100' : 'text-gray-900'} mb-4`}>Privacy</h3>
          <div className="space-y-3">
            <SettingCard
              icon={<div className={`w-full h-full bg-${currentColors.primaryBg} rounded-xl flex items-center justify-center`}><Eye className={`h-5 w-5 text-${currentColors.primary}`} /></div>}
              title="Data Visibility"
              description="Control who can see your data"
            />
            <SettingCard
              icon={<div className={`w-full h-full bg-${currentColors.primaryBg} rounded-xl flex items-center justify-center`}><Cookie className={`h-5 w-5 text-${currentColors.primary}`} /></div>}
              title="Cookie Preferences"
              description="Manage cookie settings"
            />
          </div>
        </div>
        
        <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl p-6`}>
          <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-gray-100' : 'text-gray-900'} mb-4`}>Security</h3>
          <div className="space-y-3">
            <SettingCard
              icon={<div className={`w-full h-full bg-${currentColors.primaryBg} rounded-xl flex items-center justify-center`}><Lock className={`h-5 w-5 text-${currentColors.primary}`} /></div>}
              title="Two-Factor Authentication"
              description="Add extra security to your account"
              badge="Recommended"
            />
            <SettingCard
              icon={<div className={`w-full h-full bg-${currentColors.primaryBg} rounded-xl flex items-center justify-center`}><Shield className={`h-5 w-5 text-${currentColors.primary}`} /></div>}
              title="Active Sessions"
              description="Manage your active login sessions"
            />
          </div>
        </div>
      </div>
    </div>
  );

  const DataManagement = () => (
    <div className="space-y-6">
      <BackButton onClick={() => setActiveSection('main')} title="Data Management" />
      
      <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl p-6`}>
        <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-gray-100' : 'text-gray-900'} mb-4`}>Your Data</h3>
        <div className="space-y-3">
          <SettingCard
            icon={<div className={`w-full h-full bg-${currentColors.primaryBg} rounded-xl flex items-center justify-center`}><Download className={`h-5 w-5 text-${currentColors.primary}`} /></div>}
            title="Export Data"
            description="Download a copy of your data"
          />
          <SettingCard
            icon={<div className="w-full h-full bg-red-100 rounded-xl flex items-center justify-center"><Trash2 className="h-5 w-5 text-red-600" /></div>}
            title="Delete Account"
            description="Permanently delete your account and data"
          />
        </div>
      </div>
    </div>
  );

  const ProfileSettings = () => (
    <div className="space-y-6">
      <BackButton onClick={() => setActiveSection('main')} title="Profile Settings" />
      
      <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl p-6`}>
        <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-gray-100' : 'text-gray-900'} mb-4`}>Profile Information</h3>
        <div className="space-y-4">
          <div>
            <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>Display Name</label>
            <input 
              type="text" 
              className={`w-full px-3 py-2 border ${isDarkMode ? 'border-gray-600 bg-gray-700 text-gray-100' : 'border-gray-300 bg-white text-gray-900'} rounded-lg focus:ring-2 focus:ring-${currentColors.accent} focus:border-${currentColors.accent}`}
              placeholder="Your display name"
            />
          </div>
          <div>
            <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>Email</label>
            <input 
              type="email" 
              className={`w-full px-3 py-2 border ${isDarkMode ? 'border-gray-600 bg-gray-700 text-gray-100' : 'border-gray-300 bg-white text-gray-900'} rounded-lg focus:ring-2 focus:ring-${currentColors.accent} focus:border-${currentColors.accent}`}
              placeholder="your@email.com"
            />
          </div>
          <div>
            <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>Bio</label>
            <textarea 
              className={`w-full px-3 py-2 border ${isDarkMode ? 'border-gray-600 bg-gray-700 text-gray-100' : 'border-gray-300 bg-white text-gray-900'} rounded-lg focus:ring-2 focus:ring-${currentColors.accent} focus:border-${currentColors.accent}`}
              rows={3}
              placeholder="Tell us about yourself..."
            />
          </div>
          <button className={`px-4 py-2 bg-${currentColors.accent} text-white rounded-lg hover:bg-${currentColors.primary} transition-colors`}>
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );

  const renderCurrentSection = () => {
    switch (activeSection) {
      case 'appearance':
        return <AppearanceSettings />;
      case 'notifications':
        return <NotificationSettings />;
      case 'privacy':
        return <PrivacySettings />;
      case 'data':
        return <DataManagement />;
      case 'profile':
        return <ProfileSettings />;
      default:
        return <MainSettings />;
    }
  };

  return (
    <DashboardLayout>
      <div className="w-full max-w-full px-0 py-4">
        {renderCurrentSection()}
      </div>
    </DashboardLayout>
  );
};

export default SettingsPage;