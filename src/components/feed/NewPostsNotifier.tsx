"use client";

import { memo } from 'react';
import { ArrowUp } from 'lucide-react';

interface NewPostsNotifierProps {
  count: number;
  onRefresh: () => void;
}

export const NewPostsNotifier = memo(({ count, onRefresh }: NewPostsNotifierProps) => {
  if (count === 0) return null;

  return (
    <div className="sticky top-16 z-30 flex justify-center py-2">
      <button
        onClick={onRefresh}
        className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:-translate-y-0.5 text-sm font-semibold"
      >
        <ArrowUp className="h-4 w-4" />
        {count === 1 ? '1 new post' : `${count} new posts`}
      </button>
    </div>
  );
});

NewPostsNotifier.displayName = 'NewPostsNotifier';
