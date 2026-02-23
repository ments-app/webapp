"use client";

import { useRef } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';

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
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 shadow-md">
          <ImageIcon className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">Branding</h2>
          <p className="text-sm text-muted-foreground">Upload your startup&apos;s logo and banner</p>
        </div>
      </div>

      {/* Logo Upload */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">Logo</label>
        {logoUrl ? (
          <div className="relative w-32 h-32 rounded-xl overflow-hidden border border-border/50 group">
            <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={onRemoveLogo}
              className="absolute top-1 right-1 p-1 bg-background/80 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="h-4 w-4 text-foreground" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => logoInputRef.current?.click()}
            disabled={isUploadingLogo}
            className="w-32 h-32 flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border rounded-xl text-muted-foreground hover:border-primary/30 hover:text-foreground transition-colors disabled:opacity-50"
          >
            {isUploadingLogo ? (
              <span className="h-5 w-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Upload className="h-5 w-5" />
                <span className="text-xs">Upload Logo</span>
              </>
            )}
          </button>
        )}
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
        <p className="mt-1 text-xs text-muted-foreground">Recommended: 256x256px, PNG or JPG</p>
      </div>

      {/* Banner Upload */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">Banner Image</label>
        {bannerUrl ? (
          <div className="relative w-full h-40 rounded-xl overflow-hidden border border-border/50 group">
            <img src={bannerUrl} alt="Banner" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={onRemoveBanner}
              className="absolute top-2 right-2 p-1 bg-background/80 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="h-4 w-4 text-foreground" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => bannerInputRef.current?.click()}
            disabled={isUploadingBanner}
            className="w-full h-40 flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border rounded-xl text-muted-foreground hover:border-primary/30 hover:text-foreground transition-colors disabled:opacity-50"
          >
            {isUploadingBanner ? (
              <span className="h-5 w-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Upload className="h-5 w-5" />
                <span className="text-xs">Upload Banner</span>
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
        <p className="mt-1 text-xs text-muted-foreground">Recommended: 1200x400px, PNG or JPG</p>
      </div>
    </div>
  );
}
