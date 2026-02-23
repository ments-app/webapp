'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Compass, TrendingUp, Rocket, ArrowRight, Sparkles } from 'lucide-react';

type Role = 'explorer' | 'investor' | 'founder';

interface RoleOption {
    id: Role;
    title: string;
    subtitle: string;
    description: string;
    icon: React.ReactNode;
    gradient: string;
    accentColor: string;
    borderColor: string;
    bgHover: string;
    redirectLabel: string;
}

const ROLES: RoleOption[] = [
    {
        id: 'explorer',
        title: 'Explorer',
        subtitle: 'Discover & Connect',
        description: "Discover startups, learn from builders, and connect with the community.",
        icon: <Compass className="w-6 h-6" />,
        gradient: 'from-emerald-500 to-teal-600',
        accentColor: 'text-emerald-500',
        borderColor: 'border-emerald-500/30',
        bgHover: 'hover:bg-emerald-500/5',
        redirectLabel: 'Feed',
    },
    {
        id: 'investor',
        title: 'Investor',
        subtitle: 'Fund & Grow',
        description: "Looking for promising startups to invest in and help scale.",
        icon: <TrendingUp className="w-6 h-6" />,
        gradient: 'from-violet-500 to-purple-600',
        accentColor: 'text-violet-500',
        borderColor: 'border-violet-500/30',
        bgHover: 'hover:bg-violet-500/5',
        redirectLabel: 'Deal Flow',
    },
    {
        id: 'founder',
        title: 'Founder',
        subtitle: 'Build & Launch',
        description: "Building something and need support, resources, and co-founders.",
        icon: <Rocket className="w-6 h-6" />,
        gradient: 'from-amber-500 to-orange-600',
        accentColor: 'text-amber-500',
        borderColor: 'border-amber-500/30',
        bgHover: 'hover:bg-amber-500/5',
        redirectLabel: 'My Startup',
    },
];

