"use client";

import { useRef } from 'react';
import { FileText, Upload, X, Mic } from 'lucide-react';

type Step7Props = {
  data: {
    pitch_deck_url: string;
    elevator_pitch: string;
  };
  isUploadingDeck: boolean;
  onChange: (field: string, value: string) => void;
  onPitchDeckUpload: (file: File) => void;
};

const inputClass = "w-full px-4 py-2.5 bg-background border border-border/60 rounded-xl text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/15 transition-colors";

export function Step7Media({ data, isUploadingDeck, onChange, onPitchDeckUpload }: Step7Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const charCount = data.elevator_pitch.length;
  const charLimit = 300;
  const isNearLimit = charCount > charLimit * 0.85;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-foreground">Media & Documents</h2>
        <p className="text-sm text-muted-foreground mt-1">Share your pitch deck and elevator pitch</p>
      </div>

      {/* Pitch Deck */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">Pitch Deck</label>
        {data.pitch_deck_url ? (
          <div className="flex items-center gap-4 p-4 bg-primary/5 rounded-xl border border-primary/15">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 flex-shrink-0">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">Pitch deck uploaded</p>
              <p className="text-xs text-muted-foreground">PDF document</p>
            </div>
            <button
              type="button"
              onClick={() => onChange('pitch_deck_url', '')}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploadingDeck}
            className="w-full flex flex-col items-center justify-center gap-2 px-4 py-8 rounded-xl bg-accent/20 border-2 border-dashed border-border/50 text-muted-foreground hover:border-primary/30 hover:bg-accent/40 hover:text-foreground transition-all disabled:opacity-50 group"
          >
            {isUploadingDeck ? (
              <>
                <span className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span className="text-sm">Uploading...</span>
              </>
            ) : (
              <>
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-accent/50 group-hover:bg-accent/80 transition-colors">
                  <Upload className="h-5 w-5" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium">Upload your pitch deck</p>
                  <p className="text-[10px] text-muted-foreground/60 mt-0.5">PDF format, max 10MB</p>
                </div>
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
        <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-violet-500/10">
            <Mic className="h-3.5 w-3.5 text-violet-500" />
          </div>
          Elevator Pitch
        </label>
        <textarea
          value={data.elevator_pitch}
          onChange={(e) => onChange('elevator_pitch', e.target.value)}
          placeholder="A concise 2-3 sentence pitch for your startup. This can also be a link to a video pitch."
          rows={4}
          maxLength={charLimit}
          className={`${inputClass} resize-none`}
        />
        <div className="flex justify-end mt-1.5">
          <span className={`text-xs tabular-nums ${isNearLimit ? 'text-amber-500' : 'text-muted-foreground/50'}`}>
            {charCount}/{charLimit}
          </span>
        </div>
      </div>
    </div>
  );
}
