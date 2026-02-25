"use client";

import { useRef } from 'react';
import { Upload, X, ImageIcon, Sparkles } from 'lucide-react';

type Step3Props = {
  logoUrl: string;
  bannerUrl: string;
  isUploadingLogo: boolean;
  isUploadingBanner: boolean;
  onLogoUpload: (file: File) => void;
  onBannerUpload: (file: File) => void;
  onRemoveLogo: () => void;
  onRemoveBanner: () => void;
};

export function Step3Branding({
  logoUrl, bannerUrl, isUploadingLogo, isUploadingBanner,
  onLogoUpload, onBannerUpload, onRemoveLogo, onRemoveBanner,
}: Step3Props) {
  const logoInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-foreground">Branding</h2>
        <p className="text-sm text-muted-foreground mt-1">Give your startup a visual identity</p>
      </div>

      {/* Logo Upload */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">Logo</label>
        <div className="flex items-start gap-5">
          {logoUrl ? (
            <div className="relative w-28 h-28 rounded-2xl overflow-hidden border-2 border-border/40 group shadow-sm">
              <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <button
                  type="button"
                  onClick={onRemoveLogo}
                  className="p-2 bg-white/90 rounded-full shadow-sm"
                >
                  <X className="h-4 w-4 text-gray-700" />
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => logoInputRef.current?.click()}
              disabled={isUploadingLogo}
              className="w-28 h-28 flex flex-col items-center justify-center gap-1.5 rounded-2xl bg-accent/30 border-2 border-dashed border-border/50 text-muted-foreground hover:border-primary/30 hover:bg-accent/50 hover:text-foreground transition-all disabled:opacity-50 group"
            >
              {isUploadingLogo ? (
                <span className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <ImageIcon className="h-6 w-6 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-medium">Upload</span>
                </>
              )}
            </button>
          )}
          <div className="pt-2 space-y-1">
            <p className="text-xs text-muted-foreground">Recommended: 256 x 256px</p>
            <p className="text-xs text-muted-foreground/60">PNG, JPG or SVG</p>
          </div>
        </div>
        <input
          ref={logoInputRef}
          type="file"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onLogoUpload(file);
            e.target.value = '';
          }}
          className="hidden"
        />
      </div>

      {/* Banner Upload */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">Banner Image</label>
        {bannerUrl ? (
          <div className="relative w-full h-44 rounded-2xl overflow-hidden border-2 border-border/40 group shadow-sm">
            <img src={bannerUrl} alt="Banner" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <button
                type="button"
                onClick={onRemoveBanner}
                className="p-2 bg-white/90 rounded-full shadow-sm"
              >
                <X className="h-4 w-4 text-gray-700" />
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => bannerInputRef.current?.click()}
            disabled={isUploadingBanner}
            className="w-full h-44 flex flex-col items-center justify-center gap-2 rounded-2xl bg-accent/30 border-2 border-dashed border-border/50 text-muted-foreground hover:border-primary/30 hover:bg-accent/50 hover:text-foreground transition-all disabled:opacity-50 group"
          >
            {isUploadingBanner ? (
              <span className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-accent/50 group-hover:bg-accent/80 transition-colors">
                  <Upload className="h-5 w-5" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium">Click to upload banner</p>
                  <p className="text-[10px] text-muted-foreground/60 mt-0.5">1200 x 400px recommended</p>
                </div>
              </>
            )}
          </button>
        )}
        <input
          ref={bannerInputRef}
          type="file"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onBannerUpload(file);
            e.target.value = '';
          }}
          className="hidden"
        />
      </div>

      {/* Tip */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-primary/5 border border-primary/10">
        <Sparkles className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
        <p className="text-xs text-muted-foreground leading-relaxed">
          A strong visual identity helps your startup stand out. Your logo and banner will appear on your public profile and in search results.
        </p>
      </div>
    </div>
  );
}