export default function OnboardingPage() {
    const { user, isLoading: authLoading } = useAuth();
    const router = useRouter();
    const [selectedRole, setSelectedRole] = useState<Role | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!authLoading && !user) {
            router.replace('/');
        }
    }, [authLoading, user, router]);

    const handleRoleSelect = async (role: Role) => {
        if (isSubmitting) return;

        setSelectedRole(role);
        setIsSubmitting(true);

        try {
            const res = await fetch('/api/onboarding', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_type: role }),
            });

            const data = await res.json();

            if (res.ok && data.redirect) {
                setTimeout(() => {
                    router.push(data.redirect);
                }, 600);
            } else {
                console.error('Onboarding failed:', data.error);
                setIsSubmitting(false);
                setSelectedRole(null);
            }
        } catch (err) {
            console.error('Error during onboarding:', err);
            setIsSubmitting(false);
            setSelectedRole(null);
        }
    };

    if (authLoading || !user) {
        return (
            <div className="h-screen bg-[#09090b] flex items-center justify-center">
                <div className="w-12 h-12 rounded-full border-4 border-emerald-500/70 border-t-transparent animate-spin" />
            </div>
        );
    }

    return (
        <div className="h-screen h-[100dvh] bg-[#09090b] relative overflow-hidden font-[family-name:var(--font-manrope)]">
            {/* Background effects */}
            <div className="absolute inset-0 pointer-events-none hidden sm:block">
                <div className="absolute top-0 left-1/4 w-72 h-72 bg-emerald-500/5 rounded-full blur-3xl" />
                <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-violet-500/5 rounded-full blur-3xl" />
            </div>

            {/* Content — flex column filling entire viewport */}
            <div className="relative z-10 h-full flex flex-col items-center justify-center px-4 sm:px-6">
                {/* Logo */}
                <div
                    className={`flex items-center gap-2 mb-5 sm:mb-6 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
                        }`}
                >
                    <img src="/logo/green_logo.svg" alt="Ments" className="w-8 h-8" />
                    <span className="text-white text-lg font-bold tracking-tight">ments</span>
                </div>

                {/* Header — compact */}
                <div
                    className={`text-center mb-6 sm:mb-8 transition-all duration-700 delay-100 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                        }`}
                >
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-3 sm:mb-4">
                        <Sparkles className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400 text-[10px] sm:text-xs font-semibold tracking-wide uppercase">Welcome aboard</span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight leading-tight mb-1.5 sm:mb-2">
                        What brings you to{' '}
                        <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                            Ments
                        </span>
                        ?
                    </h1>
                    <p className="text-neutral-400 text-sm sm:text-base max-w-md mx-auto leading-relaxed">
                        Choose your path and we&apos;ll personalize your experience
                    </p>
                </div>

                {/* Role Cards — compact */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 w-full max-w-sm sm:max-w-2xl lg:max-w-3xl">
                    {ROLES.map((role, index) => {
                        const isSelected = selectedRole === role.id;
                        const isOther = selectedRole !== null && !isSelected;

                        return (
                            <button
                                key={role.id}
                                onClick={() => handleRoleSelect(role.id)}
                                disabled={isSubmitting}
                                className={`
                  group relative text-left rounded-2xl border
                  p-4 sm:p-5
                  transition-all duration-500 ease-out cursor-pointer
                  ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}
                  ${isSelected
                                        ? `${role.borderColor} bg-white/[0.04] scale-[1.02] shadow-2xl ring-1 ring-white/10`
                                        : isOther
                                            ? 'border-white/5 bg-white/[0.01] opacity-40 scale-[0.97]'
                                            : `border-white/10 bg-white/[0.02] ${role.bgHover} hover:border-white/20 hover:scale-[1.02] hover:shadow-xl`
                                    }
                `}
                                style={{ transitionDelay: `${200 + index * 100}ms` }}
                            >
                                {/* Selected glow */}
                                {isSelected && (
                                    <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${role.gradient} opacity-[0.06]`} />
                                )}

                                {/* Mobile: horizontal layout — Desktop: vertical layout */}
                                <div className="flex sm:block items-center gap-3">
                                    {/* Icon */}
                                    <div
                                        className={`
                      relative shrink-0 w-10 h-10 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl flex items-center justify-center sm:mb-3
                      transition-all duration-300
                      ${isSelected
                                                ? `bg-gradient-to-br ${role.gradient} text-white shadow-lg`
                                                : `bg-white/[0.06] ${role.accentColor} group-hover:bg-white/10`
                                            }
                    `}
                                    >
                                        {role.icon}
                                    </div>

                                    {/* Text */}
                                    <div className="relative flex-1 min-w-0">
                                        <h3 className="text-sm sm:text-base font-bold text-white">{role.title}</h3>
                                        <p className={`text-[10px] sm:text-xs font-semibold ${isSelected ? role.accentColor : 'text-neutral-500'}`}>
                                            {role.subtitle}
                                        </p>
                                        <p className="text-xs text-neutral-400 leading-relaxed mt-1 hidden sm:block">{role.description}</p>
                                    </div>

                                    {/* Mobile arrow */}
                                    <div className="sm:hidden shrink-0">
                                        <ArrowRight className={`w-4 h-4 transition-all duration-300 ${isSelected ? role.accentColor : 'text-neutral-600'}`} />
                                    </div>
                                </div>

                                {/* Desktop arrow indicator */}
                                <div
                                    className={`
                    hidden sm:flex mt-3 items-center gap-1.5 text-xs font-semibold transition-all duration-300
                    ${isSelected ? `${role.accentColor} translate-x-1` : 'text-neutral-600 group-hover:text-neutral-400'}
                  `}
                                >
                                    <span>{isSelected ? `Going to ${role.redirectLabel}` : 'Select'}</span>
                                    <ArrowRight className={`w-3.5 h-3.5 transition-transform duration-300 ${isSelected ? 'translate-x-1' : 'group-hover:translate-x-0.5'}`} />
                                </div>

                                {/* Loading spinner */}
                                {isSelected && isSubmitting && (
                                    <div className="absolute top-3 right-3">
                                        <div className={`w-4 h-4 rounded-full border-2 border-t-transparent animate-spin ${role.borderColor}`} />
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Footer hint */}
                <p
                    className={`mt-4 sm:mt-6 text-neutral-600 text-[10px] sm:text-xs text-center transition-all duration-700 delay-500 ${mounted ? 'opacity-100' : 'opacity-0'
                        }`}
                >
                    You can change this later in your settings
                </p>
            </div>
        </div>
    );
}
