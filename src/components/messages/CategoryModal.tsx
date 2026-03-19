"use client";

import React, { useState, useEffect } from 'react';
import { X, Trash2, Check } from 'lucide-react';
import Image from 'next/image';
import { toProxyUrl } from '@/utils/imageUtils';

interface ConversationItem {
  conversation_id: string;
  other_username: string;
  other_full_name: string;
  other_avatar_url?: string;
}

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, color: string) => Promise<void>;
  onDelete?: () => Promise<void>;
  initialName?: string;
  initialColor?: string;
  mode: 'create' | 'edit';
  conversations?: ConversationItem[];
  assignedConversationIds?: string[];
  onToggleConversation?: (conversationId: string, assign: boolean) => Promise<void>;
}

const PRESET_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#14b8a6', // teal
  '#3b82f6', // blue
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#6b7280', // gray
  '#f43f5e', // rose
];

export default function CategoryModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  initialName = '',
  initialColor = PRESET_COLORS[0],
  mode,
  conversations,
  assignedConversationIds = [],
  onToggleConversation,
}: CategoryModalProps) {
  const [name, setName] = useState(initialName);
  const [color, setColor] = useState(initialColor || PRESET_COLORS[0]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setName(initialName);
      setColor(initialColor || PRESET_COLORS[0]);
    }
  }, [isOpen, initialName, initialColor]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      await onSave(name.trim(), color);
      onClose();
    } catch {
      // error handled by parent
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete || deleting) return;
    setDeleting(true);
    try {
      await onDelete();
      onClose();
    } catch {
      // error handled by parent
    } finally {
      setDeleting(false);
    }
  };

  const handleToggle = async (conversationId: string) => {
    if (!onToggleConversation || togglingId) return;
    setTogglingId(conversationId);
    const isAssigned = assignedConversationIds.includes(conversationId);
    try {
      await onToggleConversation(conversationId, !isAssigned);
    } catch {
      // error handled by parent
    } finally {
      setTogglingId(null);
    }
  };

  const getProxiedUrl = (url: string | undefined) => {
    if (!url) return null;
    return toProxyUrl(url, { width: 36, quality: 80 });
  };

  const showConversations = mode === 'edit' && conversations && onToggleConversation;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/60 animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal */}
      <div className={`fixed inset-x-4 z-50 mx-auto max-w-sm rounded-2xl bg-background border border-border/50 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-200 flex flex-col ${showConversations ? 'top-[10%] bottom-[10%]' : 'top-1/2 -translate-y-1/2'}`}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/30 flex-shrink-0">
          <h2 className="text-base font-semibold text-foreground">
            {mode === 'create' ? 'New Category' : 'Edit Category'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent/40 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="px-5 py-4 space-y-5">
            {/* Name Input */}
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Close Friends"
                maxLength={30}
                autoFocus
                className="w-full px-3 py-2.5 rounded-xl bg-accent/20 border border-border/30 text-foreground text-sm placeholder:text-muted-foreground/50 outline-none focus:border-primary/50 transition-colors"
              />
            </div>

            {/* Color Picker */}
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Color
              </label>
              <div className="flex flex-wrap gap-2.5">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-8 h-8 rounded-full transition-all duration-150 ${
                      color === c
                        ? 'ring-2 ring-offset-2 ring-offset-background scale-110'
                        : 'hover:scale-105'
                    }`}
                    style={{
                      backgroundColor: c,
                      ...(color === c ? { '--tw-ring-color': c } as React.CSSProperties : {}),
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Conversations Section (edit mode only) */}
          {showConversations && (
            <div className="border-t border-border/30">
              <div className="px-5 pt-4 pb-2">
                <label className="block text-sm font-medium text-muted-foreground">
                  Conversations
                </label>
              </div>
              <div className="pb-2">
                {conversations.length === 0 ? (
                  <p className="px-5 py-3 text-sm text-muted-foreground/60">No conversations</p>
                ) : (
                  conversations.map((conv) => {
                    const isAssigned = assignedConversationIds.includes(conv.conversation_id);
                    const isToggling = togglingId === conv.conversation_id;
                    const avatarSrc = getProxiedUrl(conv.other_avatar_url);

                    return (
                      <button
                        key={conv.conversation_id}
                        onClick={() => handleToggle(conv.conversation_id)}
                        disabled={isToggling}
                        className="w-full flex items-center gap-3 px-5 py-2.5 hover:bg-accent/30 transition-colors disabled:opacity-50"
                      >
                        {/* Avatar */}
                        <div className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center bg-primary text-primary-foreground flex-shrink-0">
                          {avatarSrc ? (
                            <Image
                              src={avatarSrc}
                              alt={conv.other_username || ''}
                              width={36}
                              height={36}
                              className="object-cover"
                            />
                          ) : (
                            <span className="text-sm font-medium">
                              {(conv.other_full_name || conv.other_username || 'U').charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>

                        {/* Name */}
                        <span className="flex-1 text-sm text-foreground text-left truncate">
                          {conv.other_full_name || conv.other_username || 'Unknown'}
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
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-border/30 flex items-center gap-3 flex-shrink-0">
          {mode === 'edit' && onDelete && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              {deleting ? 'Deleting...' : 'Delete'}
            </button>
          )}
          <div className="flex-1" />
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-accent/40 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim() || saving}
            className="px-4 py-2 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : mode === 'create' ? 'Create' : 'Save'}
          </button>
        </div>
      </div>
    </>
  );
}
