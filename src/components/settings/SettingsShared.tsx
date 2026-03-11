'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/* ─── Shared settings UI primitives ─── */

interface SettingCardProps {
    icon: React.ReactNode;
    title: string;
    description: string;
    href?: string;
    onClick?: () => void;
    disabled?: boolean;
    badge?: string | null;
}

export const SettingCard = ({
    icon,
    title,
    description,
    href,
    onClick,
    disabled = false,
    badge = null,
}: SettingCardProps) => {
    const content = (
        <>
            <div className="flex items-center">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center mr-3">
                    {icon}
                </div>
                <div>
                    <div className="flex items-center gap-2">
                        <h3 className="font-medium text-foreground text-sm">{title}</h3>
                        {badge && (
                            <span className="px-2 py-0.5 text-xs bg-primary/10 text-primary rounded-full">
                                {badge}
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
                </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-transform group-hover:translate-x-0.5" />
        </>
    );

    const className = `w-full flex items-center justify-between p-3 rounded-lg border transition-all duration-200 text-left group ${disabled
            ? 'bg-muted border-border cursor-not-allowed opacity-60'
            : 'bg-card border-border hover:border-primary/30 hover:shadow-sm cursor-pointer'
        }`;

    if (href && !disabled) {
        return (
            <Link href={href} className={className}>
                {content}
            </Link>
        );
    }

    return (
        <button onClick={onClick} disabled={disabled} className={className}>
            {content}
        </button>
    );
};

export const BackButton = ({ href, title }: { href: string; title: string }) => (
    <div className="flex items-center mb-4">
        <Link
            href={href}
            className="flex items-center text-muted-foreground hover:text-foreground transition-colors mr-3"
        >
            <ChevronLeft className="h-5 w-5 mr-1" />
            <span className="text-sm">Back</span>
        </Link>
        <h2 className="text-xl font-semibold text-foreground">{title}</h2>
    </div>
);

export const IconBox = ({ icon: Icon }: { icon: LucideIcon }) => (
    <div className="w-full h-full bg-primary/10 rounded-xl flex items-center justify-center">
        <Icon className="h-5 w-5 text-primary" />
    </div>
);
