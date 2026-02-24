"use client";

import { useRef } from 'react';
import { FileText, Upload, X } from 'lucide-react';

type Step7Props = {
  data: {
    pitch_deck_url: string;
    elevator_pitch: string;
  };
  isUploadingDeck: boolean;
  onChange: (field: string, value: string) => void;
  onPitchDeckUpload: (file: File) => void;
};

export function Step7Media({ data, isUploadingDeck, onChange, onPitchDeckUpload }: Step7Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-6">
      <div className="mb-1">
        <h2 className="text-lg font-semibold text-foreground">Media & Documents</h2>
        <p className="text-sm text-muted-foreground">Upload your pitch deck and elevator pitch</p>
      </div>

      {/* Pitch Deck */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">Pitch Deck (PDF)</label>
        {data.pitch_deck_url ? (
          <div className="flex items-center gap-3 p-3 bg-accent/30 rounded-xl border border-border/50">
            <FileText className="h-5 w-5 text-primary flex-shrink-0" />
            <span className="text-sm text-foreground truncate flex-1">Pitch deck uploaded</span>
            <button
              type="button"
              onClick={() => onChange('pitch_deck_url', '')}
              className="text-muted-foreground hover:text-red-500 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploadingDeck}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-border rounded-xl text-sm text-muted-foreground hover:border-primary/30 hover:text-foreground transition-colors disabled:opacity-50"
          >
            {isUploadingDeck ? (
              <>
                <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Upload PDF
              </>
            )}
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onPitchDeckUpload(file);
            e.target.value = '';
          }}
          className="hidden"
        />
      </div>

      {/* Elevator Pitch */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">Elevator Pitch</label>
        <textarea
          value={data.elevator_pitch}
          onChange={(e) => onChange('elevator_pitch', e.target.value)}
          placeholder="A concise 2-3 sentence pitch for your startup. This can also be a link to a video pitch."
          rows={4}
          className="w-full px-4 py-2.5 bg-background border border-input rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
        />
        <p className="mt-1 text-xs text-muted-foreground">{data.elevator_pitch.length}/300 characters</p>
      </div>
    </div>
  );
}
