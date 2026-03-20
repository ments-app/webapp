"use client";

import React, { useState } from 'react';
import { X, Check } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  color?: string;
}

interface CategoryAssignSheetProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  assignedCategoryIds: string[];
  onToggleCategory: (categoryId: string, assigned: boolean) => Promise<void>;
  conversationName?: string;
}

export default function CategoryAssignSheet({
  isOpen,
  onClose,
  categories,
  assignedCategoryIds,
  onToggleCategory,
  conversationName,
}: CategoryAssignSheetProps) {
  const [togglingId, setTogglingId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleToggle = async (categoryId: string) => {
    if (togglingId) return;
    setTogglingId(categoryId);
    const isAssigned = assignedCategoryIds.includes(categoryId);
    try {
      await onToggleCategory(categoryId, !isAssigned);
    } catch {
      // error handled by parent
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/60 animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Sheet — slides up from bottom */}
      <div className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl bg-background border-t border-border/50 shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[60vh] flex flex-col">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/20" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border/30">
          <div>
            <h3 className="text-base font-semibold text-foreground">Add to Category</h3>
            {conversationName && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[200px]">
                {conversationName}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent/40 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Category List */}
        <div className="flex-1 overflow-y-auto py-2">
          {categories.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <p className="text-sm text-muted-foreground">No categories yet</p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Create a category first using the + button
              </p>
            </div>
          ) : (
            categories.map((category) => {
              const isAssigned = assignedCategoryIds.includes(category.id);
              const isToggling = togglingId === category.id;

              return (
                <button
                  key={category.id}
                  onClick={() => handleToggle(category.id)}
                  disabled={isToggling}
                  className="w-full flex items-center gap-3 px-5 py-3 hover:bg-accent/30 transition-colors disabled:opacity-50"
                >
                  {/* Color dot */}
                  <div
                    className="w-3.5 h-3.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: category.color || '#6b7280' }}
                  />

                  {/* Name */}
                  <span className="flex-1 text-sm text-foreground text-left truncate">
                    {category.name}
                  </span>

                  {/* Checkbox */}
                  <div
                    className={`w-5 h-5 rounded-md flex items-center justify-center transition-all flex-shrink-0 ${
                      isAssigned
                        ? 'bg-primary'
                        : 'border-2 border-muted-foreground/30'
                    }`}
                  >
                    {isAssigned && <Check className="w-3.5 h-3.5 text-primary-foreground" />}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Safe area padding for mobile */}
        <div className="h-safe-area-inset-bottom pb-4" />
      </div>
    </>
  );
}
