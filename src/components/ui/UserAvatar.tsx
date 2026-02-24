"use client";

import { useState } from 'react';
import Image from 'next/image';
import { toProxyUrl } from '@/utils/imageUtils';

// Deterministic color from a string — gives each user a unique gradient
function hashColor(str: string): [string, string] {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors: [string, string][] = [
    ['from-violet-500/30', 'to-purple-500/20'],
    ['from-blue-500/30', 'to-cyan-500/20'],
    ['from-emerald-500/30', 'to-teal-500/20'],
    ['from-amber-500/30', 'to-orange-500/20'],
    ['from-rose-500/30', 'to-pink-500/20'],
    ['from-indigo-500/30', 'to-blue-500/20'],
    ['from-teal-500/30', 'to-green-500/20'],
    ['from-fuchsia-500/30', 'to-pink-500/20'],
  ];
  return colors[Math.abs(hash) % colors.length];
}

type UserAvatarProps = {
  src?: string | null;
  alt?: string;
  fallbackText?: string;
  size?: number;
  className?: string;
  fallbackClassName?: string;
  quality?: number;
};

export function UserAvatar({
  src, alt = 'User', fallbackText, size = 40,
  className = '', fallbackClassName = '', quality = 82,
}: UserAvatarProps) {
  const [failed, setFailed] = useState(false);

  const initial = (fallbackText || alt || 'U').charAt(0).toUpperCase();
  const [g1, g2] = hashColor(fallbackText || alt || 'U');

  const textSize =
    size <= 24 ? 'text-[10px]' :
    size <= 32 ? 'text-xs' :
    size <= 40 ? 'text-sm' :
    size <= 56 ? 'text-lg' :
    'text-xl';

  const proxied = src ? toProxyUrl(src, { width: size * 2, quality }) : '';

  if (!src || failed || !proxied) {
    return (
      <div
        className={`rounded-full bg-gradient-to-br ${g1} ${g2} flex items-center justify-center font-bold text-primary flex-shrink-0 ${fallbackClassName} ${className}`}
        style={{ width: size, height: size }}
        aria-label={alt}
      >
        <span className={textSize}>{initial}</span>
      </div>
    );
  }

  return (
    <div className={`rounded-full overflow-hidden flex-shrink-0 ${className}`} style={{ width: size, height: size }}>
      <Image
        src={proxied}
        alt={alt}
        width={size}
        height={size}
        className="w-full h-full object-cover"
        unoptimized
        onError={() => setFailed(true)}
      />
    </div>
  );
}
